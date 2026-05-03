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

MODEL = "claude-sonnet-4-6"

_SYSTEM = (
    "Eres un clasificador filosófico experto. Solo devuelves JSON válido con claves entre comillas. "
    "Nunca añades texto adicional ni explicaciones."
)

_PROMPT = (
    "Eres un experto en filosofía. Analiza esta reflexión y puntúa del 0 al 10 cuánto expresa cada "
    "pensamiento filosófico. Sé muy preciso en las fronteras difíciles.\n\n"
    "DEFINICIONES EXACTAS:\n"
    "- nihilista: rechaza explícitamente que exista significado o propósito inherente. "
    "Vacío, absurdo, nada importa. NO confundir con existencialista que SÍ construye significado.\n"
    "- cientista: confía ÚNICAMENTE en evidencia empírica, experimentos, datos medibles, "
    "método científico. NO confundir con racionalista que usa lógica pura sin necesitar evidencia.\n"
    "- estoico: acepta lo incontrolable, controla solo lo interno, disciplina emocional, ecuanimidad. "
    "NO confundir con realista.\n"
    "- existencialista: construye su propio significado mediante decisiones y libertad radical. "
    "NO confundir con nihilista.\n"
    "- racionalista: razón y lógica pura sin necesitar evidencia empírica. "
    "NO confundir con cientista.\n"
    "- humanista: el ser humano y su bienestar son el centro. "
    "Empatía, dignidad, relaciones, comunidad.\n"
    "- realista: pragmatismo puro, hechos concretos, sin componente espiritual ni emocional profundo.\n"
    "- trascendentalista: dimensión más allá de lo físico o racional, "
    "intuición profunda, conexión con algo mayor.\n\n"
    "REGLA CRÍTICA: Realista solo merece puntuación alta si el texto habla EXPLÍCITAMENTE "
    "de pragmatismo y hechos concretos. No lo puntúes alto por lenguaje reflexivo general.\n\n"
    'Devuelve SOLO este JSON sin texto adicional:\n'
    '{{"nihilista": X, "cientista": X, "estoico": X, "existencialista": X, '
    '"racionalista": X, "humanista": X, "realista": X, "trascendentalista": X}}\n\n'
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
    Clasifica una reflexión filosófica usando claude-sonnet-4-6.

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
