"""
Asistente de voz Evo — respuesta breve (ChatGPT) + síntesis OpenAI TTS.
"""
from __future__ import annotations

import base64
import logging
import os

from llm import API_KEY, BASE_URL, OpenAIClient

_log = logging.getLogger(__name__)

VOICE_ASSISTANT_MODEL = os.getenv("VOICE_ASSISTANT_MODEL", os.getenv("LLM_MODEL", "gpt-4o-mini"))
VOICE_ASSISTANT_TTS_MODEL = os.getenv("VOICE_ASSISTANT_TTS_MODEL", "tts-1")
VOICE_ASSISTANT_TTS_VOICE = os.getenv("VOICE_ASSISTANT_TTS_VOICE", "nova")

OPENAI_TTS_VOICES = frozenset({
    "alloy", "ash", "ballad", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer", "verse",
})

EVO_APP_KNOWLEDGE = """Qué es Evo (conocimiento fijo de la app):
- Red social filosófica en español: feed (Para ti / Siguiendo), perfiles, clanes, mensajes entre amigos.
- Los usuarios publican reflexiones (texto propio) y frases (citas; a veces con autor atribuido).
- También pueden publicar opiniones y contenido personal; no todo es cita histórica verificada.
- Ocho clanes filosóficos: nihilista, cientista, estoico, existencialista, racionalista, humanista,
  realista, trascendentalista.
- La app estima porcentajes entre esos clanes según lo que el usuario escribe con la IA al reflexionar.
  Es orientativo y evolutivo, NO un test psicológico ni una etiqueta fija de identidad.
- El clan visible suele ser el de mayor %; el rango (Aprendiz / Maestro / Filósofo) depende del % en ese clan.
- Pueden chatear con IA para crear reflexiones/frases; el asistente de voz es aparte y breve."""

SYSTEM_PROMPT = f"""Eres el asistente de voz de Evo.
El usuario te habla por voz; tú respondes en español para ser leído en voz alta.

{EVO_APP_KNOWLEDGE}

Reglas de respuesta:
- Responde SIEMPRE a lo que el usuario acaba de decir, no a un tema aleatorio.
- Si recibes contexto de pantalla, úsalo como fuente principal: publicación visible, perfil, % filosóficos,
  clan, frase insignia, etc.
- Sobre porcentajes filosóficos: explícalos como tendencias de estilo de pensamiento en Evo, no como verdad
  objetiva sobre la persona. Ej.: mucho humanista + existencialista sugiere interés en dignidad humana y
  sentido de la vida, sin absolutizar.
- Sobre atribución de citas: prudencia; distingue lo muy conocido de lo dudoso.
- No des consejos médicos, legales ni afirmes datos de personas reales que no estén en el contexto.
- Si el mensaje son balbuceos o ruido sin sentido, pide que repita con claridad.
- Si falta contexto para responder concretamente, dilo brevemente en lugar de inventar.
- Máximo 2 o 3 frases cortas (unas 25–50 palabras en total).
- Sin markdown, emojis ni listas."""


def _build_user_prompt(message: str, screen_context: str | None = None) -> str:
    ctx = (screen_context or "").strip()
    if not ctx:
        return message
    return (
        "Contexto de lo que el usuario está viendo en la app:\n"
        f"{ctx}\n\n"
        "Pregunta o comentario del usuario:\n"
        f"{message}"
    )

PREVIEW_SAMPLE_TEXT = "Hola. Soy tu asistente de voz en Evo. Así suena esta voz."


def normalize_tts_voice(voice: str | None) -> str:
    v = (voice or VOICE_ASSISTANT_TTS_VOICE).strip().lower()
    return v if v in OPENAI_TTS_VOICES else VOICE_ASSISTANT_TTS_VOICE


def run_voice_assistant_turn(
    message: str,
    voice: str | None = None,
    screen_context: str | None = None,
) -> tuple[str, str | None]:
    """Returns (reply_text, audio_mp3_base64_or_none)."""
    text = (message or "").strip()
    if not text:
        raise ValueError("message is required")

    llm = OpenAIClient(model=VOICE_ASSISTANT_MODEL)
    reply = llm.complete(
        system=SYSTEM_PROMPT,
        user=_build_user_prompt(text, screen_context=screen_context),
        language="es",
        max_tokens=150,
        prompt_id="voice_assistant",
    )
    reply = (reply or "").strip()
    if not reply:
        reply = "No he podido formular una respuesta. ¿Puedes repetirlo?"

    audio_b64 = _synthesize_speech(reply, voice=voice)
    return reply, audio_b64


def run_voice_assistant_preview(voice: str | None = None, text: str | None = None) -> str | None:
    sample = (text or "").strip() or PREVIEW_SAMPLE_TEXT
    return _synthesize_speech(sample, voice=voice)


def _synthesize_speech(text: str, voice: str | None = None) -> str | None:
    if not API_KEY:
        return None
    try:
        from openai import OpenAI
    except ImportError:
        _log.warning("openai package missing — TTS skipped")
        return None

    client = OpenAI(api_key=API_KEY, base_url=BASE_URL) if BASE_URL else OpenAI(api_key=API_KEY)
    try:
        response = client.audio.speech.create(
            model=VOICE_ASSISTANT_TTS_MODEL,
            voice=normalize_tts_voice(voice),
            input=text[:4096],
            response_format="mp3",
        )
        return base64.b64encode(response.content).decode("ascii")
    except Exception as e:
        _log.warning("voice_assistant TTS failed: %s", e)
        return None
