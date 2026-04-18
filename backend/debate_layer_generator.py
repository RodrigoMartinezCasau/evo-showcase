import json
import logging
import re
from typing import Any, Generator, List

from llm import OpenAIClient, translate_debate_layer_to_es, translate_debate_layer_structured_to_es, translate_debate_layer_star_format_to_es
from pydantic import BaseModel


class DebateBlock(BaseModel):
    """One conceptual block: title (max 30 words) + bullets (max 20 words each)."""
    title: str
    bullets: list[str]


# Structured debate output (Postura / Contrapostura / Pregunta) with titled points and bullets
class BulletPoint(BaseModel):
    text: str


class ArgumentPoint(BaseModel):
    index: int
    title: str
    bullets: list[BulletPoint]


class StructuredSection(BaseModel):
    section_title: str
    points: list[ArgumentPoint] = []
    quick_summary: str
    body: str = ""


class QuestionSection(BaseModel):
    section_title: str
    socratic_question: str


class DebateLayer(BaseModel):
    steelman_of_user: str
    contrarian_position: str
    counterarguments: list[str]
    socratic_questions: list[str]
    where_contrarian_might_fail: list[str]
    # Optional structured format for high-retention display (blocks + resumen).
    steelman_blocks: list[DebateBlock] | None = None
    steelman_resumen: str | None = None
    contrarian_blocks: list[DebateBlock] | None = None
    contrarian_resumen: str | None = None
    # New structured format: stance/counter/question with points and bullets (star layout)
    stance_section: StructuredSection | None = None
    counter_section: StructuredSection | None = None
    question_section: QuestionSection | None = None
    # Short conversational intro rendered before the analysis sections
    conversational_intro: str | None = None


logger = logging.getLogger(__name__)

# Stance keywords for heuristic detection (case-insensitive)
STANCE_KEYWORDS = {
    "theist": ["believe in god", "belief in god", "faith", "theist", "theism", "creator", "divine", "religious"],
    "atheist": ["don't believe", "do not believe", "no god", "atheist", "atheism", "no evidence for god"],
    "agnostic": ["agnostic", "don't know", "do not know", "uncertain", "unsure", "can't know", "cannot know"],
}


def detect_stance(user_stance: str | None, user_message: str) -> str:
    """
    Detect stance: use user_stance if provided, else infer from user_message.
    Returns one of: "theist", "atheist", "agnostic", "balanced", "unknown".
    """
    if user_stance and (user_stance or "").strip():
        s = (user_stance or "").strip().lower()
        if s in ("theist", "atheist"):
            return s
        if s in ("agnostic", "unknown"):
            return "balanced"  # Use balanced contrarian for agnostic/unknown
        return "balanced"
    # Infer from message
    msg = (user_message or "").lower()
    for stance, keywords in STANCE_KEYWORDS.items():
        if any(kw in msg for kw in keywords):
            if stance == "agnostic":
                return "balanced"
            return stance
    return "balanced"


def _extract_json(text: str) -> dict | None:
    """Extract JSON from LLM response, handling markdown code fences."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return None


def _assert_prompt_uses_user_text(full_prompt: str, user_text: str) -> None:
    """Log warning if user_text is not found in prompt (helps debug template copying)."""
    if not user_text or not user_text.strip():
        return
    u = user_text.strip().lower()
    if len(u) < 5:
        return
    chunk = u[:50] if len(u) > 50 else u
    prompt_lower = full_prompt.lower()
    if chunk not in prompt_lower and u[:20] not in prompt_lower:
        logger.warning("Prompt may not include user text. User input (first 50 chars): %s", user_text[:50])


def _is_spanish_rich(en_steelman: str, en_contrarian: str, es_steelman: str, es_contrarian: str) -> bool:
    """Check if Spanish translation preserved richness (length + no banned phrases)."""
    # Length check: ES >= 85% of EN
    en_len = len(en_steelman) + len(en_contrarian)
    es_len = len(es_steelman) + len(es_contrarian)
    if es_len < 0.85 * en_len:
        return False
    # Banned generic openers (if present, translation is too generic)
    es_combined = (es_steelman + " " + es_contrarian).lower()
    banned = ["merece una lectura", "conecta con debates", "conviene seguir explorando", "tu reflexión sobre"]
    for b in banned:
        if b in es_combined:
            return False
    return True


def _repair_spanish_richness(
    en_layer: DebateLayer,
    es_layer: DebateLayer,
    llm_client: OpenAIClient,
) -> DebateLayer | None:
    """One repair pass: expand Spanish to match English specificity/density."""
    system = """Your job: rewrite the Spanish so it matches the English in specificity and density.

RULES:
- Do not add new claims not in EN; you may unpack/clarify what's already implied.
- Keep structure: Position / Counterpoint / One Question.
- Length target: within ±10% of English length.
- Output natural Spanish with same depth as English.
- Return ONLY JSON: steelman_of_user, contrarian_position, counterarguments, socratic_questions, where_contrarian_might_fail."""

    user = f"""English (canonical):
steelman: {en_layer.steelman_of_user}
contrarian: {en_layer.contrarian_position}

Spanish (current, needs expansion):
steelman: {es_layer.steelman_of_user}
contrarian: {es_layer.contrarian_position}

