import json
import logging
import re

from kb_loader import KBLoader
from kb_schemas import KBDomain
from llm import LLMClient, OpenAIClient
from schemas import Domain, PhysicalSpec

logger = logging.getLogger(__name__)

# Singleton KBLoader instance
_kb_loader: KBLoader | None = None


def _get_kb_loader() -> KBLoader:
    global _kb_loader
    if _kb_loader is None:
        _kb_loader = KBLoader()
    return _kb_loader


def _domain_to_kb_domain(domain: Domain) -> KBDomain | None:
    """Map PhysicalSpec Domain to KBDomain."""
    mapping = {
        Domain.MECHANICS: KBDomain.MECHANICS,
        Domain.THERMODYNAMICS: KBDomain.THERMODYNAMICS,
        Domain.ELECTROMAGNETISM: KBDomain.ELECTROMAGNETISM,
        Domain.QUANTUM_MECHANICS: KBDomain.QUANTUM,
    }
    return mapping.get(domain)

# JSON block in markdown or raw
JSON_BLOCK_RE = re.compile(r"```(?:json)?\s*([\s\S]*?)```", re.IGNORECASE)


def _extract_json(text: str) -> str | None:
    m = JSON_BLOCK_RE.search(text)
    if m:
        return m.group(1).strip()
    # Try parse whole as JSON
    try:
        json.loads(text.strip())
        return text.strip()
    except Exception:
        pass
    return None


def _parse_spec(raw: str) -> PhysicalSpec | None:
    j = _extract_json(raw)
    if not j:
        return None
    return PhysicalSpec.model_validate_json(j)


