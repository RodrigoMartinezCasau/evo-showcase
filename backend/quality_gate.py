"""
Quality gate for assistant main reply. Ensures steelman + contrapoint + ONE question.
Prevents conclusive language. One repair attempt, then fallback.
"""
import re

FORBIDDEN_PHRASES_ES = [
    r"\bla\s+verdad\s+es\b",
    r"\bpor\s+tanto\s+debemos\s+concluir\b",
    r"\besto\s+demuestra\s+que\b",
    r"\bestá\s+comprobado\b",
    r"\bdefinitivamente\s+(es|no)\b",
    r"\babsolutamente\s+(correcto|incorrecto)\b",
    # Generic filler (trigger repair to get substantive content)
    r"\bplantea\s+cuestiones\b",
    r"\bmerecen\s+consideración\b",
    r"\bconviene\s+seguir\s+explorando\b",
    r"\botras\s+perspectivas\s+podrían\s+matizar\b",
]

FORBIDDEN_PHRASES_EN = [
    r"\bthe\s+truth\s+is\b",
    r"\btherefore\s+we\s+must\s+conclude\b",
    r"\bthis\s+proves?\s+that\b",
    r"\bit\s+is\s+proven\b",
    r"\bdefinitely\s+(right|wrong)\b",
    r"\babsolutely\s+(correct|incorrect)\b",
]

# Multiple question marks or multiple question sentences
MULTI_QUESTION_PATTERN = re.compile(r"[?¿].*[?¿]", re.DOTALL)

# Spanish: too short / generic check (triggers expand)
SPANISH_GENERIC_PHRASES = [
    "conviene seguir explorando",
    "merecen consideración",
    "otras perspectivas",
    "plantea cuestiones",
    "seguir examinando",
]
MIN_SPANISH_WORD_COUNT = 120


def is_spanish_response_too_short_or_generic(steelman: str, contrarian: str) -> bool:
    """
    True if Spanish response is too short or generic. Use to trigger one expand retry.
    - (position + counterpoint) < 120 words, OR
    - Contains generic phrase AND is short (< 150 words).
    """
    combined = f"{steelman or ''} {contrarian or ''}".strip()
    words = [w for w in combined.split() if w]
    word_count = len(words)
    if word_count < MIN_SPANISH_WORD_COUNT:
        return True
    combined_lower = combined.lower()
    for phrase in SPANISH_GENERIC_PHRASES:
        if phrase in combined_lower and word_count < 150:
            return True
    return False


def _has_multiple_questions(text: str) -> bool:
    """True if text appears to have more than one question."""
    if not text:
        return False
    q_count = text.count("?") + text.count("¿")
    return q_count > 1


def _has_forbidden(text: str, lang: str) -> bool:
    phrases = FORBIDDEN_PHRASES_ES if lang == "es" else FORBIDDEN_PHRASES_EN
    t = (text or "").lower()
    return any(re.search(p, t, re.IGNORECASE) for p in phrases)


def validate_main_reply(
    steelman: str,
    contrarian: str,
    next_question: str,
    lang: str,
) -> list[str]:
    """
    Validate main reply structure. Returns list of error messages (empty if OK).
    """
    errors = []
    steelman = (steelman or "").strip()
    contrarian = (contrarian or "").strip()
    next_question = (next_question or "").strip()

    if not steelman or len(steelman) < 10:
        errors.append("steelman_too_short")
    if not contrarian or len(contrarian) < 10:
        errors.append("contrarian_too_short")
    if not next_question or "?" not in next_question and "¿" not in next_question:
        errors.append("no_question")

    if _has_multiple_questions(next_question):
        errors.append("multiple_questions")

    if _has_forbidden(steelman, lang):
        errors.append("forbidden_in_steelman")
    if _has_forbidden(contrarian, lang):
        errors.append("forbidden_in_contrarian")
    if _has_forbidden(next_question, lang):
        errors.append("forbidden_in_question")

    return errors