Rewrite Spanish to match English density. Output JSON only."""

    try:
        raw = llm_client.complete(system=system, user=user, language=None, max_tokens=1500)
        raw = (raw or "").strip()
        if raw.startswith("```"):
            lines = raw.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            raw = "\n".join(lines)
        data = json.loads(raw)
        return DebateLayer(
            steelman_of_user=str(data.get("steelman_of_user", es_layer.steelman_of_user)).strip(),
            contrarian_position=str(data.get("contrarian_position", es_layer.contrarian_position)).strip(),
            counterarguments=[str(x).strip() for x in data.get("counterarguments", es_layer.counterarguments)],
            socratic_questions=[str(x).strip() for x in data.get("socratic_questions", es_layer.socratic_questions)],
            where_contrarian_might_fail=[str(x).strip() for x in data.get("where_contrarian_might_fail", es_layer.where_contrarian_might_fail)],
        )
    except Exception as e:
        logger.debug("Repair Spanish richness failed: %s", e)
        return None


def _translate_and_validate_es(en_layer: DebateLayer, llm_client: OpenAIClient) -> DebateLayer:
    """Translate EN to ES. Uses star-format translation when layer has stance_section/counter_section/question_section; else blocks; else flat."""
    if en_layer.stance_section and en_layer.counter_section and en_layer.question_section:
        stance_d = en_layer.stance_section.model_dump()
        counter_d = en_layer.counter_section.model_dump()
        question_d = en_layer.question_section.model_dump()
        translated = translate_debate_layer_star_format_to_es(
            stance_d,
            counter_d,
            question_d,
            en_layer.counterarguments,
            en_layer.where_contrarian_might_fail,
            llm_client,
        )
        if not translated:
            logger.warning("Star-format translation to ES failed, returning EN debate_layer")
            return en_layer
        stance_es_d, counter_es_d, question_es_d, counter_es, wcf_es = translated
        stance_sec_es = StructuredSection.model_validate(stance_es_d)
        counter_sec_es = StructuredSection.model_validate(counter_es_d)
        question_sec_es = QuestionSection.model_validate(question_es_d)
        flat_steelman = _derived_flat_from_stance_section(stance_sec_es)
        flat_contrarian = _derived_flat_from_stance_section(counter_sec_es)
        sq_es = [
            question_sec_es.socratic_question,
            "¿Qué haría cambiar tu postura?",
            "¿Qué supuestos estás asumiendo?",
        ]
        return DebateLayer(
            steelman_of_user=flat_steelman,
            contrarian_position=flat_contrarian,
            counterarguments=counter_es,
            socratic_questions=sq_es,
            where_contrarian_might_fail=wcf_es,
            stance_section=stance_sec_es,
            counter_section=counter_sec_es,
            question_section=question_sec_es,
        )
    if en_layer.steelman_blocks and en_layer.steelman_resumen and en_layer.contrarian_blocks and en_layer.contrarian_resumen:
        sb = [{"title": b.title, "bullets": b.bullets} for b in en_layer.steelman_blocks]
        cb = [{"title": b.title, "bullets": b.bullets} for b in en_layer.contrarian_blocks]
        translated = translate_debate_layer_structured_to_es(
            sb,
            en_layer.steelman_resumen,
            cb,
            en_layer.contrarian_resumen,
            en_layer.counterarguments,
            en_layer.socratic_questions,
            en_layer.where_contrarian_might_fail,
            llm_client,
        )
        if not translated:
            logger.warning("Structured translation to ES failed, returning EN debate_layer")
            return en_layer
        sb_es, sr_es, cb_es, cr_es, counter_es, sq_es, wcf_es = translated
        steelman_blocks_es = [DebateBlock(title=b["title"], bullets=b["bullets"]) for b in sb_es]
        contrarian_blocks_es = [DebateBlock(title=b["title"], bullets=b["bullets"]) for b in cb_es]
        flat_steelman = _derived_flat_from_structured(sb_es, sr_es)
        flat_contrarian = _derived_flat_from_structured(cb_es, cr_es)
        return DebateLayer(
            steelman_of_user=flat_steelman,
            contrarian_position=flat_contrarian,
            counterarguments=counter_es,
            socratic_questions=sq_es,
            where_contrarian_might_fail=wcf_es,
            steelman_blocks=steelman_blocks_es,
            steelman_resumen=sr_es,
            contrarian_blocks=contrarian_blocks_es,
            contrarian_resumen=cr_es,
        )
    translated = translate_debate_layer_to_es(
        en_layer.steelman_of_user,
        en_layer.contrarian_position,
        en_layer.counterarguments,
        en_layer.socratic_questions,
        en_layer.where_contrarian_might_fail,
        llm_client,
    )
    if not translated:
        logger.warning("Translation to ES failed, returning EN debate_layer")
        return en_layer

    es_layer = DebateLayer(
        steelman_of_user=translated[0],
        contrarian_position=translated[1],
        counterarguments=translated[2],
        socratic_questions=translated[3],
        where_contrarian_might_fail=translated[4],
    )

    if not _is_spanish_rich(
        en_layer.steelman_of_user,
        en_layer.contrarian_position,
        es_layer.steelman_of_user,
        es_layer.contrarian_position,
    ):
        logger.info("Spanish translation too short/abstract, attempting repair")
        repaired = _repair_spanish_richness(en_layer, es_layer, llm_client)
        if repaired:
            return repaired
        logger.warning("Repair failed, returning original translation")

    return es_layer


# Phrases that suggest conclusive language (to reject)
CONCLUSIVE_PATTERNS = [
    r"\b(therefore|thus|hence)\s+(we\s+)?(must|should|conclude)\b",
    r"\b(the\s+)?(truth|answer)\s+is\b",
    r"\b(definitely|certainly|absolutely)\s+(wrong|right|true|false)\b",
    r"\b(proven|disproven|proved|disproved)\b",
    r"\b(in\s+conclusion|to\s+conclude|in\s+summary)\b",
    r"\b(this\s+proves?|that\s+proves?)\b",
]


def _has_conclusive_language(text: str) -> bool:
    """Check if text contains conclusive language (case-insensitive)."""
    t = (text or "").lower()
    for pat in CONCLUSIVE_PATTERNS:
        if re.search(pat, t, re.IGNORECASE):
            return True
    return False


MAX_TITLE_WORDS = 30
MIN_BULLETS_PER_POINT = 1
MAX_BULLETS_PER_POINT = 5
MIN_BULLET_LEN = 30


def _word_count(s: str) -> int:
    return len((s or "").strip().split())


def _derived_flat_from_stance_section(section: StructuredSection) -> str:
    """Derive flat paragraph from structured stance/counter section for fallback display."""
    parts = []
    if section.points:
        for p in section.points:
            if (p.title or "").strip():
                parts.append((p.title or "").strip())
            for b in p.bullets:
                t = (getattr(b, "text", b) if isinstance(b, BulletPoint) else str(b)).strip()
                if t:
                    parts.append("• " + t)
    elif (section.body or "").strip():
        parts.append(section.body.strip())
    if (section.quick_summary or "").strip():
        parts.append("RESUMEN RÁPIDO → " + (section.quick_summary or "").strip())
    return "\n".join(parts)


def _build_structured_debate_prompts(
    topic: str,
    user_message: str,
    stance: str,
    facts_summary: str,
    facts_list: list[dict],
    debate_memory: dict | None,
    chat_history: list[dict] | None = None,
) -> tuple[str, str]:
    """Build (system_prompt, user_prompt) for StructuredDebateOutput (stance/counter/question with points and bullets)."""
    has_facts = len(facts_list) > 0
    system_prompt = """You are a calm, respectful debate facilitator. You are generating a debate response. Output ONLY JSON that follows the schema below.

