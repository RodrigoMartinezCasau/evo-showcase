import json
import logging
import re
from typing import Any, Generator, List

from llm import OpenAIClient, translate_debate_layer_to_es, translate_debate_layer_structured_to_es
from pydantic import BaseModel


class DebateBlock(BaseModel):
    """One conceptual block: title (max 30 words) + bullets (max 20 words each)."""
    title: str
    bullets: list[str]


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
    """Translate EN to ES. Uses structured translation when layer has blocks; else flat."""
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
) -> tuple[str, str]:
    """Build (system_prompt, user_prompt) for debate layer. Shared by generate and stream."""
    has_facts = len(facts_list) > 0
    system_prompt = """You are a calm, respectful debate facilitator. Output in English.

MANDATORY OUTPUT FORMAT (structured, high-retention):
- steelman_blocks: Array of conceptual blocks. Each block has "title" (short conceptual title, max 30 words) and "bullets" (array of strings, each max 20 words, one idea per bullet). Use as many blocks as needed to cover the full argument; minimum 2 blocks.
- steelman_resumen: 1–2 sentence conclusion summarizing the core argument (no filler).
- contrarian_blocks: Same structure as steelman_blocks for the counter-position. Minimum 2 blocks.
- contrarian_resumen: 1–2 sentence conclusion summarizing the counter-argument.
- socratic_questions: Array of 3–7 questions. First = main Socratic question (specific).

STYLE RULES:
- Titles: conceptual, not descriptive sentences. Max 30 words each.
- Bullets: one idea per bullet, max 20 words. No long paragraphs. No filler transitions ("therefore", "moreover we can observe that").
- Keep argument density high and intellectual tone serious. Do not reduce conceptual rigor or oversimplify.
- NO final conclusions in the blocks; reserve synthesis for the resumen only.
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
    facts_block = _format_scientific_facts_block(facts_list)
    user_prompt = f"""USER QUESTION (respond to THIS specific question):
"{user_message}"

Topic: {topic}
Detected stance: {stance}
Facts summary: {facts_summary}
{memory_block}
{facts_block + chr(10) + chr(10) if facts_block else ""}
{contrarian_instruction}

Generate debate_layer JSON:
{{
  "steelman_blocks": [
    {{ "title": "Short conceptual title (max 30 words)", "bullets": ["Bullet idea (max 20 words)", "Bullet idea", ...] }},
    ...
  ],
  "steelman_resumen": "1–2 sentence conclusion summarizing the core argument.",
  "contrarian_blocks": [
    {{ "title": "Short conceptual title (max 30 words)", "bullets": ["Bullet idea (max 20 words)", ...] }},
    ...
  ],
  "contrarian_resumen": "1–2 sentence conclusion summarizing the counter-argument.",
  "counterarguments": ["Counterargument 1", "Counterargument 2", ...],
  "socratic_questions": ["Main Socratic question (specific)", "Question 2", "Question 3", ...],
  "where_contrarian_might_fail": ["Limit 1", "Limit 2", ...]
}}

REQUIREMENTS:
- steelman_blocks and contrarian_blocks: at least 2 blocks each. Titles max 30 words; bullets max 20 words each. One idea per bullet.
- steelman_resumen and contrarian_resumen: 1–2 sentences each. No filler.
- socratic_questions: 3–7 items. First = main Socratic question (specific).
- where_contrarian_might_fail: Acknowledge limits.
- NO generic filler. GROUNDING: Base arguments on the provided Scientific Facts only; do not introduce new empirical claims. If no facts were provided, state explicitly that science does not provide direct empirical facts on this question.
- Output ONLY JSON, no markdown."""
    return system_prompt, user_prompt


def generate_debate_layer(
    topic: str,
    user_message: str,
    stance: str,
    facts_summary: str,
    scientific_facts: list[dict] | None = None,
    llm_client: OpenAIClient | None = None,
    debate_memory: dict | None = None,
    response_language: str = "en",
) -> DebateLayer:
    """
    Generate debate_layer using LLM. Always generates in English (canonical).
    Opinion and Counterpoint MUST be grounded in scientific_facts when provided; no new empirical claims.
    If response_language == "es", translates to Spanish with strict richness preservation.
    """
    if llm_client is None:
        llm_client = OpenAIClient()
    facts_list = scientific_facts if scientific_facts is not None else []
    system_prompt, user_prompt = _build_debate_prompts(
        topic, user_message, stance, facts_summary, facts_list, debate_memory
    )
    full_prompt = system_prompt + "\n\n" + user_prompt
    _assert_prompt_uses_user_text(full_prompt, user_message)

    try:
        from llm import MAX_TOKENS_DEBATE
        # Always generate in English (canonical)
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
            # Translate to Spanish if needed
            if response_language == "es":
                return _translate_and_validate_es(debate_layer, llm_client)
            return debate_layer

        logger.warning("DebateLayer validation failed, attempting repair")
        return _repair_debate_layer(
            topic, user_message, stance, facts_summary, facts_list, llm_client, "Validation failed", response_language
        )

    except Exception as e:
        logger.error(f"Error generating debate_layer: {e}", exc_info=True)
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
    then {"type": "done", "layer": DebateLayer}. Same logic as generate_debate_layer; delivery only is streamed.
    """
    if llm_client is None:
        llm_client = OpenAIClient()
    facts_list = scientific_facts if scientific_facts is not None else []
    system_prompt, user_prompt = _build_debate_prompts(
        topic, user_message, stance, facts_summary, facts_list, debate_memory
    )
    _assert_prompt_uses_user_text(system_prompt + "\n\n" + user_prompt, user_message)
    from llm import MAX_TOKENS_DEBATE
    accumulated: list[str] = []
    try:
        for chunk in llm_client.complete_stream(
            system=system_prompt, user=user_prompt, language=None, max_tokens=MAX_TOKENS_DEBATE, prompt_id="DEBATE_EN"
        ):
            accumulated.append(chunk)
            yield {"type": "delta", "content": chunk}
        raw_response = "".join(accumulated)
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
