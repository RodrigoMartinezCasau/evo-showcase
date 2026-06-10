"""
Tests unitarios del parser de acciones del agente de voz (sin red, sin OpenAI).

Ejecutar:  python3 test_voice_assistant_agent.py
"""
from voice_assistant import _build_system_prompt, _parse_agent_json

VALID = {"my_profile", "back", "messages"}

PASSED = 0


def check(name: str, got, expected):
    global PASSED
    assert got == expected, f"FAIL {name}: got {got!r}, expected {expected!r}"
    PASSED += 1
    print(f"  ok: {name}")


# ── JSON válido con navigate ──────────────────────────────────────────────────
check(
    "navigate válido",
    _parse_agent_json('{"reply": "Vamos.", "action": {"type": "navigate", "intent": "my_profile"}}', VALID),
    ("Vamos.", {"type": "navigate", "intent": "my_profile"}),
)

# ── JSON válido con action none ───────────────────────────────────────────────
check(
    "action none",
    _parse_agent_json('{"reply": "Nietzsche dijo eso.", "action": {"type": "none"}}', VALID),
    ("Nietzsche dijo eso.", None),
)

# ── Intent que no existe en el manifest → rechazar acción ─────────────────────
check(
    "intent inexistente",
    _parse_agent_json('{"reply": "ok", "action": {"type": "navigate", "intent": "borrar_cuenta"}}', VALID),
    ("ok", None),
)

# ── JSON malformado → degrada a texto plano sin acción ───────────────────────
check(
    "JSON roto",
    _parse_agent_json("Esto no es JSON, es prosa.", VALID),
    ("Esto no es JSON, es prosa.", None),
)

# ── Campos extra inesperados → parsea lo válido e ignora el resto ─────────────
check(
    "campos extra",
    _parse_agent_json(
        '{"reply": "Vamos.", "confidence": 0.93, "foo": [1],'
        ' "action": {"type": "navigate", "intent": "back", "speed": "fast"}}',
        VALID,
    ),
    ("Vamos.", {"type": "navigate", "intent": "back"}),
)

# ── Tipos incorrectos (intent numérico) → rechazar ────────────────────────────
check(
    "intent numérico",
    _parse_agent_json('{"reply": "ok", "action": {"type": "navigate", "intent": 42}}', VALID),
    ("ok", None),
)

# ── Manifest vacío → rechazar todas las acciones ──────────────────────────────
check(
    "manifest vacío",
    _parse_agent_json('{"reply": "ok", "action": {"type": "navigate", "intent": "my_profile"}}', set()),
    ("ok", None),
)

# ── Case sensitivity: los intents son case-sensitive por diseño ───────────────
check(
    "case sensitivity",
    _parse_agent_json('{"reply": "ok", "action": {"type": "navigate", "intent": "My_Profile"}}', VALID),
    ("ok", None),
)

# ── Code fences alrededor del JSON → se limpian ───────────────────────────────
check(
    "code fences",
    _parse_agent_json('```json\n{"reply": "Volvemos.", "action": {"type": "navigate", "intent": "back"}}\n```', VALID),
    ("Volvemos.", {"type": "navigate", "intent": "back"}),
)

# ── Texto antes/después del JSON → se extrae el objeto embebido ───────────────
# (visto con el LLM real: "Vamos a tus notificaciones.{json}" — sin el fix,
#  el TTS leía el JSON en voz alta y la navegación se perdía)
raw_mixed = 'Claro! {"reply": "Vamos.", "action": {"type": "navigate", "intent": "back"}} Espero que ayude.'
check(
    "texto alrededor del JSON",
    _parse_agent_json(raw_mixed, VALID),
    ("Vamos.", {"type": "navigate", "intent": "back"}),
)

# ── Reply duplicado antes del JSON (caso real del LLM) ────────────────────────
check(
    "reply duplicado + JSON",
    _parse_agent_json(
        'Vamos a tus notificaciones.{"reply": "Vamos a tus notificaciones.",'
        ' "action": {"type": "navigate", "intent": "back"}}',
        VALID,
    ),
    ("Vamos a tus notificaciones.", {"type": "navigate", "intent": "back"}),
)

# ── JSON embebido sin reply → usa el texto previo como reply ──────────────────
check(
    "JSON sin reply usa prefijo",
    _parse_agent_json('Volvemos. {"action": {"type": "navigate", "intent": "back"}}', VALID),
    ("Volvemos.", {"type": "navigate", "intent": "back"}),
)