LANGUAGE (MANDATORY): All text values in the JSON — titles, bullets, quick_summary, socratic_question — MUST be written in Spanish. Do NOT use English anywhere, not even inside a single bullet.

CONTEXT HANDLING (CRITICAL):
- If the prompt includes a [Recent conversation …] block, the user's CURRENT message may be a follow-up (e.g. "¿qué opinas?", "desarrolla eso", "no estoy de acuerdo", "y si lo miramos al revés", "explica más", "pero entonces…").
- In that case, the real subject is whatever the previous user reflection was about, and the new message is asking you to extend, react to, or push back on it.
- You MUST treat the previous user reflection as the actual topic and produce stance/counter/question that continue that thread.
- Do NOT generate a generic debate about the literal short follow-up phrase.

RULES:
- Do NOT invent new arguments. Do NOT remove arguments. Only reorganize and articulate.
- stance.points and counter.points: organize the content into NUMBERED THEMATIC POINTS. Each point is a distinct idea or angle within the argument.
  * First, mentally draft the full argument.
  * Then, split it into 3–6 thematic points (use as many as the content demands — no padding, no filler).
  * Each point has a short, specific TITLE (3–8 words) that names the concrete idea — NOT generic labels like "Key Consideration" or "Important Factor".
  * Each point has 1–3 BULLETS. Each bullet is ONE concise sentence that adds a unique idea. No repetition, no paraphrasing the title, no filler.
  * Bullets must be intellectually dense: each one should teach, reveal, or reframe something.
- stance.quick_summary and counter.quick_summary: 1–2 sentences summarizing each section.
- question.socratic_question: 1 sentence that invites reflection (Socratic question).
- Maintain language: output in English.
- Include counterarguments and where_contrarian_might_fail as arrays (same as before).
- QUALITY: Do NOT produce empty or generic points. Every point must correspond to a real idea from the reflection. Every bullet must contribute something new.

SCHEMA (StructuredDebateOutput):
{
  "stance": {
    "section_title": "TU POSTURA (EN SU MEJOR VERSIÓN)",
    "points": [
      { "index": 1, "title": "Specific Idea Name", "bullets": [{ "text": "One concise sentence with a unique idea." }, { "text": "Another distinct insight." }] },
      { "index": 2, "title": "Another Angle", "bullets": [{ "text": "..." }] }
    ],
    "quick_summary": "1–2 sentence summary"
  },
  "counter": {
    "section_title": "CONTRAPOSTURA",
    "points": [
      { "index": 1, "title": "...", "bullets": [{ "text": "..." }] }
    ],
    "quick_summary": "..."
  },
  "question": { "section_title": "PREGUNTA PARA TI", "socratic_question": "..." },
  "counterarguments": ["...", ...],
  "where_contrarian_might_fail": ["...", ...]
}

Return ONLY valid JSON, no markdown."""
    if has_facts:
        system_prompt += "\n\nGROUNDING (STRICT): Your arguments MUST be based on the provided Scientific Facts. You may interpret them, but you may NOT introduce new empirical claims."
    else:
        system_prompt += "\n\nGROUNDING (STRICT): No relevant scientific facts were provided. stance and counter MUST explicitly state that science does not provide direct empirical facts on this question where appropriate."
    contrarian_instruction = (
        "Adopt a clear contrarian position that challenges the user's view."
        if stance not in ("agnostic", "unknown", "balanced")
        else "Offer a balanced critique that considers multiple perspectives without favoring one side."
    )
    memory_block = ""
    if debate_memory:
        terms = debate_memory.get("key_terms", [])
        assumptions = debate_memory.get("assumptions", [])
        prev_stance = debate_memory.get("user_stance")
        if terms or assumptions or prev_stance:
            memory_block = "\n[Previous debate context]\n"
            if prev_stance:
                memory_block += f"- User's stance: {prev_stance}\n"
            if terms:
                memory_block += f"- Key terms: {', '.join(terms[:8])}\n"
            if assumptions:
                memory_block += f"- Assumptions: {'; '.join(assumptions[:5])}\n"
    history_block = _format_chat_history_block(chat_history)
    facts_block = _format_scientific_facts_block(facts_list)
    user_prompt = f"""topic: {topic}
user_message: {user_message}
Detected stance: {stance}
Facts summary: {facts_summary}
{memory_block}
{history_block}
{facts_block + chr(10) + chr(10) if facts_block else ""}
{contrarian_instruction}

