"""
Phrase intro generator.

Generates a short, conversational, Spanish-only AI intro for a phrase the user
submitted in PHRASE mode. The intro is meant to:

- React naturally to the phrase (1–3 sentences).
- Judge whether the input actually looks like a phrase / quote, and gently say
  so when it doesn't (e.g. "esto suena más a una idea que a una cita…").
- If the user provided an attribution (`author`), assess plausibility:
    * Plausible attribution → say nothing about authorship.
    * Clearly wrong / very inconsistent attribution → flag suspicion gently
      ("no suena demasiado a Aurelio…", "la atribución genera dudas…").
    * Uncertain → mention doubt cautiously.

Tone: warm, conversational, brief. No academic voice, no certainty claims, no
hardcoded canned lines. The model produces varied, contextual phrasing.

Output: plain Spanish text. NEVER JSON, NEVER quotes, NEVER labels.
"""
from __future__ import annotations

import logging
import re

from llm import OpenAIClient

logger = logging.getLogger(__name__)


SYSTEM_PROMPT = """Eres un lector calmado y atento. Reaccionas a una frase/cita corta que el usuario acaba de enviar en modo "frase" de la app.

OBJETIVO: producir UNA respuesta breve, conversacional y en ESPAÑOL, de 1 a 3 oraciones, que:
1. Reaccione naturalmente al contenido de la frase.
2. Si la frase NO parece realmente una frase/cita pulida (parece más una idea suelta, una nota, una pregunta o un comentario casual), dilo con amabilidad y naturalidad — sin sonar académico ni cortante.
3. Si el usuario proporcionó un AUTOR para la cita, evalúa si la atribución es plausible o no:
   - Si la atribución parece claramente equivocada o muy inconsistente con ese autor: menciónalo de forma suave y conversacional ("no suena demasiado a…", "la atribución genera dudas…", "no termina de encajar con…").
   - Si la atribución es razonable / plausible: NO digas absolutamente nada sobre el autor — limítate a reaccionar al contenido.
   - Si es incierto: menciona la duda con cautela, sin afirmar nada.

REGLAS DE ESTILO (importantes):
- IDIOMA: español de España, natural, fluido. Nunca uses inglés.
- Largo MÁXIMO: 3 oraciones. No te alargues.
- Tono: cálido, curioso, breve, como un amigo culto que reacciona en 5 segundos.
- NO uses voz docente, NO uses encabezados, NO uses listas, NO uses emojis.
- NO inventes la frase de nuevo, NO la repitas literal — reacciona a su sustancia.
- NO empieces con muletillas como "Vaya, qué…", "Es interesante cómo…", "Esa frase…", "Tu frase…".
- NO termines con coletillas como "¿no?", "¿verdad?", "¿cierto?", "¿sabes?".
- NO afirmes con certeza absoluta nada sobre la autoría salvo que sea evidentísimo.
- Si todo está bien con la atribución (o no hay autor), simplemente reacciona al contenido — no es obligatorio comentar nada sobre autoría.

DEVUELVE SOLO el texto del intro. Nada de JSON, comillas envolventes, etiquetas ni explicaciones."""


def _build_user_prompt(phrase: str, author: str | None) -> str:
    phrase_clean = (phrase or "").strip()
    author_clean = (author or "").strip()
    if author_clean:
        return (
            f"Frase enviada por el usuario:\n\"\"\"\n{phrase_clean}\n\"\"\"\n\n"
            f"Autor que el usuario atribuye: {author_clean}\n\n"
            f"Reacciona en 1–3 oraciones. Si la atribución a {author_clean} parece claramente "
            f"equivocada o muy poco consistente con ese autor, menciónalo con suavidad. "
            f"Si parece plausible o no tienes evidencia clara en contra, NO comentes la autoría."
        )
    return (
        f"Frase enviada por el usuario (sin autor declarado):\n\"\"\"\n{phrase_clean}\n\"\"\"\n\n"
        f"Reacciona en 1–3 oraciones. Si no parece realmente una frase/cita pulida sino más bien "
        f"una idea suelta o un comentario, puedes señalarlo con naturalidad."
    )


_TRAILING_TAGS = ("¿no?", "¿verdad?", "¿cierto?", "¿sabes?", "right?", "you know?")


def _strip_trailing_tags(text: str) -> str:
    out = text
    for crutch in _TRAILING_TAGS:
        out = re.sub(
            rf",?\s*{re.escape(crutch)}\s*$",
            ".",
            out,
            flags=re.MULTILINE | re.IGNORECASE,
        )
    return out.strip()


def generate_phrase_intro(
    phrase: str,
    author: str | None = None,
    llm_client: OpenAIClient | None = None,
) -> str | None:
    """
    Generate a short Spanish AI intro for a user-submitted phrase.

    Returns None on failure; callers should be ready to render the rest of the
    phrase UI without the intro in that case.
    """
    if not (phrase or "").strip():
        return None
    if llm_client is None:
        llm_client = OpenAIClient()
    user_prompt = _build_user_prompt(phrase, author)
    try:
        result = llm_client.complete(
            system=SYSTEM_PROMPT,
            user=user_prompt,
            language=None,  # the system prompt already mandates Spanish
            max_tokens=140,  # 1–3 short sentences fit comfortably under 140 tokens
            prompt_id="PHRASE_INTRO",
        )
        intro = (result or "").strip()
        # If the model wrapped the response in surrounding quotes, drop them.
        if intro.startswith('"') and intro.endswith('"') and len(intro) > 1:
            intro = intro[1:-1].strip()
        intro = _strip_trailing_tags(intro)
        return intro or None
    except Exception as e:
        logger.warning("Failed to generate phrase_intro: %s", e)
        return None
