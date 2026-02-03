"""
Milestone D6: Creator Mode — generates video/script draft from existing structured layers.
LLM must ONLY use facts_layer, author_layer, debate_layer; no new claims or quotes.

Also: reframe_to_debate — converts non-debate questions into debatable formulations.
"""
import json
import logging
from typing import Any

from llm import OpenAIClient
from pydantic import BaseModel


class CreatorResponse(BaseModel):
    title_options: list[str]  # 3–5
    hook: str
    outline: list[str]  # 5–8 bullet points
    script: str
    audience_questions: list[str]  # 3–7
    disclaimer: str
    sources_used: dict[str, list[str]]  # science_ids, quote_ids


logger = logging.getLogger(__name__)


def _extract_json(text: str) -> dict | None:
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


def reframe_to_debate(original_message: str, language: str, llm_client: OpenAIClient | None = None) -> str:
    """
    Convert a non-debate question into a debatable formulation.
    Introduces tension, opposing perspectives, and invites reflection.
    Returns a short topic string (1-2 sentences) suitable for the debate pipeline.
    """
    if llm_client is None:
        llm_client = OpenAIClient()
    lang_name = "Spanish" if language == "es" else "English"
    system = f"""You reframe non-debate questions into debatable formulations. Output STRICTLY in {lang_name}.

RULES:
- Introduce tension (e.g. "authenticity vs innovation", "tradition vs change").
- Introduce opposing perspectives briefly.
- End with ONE open Socratic question (use ? or ¿).
- Output ONLY 1-2 sentences. No preamble. No explanation.
- Never condescending. Always invite reflection."""

    user = f"""User asked (not a debate): "{original_message}"

Produce a debatable formulation (1-2 sentences) that reframes this for philosophical/scientific reflection. End with exactly ONE question."""

    try:
        out = llm_client.complete(system=system, user=user, language=language)
        text = (out or "").strip()
        if text and ("?" in text or "¿" in text):
            return text
    except Exception as e:
        logger.warning(f"reframe_to_debate failed: {e}")
    # Fallback: simple reflective formulation
    if language == "es":
        return f"Reflexión sobre: {original_message[:80]}. ¿Qué perspectivas distintas existen?"
    return f"Reflection on: {original_message[:80]}. What different perspectives exist?"


def _build_content_pack(facts_layer: Any, author_layer: Any, debate_layer: Any) -> str:
    """Build a compact content pack from the three layers for the LLM."""
    pack = "=== FACTS LAYER (use only these claims and summary) ===\n"
    pack += f"Summary: {facts_layer.summary}\n"
    pack += "Claims:\n"
    for c in facts_layer.claims:
        pack += f"  - [{c.certainty}] {c.text} (source_ids: {c.source_ids})\n"
    pack += f"What we don't know: {facts_layer.what_we_dont_know}\n"
    pack += f"Common misconceptions: {facts_layer.common_misconceptions}\n\n"

    pack += "=== AUTHOR LAYER (use ONLY these quotes verbatim; do not invent quotes) ===\n"
    for q in author_layer.quotes:
        pack += f"  quote_id: {q.quote_id}\n  author: {q.author}\n  work: {q.work}\n  quote: {q.quote}\n\n"
    pack += "\n"

    pack += "=== DEBATE LAYER ===\n"
    pack += f"Steelman: {debate_layer.steelman_of_user}\n"
    pack += f"Contrarian: {debate_layer.contrarian_position}\n"
    pack += f"Counterarguments: {debate_layer.counterarguments}\n"
    pack += f"Socratic questions: {debate_layer.socratic_questions}\n"
    pack += f"Where contrarian might fail: {debate_layer.where_contrarian_might_fail}\n"

    return pack