Generate the JSON for StructuredDebateOutput. Return ONLY valid JSON, no markdown."""
    return system_prompt, user_prompt


def _validate_structured_debate(debate_dict: dict) -> tuple[StructuredSection, StructuredSection, QuestionSection] | None:
    """Validate debate_dict as StructuredDebateOutput. Accepts prose (body) or legacy (points) format."""
    try:
        stance = debate_dict.get("stance")
        counter = debate_dict.get("counter")
        question = debate_dict.get("question")
        if not isinstance(stance, dict) or not isinstance(counter, dict) or not isinstance(question, dict):
            return None

        def to_bullet_list(items: list) -> list[BulletPoint]:
            out = []
            for b in items:
                if isinstance(b, dict):
                    t = (b.get("text") or "").strip()
                else:
                    t = str(b).strip()
                if t:
                    out.append(BulletPoint(text=t))
            return out

        def to_argument_points(items: list) -> list[ArgumentPoint]:
            out = []
            for i, p in enumerate(items):
                if not isinstance(p, dict):
                    continue
                idx = p.get("index")
                if idx is None:
                    idx = i + 1
                title = (p.get("title") or "").strip() or "..."
                blist = to_bullet_list(p.get("bullets") or [])
                if len(blist) < MIN_BULLETS_PER_POINT:
                    continue
                out.append(ArgumentPoint(index=int(idx), title=title, bullets=blist))
            return out

        def build_section(section: dict, default_title: str) -> StructuredSection | None:
            st = (section.get("section_title") or "").strip() or default_title
            qs = (section.get("quick_summary") or "").strip()
            if not qs:
                return None
            pts = section.get("points")
            if isinstance(pts, list) and len(pts) >= 1:
                arg_points = to_argument_points(pts)
                if len(arg_points) >= 1:
                    return StructuredSection(
                        section_title=st,
                        points=arg_points,
                        quick_summary=qs,
                    )
            body = (section.get("body") or "").strip()
            if body and len(body) >= 50:
                return StructuredSection(
                    section_title=st,
                    body=body,
                    quick_summary=qs,
                )
            return None

        stance_sec = build_section(stance, "TU POSTURA (EN SU MEJOR VERSIÓN)")
        counter_sec = build_section(counter, "CONTRAPOSTURA")
        if stance_sec is None or counter_sec is None:
            return None

        sq = (question.get("socratic_question") or "").strip()
        if not sq or "\n" in sq:
            return None
        question_sec = QuestionSection(
            section_title=(question.get("section_title") or "").strip() or "PREGUNTA PARA TI",
            socratic_question=sq,
        )
        if _has_conclusive_language(stance_sec.quick_summary) or _has_conclusive_language(counter_sec.quick_summary):
            return None
        if _has_conclusive_language(sq):
            return None
        return (stance_sec, counter_sec, question_sec)
    except Exception as e:
        logger.debug("Structured debate validation error: %s", e)
        return None


def _format_chat_history_block(chat_history: list[dict] | None) -> str:
    """
    Format the recent chat turns as a compact context block for the LLM prompt.
    Keeps the last N messages; each message is truncated to avoid prompt bloat.
    Returns an empty string when history is empty or None.
    """
    if not chat_history:
        return ""
    MAX_CHARS_PER_MSG = 300
    lines = ["[Recent conversation — use for continuity; latest user message takes priority]"]
    for m in chat_history:
        role = (m.get("role") or "unknown").capitalize()
        content = (m.get("content") or "").strip()
        if len(content) > MAX_CHARS_PER_MSG:
            content = content[:MAX_CHARS_PER_MSG] + "…"
        lines.append(f"{role}: {content}")
    lines.append("---")
    return "\n".join(lines)


def _format_scientific_facts_block(scientific_facts: list[dict]) -> str:
    """Format selected scientific facts as a structured list for the prompt."""
    if not scientific_facts:
        return ""
    lines = ["=== Scientific Facts (use these only; do not invent empirical claims) ==="]
    for i, f in enumerate(scientific_facts, 1):
        fid = f.get("id") or f"fact_{i}"
        claim = (f.get("claim") or "").strip()
        source = (f.get("source_name") or "").strip()
        field = (f.get("field") or "").strip()
        parts = [f"[{i}] id: {fid}", f"claim: {claim}"]
        if source:
            parts.append(f"source: {source}")
        if field:
            parts.append(f"field: {field}")
        lines.append("\n".join(parts))
    return "\n\n".join(lines)


def _build_debate_prompts(
    topic: str,
    user_message: str,
    stance: str,
    facts_summary: str,
    facts_list: list[dict],
    debate_memory: dict | None,
    chat_history: list[dict] | None = None,
) -> tuple[str, str]:
    """Build (system_prompt, user_prompt) for debate layer. Shared by generate and stream."""
    has_facts = len(facts_list) > 0
    system_prompt = """You are a calm, respectful debate facilitator. Output ONLY in Spanish. Every word of every field must be in Spanish — no English, not even partial.

CONTEXT HANDLING (CRITICAL):
- If the prompt includes a [Recent conversation …] block, the user's CURRENT message may be a follow-up (e.g. "what do you think?", "develop that", "I disagree", "explain more", "but then…").
- Treat the previous user reflection as the real subject and continue that thread; do NOT debate the literal short follow-up phrase as if it were a fresh standalone topic.

MANDATORY STRUCTURE:
1. steelman_of_user: Present the user's view in its strongest form. Minimum 2 distinct arguments with reasoning. Aim: ~200–350 words. One or two continuous paragraphs, not bullet points. Formal, reflective tone.
2. contrarian_position: Adopt a contrarian position. Minimum 2 distinct counterarguments with reasoning. Aim: ~150–280 words. One or two continuous paragraphs, not bullet points.
3. socratic_questions: First question MUST be specific and Socratic. Total 3–7 questions. Exactly 1 main question.

HARD RULES:
- Output detailed, not summary. Address the user's specific question.
- At least 2 concrete argumentative moves per side.
- NO final conclusions. Tone: calm, non-polemical, open.
- NO generic filler: "raises questions worth considering", "worth exploring further", "multiple perspectives".
- NO bullet points or mini-section titles inside steelman_of_user or contrarian_position.
- socratic_questions: 3-7 items. First is main question."""
    if has_facts:
        system_prompt += """

GROUNDING (STRICT): Your arguments MUST be based on the provided Scientific Facts. You may interpret them, but you may NOT introduce new empirical claims. Do not add facts or data that are not in the list."""
    else:
        system_prompt += """

