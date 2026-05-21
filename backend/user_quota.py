"""
Per-user daily AI quota backed by Supabase `profiles`.

- DAILY_LIMIT = 10 uses per user per calendar day (client date via x-client-date).
- Resets remaining_uses when last_uses_reset_date != client day.
- Optional GLOBAL_DAILY_AI_CAP: soft safety net across all users (in-memory).
"""

from __future__ import annotations

import json
import logging
import os
import time
import urllib.error
import urllib.request
from typing import Optional

logger = logging.getLogger(__name__)

DAILY_LIMIT = int(os.environ.get("DAILY_AI_USES_PER_USER", "10"))
GLOBAL_DAILY_AI_CAP = int(os.environ.get("GLOBAL_DAILY_AI_CAP", "200000"))

_SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip().rstrip("/")
_SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()

# Idempotency: (user_id, date, request_id) already counted
_counted_request_ids: set[tuple[str, str, str]] = set()
# Global cap counter (in-memory; approximate with multiple replicas)
_global_daily_count: dict[str, int] = {}


def _today_fallback() -> str:
    return time.strftime("%Y-%m-%d", time.gmtime())


def _supabase_headers() -> dict[str, str]:
    return {
        "apikey": _SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {_SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


def _fetch_profile(user_id: str) -> Optional[dict]:
    if not _SUPABASE_URL or not _SUPABASE_SERVICE_KEY:
        logger.warning("[quota] Supabase not configured — cannot enforce per-user quota")
        return None
    url = (
        f"{_SUPABASE_URL}/rest/v1/profiles"
        f"?id=eq.{user_id}&select=remaining_uses,last_uses_reset_date"
    )
    req = urllib.request.Request(url, headers=_supabase_headers(), method="GET")
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            rows = json.loads(resp.read().decode())
        if isinstance(rows, list) and rows:
            return rows[0]
    except Exception as exc:
        logger.warning("[quota] fetch profile failed user=%s: %s", user_id, exc)
    return None


def _patch_profile(user_id: str, body: dict) -> bool:
    if not _SUPABASE_URL or not _SUPABASE_SERVICE_KEY:
        return False
    url = f"{_SUPABASE_URL}/rest/v1/profiles?id=eq.{user_id}"
    data = json.dumps(body).encode()
    req = urllib.request.Request(
        url,
        data=data,
        method="PATCH",
        headers=_supabase_headers(),
    )
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            return resp.status in (200, 204)
    except Exception as exc:
        logger.warning("[quota] patch profile failed user=%s: %s", user_id, exc)
        return False


def _normalize_client_date(raw: Optional[str]) -> str:
    if not raw:
        return _today_fallback()
    s = raw.strip()[:10]
    if len(s) == 10 and s[4] == "-" and s[7] == "-":
        return s
    return _today_fallback()


def refresh_remaining(user_id: str, client_date: Optional[str] = None) -> int:
    """Apply day rollover if needed; return remaining uses (0..DAILY_LIMIT)."""
    day = _normalize_client_date(client_date)
    row = _fetch_profile(user_id)
    if row is None:
        # Dev without Supabase: allow up to limit (local-only testing)
        return DAILY_LIMIT

    last = row.get("last_uses_reset_date")
    if last is not None:
        last = str(last)[:10]
    remaining = row.get("remaining_uses")
    try:
        remaining_int = max(0, min(DAILY_LIMIT, int(remaining)))
    except (TypeError, ValueError):
        remaining_int = DAILY_LIMIT

    if last != day:
        remaining_int = DAILY_LIMIT
        _patch_profile(
            user_id,
            {"remaining_uses": DAILY_LIMIT, "last_uses_reset_date": day},
        )
    return remaining_int


def check_can_consume(user_id: str, client_date: Optional[str] = None) -> tuple[bool, int]:
    """True if user has at least one use left (after rollover)."""
    if not _check_global_cap():
        return False, 0
    remaining = refresh_remaining(user_id, client_date)
    return remaining > 0, remaining


def consume_use(
    user_id: str,
    client_date: Optional[str] = None,
    request_id: Optional[str] = None,
) -> tuple[bool, int]:
    """
    Decrement one use after a successful generation call.
    Returns (ok, remaining_after).
    """
    day = _normalize_client_date(client_date)
    if request_id:
        rid = request_id.strip()
        if rid:
            id_key = (user_id, day, rid)
            if id_key in _counted_request_ids:
                return True, refresh_remaining(user_id, day)
            _counted_request_ids.add(id_key)
            old = {k for k in _counted_request_ids if k[1] != day}
            _counted_request_ids.difference_update(old)

    remaining = refresh_remaining(user_id, day)
    if remaining <= 0:
        return False, 0

    new_remaining = remaining - 1
    if _patch_profile(
        user_id,
        {"remaining_uses": new_remaining, "last_uses_reset_date": day},
    ):
        _increment_global_cap()
        return True, new_remaining
    return False, remaining


def get_usage_payload(user_id: str, client_date: Optional[str] = None) -> dict:
    day = _normalize_client_date(client_date)
    remaining = refresh_remaining(user_id, day)
    used = max(0, DAILY_LIMIT - remaining)
    return {
        "dailyLimit": DAILY_LIMIT,
        "used": used,
        "remaining": remaining,
        "date": day,
        "userId": user_id,
    }


def _check_global_cap() -> bool:
    """Optional app-wide safety net (in-memory)."""
    if GLOBAL_DAILY_AI_CAP <= 0:
        return True
    today = _today_fallback()
    used = _global_daily_count.get(today, 0)
    return used < GLOBAL_DAILY_AI_CAP


def _increment_global_cap() -> None:
    if GLOBAL_DAILY_AI_CAP <= 0:
        return
    today = _today_fallback()
    _global_daily_count[today] = _global_daily_count.get(today, 0) + 1
    # prune old days
    for k in list(_global_daily_count.keys()):
        if k != today:
            del _global_daily_count[k]
