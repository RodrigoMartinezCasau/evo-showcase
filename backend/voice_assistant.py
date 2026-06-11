"""
Asistente de voz Evo — respuesta breve (ChatGPT) + síntesis OpenAI TTS.

v1 agente: si el cliente envía el manifest de rutas, el LLM puede devolver
una acción de navegación estructurada además de la respuesta hablada.
"""
from __future__ import annotations

import base64
import json
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


NAVIGATION_PROMPT_TEMPLATE = """
CAPACIDAD DE NAVEGACIÓN:
Puedes mover al usuario por la app cuando lo pida EXPLÍCITAMENTE
("llévame a…", "abre…", "quiero crear…", "vuelve atrás"…).

Ruta actual del usuario: {current_route}

RUTAS DISPONIBLES (intents del manifest):
{routes_list}

FORMATO DE RESPUESTA — devuelve SIEMPRE un único objeto JSON válido, sin markdown.
Tu respuesta COMPLETA debe ser SOLO el objeto JSON: nada de texto antes ni después.

Si el usuario pide navegar:
{{"reply": "Confirmación corta (1 frase), ej: 'Vamos a tu perfil.'", "action": {{"type": "navigate", "intent": "<intent_del_manifest>"}}}}

Si es una pregunta o comentario normal (NO pide navegar ni ejecutar una acción):
{{"reply": "Tu respuesta hablada", "action": {{"type": "none"}}}}

REGLAS DE NAVEGACIÓN:
- Usa SOLO intents de la lista; nunca inventes intents ni rutas.
- create_reflection y create_phrase abren el editor VACÍO. Si el usuario dice QUÉ escribir
  (tema, cita, texto literal, autor…) NO navegues: usa la acción execute create_*_prefill
  del bloque de acciones (abre la pantalla con el texto preparado).
- Si la petición del usuario coincide (igual o casi igual) con un ejemplo del manifest, navega
  directamente SIN preguntar. Ej.: "vuelve" o "atrás" → intent 'back'.
- Solo pregunta (action type none) si la petición encaja igual de bien en DOS intents distintos
  y elegir mal sería molesto para el usuario.
- NUNCA preguntes y navegues a la vez: si tu reply termina en pregunta ("¿quieres que te
  lleve?"), la action DEBE ser type none. Navegar solo con confirmación implícita o explícita.
- Con navegación: reply de máximo 1-2 frases cortas.
- Sin navegación: máximo 3-4 frases.

DATOS DEL USUARIO EN EL CONTEXTO:
Si el contexto incluye "Datos del usuario actual" (clan, porcentajes, frases desbloqueadas,
racha, usos restantes), RESPONDE DIRECTAMENTE con esos datos, sin navegar y sin decir que no
puedes saberlo. Ej.: "¿de qué clan soy?" → "Eres Humanista, con un 24%." Solo ofrece navegar
si el usuario quiere VER la pantalla, no para conocer el dato.

PUBLICACIONES VISIBLES EN EL FEED:
Si el contexto incluye "Publicaciones visibles en pantalla", el usuario está viendo el feed y
cada línea describe una publicación: autor, clan, tipo (frase/reflexión), métricas y contenido.
- "esta publicación", "este post", "léeme esto" → la marcada como POST EN PANTALLA AHORA;
  si no hay marca y solo hay una visible, esa.
- "el post de @fulano" / "la frase de X" → identifícala por autor o contenido entre las visibles.
- Puedes leer su contenido, resumirlo, comentar su autor o sus métricas, todo sin navegar
  (action type none).
- Si la referencia es ambigua entre varias visibles, pregunta cuál (cítalas por autor).
- Si una publicación tiene imagen adjunta puedes mencionarlo, pero NO puedes describir la
  imagen (no la ves).
- Si el contexto dice que no hay publicaciones cargadas, dilo tal cual: "Todavía no hay
  publicaciones cargadas en pantalla." No inventes publicaciones.
- NUNCA digas el post_id en voz alta: es un identificador interno.

{actions_block}

CONVERSACIONES Y CHATS CONCRETOS:
Si pide abrir una conversación concreta (con una persona o un chat anterior con la IA),
responde sin navegar: "Puedo abrirte la bandeja de mensajes, pero todavía no puedo entrar en
una conversación concreta por voz. Estará disponible pronto." Si acepta, navega a 'messages'
en el siguiente turno.
"""


