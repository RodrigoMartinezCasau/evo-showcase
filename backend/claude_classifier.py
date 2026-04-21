"""
claude_classifier.py
====================

Llama a Claude Haiku para clasificar una reflexión filosófica en los 8 clanes.

Usado exclusivamente por el endpoint POST /classify/reflection de main.py.
La API key nunca sale del backend; el cliente solo llama al endpoint FastAPI.

Retorna zeros en cualquier error para no romper el flujo del clasificador híbrido.
"""

import json
import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

CLANS: list[str] = [
    "nihilista", "cientista", "estoico", "existencialista",
    "racionalista", "humanista", "realista", "trascendentalista",
]

MODEL = "claude-haiku-4-5-20251001"

_SYSTEM = (
    "Eres un clasificador filosófico preciso. Solo devuelves JSON válido. "
    "Nunca añades texto adicional ni explicaciones."
)

_PROMPT = (
    "Analiza esta reflexión filosófica y puntúa del 0 al 10 cuánto expresa cada uno de estos "
    "8 pensamientos. Devuelve SOLO un JSON sin texto adicional: "
    '{"nihilista": X, "cientista": X, "estoico": X, "existencialista": X, '
    '"racionalista": X, "humanista": X, "realista": X, "trascendentalista": X}. '
    "Reflexión: {texto}"
)


def _zeros() -> dict[str, float]:
    return {c: 0.0 for c in CLANS}


def _parse_scores(raw: str) -> dict[str, float] | None:
    """
    Extrae el JSON de la respuesta de Claude y valida los 8 clanes.
    Retorna None si el JSON es inválido o faltan clanes.
    """
    text = raw.strip()
    # Quitar fences de markdown si los hay
    if text.startswith("```"):
        lines = [ln for ln in text.split("\n") if not ln.strip().startswith("```")]
        text = "\n".join(lines).strip()

    # Intentar parsear directamente
    data: Any = None
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        # Buscar el primer bloque {...}
        start = text.find("{")
        end   = text.rfind("}") + 1
        if start < 0 or end <= start:
            return None
        try:
            data = json.loads(text[start:end])
        except json.JSONDecodeError:
            return None

    if not isinstance(data, dict):
        return None

    scores: dict[str, float] = {}
    for clan in CLANS:
        raw_val = data.get(clan, 0)
        try:
            val = float(raw_val)
        except (TypeError, ValueError):
            val = 0.0
        scores[clan] = max(0.0, min(10.0, val))

    return scores


def classify_with_claude(texto: str) -> dict[str, float]:
    """
    Clasifica una reflexión filosófica usando claude-haiku-4-5-20251001.

    Retorna un dict {clan: score} en escala [0, 10].
    Retorna zeros en cualquier error (API, red, parseo) para no romper el flujo.
    """
    texto = (texto or "").strip()
    if not texto:
        return _zeros()

    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        logger.warning("classify_with_claude: ANTHROPIC_API_KEY no configurada — devolviendo zeros")
        return _zeros()

    try:
        import anthropic  # import lazy: solo se necesita cuando esta función corre

        client = anthropic.Anthropic(api_key=api_key)
        user_prompt = _PROMPT.replace("{texto}", texto)

        message = client.messages.create(
            model=MODEL,
            max_tokens=256,
            system=_SYSTEM,
            messages=[{"role": "user", "content": user_prompt}],
        )

        raw_text = message.content[0].text if message.content else ""
        scores = _parse_scores(raw_text)

        if scores is None:
            logger.warning(
                "classify_with_claude: no se pudo parsear JSON de Claude: %r",
                raw_text[:200],
            )
            return _zeros()

        return scores

    except Exception as exc:
        logger.warning("classify_with_claude: error de API — %s", exc)
        return _zeros()