# ── Llaves dentro de strings no rompen la extracción ──────────────────────────
check(
    "llaves dentro de string",
    _parse_agent_json('Nota: {"reply": "Usa {llaves} con cuidado.", "action": {"type": "none"}}', VALID),
    ("Usa {llaves} con cuidado.", None),
)

# ── Texto con llave suelta y sin JSON válido → degrada a texto plano ──────────
raw_broken = "Esto tiene una { llave suelta y nada más."
check("llave suelta sin JSON", _parse_agent_json(raw_broken, VALID), (raw_broken, None))

# ── action no-dict → sin acción, reply intacto ────────────────────────────────
check(
    "action no es objeto",
    _parse_agent_json('{"reply": "hola", "action": "navigate"}', VALID),
    ("hola", None),
)

# ── Sprint 1 (v2): acciones type execute ──────────────────────────────────────
VALID_ACTIONS = {"like_post", "unlike_post", "save_post", "unsave_post"}

check(
    "execute válido",
    _parse_agent_json(
        '{"reply": "Listo, le he dado like.", "action": {"type": "execute", "intent": "like_post", "parameters": {}}}',
        VALID,
        VALID_ACTIONS,
    ),
    ("Listo, le he dado like.", {"type": "execute", "intent": "like_post", "parameters": {}}),
)

check(
    "execute sin parameters → parameters vacíos",
    _parse_agent_json(
        '{"reply": "Hecho.", "action": {"type": "execute", "intent": "save_post"}}',
        VALID,
        VALID_ACTIONS,
    ),
    ("Hecho.", {"type": "execute", "intent": "save_post", "parameters": {}}),
)

check(
    "execute con intent inexistente → degrada a none",
    _parse_agent_json(
        '{"reply": "ok", "action": {"type": "execute", "intent": "delete_account"}}',
        VALID,
        VALID_ACTIONS,
    ),
    ("ok", None),
)

check(
    "execute sin lista de acciones válidas → degrada",
    _parse_agent_json(
        '{"reply": "ok", "action": {"type": "execute", "intent": "like_post"}}',
        VALID,
    ),
    ("ok", None),
)

check(
    "execute con parameters no-dict → degrada",
    _parse_agent_json(
        '{"reply": "ok", "action": {"type": "execute", "intent": "like_post", "parameters": [1, 2]}}',
        VALID,
        VALID_ACTIONS,
    ),
    ("ok", None),
)

check(
    "type desconocido → degrada a none",
    _parse_agent_json(
        '{"reply": "ok", "action": {"type": "self_destruct", "intent": "like_post"}}',
        VALID,
        VALID_ACTIONS,
    ),
    ("ok", None),
)

check(
    "execute con intent navigate cruzado → degrada",
    _parse_agent_json(
        '{"reply": "ok", "action": {"type": "execute", "intent": "my_profile"}}',
        VALID,
        VALID_ACTIONS,
    ),
    ("ok", None),
)

# ── System prompt: incluye navegación solo si hay manifest ────────────────────
routes = [{"intent": "my_profile", "label": "Mi perfil", "examples": ["mi perfil"]}]
with_manifest = _build_system_prompt(routes, "/feed")
without_manifest = _build_system_prompt(None, "/feed")
assert "my_profile" in with_manifest and "/feed" in with_manifest
assert "CAPACIDAD DE NAVEGACIÓN" not in without_manifest
PASSED += 1
print("  ok: system prompt condicional")

# ── System prompt: bloque de acciones condicional ──────────────────────────────
actions = [
    {
        "intent": "like_post",
        "label": "Dar like a publicación",
        "examples": ["dale like", "me gusta esto"],
        "requires_visible_post": True,
    }
]
with_actions = _build_system_prompt(routes, "/feed", actions)
assert "CAPACIDAD DE EJECUTAR ACCIONES" in with_actions
assert "like_post" in with_actions
assert "[requiere publicación visible]" in with_actions
# Con acciones disponibles, like ya NO está en la lista de no soportadas:
assert "dar o quitar like" not in with_actions
assert "Comentar, repostear, votar negativo" in with_actions
PASSED += 1
print("  ok: system prompt con acciones")

# Cliente v1 (sin manifest_actions): se mantiene el bloque legacy.
without_actions = _build_system_prompt(routes, "/feed")
assert "CAPACIDAD DE EJECUTAR ACCIONES" not in without_actions
assert "dar o quitar like" in without_actions
PASSED += 1
print("  ok: system prompt sin acciones (legacy v1)")

print(f"\n{PASSED} tests OK")