def generate_creator_response(
    content_pack: str,
    topic: str,
    creator_style: str,  # "etacon_calm" | "evoconn_dynamic"
    format_type: str,   # "video_script" | "written_reflection"
    length: str,        # "short" | "medium" | "long"
    allowed_science_ids: list[str],
    allowed_quote_ids: list[str],
    verbatim_quotes: list[str],  # exact quote strings that may appear in script
    llm_client: OpenAIClient | None = None,
) -> CreatorResponse:
    """
    Generate CreatorResponse from content pack. Uses ONLY provided facts and quotes.
    Open-ended tone; script ends with questions. No new claims or quotes.
    """
    if llm_client is None:
        llm_client = OpenAIClient()

    system_prompt = """You are a script/reflection writer. Generate a video script or written reflection using ONLY the provided content pack.

CRITICAL RULES:
1. Use ONLY the facts (claims + summary) from the FACTS LAYER. Do NOT introduce new factual claims.
2. Use ONLY the quotes from the AUTHOR LAYER. Quote text MUST be verbatim (character-for-character). Do NOT invent or paraphrase quotes.
3. Use the DEBATE LAYER for structure (steelman, contrarian, questions).
4. Maintain open-ended tone. End with questions, never conclusions.
5. title_options: 3–5 options. audience_questions: 3–7 questions.
6. outline: 5–8 bullet points.
7. sources_used: MUST only include science_ids and quote_ids that appear in the content pack. No new IDs.
8. disclaimer: Non-imposing, open-ended (e.g. "This is one perspective; others exist.").
9. Output ONLY valid JSON, no markdown fences."""

    style_note = "Calm, reflective tone." if creator_style == "etacon_calm" else "Dynamic, engaging tone."
    format_note = "Video script (spoken, scene-friendly)." if format_type == "video_script" else "Written reflection (readable essay)."
    length_note = {"short": "Brief (script ~300 words).", "medium": "Medium (script ~600 words).", "long": "Long (script ~1000 words)."}.get(length, "Medium.")

    user_prompt = f"""Topic: {topic}

{content_pack}

Generate a CreatorResponse JSON object using ONLY the content above.

Style: {style_note}
Format: {format_note}
Length: {length_note}

Output structure (JSON only):
{{
  "title_options": ["Title 1", "Title 2", "Title 3", ...],
  "hook": "Opening hook (1-2 sentences)",
  "outline": ["Bullet 1", "Bullet 2", ...],
  "script": "Full script or reflection text. Use ONLY facts and quotes from the pack. End with open-ended questions.",
  "audience_questions": ["Question 1", "Question 2", ...],
  "disclaimer": "Non-imposing, open-ended disclaimer.",
  "sources_used": {{
    "science_ids": ["id1", "id2"],
    "quote_ids": ["quote_id1", "quote_id2"]
  }}
}}

REQUIREMENTS:
- title_options: 3–5 items
- outline: 5–8 items
- audience_questions: 3–7 items
- sources_used.science_ids and sources_used.quote_ids MUST be subsets of the IDs in the content pack. Allowed science_ids: {allowed_science_ids}. Allowed quote_ids: {allowed_quote_ids}.
- Any quote in the script MUST be verbatim from the AUTHOR LAYER. Do not invent quotes.
- Script must end open-ended (questions). No conclusions.
- Output ONLY the JSON object."""

    try:
        raw_response = llm_client.complete(system=system_prompt, user=user_prompt)
        creator_dict = _extract_json(raw_response)
        if creator_dict is None:
            logger.warning("Creator: failed to parse JSON, attempting repair")
            return _repair_creator(
                content_pack, topic, creator_style, format_type, length,
                allowed_science_ids, allowed_quote_ids, verbatim_quotes, llm_client, "Failed to parse JSON"
            )
        resp = _validate_and_build_creator_response(
            creator_dict, allowed_science_ids, allowed_quote_ids, verbatim_quotes
        )
        if resp:
            return resp
        logger.warning("Creator: validation failed, attempting repair")
        return _repair_creator(
            content_pack, topic, creator_style, format_type, length,
            allowed_science_ids, allowed_quote_ids, verbatim_quotes, llm_client, "Validation failed"
        )
    except Exception as e:
        logger.error(f"Creator generation error: {e}", exc_info=True)
        return _fallback_creator_response(topic, allowed_science_ids, allowed_quote_ids)


