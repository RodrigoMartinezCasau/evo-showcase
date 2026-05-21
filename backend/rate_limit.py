"""
Rate limiting for FastAPI.

- Default: in-memory bucket (OK with **1 Railway replica**).
- Production scale: set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
  (Upstash Redis → REST API, no extra Python deps).
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

RATE_LIMIT_PER_MINUTE = int(os.environ.get("RATE_LIMIT_PER_MINUTE", "30"))
_RATE_WINDOW_SECONDS = 60

_UPSTASH_URL = os.environ.get("UPSTASH_REDIS_REST_URL", "").strip().rstrip("/")
_UPSTASH_TOKEN = os.environ.get("UPSTASH_REDIS_REST_TOKEN", "").strip()

_rate_counters: dict[str, dict[str, float | int]] = {}


def upstash_configured() -> bool:
    return bool(_UPSTASH_URL and _UPSTASH_TOKEN)


def startup_note() -> None:
    if upstash_configured():
        logger.info("[rate_limit] Using Upstash Redis REST (shared across replicas).")
    else:
        logger.warning(
            "[rate_limit] In-memory only — set Railway replicas=1 OR configure "
            "UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN for multi-instance."
        )


def _minute_bucket() -> int:
    return int(time.time() // _RATE_WINDOW_SECONDS)


def _redis_incr(key: str, window_sec: int) -> Optional[int]:
    """INCR + EXPIRE via Upstash REST pipeline."""
    if not upstash_configured():
        return None
    url = _UPSTASH_URL
    headers = {"Authorization": f"Bearer {_UPSTASH_TOKEN}"}
    body = json.dumps(["INCR", key, "EXPIRE", key, str(window_sec)]).encode()
    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={**headers, "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read().decode())
        # Pipeline returns list of results; first is INCR count
        if isinstance(data, list) and data:
            result = data[0].get("result") if isinstance(data[0], dict) else data[0]
            return int(result)
    except Exception as exc:
        logger.warning("[rate_limit] Upstash error: %s — falling back to memory", exc)
    return None


def check_rate_limit(client_key: str, path: str) -> bool:
    """
    Return True if request is allowed, False if rate limited.
    client_key should be user_id if available, else IP.
    """
    bucket_id = _minute_bucket()
    key = f"rl:{client_key}:{path}:{bucket_id}"

    count = _redis_incr(key, _RATE_WINDOW_SECONDS + 5)
    if count is not None:
        return count <= RATE_LIMIT_PER_MINUTE

    now = time.time()
    mem_key = f"{key}"
    bucket = _rate_counters.get(mem_key)
    if not bucket or now >= float(bucket["reset"]):
        _rate_counters[mem_key] = {"count": 1, "reset": now + _RATE_WINDOW_SECONDS}
        return True
    bucket["count"] = int(bucket["count"]) + 1
    return int(bucket["count"]) <= RATE_LIMIT_PER_MINUTE