GROUNDING (STRICT): No relevant scientific facts were provided for this question. The steelman_of_user and contrarian_position MUST explicitly state that science does not provide direct empirical facts on this question. Do not invent empirical claims."""
    contrarian_instruction = (
        "Adopt a clear contrarian position that challenges the user's view."
        if stance not in ("agnostic", "unknown", "balanced")
        else "Offer a balanced critique that considers multiple perspectives without favoring one side."
    )
    memory_block = ""
    if debate_memory:
        terms = debate_memory.get("key_terms", [])
        assumptions = debate_memory.get("assumptions", [])
        prev_stance = debate_memory.get("user_stance")
        if terms or assumptions or prev_stance:
            memory_block = "\n[Previous debate context - use to avoid repetition, stay consistent]\n"
            if prev_stance:
                memory_block += f"- User's evolving stance: {prev_stance}\n"
            if terms:
                memory_block += f"- Key terms already discussed: {', '.join(terms[:8])}\n"
            if assumptions:
                memory_block += f"- Assumptions noted: {'; '.join(assumptions[:5])}\n"
    history_block = _format_chat_history_block(chat_history)
    facts_block = _format_scientific_facts_block(facts_list)
    user_prompt = f"""USER QUESTION (respond to THIS specific question):
"{user_message}"

Topic: {topic}
Detected stance: {stance}
Facts summary: {facts_summary}
{memory_block}
{history_block}
{facts_block + chr(10) + chr(10) if facts_block else ""}
{contrarian_instruction}

Generate debate_layer JSON:
{{
  "steelman_of_user": "Strongest version of user's position (respectful, accurate, essay-style paragraphs)",
  "contrarian_position": "Contrarian or balanced critique (respectful, no conclusions, essay-style paragraphs)",
  "counterarguments": ["Counterargument 1", "Counterargument 2", ...],
  "socratic_questions": ["Question 1", "Question 2", "Question 3", ...],
  "where_contrarian_might_fail": ["Limit 1", "Limit 2", ...]
}}

REQUIREMENTS:
- steelman_of_user: ~200–350 words. 1–3 continuous paragraphs. No bullets, no mini-titles. Reference user's specific wording.
- contrarian_position: ~150–280 words. 1–2 continuous paragraphs. No bullets, no mini-titles.
- socratic_questions: 3–7 items. First = main Socratic question (specific).
- where_contrarian_might_fail: Acknowledge limits.
- NO generic filler. GROUNDING: Base arguments on the provided Scientific Facts only; do not introduce new empirical claims. If no facts were provided, state explicitly that science does not provide direct empirical facts on this question.
- Output ONLY JSON, no markdown."""
    return system_prompt, user_prompt


def _generate_conversational_intro(
    user_message: str,
    llm_client: OpenAIClient,
    response_language: str = "en",
    chat_history: list[dict] | None = None,
) -> str | None:
    """
    Generate a HUMAN, context-specific conversational intro that reacts to
    the user's reflection. 3–5 lines, one idea per line. Must reference the
    actual content of the user's message, not generic vague reactions.
    """
    lang_instruction = (
        "Write in natural, everyday Spanish."
        if response_language == "es"
        else "Write in natural, everyday English."
    )
    system = f"""You are a thoughtful friend reacting to something the user just told you. Your reply must feel HUMAN, SPECIFIC to what they said, and NEVER GENERIC.

LENGTH:
- 3 to 5 short lines.
- Around 30–60 words total.
- One idea per line. Use real line breaks (\\n).

CONTENT — THIS IS THE MOST IMPORTANT RULE:
- You MUST mention the actual SUBJECT of what the user wrote (a key word, the dilemma they posed, the feeling they expressed, the contradiction they pointed at, etc.).
- DO NOT write a generic reaction that could fit ANY message. If your intro could be pasted under a different reflection without changing meaning, it is WRONG.
- Show you understood the *specific* thing they said, then briefly hint at the tension/angle worth exploring.

BANNED PATTERNS — never end a line with these crutches:
- "¿no?"  ← strictly forbidden
- "¿verdad?"
- "¿cierto?"
- "¿sabes?"
- "right?"
- "you know?"
Also never start with: "Esa pregunta…", "Vaya, qué…", "Es interesante cómo…", "Tu reflexión…", "Lo que planteas…", "As an AI…", "I understand that…".

TONE:
- Warm, intelligent, curious — like a friend who actually thought about what you said for 5 seconds before replying.
- No teacher voice. No "vamos a analizar". No headings.
- Don't repeat the user's words verbatim; rephrase the substance.
- Don't introduce your own conclusion yet; just react and frame.

LANGUAGE: {lang_instruction}

GOOD EXAMPLES (match this *style and specificity*, never the words):

User wrote about whether to choose a partner who can't change vs one who's too easily influenced:
→
Curiosa esa elección entre la rigidez y la maleabilidad.
Las dos opciones parecen extremas, y quizá por eso incomodan.
Una niega el crecimiento, la otra disuelve la identidad.
Ahí hay algo más profundo sobre qué buscamos en el otro.

User wrote a vague rant about feeling stuck:
→
Suena a esa sensación de estar parado mientras todo lo demás se mueve.
No siempre es falta de dirección — a veces es exceso de opciones invisibles.
Vale la pena mirar de dónde viene esa quietud.

User asked a simple question (not really a reflection):
→
Más que una reflexión, esto parece una pregunta directa.
Pero tiene fondo: detrás de ella hay un supuesto sobre cómo funcionan las cosas.
Vamos a desarmarla un poco antes de responder.

FOLLOW-UPS (CRITICAL):
- If the user's CURRENT message is short or refers to something already said (e.g. "¿qué opinas?", "desarrolla eso", "no estoy de acuerdo", "y si lo miramos al revés", "eso no me convence", "explica más"), it IS a follow-up to the prior conversation.
- In that case you MUST treat the previous user reflection (from the recent chat history below) as the actual subject. Do NOT say "esto no parece una reflexión" — it IS a reflection that continues the previous one.
- Mention or echo the SUBJECT of the previous reflection, not the literal short follow-up phrase.