# Bloque de "no soportado" cuando el cliente NO envía acciones (clientes v1).
UNSUPPORTED_ACTIONS_BLOCK_NO_ACTIONS = """ACCIONES QUE TODAVÍA NO PUEDES HACER (responde con action type none):
Comentar, dar o quitar like, votar, publicar o escribir contenido POR el usuario,
seguir o dejar de seguir a alguien, bloquear, denunciar, cambiar ajustes o la privacidad
de la cuenta, enviar mensajes o compartir, eliminar publicaciones.
Si el usuario pide cualquiera de estas, responde EXACTAMENTE con esta idea:
"Por ahora solo puedo moverte por la app. Esa acción todavía no la puedo hacer por ti, pero estará disponible pronto."
MATIZ IMPORTANTE: "quiero crear/escribir una reflexión o frase" SÍ es navegación a la pantalla
de creación (intents create_reflection / create_phrase) — el usuario la escribe él mismo.
Solo es acción no soportada si pide que TÚ escribas o publiques el contenido por él
(ej. "escribe una reflexión sobre X y publícala").

PERFILES DE OTROS USUARIOS:
Si pide ir al perfil de otra persona ("llévame al perfil de Juan"), responde sin navegar:
"Puedo llevarte a tu perfil, pero todavía no puedo buscar perfiles de otros usuarios por voz. Estará disponible pronto."
"""

# Bloque de acciones cuando el cliente SÍ envía manifest_actions (v2).
ACTIONS_BLOCK_TEMPLATE = """CAPACIDAD DE EJECUTAR ACCIONES:
Además de navegar, puedes ejecutar estas acciones de la app cuando el usuario las pida:
{actions_list}

Si el usuario pide una de esas acciones, responde:
{{"reply": "Confirmación corta (1 frase), ej: 'Listo, le he dado like.'", "action": {{"type": "execute", "intent": "<intent_de_accion>", "parameters": {{}}}}}}

REGLAS PARA ACCIONES:
- Usa SOLO intents de acción de la lista; nunca inventes.
- Las acciones marcadas con [requiere publicación visible] solo tienen sentido si el contexto
  incluye "Publicaciones visibles en pantalla" o una publicación abierta. Si el usuario las pide
  sin ese contexto, NO ejecutes; responde con action type none explicando qué falta,
  ej.: "Para dar like, abre primero una publicación."
- Si la acción declara parámetros, rellénalos en "parameters" según su descripción.
  Los parámetros opcionales pueden omitirse si el usuario no los especifica.
- Con acción execute: reply de máximo 1 frase, sin preguntas (salvo confirmación, abajo).
- Las acciones sobre publicaciones se aplican a la que el usuario está viendo (la marcada
  como POST EN PANTALLA AHORA); no necesitas identificarla tú, el cliente lo resuelve.

REGLAS PARA ACCIONES CON CONFIRMACIÓN:
- Las acciones marcadas con [requiere confirmación] son sensibles: NO se ejecutan
  directamente; la app mostrará un diálogo de confirmación al usuario (y escuchará
  su respuesta por voz).
- Para esas acciones incluye en tu respuesta "requireConfirmation": true y
  "confirmationMessage" con el texto de confirmación indicado en la lista, y tu reply
  debe SER esa misma pregunta de confirmación (se leerá en voz alta), ej.:
{{"reply": "<pregunta de confirmación>", "action": {{"type": "execute", "intent": "<intent>", "parameters": {{}}, "requireConfirmation": true, "confirmationMessage": "<pregunta de confirmación>"}}}}
- Las acciones SIN esa marca no requieren confirmación: si la petición es clara,
  ejecuta directamente con reply confirmatorio.

ACCIONES DE CREACIÓN (create_reflection_prefill, create_phrase_prefill, create_comment_prefill):
PRIORIDAD: si menciona qué escribir → SIEMPRE execute create_*_prefill, NUNCA navigate
create_reflection/create_phrase.
Cuando el usuario pide crear contenido (reflexión, frase, comentario):
- Extrae el contenido o el tema de LO QUE ÉL DICE y pásalo en los parámetros con los
  nombres exactos: content (reflexión), phraseText y author opcional (frase),
  commentText (comentario), searchQuery (búsqueda/perfil).
- NUNCA generes tú el contenido completo. Tu trabajo es extraer lo que el usuario
  quiere decir, no escribir por él.
- Si da contenido literal ("reflexión que diga X", "comenta: gran post"), pásalo tal cual.
- Si da solo un tema ("reflexión sobre la libertad"), pasa el tema en content; la app
  pondrá un punto de partida mínimo.
- Estas acciones NO publican nada: solo abren la pantalla con el texto preparado para
  que el usuario lo revise, lo edite y lo publique él mismo.
- reply ejemplo: "Te abro una reflexión sobre la libertad. Revísala y publícala cuando quieras."
- Si el usuario solo quiere abrir la pantalla SIN contenido ("nueva reflexión", "crear frase"),
  usa la navegación normal (intents create_reflection / create_phrase).

ACCIONES SOBRE EL PERFIL VISIBLE (follow_user, unfollow_user, block_user):
- Solo tienen sentido si el contexto incluye el perfil de OTRO usuario en pantalla
  (las marcadas con [requiere perfil visible]). Si no, responde con action type none
  explicando qué falta, ej.: "Para seguirle, abre primero su perfil."
- El cliente resuelve sobre qué perfil se actúa; tú no necesitas identificarlo.

BÚSQUEDA Y PERFILES POR NOMBRE (find_user_profile, search_content):
- SIEMPRE execute (no respondas que no puedes buscar perfiles: esa capacidad SÍ existe).
- "llévame al perfil de [nombre]", "abre el perfil de @[username]", "busca a [nombre] y
  abre su perfil" → find_user_profile con searchQuery = el nombre dicho (sin la arroba).
  La app busca al usuario; si hay varios o ninguno, ella misma se lo dirá al usuario.
- "busca [algo]", "encuentra usuarios que..." → search_content con searchQuery.
- La búsqueda de Evo cubre usuarios y clanes; no existe búsqueda de publicaciones por
  tema. Si piden "publicaciones sobre X", dilo y ofrece buscar usuarios o clanes.

ACCIONES QUE TODAVÍA NO PUEDES HACER (responde con action type none):
Votar negativo, publicar contenido POR el usuario, enviar mensajes o compartir por chat,
eliminar publicaciones, denunciar a un usuario desde su perfil, y cualquier ajuste que
no esté en la lista de acciones.
Si el usuario pide cualquiera de estas, responde EXACTAMENTE con esta idea:
"Eso todavía no puedo hacerlo por voz, pero estará disponible pronto."
"""