def run_pipeline(message: str, client: LLMClient | None = None) -> tuple[PhysicalSpec, str, dict]:
    """Run Idea → PhysicalSpec. Returns (PhysicalSpec, assistant_reply)."""
    from language_detector import detect_language

    detected_language = detect_language(message)
    llm = client or OpenAIClient()

    # Step 1: extract intent/context
    step1 = llm.complete(
        system="You are a physics assistant. Extract the user's intent and physical context in 1–2 sentences. Output only that summary, no JSON.",
        user=message,
        language=detected_language,
    )

    # Step 2: produce PhysicalSpec (strict JSON)
    # Extract keywords for KB lookup
    keywords = []
    keywords.extend(step1.lower().split())
    # We'll add more keywords after we have a preliminary spec, but for now use step1
    
    # Get KB entries (we'll refine after getting initial spec)
    kb_domain = None  # Will be set after parsing domain
    kb_entries = []
    
    # Step 2a: Get initial spec to determine domain
    schema_hint_basic = """
Output a single JSON object with this exact structure (use empty arrays where needed):
{
  "domain": "mechanics"|"thermodynamics"|"electromagnetism"|"optics"|"quantum_mechanics"|"fluid_dynamics"|"waves"|"relativity"|"other",
  "goal": "string",
  "assumptions": ["string"],
  "variables": [{"name":"","meaning":"","unit":""}],
  "constraints": ["string"],
  "candidate_laws": [{"name":"","form":"","why_applicable":""}],
  "suggested_laws": [],
  "questions": []
}
Leave "questions" and "suggested_laws" as []; they will be filled in later steps. Output only the JSON object, no markdown or extra text."""

    step2a_user = f"User message: {message}\n\nContext: {step1}\n\n{schema_hint_basic}"
    step2a_raw = llm.complete(system="Output valid JSON only. No commentary.", user=step2a_user, language=detected_language)
    spec = _parse_spec(step2a_raw)
    if spec is None:
        step2a_retry = llm.complete(
            system="Output valid JSON only. No markdown, no code fences, no explanation.",
            user=step2a_user,
            language=detected_language,
        )
        spec = _parse_spec(step2a_retry)
    if spec is None:
        raise ValueError("Pipeline could not produce valid PhysicalSpec JSON after retry.")
    
    # Now we have domain, get KB entries
    kb_domain = _domain_to_kb_domain(spec.domain)
    kb_entries = []
    kb_debug = {"kb_candidate_count": 0, "kb_candidates": [], "domain": None, "keywords": []}
    
    if kb_domain:
        kb_debug["domain"] = kb_domain.value
        # Extract keywords from goal, assumptions, variable names, AND raw user message
        all_keywords = []
        # Include raw message
        all_keywords.extend(message.lower().split())
        # Include goal, assumptions, variable names
        all_keywords.extend((spec.goal or "").lower().split())
        for a in spec.assumptions or []:
            all_keywords.extend(a.lower().split())
        for v in spec.variables or []:
            all_keywords.append((v.name or "").lower())
            all_keywords.extend((v.meaning or "").lower().split())
        # Remove duplicates and empty, filter very short words
        all_keywords = list(set([k for k in all_keywords if k and len(k) > 2]))
        kb_debug["keywords"] = all_keywords[:20]  # Limit for logging
        
        # Try with keywords first
        kb_entries = _get_kb_loader().get_entries(domain=kb_domain, keywords=all_keywords)
        
        # Fallback: if no matches, get all entries for the domain (so LLM can still choose)
        if not kb_entries:
            kb_entries = _get_kb_loader().get_entries(domain=kb_domain)
        
        # Logging
        logger.info(f"KB lookup: domain={kb_domain.value}, keywords={len(all_keywords)}, entries={len(kb_entries)}")
        logger.info(f"KB entry IDs (first 10): {[e.id for e in kb_entries[:10]]}")
        
        # Debug info
        kb_debug["kb_candidate_count"] = len(kb_entries)
        kb_debug["kb_candidates"] = [{"id": e.id, "name": e.name} for e in kb_entries[:20]]
    
    # Step 2b: Refine spec with KB-backed suggested_laws
    kb_context = ""
    if kb_entries:
        kb_context = "\n\n=== KNOWLEDGE BASE ENTRIES (use ONLY these for suggested_laws) ===\n"
        for i, kb in enumerate(kb_entries, 1):
            kb_context += f"\n{i}. id: {kb.id}\n"
            kb_context += f"   name: {kb.name}\n"
            if kb.equation:
                kb_context += f"   equation: {kb.equation}\n"
            if kb.assumptions:
                kb_context += f"   assumptions: {', '.join(kb.assumptions[:3])}\n"  # Limit to first 3
            if kb.validity_limits:
                kb_context += f"   validity_limits: {', '.join(kb.validity_limits[:2])}\n"  # Limit to first 2
        kb_context += "\n=== CRITICAL RULES FOR suggested_laws ===\n"
        kb_context += "1. You MUST use ONLY the KB entries listed above.\n"
        kb_context += "2. If a KB entry is relevant to the problem, include it in suggested_laws.\n"
        kb_context += "3. For each suggested_law, provide:\n"
        kb_context += "   - kb_id: the exact id from the list (e.g., 'inclined_plane_normal_force')\n"
        kb_context += "   - name: copy from KB entry\n"
        kb_context += "   - equation: copy from KB entry\n"
        kb_context += "   - explanation: brief reason why this law applies to this problem\n"
        kb_context += "4. Do NOT invent laws. If no KB entry applies, set suggested_laws to [].\n"
        kb_context += "5. Example: For an inclined plane problem, include 'inclined_plane_normal_force' and related entries.\n"
    
    schema_hint = """
Output a single JSON object with this exact structure (use empty arrays where needed):
{
  "domain": "mechanics"|"thermodynamics"|"electromagnetism"|"optics"|"quantum_mechanics"|"fluid_dynamics"|"waves"|"relativity"|"other",
  "goal": "string",
  "assumptions": ["string"],
  "variables": [{"name":"","meaning":"","unit":""}],
  "constraints": ["string"],
  "candidate_laws": [{"name":"","form":"","why_applicable":""}],
  "suggested_laws": [{"kb_id":"exact_id_from_KB","name":"KB_entry_name","equation":"KB_equation","explanation":"why_applicable"}],
  "questions": []
}
IMPORTANT for suggested_laws:
- Use ONLY the KB entries provided above.
- Copy kb_id exactly (e.g., "inclined_plane_normal_force").
- Copy name and equation from the KB entry.
- Write a brief explanation of why this law applies.
- If the problem involves an inclined plane, include inclined_plane entries.
- If the problem involves forces, include newton_second_law.
- If no KB entry applies, use [].
Leave "questions" as []; it will be filled in the next step.
Output only the JSON object, no markdown or extra text."""

    # Build a more explicit prompt for suggested_laws
    suggested_laws_instruction = ""
    if kb_entries:
        suggested_laws_instruction = "\n\nFor suggested_laws: Review the KB entries above. If any are relevant to this problem (e.g., 'inclined plane' entries for an inclined plane problem, 'newton' entries for force problems), include them in suggested_laws with their exact kb_id. Provide a brief explanation of why each law applies."
    
    step2_user = f"User message: {message}\n\nContext: {step1}\n\nCurrent PhysicalSpec: {spec.model_dump_json()}{kb_context}{suggested_laws_instruction}\n\n{schema_hint}"
    step2_raw = llm.complete(system="Output valid JSON only. No commentary. Follow KB instructions strictly.", user=step2_user, language=detected_language)
    spec_final = _parse_spec(step2_raw)
    if spec_final is None:
        step2_retry = llm.complete(
            system="Output valid JSON only. No markdown, no code fences, no explanation. Use only KB entries for suggested_laws.",
            user=step2_user,
            language=detected_language,
        )
        spec_final = _parse_spec(step2_retry)
    if spec_final is None:
        raise ValueError("Pipeline could not produce valid PhysicalSpec JSON after retry.")
    
    # Validate suggested_laws: ensure all kb_ids exist in KB and enrich with KB data
    if spec_final.suggested_laws:
        kb_by_id = {kb.id: kb for kb in kb_entries}
        validated = []
        for sl in spec_final.suggested_laws:
            if sl.kb_id in kb_by_id:
                kb_entry = kb_by_id[sl.kb_id]
                # Enrich SuggestedLaw with KB entry data
                sl.status = kb_entry.status.value
                sl.assumptions = kb_entry.assumptions.copy()
                sl.validity_limits = kb_entry.validity_limits.copy()
                sl.notes = kb_entry.notes.copy()
                validated.append(sl)
            # Silently drop invalid kb_ids (LLM hallucinated)
        spec_final.suggested_laws = validated
    elif kb_entries:
        # If LLM didn't generate suggested_laws but we have KB entries, 
        # the LLM might have missed them. We could auto-suggest based on domain/keywords,
        # but for now we leave it empty as the LLM should have done it.
        pass
    
    spec = spec_final

    # Step 3: produce minimal questions
    step3_user = f"PhysicalSpec so far: {spec.model_dump_json()}\n\nGenerate a short list of minimal clarifying questions (2–5) as a JSON array of strings. Output only the JSON array, e.g. [\"q1\", \"q2\"]."
    step3_raw = llm.complete(system="Output a JSON array of strings only. No other text.", user=step3_user, language=detected_language)
    questions_raw = _extract_json(step3_raw) or step3_raw.strip()
    try:
        qs = json.loads(questions_raw)
        if isinstance(qs, list) and all(isinstance(x, str) for x in qs):
            spec.questions = qs
        # else leave spec.questions as is
    except Exception:
        pass

    # Assistant reply for chat (language-aware)
    if detected_language == "es":
        reply = f"He analizado tu idea.\n\n**Contexto:** {step1}\n\nRevisa el PhysicalSpec en el panel derecho. Si quieres, responde a las preguntas para afinar el modelo."
    else:
        reply = f"I have analyzed your idea.\n\n**Context:** {step1}\n\nReview the PhysicalSpec in the right panel. If you like, answer the questions to refine the model."
    return spec, reply, kb_debug