Return ONLY the intro text. No quotes, no JSON, no labels."""
    history_block = _format_chat_history_block(chat_history)
    if history_block:
        user = (
            f"{history_block}\n\n"
            f"User's CURRENT message (may be a follow-up; resolve it using the history above):\n"
            f"\"\"\"\n{user_message.strip()}\n\"\"\""
        )
    else:
        user = f"User's message:\n\"\"\"\n{user_message.strip()}\n\"\"\""
    try:
        result = llm_client.complete(
            system=system,
            user=user,
            language=None,
            max_tokens=120,  # intro is short (3-5 lines, ~30-60 words)
            prompt_id="CONVERSATIONAL_INTRO",
        )
        intro = (result or "").strip()
        # Strip surrounding quotes if the model wrapped the response
        if intro.startswith('"') and intro.endswith('"') and len(intro) > 1:
            intro = intro[1:-1].strip()
        # Post-process: strip the banned tag-question crutches if the model slipped them in
        for crutch in ("¿no?", "¿verdad?", "¿cierto?", "¿sabes?", "right?", "you know?"):
            # Only strip when it appears as a trailing tag at end of a line
            intro = re.sub(rf",?\s*{re.escape(crutch)}\s*$", ".", intro, flags=re.MULTILINE | re.IGNORECASE)
        intro = intro.strip()
        return intro if intro else None
    except Exception as e:
        logger.warning("Failed to generate conversational_intro: %s", e)
        return None


def generate_debate_layer(
    topic: str,
    user_message: str,
    stance: str,
    facts_summary: str,
    scientific_facts: list[dict] | None = None,
    llm_client: OpenAIClient | None = None,
    debate_memory: dict | None = None,
    response_language: str = "en",
    chat_history: list[dict] | None = None,
    skip_intro: bool = False,
) -> DebateLayer:
    """
    Generate debate_layer using LLM. Always generates in English (canonical).
    Tries structured output (stance/counter/question with points and bullets) first; falls back to essay format if invalid.
    If response_language == "es", translates to Spanish with strict richness preservation.
    """
    if llm_client is None:
        llm_client = OpenAIClient()
    facts_list = scientific_facts if scientific_facts is not None else []
    from llm import MAX_TOKENS_DEBATE

    # 1) Try structured prompt first
    system_structured, user_structured = _build_structured_debate_prompts(
        topic, user_message, stance, facts_summary, facts_list, debate_memory, chat_history
    )
    full_structured = system_structured + "\n\n" + user_structured
    _assert_prompt_uses_user_text(full_structured, user_message)

    try:
        raw_response = llm_client.complete(
            system=system_structured, user=user_structured, language=None, max_tokens=MAX_TOKENS_DEBATE, prompt_id="DEBATE_STRUCTURED"
        )
        debate_dict = _extract_json(raw_response)

        if debate_dict is not None:
            structured_triple = _validate_structured_debate(debate_dict)
            if structured_triple:
                stance_sec, counter_sec, question_sec = structured_triple
                flat_steelman = _derived_flat_from_stance_section(stance_sec)
                flat_contrarian = _derived_flat_from_stance_section(counter_sec)
                counter = [str(x).strip() for x in debate_dict.get("counterarguments", [])]
                wcf = [str(x).strip() for x in debate_dict.get("where_contrarian_might_fail", [])]
                sq_list = [
                    question_sec.socratic_question,
                    "¿Qué cambiaría tu perspectiva sobre esto?",
                    "¿Qué suposiciones estás haciendo?",
                ]
                intro = (
                    None
                    if skip_intro
                    else _generate_conversational_intro(user_message, llm_client, response_language, chat_history=chat_history)
                )
                debate_layer = DebateLayer(
                    steelman_of_user=flat_steelman,
                    contrarian_position=flat_contrarian,
                    counterarguments=counter if counter else ["See counter section above."],
                    socratic_questions=sq_list,
                    where_contrarian_might_fail=wcf if wcf else [],
                    stance_section=stance_sec,
                    counter_section=counter_sec,
                    question_section=question_sec,
                    conversational_intro=intro,
                )
                if response_language == "es":
                    translated = _translate_and_validate_es(debate_layer, llm_client)
                    # intro is already in the correct language (generated with response_language)
                    translated.conversational_intro = intro
                    return translated
                return debate_layer
        # 2) Fallback: essay-style prompt and validation
        logger.info("Structured debate validation failed or missing; using essay prompt")
        system_prompt, user_prompt = _build_debate_prompts(
            topic, user_message, stance, facts_summary, facts_list, debate_memory, chat_history
        )
        full_prompt = system_prompt + "\n\n" + user_prompt
        _assert_prompt_uses_user_text(full_prompt, user_message)
        raw_response = llm_client.complete(
            system=system_prompt, user=user_prompt, language=None, max_tokens=MAX_TOKENS_DEBATE, prompt_id="DEBATE_EN"
        )
        debate_dict = _extract_json(raw_response)
        if debate_dict is None:
            logger.warning("Failed to parse LLM JSON for debate_layer, attempting repair")
            return _repair_debate_layer(
                topic, user_message, stance, facts_summary, facts_list, llm_client, "Failed to parse JSON", response_language
            )
        debate_layer = _validate_and_build_debate_layer(debate_dict)
        if debate_layer:
            intro = (
                None
                if skip_intro
                else _generate_conversational_intro(user_message, llm_client, response_language, chat_history=chat_history)
            )
            debate_layer.conversational_intro = intro
            if response_language == "es":
                translated = _translate_and_validate_es(debate_layer, llm_client)
                translated.conversational_intro = intro
                return translated
            return debate_layer
        logger.warning("DebateLayer validation failed, attempting repair")
        return _repair_debate_layer(
            topic, user_message, stance, facts_summary, facts_list, llm_client, "Validation failed", response_language
        )
    except Exception as e:
        logger.error("Error generating debate_layer: %s", e, exc_info=True)
        return _fallback_debate_layer(user_message, response_language, llm_client)


def generate_debate_layer_stream(
    topic: str,
    user_message: str,
    stance: str,
    facts_summary: str,
    scientific_facts: list[dict] | None = None,
    llm_client: OpenAIClient | None = None,
    debate_memory: dict | None = None,
    response_language: str = "en",
) -> Generator[dict[str, Any], None, None]:
    """
    Stream debate layer: yield {"type": "delta", "content": chunk} for each LLM chunk,
    then {"type": "done", "layer": DebateLayer}. Tries structured output first, then essay fallback.
    """
    if llm_client is None:
        llm_client = OpenAIClient()
    facts_list = scientific_facts if scientific_facts is not None else []
    from llm import MAX_TOKENS_DEBATE
    system_prompt, user_prompt = _build_structured_debate_prompts(
        topic, user_message, stance, facts_summary, facts_list, debate_memory
    )
    _assert_prompt_uses_user_text(system_prompt + "\n\n" + user_prompt, user_message)
    accumulated: list[str] = []
    try:
        for chunk in llm_client.complete_stream(
            system=system_prompt, user=user_prompt, language=None, max_tokens=MAX_TOKENS_DEBATE, prompt_id="DEBATE_STRUCTURED"
        ):
            accumulated.append(chunk)
            yield {"type": "delta", "content": chunk}
        raw_response = "".join(accumulated)
        debate_dict = _extract_json(raw_response)
        if debate_dict is not None:
            structured_triple = _validate_structured_debate(debate_dict)
            if structured_triple:
                stance_sec, counter_sec, question_sec = structured_triple
                flat_steelman = _derived_flat_from_stance_section(stance_sec)
                flat_contrarian = _derived_flat_from_stance_section(counter_sec)
                counter = [str(x).strip() for x in debate_dict.get("counterarguments", [])]
                wcf = [str(x).strip() for x in debate_dict.get("where_contrarian_might_fail", [])]
                sq_list = [
                    question_sec.socratic_question,
                    "¿Qué cambiaría tu perspectiva sobre esto?",
                    "¿Qué suposiciones estás haciendo?",
                ]
                debate_layer = DebateLayer(
                    steelman_of_user=flat_steelman,
                    contrarian_position=flat_contrarian,
                    counterarguments=counter if counter else ["See counter section above."],
                    socratic_questions=sq_list,
                    where_contrarian_might_fail=wcf if wcf else [],
                    stance_section=stance_sec,
                    counter_section=counter_sec,
                    question_section=question_sec,
                )
                if response_language == "es":
                    debate_layer = _translate_and_validate_es(debate_layer, llm_client)
                yield {"type": "done", "layer": debate_layer}
                return
        # Fallback: essay prompt
        system_essay, user_essay = _build_debate_prompts(
            topic, user_message, stance, facts_summary, facts_list, debate_memory
        )
        raw_response = llm_client.complete(
            system=system_essay, user=user_essay, language=None, max_tokens=MAX_TOKENS_DEBATE, prompt_id="DEBATE_EN"
        )
        debate_dict = _extract_json(raw_response)
        if debate_dict is None:
            logger.warning("Failed to parse LLM JSON for debate_layer (stream), attempting repair")
            layer = _repair_debate_layer(
                topic, user_message, stance, facts_summary, facts_list, llm_client, "Failed to parse JSON", response_language
            )
            yield {"type": "done", "layer": layer}
            return
        debate_layer = _validate_and_build_debate_layer(debate_dict)
        if debate_layer:
            if response_language == "es":
                debate_layer = _translate_and_validate_es(debate_layer, llm_client)
            yield {"type": "done", "layer": debate_layer}
            return
        logger.warning("DebateLayer validation failed (stream), attempting repair")
        layer = _repair_debate_layer(
            topic, user_message, stance, facts_summary, facts_list, llm_client, "Validation failed", response_language
        )
        yield {"type": "done", "layer": layer}
    except Exception as e:
        logger.error("Error in generate_debate_layer_stream: %s", e, exc_info=True)
        layer = _fallback_debate_layer(user_message, response_language, llm_client)
        yield {"type": "done", "layer": layer}


def _derived_flat_from_structured(blocks: list[dict], resumen: str) -> str:
    """Derive flat paragraph from structured blocks + resumen for backward compat."""
    parts = []
    for b in blocks:
        title = (b.get("title") or "").strip()
        bullets = b.get("bullets") or []
        if title:
            parts.append(title)
        for bl in bullets:
            if (bl or "").strip():
                parts.append("• " + str(bl).strip())
    if (resumen or "").strip():
        parts.append("RESUMEN RÁPIDO → " + str(resumen).strip())
    return "\n".join(parts)


def _validate_and_build_debate_layer(debate_dict: dict) -> DebateLayer | None:
    """Validate debate_dict and build DebateLayer. Accepts structured (blocks + resumen) or flat format."""
    try:
        sq = debate_dict.get("socratic_questions", [])
        if not isinstance(sq, list) or len(sq) < 3 or len(sq) > 7:
            return None
        sq_clean = [str(x).strip() for x in sq]
        counter = [str(x).strip() for x in debate_dict.get("counterarguments", [])]
        wcf = [str(x).strip() for x in debate_dict.get("where_contrarian_might_fail", [])]

        # Structured format (preferred)
        sb = debate_dict.get("steelman_blocks")
        sr = (debate_dict.get("steelman_resumen") or "").strip()
        cb = debate_dict.get("contrarian_blocks")
        cr = (debate_dict.get("contrarian_resumen") or "").strip()
        if isinstance(sb, list) and len(sb) >= 1 and isinstance(cb, list) and len(cb) >= 1 and sr and cr:
            steelman_blocks_pydantic: list[DebateBlock] = []
            for b in sb:
                if not isinstance(b, dict):
                    continue
                title = (b.get("title") or "").strip()
                bullets = [str(x).strip() for x in (b.get("bullets") or []) if str(x).strip()]
                if title or bullets:
                    steelman_blocks_pydantic.append(DebateBlock(title=title or "...", bullets=bullets))
            contrarian_blocks_pydantic: list[DebateBlock] = []
            for b in cb:
                if not isinstance(b, dict):
                    continue
                title = (b.get("title") or "").strip()
                bullets = [str(x).strip() for x in (b.get("bullets") or []) if str(x).strip()]
                if title or bullets:
                    contrarian_blocks_pydantic.append(DebateBlock(title=title or "...", bullets=bullets))
            if steelman_blocks_pydantic and contrarian_blocks_pydantic:
                flat_steelman = _derived_flat_from_structured(
                    [{"title": b.title, "bullets": b.bullets} for b in steelman_blocks_pydantic], sr
                )
                flat_contrarian = _derived_flat_from_structured(
                    [{"title": b.title, "bullets": b.bullets} for b in contrarian_blocks_pydantic], cr
                )
                if _has_conclusive_language(flat_steelman) or _has_conclusive_language(flat_contrarian):
                    return None
                for q in sq_clean:
                    if _has_conclusive_language(q):
                        return None
                return DebateLayer(
                    steelman_of_user=flat_steelman,
                    contrarian_position=flat_contrarian,
                    counterarguments=counter,
                    socratic_questions=sq_clean,
                    where_contrarian_might_fail=wcf,
                    steelman_blocks=steelman_blocks_pydantic,
                    steelman_resumen=sr,
                    contrarian_blocks=contrarian_blocks_pydantic,
                    contrarian_resumen=cr,
                )
        # Flat format (legacy)
        for key in ["steelman_of_user", "contrarian_position"]:
            if key not in debate_dict:
                return None
        flat_steelman = str(debate_dict["steelman_of_user"]).strip()
        flat_contrarian = str(debate_dict["contrarian_position"]).strip()
        if _has_conclusive_language(flat_steelman) or _has_conclusive_language(flat_contrarian):
            return None
        for q in sq_clean:
            if _has_conclusive_language(q):
                return None
        return DebateLayer(
            steelman_of_user=flat_steelman,
            contrarian_position=flat_contrarian,
            counterarguments=counter,
            socratic_questions=sq_clean,
            where_contrarian_might_fail=wcf,
        )
    except Exception as e:
        logger.debug(f"DebateLayer validation error: {e}")
        return None


def _repair_debate_layer(
    topic: str,
    user_message: str,
    stance: str,
    facts_summary: str,
    scientific_facts: list[dict],
    llm_client: OpenAIClient,
    error_message: str,
    response_language: str = "en",
) -> DebateLayer:
    """Repair in EN, then translate to ES if needed. Uses same grounding rules as main generation."""
    has_facts = len(scientific_facts) > 0
    grounding_note = (
        "Base arguments on the provided Scientific Facts only; do not introduce new empirical claims."
        if has_facts
        else "No scientific facts provided; steelman and contrarian MUST state that science does not provide direct empirical facts on this question."
    )
    facts_block = _format_scientific_facts_block(scientific_facts)
    repair_prompt = f"""Previous attempt failed: {error_message}