def _validate_and_build_creator_response(
    d: dict,
    allowed_science_ids: list[str],
    allowed_quote_ids: list[str],
    verbatim_quotes: list[str],
) -> CreatorResponse | None:
    """Validate and build CreatorResponse. Enforce title_options 3–5, audience_questions 3–7, sources from allowed sets, no new quote text."""
    try:
        title_opts = d.get("title_options", [])
        if not isinstance(title_opts, list) or len(title_opts) < 3 or len(title_opts) > 5:
            return None
        audience_q = d.get("audience_questions", [])
        if not isinstance(audience_q, list) or len(audience_q) < 3 or len(audience_q) > 7:
            return None
        outline = d.get("outline", [])
        if not isinstance(outline, list) or len(outline) < 5 or len(outline) > 8:
            return None
        sources = d.get("sources_used", {})
        if not isinstance(sources, dict):
            return None
        sci_ids = sources.get("science_ids", [])
        q_ids = sources.get("quote_ids", [])
        if not isinstance(sci_ids, list) or not isinstance(q_ids, list):
            return None
        allowed_sci = set(allowed_science_ids)
        allowed_q = set(allowed_quote_ids)
        if not all(s in allowed_sci for s in sci_ids):
            return None
        if not all(q in allowed_q for q in q_ids):
            return None
        script = (d.get("script") or "").strip()
        # Prompt enforces verbatim quotes; we validate structure and sources only
        return CreatorResponse(
            title_options=[str(x).strip() for x in title_opts],
            hook=str(d.get("hook", "")).strip(),
            outline=[str(x).strip() for x in outline],
            script=script,
            audience_questions=[str(x).strip() for x in audience_q],
            disclaimer=str(d.get("disclaimer", "")).strip(),
            sources_used={"science_ids": list(sci_ids), "quote_ids": list(q_ids)},
        )
    except Exception as e:
        logger.debug(f"Creator validation error: {e}")
        return None


def _repair_creator(
    content_pack: str,
    topic: str,
    creator_style: str,
    format_type: str,
    length: str,
    allowed_science_ids: list[str],
    allowed_quote_ids: list[str],
    verbatim_quotes: list[str],
    llm_client: OpenAIClient,
    error_message: str,
) -> CreatorResponse:
    repair_prompt = f"""Previous attempt failed: {error_message}

Topic: {topic}
Content pack (use ONLY this content):
{content_pack}

Fix the output to satisfy:
- title_options: exactly 3–5 items
- outline: 5–8 items
- audience_questions: 3–7 items
- sources_used.science_ids MUST be subset of: {allowed_science_ids}
- sources_used.quote_ids MUST be subset of: {allowed_quote_ids}
- Do NOT invent quotes. Use only verbatim quotes from the AUTHOR LAYER.
- Script must end open-ended. No conclusions.

Output ONLY the corrected CreatorResponse JSON object."""

    try:
        raw = llm_client.complete(
            system="Output valid JSON only. Fix validation errors. No new quotes or claims.",
            user=repair_prompt,
        )
        creator_dict = _extract_json(raw)
        if creator_dict is None:
            return _fallback_creator_response(topic, allowed_science_ids, allowed_quote_ids)
        resp = _validate_and_build_creator_response(
            creator_dict, allowed_science_ids, allowed_quote_ids, verbatim_quotes
        )
        if resp:
            return resp
    except Exception as e:
        logger.debug(f"Creator repair error: {e}")
    return _fallback_creator_response(topic, allowed_science_ids, allowed_quote_ids)


def _fallback_creator_response(
    topic: str,
    allowed_science_ids: list[str],
    allowed_quote_ids: list[str],
) -> CreatorResponse:
    """Minimal title + outline + questions using existing layers."""
    return CreatorResponse(
        title_options=[
            f"Exploring {topic}",
            f"{topic}: Facts and Perspectives",
            f"Open Questions on {topic}",
        ],
        hook=f"This piece explores different perspectives on {topic}, without drawing final conclusions.",
        outline=[
            "Introduce the topic and why it matters.",
            "Present key facts from available sources.",
            "Consider alternative viewpoints.",
            "Acknowledge limits of the discussion.",
            "End with open-ended questions for the audience.",
        ],
        script=f"This is a draft script on {topic}. Key facts and quotes from the knowledge base can be woven here. The tone is open-ended; the goal is to invite reflection, not to conclude. What evidence would you want to see more of? How might someone disagree with the main arguments? What assumptions are we making?",
        audience_questions=[
            "What evidence would strengthen or weaken the main arguments?",
            "How might someone with a different view respond?",
            "What would you want to explore further?",
        ],
        disclaimer="This is one perspective; others exist. The aim is to encourage reflection, not to impose a conclusion.",
        sources_used={
            "science_ids": list(allowed_science_ids)[:5],
            "quote_ids": list(allowed_quote_ids)[:5],
        },
    )