def _build_routes_list(manifest_routes: list[dict]) -> str:
    lines = []
    for r in manifest_routes:
        intent = str(r.get("intent", "")).strip()
        label = str(r.get("label", "")).strip()
        examples = [str(e) for e in (r.get("examples") or [])][:6]
        if not intent:
            continue
        lines.append(f"- intent='{intent}' ({label}) → ejemplos: {', '.join(examples)}")
    return "\n".join(lines)


def _build_actions_list(manifest_actions: list[dict]) -> str:
    lines = []
    for a in manifest_actions:
        intent = str(a.get("intent", "")).strip()
        label = str(a.get("label", "")).strip()
        examples = [str(e) for e in (a.get("examples") or [])][:6]
        if not intent:
            continue
        suffix = " [requiere publicación visible]" if a.get("requires_visible_post") else ""
        if a.get("requires_visible_profile"):
            suffix += " [requiere perfil visible]"
        if a.get("requires_confirmation"):
            suffix += " [requiere confirmación]"
        lines.append(f"- intent='{intent}' ({label}){suffix} → ejemplos: {', '.join(examples)}")
        confirmation = str(a.get("confirmation_message") or "").strip()
        if confirmation:
            lines.append(f"    confirmación: \"{confirmation}\"")
        params = a.get("parameters")
        if isinstance(params, dict):
            for name, desc in params.items():
                lines.append(f"    parámetro '{name}': {str(desc).strip()}")
    return "\n".join(lines)


def _build_actions_block(manifest_actions: list[dict] | None) -> str:
    """Bloque del prompt sobre acciones: lista v2 si el cliente la envía,
    o el aviso legacy de "todavía no puedo" para clientes solo-navegación."""
    actions_list = _build_actions_list(manifest_actions or [])
    if not actions_list:
        return UNSUPPORTED_ACTIONS_BLOCK_NO_ACTIONS
    return ACTIONS_BLOCK_TEMPLATE.format(actions_list=actions_list)


def _build_system_prompt(
    manifest_routes: list[dict] | None,
    current_route: str | None,
    manifest_actions: list[dict] | None = None,
) -> str:
    prompt = SYSTEM_PROMPT
    if manifest_routes:
        prompt += NAVIGATION_PROMPT_TEMPLATE.format(
            current_route=(current_route or "desconocida"),
            routes_list=_build_routes_list(manifest_routes),
            actions_block=_build_actions_block(manifest_actions),
        )
    return prompt


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