Topic: {topic}
User message: {user_message}
Stance: {stance}
Facts summary: {facts_summary}
{facts_block + chr(10) + chr(10) if facts_block else ""}
VALIDATION ERRORS TO FIX:
- socratic_questions MUST have 3-7 items.
- NO conclusive language.
- Tone: calm, respectful, open.
- GROUNDING: {grounding_note}

LENGTH (do not shorten): steelman_of_user ~120–220 words, contrarian_position ~90–180 words. Multiple paragraphs per section. Detailed arguments, not summaries.

Generate CORRECTED JSON (English):
{{
  "steelman_of_user": "...",
  "contrarian_position": "...",
  "counterarguments": ["...", ...],
  "socratic_questions": ["...", "...", "...", ...],
  "where_contrarian_might_fail": ["...", ...]
}}

Output ONLY JSON, no markdown."""

    try:
        from llm import MAX_TOKENS_DEBATE
        raw_response = llm_client.complete(
            system="Output valid JSON. Fix errors. English output.",
            user=repair_prompt,
            language=None,
            max_tokens=MAX_TOKENS_DEBATE,
        )
        debate_dict = _extract_json(raw_response)
        if debate_dict is None:
            return _fallback_debate_layer(user_message, response_language, llm_client)
        debate_layer = _validate_and_build_debate_layer(debate_dict)
        if debate_layer:
            if response_language == "es":
                return _translate_and_validate_es(debate_layer, llm_client)
            return debate_layer
    except Exception as e:
        logger.debug(f"Repair failed: {e}")
    return _fallback_debate_layer(user_message, response_language, llm_client)


def _fallback_debate_layer(
    user_message: str, response_language: str = "en", llm_client: OpenAIClient | None = None
) -> DebateLayer:
    """Fallback DebateLayer. Always EN; translate to ES if needed."""
    en_layer = DebateLayer(
        steelman_of_user=(
            f"A charitable reading of your position: {user_message}. "
            "You raise important questions that deserve careful consideration from multiple angles. "
            "The strongest version of this view distinguishes between what can be established empirically "
            "and questions that transcend direct observation. "
            "Proponents might argue that the internal coherence of theoretical frameworks "
            "provides a form of rational support distinct from direct verification. "
            "Moreover, inference to the best explanation admits different reasonable interpretations "
            "depending on which epistemic criteria one prioritizes."
        ),
        contrarian_position=(
            "A rigorous counterpoint would highlight the limits of empirical evidence "
            "and the burden of proof in existential claims. "
            "One might also consider alternative explanations that do not appeal to transcendent causes "
            "and can account for the same phenomena with greater parsimony. "
            "Methodological naturalism, for instance, requires that explanations remain "
            "within what is falsifiable and verifiable. "
            "This critique does not settle the matter but invites further examination."
        ),
        counterarguments=[
            "Alternative interpretations of the evidence exist and may be equally coherent.",
            "Different epistemic frameworks may lead to different but equally defensible conclusions.",
            "It may be valuable to consider objections from viewpoints that prioritize different criteria.",
        ],
        socratic_questions=[
            "What evidence or reasoning would change your position on this topic?",
            "How might someone who disagrees respond to your strongest argument?",
            "What assumptions are you making, and are they shared by everyone?",
        ],
        where_contrarian_might_fail=[
            "The contrarian critique may not apply equally in all cases.",
            "Some objections may be less relevant to your specific formulation.",
        ],
    )
    if response_language == "es" and llm_client:
        return _translate_and_validate_es(en_layer, llm_client)
    return en_layer