def fallback_main_reply(topic: str, lang: str) -> tuple[str, str, str]:
    """Safe fallback: substantive steelman, contrapoint, one Socratic question. No boilerplate phrases."""
    if lang == "es":
        # Avoid boilerplate: "Tu reflexión... conecta con debates", "Popper", "multiverso" etc.
        steelman = (
            f"Tu pregunta sobre {topic} merece una lectura caritativa. "
            "La posición más fuerte distingue entre lo que podemos establecer empíricamente "
            "y las cuestiones que trascienden la observación. "
            "Quienes defienden esta postura podrían argumentar que la coherencia interna de los marcos teóricos "
            "ofrece un tipo de apoyo racional distinto al de la verificación directa. "
            "Además, la inferencia a la mejor explicación admite distintas interpretaciones razonables "
            "dependiendo de los criterios epistémicos que uno privilegie."
        )
        contrarian = (
            "Un contrapunto riguroso señalaría los límites de la evidencia empírica "
            "y la carga de la prueba en afirmaciones existenciales. "
            "También cabría considerar las alternativas explicativas que no apelan a causas trascendentes "
            "y que pueden dar cuenta de los mismos fenómenos con mayor parsimonia. "
            "El naturalismo metodológico, por ejemplo, exige que las explicaciones se mantengan "
            "dentro de lo falsable y verificable."
        )
        question = f"¿Qué evidencia o razonamiento modificaría tu posición sobre {topic}?"
    else:
        steelman = (
            f"Your question about {topic} deserves a charitable interpretation. "
            "The strongest version of this position distinguishes between what we can establish empirically "
            "and questions that transcend direct observation. "
            "Proponents might argue that the internal coherence of theoretical frameworks "
            "provides a form of rational support distinct from direct verification. "
            "Moreover, inference to the best explanation admits different reasonable interpretations "
            "depending on which epistemic criteria one prioritizes."
        )
        contrarian = (
            "A rigorous counterpoint would highlight the limits of empirical evidence "
            "and the burden of proof in existential claims. "
            "One might also consider alternative explanations that do not appeal to transcendent causes "
            "and can account for the same phenomena with greater parsimony. "
            "Methodological naturalism, for instance, requires that explanations remain "
            "within what is falsifiable and verifiable."
        )
        question = f"What evidence or reasoning would change your position on {topic}?"
    return steelman, contrarian, question


def repair_main_reply(
    topic: str,
    user_message: str,
    steelman: str,
    contrarian: str,
    next_question: str,
    errors: list[str],
    lang: str,
) -> tuple[str, str, str] | None:
    """
    One repair attempt via LLM. Returns (steelman, contrarian, question) or None if failed.
    """
    try:
        from llm import OpenAIClient
        llm = OpenAIClient()
        err_desc = ", ".join(errors)
        lang_name = "Spanish" if lang == "es" else "English"
        extra_rules = (
            " NO generic filler (prohibido: 'plantea cuestiones', 'merecen consideración', "
            "'conviene seguir explorando', 'otras perspectivas podrían matizar'). "
            "steelman y contrarian: 5–10 líneas cada uno, contenido concreto (menciona ideas: "
            "método científico, falsabilidad, ajuste fino, límites de la ciencia). "
            "question: UNA pregunta específica y socrática."
            if lang == "es"
            else " NO generic filler (forbidden: 'raises questions', 'worth considering', "
            "'multiple perspectives', 'worth exploring'). "
            "steelman and contrarian: 5–10 sentences each, substantive content (mention specific ideas: "
            "scientific method, falsifiability, fine-tuning, limits of science). "
            "question: ONE specific Socratic question."
        )
        prompt = f"""Fix this debate reply. Topic: {topic}
User message: {user_message[:300]}

Current (has errors: {err_desc}):
- Steelman: {steelman[:200]}
- Contrarian: {contrarian[:200]}
- Question: {next_question[:150]}

Rules: Exactly ONE open-ended question. No conclusive phrases. Calm tone. Output in {lang_name}.{extra_rules}
Return JSON only: {{"steelman": "...", "contrarian": "...", "question": "..."}}
"""
        raw = llm.complete(system="Output valid JSON only.", user=prompt, language=lang)
        import json
        raw = raw.strip()
        if raw.startswith("```"):
            raw = re.sub(r"^```\w*\n?", "", raw)
            raw = re.sub(r"\n?```$", "", raw)
        data = json.loads(raw)
        s = (data.get("steelman") or "").strip()
        c = (data.get("contrarian") or "").strip()
        q = (data.get("question") or "").strip()
        if s and c and q and ("?" in q or "¿" in q):
            new_errors = validate_main_reply(s, c, q, lang)
            if not new_errors:
                return (s, c, q)
    except Exception:
        pass
    return None