def _strip_code_fences(raw: str) -> str:
    text = raw.strip()
    if not text.startswith("```"):
        return text
    lines = text.split("\n")
    if lines and lines[0].startswith("```"):
        lines = lines[1:]
    if lines and lines[-1].strip() == "```":
        lines = lines[:-1]
    return "\n".join(lines).strip()


def _looks_like_broken_json_reply(text: str) -> bool:
    """Detecta salidas del LLM que son JSON roto/truncado — no deben leerse en voz alta."""
    t = text.strip()
    if not t:
        return False
    if t.startswith("{") or t.startswith("```"):
        return True
    if '{"reply"' in t or '"action"' in t and "{" in t:
        return True
    if t.count("{") > t.count("}") + 1:
        return True
    return False


def _fallback_reply_when_parse_fails(raw: str) -> str:
    if _looks_like_broken_json_reply(raw):
        return "No he podido procesarlo bien. ¿Puedes repetirlo con más claridad?"
    stripped = raw.strip()
    return stripped if stripped else "No he podido formular una respuesta. ¿Puedes repetirlo?"


def _extract_embedded_json(text: str) -> tuple[dict | None, str]:
    """
    El LLM a veces antepone texto al JSON ("Vamos a X.{\"reply\": ...}").
    Extrae el primer objeto JSON balanceado; devuelve (objeto, texto_previo).
    Sin esto, el reply degradaba al raw entero y el TTS leía el JSON en voz alta.
    """
    start = text.find("{")
    if start == -1:
        return None, text
    depth = 0
    in_string = False
    escaped = False
    for i in range(start, len(text)):
        ch = text[i]
        if escaped:
            escaped = False
            continue
        if ch == "\\":
            escaped = in_string
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                try:
                    data = json.loads(text[start : i + 1])
                except (json.JSONDecodeError, ValueError):
                    return None, text
                return (data, text[:start].strip()) if isinstance(data, dict) else (None, text)
    return None, text


def _parse_agent_json(
    raw: str,
    valid_intents: set[str],
    valid_action_intents: set[str] | frozenset[str] = frozenset(),
) -> tuple[str, dict | None]:
    """
    Valida la salida JSON del LLM. Si es inválida, degrada a texto plano
    sin acción (nunca ejecutar una acción dudosa).
    - 'navigate': intent debe estar en valid_intents (rutas del manifest).
    - 'execute': intent debe estar en valid_action_intents y parameters,
      si viene, debe ser un objeto.
    Returns (reply_text, action_dict_or_none).
    """
    text = _strip_code_fences(raw)
    try:
        data = json.loads(text)
    except (json.JSONDecodeError, ValueError):
        data, prefix = _extract_embedded_json(text)
        if data is None:
            return _fallback_reply_when_parse_fails(raw), None
        # El texto previo al JSON suele ser el mismo reply duplicado: ignorarlo
        # salvo que el JSON no traiga reply.
        if not str(data.get("reply", "")).strip() and prefix:
            data["reply"] = prefix

    if not isinstance(data, dict):
        return _fallback_reply_when_parse_fails(raw), None

    reply = str(data.get("reply", "")).strip()
    action_raw = data.get("action")

    if not isinstance(action_raw, dict):
        return reply or raw.strip(), None

    action_type = str(action_raw.get("type", "")).strip()
    if action_type == "navigate":
        intent = str(action_raw.get("intent", "")).strip()
        if intent and intent in valid_intents:
            return reply, {"type": "navigate", "intent": intent}
        _log.warning("voice_assistant: LLM devolvió intent inválido: %r", intent)
        return reply, None

    if action_type == "execute":
        intent = str(action_raw.get("intent", "")).strip()
        if not intent or intent not in valid_action_intents:
            _log.warning("voice_assistant: LLM devolvió action intent inválido: %r", intent)
            return reply, None
        params = action_raw.get("parameters")
        if params is not None and not isinstance(params, dict):
            _log.warning("voice_assistant: parameters no es objeto para intent %r", intent)
            return reply, None
        action: dict = {"type": "execute", "intent": intent, "parameters": params or {}}
        # Confirmación ligera (v2 Sprint 2): preservar los campos hacia el
        # cliente. Son informativos — el cliente exige la confirmación desde
        # su manifest aunque el LLM los omita.
        if action_raw.get("requireConfirmation") is True:
            action["requireConfirmation"] = True
        confirmation_message = str(action_raw.get("confirmationMessage") or "").strip()
        if confirmation_message:
            action["confirmationMessage"] = confirmation_message
        return reply, action

    # 'none' o tipo desconocido: degradar a solo respuesta hablada.
    return reply, None

# Contadores de truncamiento (proceso): % de respuestas cortadas por max_tokens.
# Sirven para decidir con datos reales si hay que subir el límite (220).
_truncation_stats = {"total_with_manifest": 0, "truncated": 0}


def _record_truncation(finish_reason: str | None) -> bool:
    _truncation_stats["total_with_manifest"] += 1
    was_truncated = finish_reason == "length"
    if was_truncated:
        _truncation_stats["truncated"] += 1
    total = _truncation_stats["total_with_manifest"]
    truncated = _truncation_stats["truncated"]
    if was_truncated:
        pct = (truncated / total) * 100 if total else 0.0
        _log.warning(
            "voice_assistant TRUNCATED response (finish_reason=length): %d/%d (%.1f%%) truncados",
            truncated, total, pct,
        )
    elif total % 50 == 0:
        pct = (truncated / total) * 100 if total else 0.0
        _log.info(
            "voice_assistant truncation stats: %d/%d (%.1f%%) truncados",
            truncated, total, pct,
        )
    return was_truncated


PREVIEW_SAMPLE_TEXT = "Hola. Soy tu asistente de voz en Evo. Así suena esta voz."


def normalize_tts_voice(voice: str | None) -> str:
    v = (voice or VOICE_ASSISTANT_TTS_VOICE).strip().lower()
    return v if v in OPENAI_TTS_VOICES else VOICE_ASSISTANT_TTS_VOICE


def run_voice_assistant_turn(
    message: str,
    voice: str | None = None,
    screen_context: str | None = None,
    current_route: str | None = None,
    manifest_routes: list[dict] | None = None,
    manifest_actions: list[dict] | None = None,
) -> tuple[str, str | None, dict | None, bool]:
    """Returns (reply_text, audio_mp3_base64_or_none, action_dict_or_none, was_truncated)."""
    text = (message or "").strip()
    if not text:
        raise ValueError("message is required")

    has_manifest = bool(manifest_routes)
    llm = OpenAIClient(model=VOICE_ASSISTANT_MODEL)
    raw, finish_reason = llm.complete_with_meta(
        system=_build_system_prompt(manifest_routes, current_route, manifest_actions),
        user=_build_user_prompt(text, screen_context=screen_context),
        language="es",
        max_tokens=320 if has_manifest else 150,
        prompt_id="voice_assistant",
    )
    raw = (raw or "").strip()

    action: dict | None = None
    was_truncated = False
    if has_manifest:
        was_truncated = _record_truncation(finish_reason)
        valid_intents = {
            str(r.get("intent", "")).strip()
            for r in (manifest_routes or [])
            if r.get("intent")
        }
        valid_action_intents = {
            str(a.get("intent", "")).strip()
            for a in (manifest_actions or [])
            if a.get("intent")
        }
        reply, action = _parse_agent_json(raw, valid_intents, valid_action_intents)
    else:
        reply = raw

    if not reply:
        reply = "No he podido formular una respuesta. ¿Puedes repetirlo?"

    audio_b64 = _synthesize_speech(reply, voice=voice)
    return reply, audio_b64, action, was_truncated


def run_voice_assistant_preview(voice: str | None = None, text: str | None = None) -> str | None:
    sample = (text or "").strip() or PREVIEW_SAMPLE_TEXT
    return _synthesize_speech(sample, voice=voice)


# CAUSA RAÍZ del cuelgue del agente (orbe en "pensando" para siempre):
# cada llamada creaba un cliente OpenAI nuevo SIN timeout (default del SDK:
# 600 s + 2 reintentos). Cuando una conexión al endpoint de TTS se quedaba
# colgada, el request retenía un thread ~10 min; los reintentos del usuario
# se acumulaban y el backend entero dejaba de responder (incluso /health).
# Fix: cliente único reutilizado + timeout corto sin reintentos — si el TTS
# falla, devolvemos None y el móvil degrada al TTS del dispositivo.
_TTS_TIMEOUT_SECONDS = 10
_tts_client = None


def _get_tts_client():
    global _tts_client
    if _tts_client is None:
        from openai import OpenAI

        kwargs: dict = {
            "api_key": API_KEY,
            "timeout": _TTS_TIMEOUT_SECONDS,
            "max_retries": 0,
        }
        if BASE_URL:
            kwargs["base_url"] = BASE_URL
        _tts_client = OpenAI(**kwargs)
    return _tts_client


def _synthesize_speech(text: str, voice: str | None = None) -> str | None:
    if not API_KEY:
        return None
    try:
        client = _get_tts_client()
    except ImportError:
        _log.warning("openai package missing — TTS skipped")
        return None

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
