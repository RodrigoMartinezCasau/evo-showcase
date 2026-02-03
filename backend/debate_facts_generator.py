"""
Facts layer for debate responses. Uses Science KB (KBScienceEntry from
knowledge_base_science/*.yaml) for LLM-synthesized summary/claims. Optional
'facts' list is filled from ScienceFactsLoader (knowledge_base_science/facts/*.yaml)
so the Scientific Facts UI section shows relevant items without "Insufficient KB coverage".
"""
import json
import logging
from typing import List, Optional

from llm import OpenAIClient
from debate_kb_schemas import KBScienceEntry
from pydantic import BaseModel


class Claim(BaseModel):
    text: str
    certainty: str  # e.g., "consensus", "debated", "speculative"
    source_ids: list[str]
    short_explanation: str


class FactsLayer(BaseModel):
    summary: str
    claims: list[Claim]
    what_we_dont_know: list[str]
    common_misconceptions: list[str]
    # Optional: science facts from knowledge_base_science/facts/*.yaml (ScientificFact)
    # for the Scientific Facts UI section. Each item: id, claim, value?, units?, formula?,
    # certainty, source_name, source_note?
    facts: Optional[list] = None

logger = logging.getLogger(__name__)


def _extract_json(text: str) -> dict | None:
    """Extract JSON from LLM response, handling markdown code fences."""
    text = text.strip()
    # Remove markdown code fences if present
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


def generate_facts_layer(
    topic: str,
    user_message: str,
    science_entries: List[KBScienceEntry],
    llm_client: OpenAIClient | None = None,
    response_language: str = "en",
) -> FactsLayer:
    """
    Generate facts_layer using LLM with Science KB entries.
    Returns validated FactsLayer or fallback if generation/validation fails.
    """
    if llm_client is None:
        llm_client = OpenAIClient()

    # If no science entries, return fallback (language-aware)
    if not science_entries:
        logger.warning("No science KB entries provided, returning fallback FactsLayer")
        if response_language == "es":
            return FactsLayer(
                summary="Cobertura de KB insuficiente para este tema aún.",
                claims=[],
                what_we_dont_know=["Añade más entradas de ciencia al KB para este tema."],
                common_misconceptions=[],
            )
        return FactsLayer(
            summary="Insufficient KB coverage for this topic yet.",
            claims=[],
            what_we_dont_know=["Add more science KB entries for this topic."],
            common_misconceptions=[],
        )

    # Build Science KB context for LLM
    kb_context = "=== Science Knowledge Base Entries ===\n"
    valid_science_ids = set()
    for entry in science_entries:
        valid_science_ids.add(entry.id)
        kb_context += f"\nEntry ID: {entry.id}\n"
        kb_context += f"Topic: {entry.topic}\n"
        kb_context += f"Certainty: {entry.certainty.value}\n"
        kb_context += f"Claims: {', '.join(entry.claims)}\n"
        if entry.misconceptions:
            kb_context += f"Misconceptions: {', '.join(entry.misconceptions)}\n"
        if entry.notes:
            kb_context += f"Notes: {', '.join(entry.notes)}\n"

    # Build LLM prompt
    lang_name = "Spanish" if response_language == "es" else "English"
    system_prompt = f"""You are a scientific fact synthesizer. Generate a factual, open-ended summary and claims based on the provided Science KB entries.

CRITICAL RULES:
1. Output ONLY valid JSON, no markdown, no explanation.
2. claims array MUST have at least 3 items.
3. Each claim MUST have at least one source_id from the provided KB entry IDs.
4. Each claim.certainty MUST be one of: "consensus", "debated", "speculative".
5. summary MUST be factual and open-ended. NO philosophical conclusions, NO final judgments.
6. Use source_ids from the KB entries provided. Do NOT invent IDs.
7. what_we_dont_know and common_misconceptions should be factual lists, not empty.
8. Output ALL text (summary, claims, etc.) strictly in {lang_name}."""

    user_prompt = f"""Topic: {topic}
User Message: {user_message}

{kb_context}

Generate a facts_layer JSON object with this exact structure:
{{
  "summary": "Factual, open-ended summary of what science says about this topic. NO philosophical conclusions.",
  "claims": [
    {{
      "text": "A factual claim based on KB entries",
      "certainty": "consensus" | "debated" | "speculative",
      "source_ids": ["entry_id_from_KB"],
      "short_explanation": "Brief explanation"
    }}
  ],
  "what_we_dont_know": ["Factual statement about unknowns"],
  "common_misconceptions": ["Factual statement about misconceptions"]
}}

REQUIREMENTS:
- claims MUST have at least 3 items
- Each claim.source_ids MUST have at least 1 ID from: {list(valid_science_ids)}
- Each claim.certainty MUST be "consensus", "debated", or "speculative"
- summary MUST be factual, open-ended, NO philosophical conclusions
- Output ONLY the JSON object, no markdown fences, no extra text"""

    # First LLM call
    try:
        raw_response = llm_client.complete(system=system_prompt, user=user_prompt, language=response_language)
        facts_dict = _extract_json(raw_response)
        
        if facts_dict is None:
            logger.warning("Failed to parse LLM JSON, attempting repair")
            return _repair_facts_layer(
                topic, user_message, science_entries, valid_science_ids, llm_client, "Failed to parse JSON", response_language
            )
        
        # Validate and build FactsLayer
        facts_layer = _validate_and_build_facts_layer(facts_dict, valid_science_ids)
        if facts_layer:
            return facts_layer
        
        # Validation failed, attempt repair
        logger.warning("FactsLayer validation failed, attempting repair")
        return _repair_facts_layer(
            topic, user_message, science_entries, valid_science_ids, llm_client, "Validation failed", response_language
        )
        
    except Exception as e:
        logger.error(f"Error generating facts_layer: {e}", exc_info=True)
        if response_language == "es":
            return FactsLayer(
                summary="Cobertura de KB insuficiente para este tema aún.",
                claims=[],
                what_we_dont_know=["Añade más entradas de ciencia al KB para este tema."],
                common_misconceptions=[],
            )
        return FactsLayer(
            summary="Insufficient KB coverage for this topic yet.",
            claims=[],
            what_we_dont_know=["Add more science KB entries for this topic."],
            common_misconceptions=[],
        )


def _validate_and_build_facts_layer(facts_dict: dict, valid_science_ids: set[str]) -> FactsLayer | None:
    """Validate facts_dict and build FactsLayer if valid, return None if invalid."""
    try:
        # Check claims length
        claims_list = facts_dict.get("claims", [])
        if len(claims_list) < 3:
            return None
        
        # Validate each claim
        validated_claims = []
        for claim_dict in claims_list:
            # Check required fields
            if not all(k in claim_dict for k in ["text", "certainty", "source_ids", "short_explanation"]):
                return None
            
            # Check certainty enum
            if claim_dict["certainty"] not in ["consensus", "debated", "speculative"]:
                return None
            
            # Check source_ids
            source_ids = claim_dict["source_ids"]
            if not isinstance(source_ids, list) or len(source_ids) < 1:
                return None
            
            # Check all source_ids exist in valid_science_ids
            if not all(sid in valid_science_ids for sid in source_ids):
                return None
            
            validated_claims.append(
                Claim(
                    text=claim_dict["text"],
                    certainty=claim_dict["certainty"],
                    source_ids=source_ids,
                    short_explanation=claim_dict["short_explanation"],
                )
            )
        
        # Build FactsLayer
        return FactsLayer(
            summary=facts_dict.get("summary", ""),
            claims=validated_claims,
            what_we_dont_know=facts_dict.get("what_we_dont_know", []),
            common_misconceptions=facts_dict.get("common_misconceptions", []),
        )
    except Exception as e:
        logger.error(f"Error validating FactsLayer: {e}", exc_info=True)
        return None


def _repair_facts_layer(
    topic: str,
    user_message: str,
    science_entries: List[KBScienceEntry],
    valid_science_ids: set[str],
    llm_client: OpenAIClient,
    error_message: str,
    response_language: str = "en",
) -> FactsLayer:
    """Attempt one repair call, return fallback if repair fails."""
    kb_context = "=== Science Knowledge Base Entries ===\n"
    for entry in science_entries:
        kb_context += f"\nEntry ID: {entry.id}\n"
        kb_context += f"Topic: {entry.topic}\n"
        kb_context += f"Certainty: {entry.certainty.value}\n"
        kb_context += f"Claims: {', '.join(entry.claims)}\n"
        if entry.misconceptions:
            kb_context += f"Misconceptions: {', '.join(entry.misconceptions)}\n"
        if entry.notes:
            kb_context += f"Notes: {', '.join(entry.notes)}\n"

    repair_prompt = f"""Previous attempt failed with error: {error_message}

Topic: {topic}
User Message: {user_message}

{kb_context}

VALIDATION ERRORS:
- claims array MUST have at least 3 items
- Each claim.source_ids MUST have at least 1 ID
- Each claim.certainty MUST be one of: "consensus", "debated", "speculative"
- All source_ids MUST be from this list: {list(valid_science_ids)}
- summary MUST be factual, open-ended, NO philosophical conclusions

Generate CORRECTED JSON ONLY:
{{
  "summary": "Factual, open-ended summary",
  "claims": [
    {{
      "text": "...",
      "certainty": "consensus" | "debated" | "speculative",
      "source_ids": ["valid_id_from_list"],
      "short_explanation": "..."
    }}
  ],
  "what_we_dont_know": [...],
  "common_misconceptions": [...]
}}

Output ONLY the corrected JSON object, no markdown, no explanation."""

    try:
        raw_response = llm_client.complete(
            system="Output valid JSON only. Fix all validation errors. Use only provided source_ids.",
            user=repair_prompt,
            language=response_language,
        )
        facts_dict = _extract_json(raw_response)
        
        if facts_dict is None:
            logger.warning("Repair attempt failed to parse JSON, returning fallback")
            if response_language == "es":
                return FactsLayer(
                    summary="Cobertura de KB insuficiente para este tema aún.",
                    claims=[],
                    what_we_dont_know=["Añade más entradas de ciencia al KB para este tema."],
                    common_misconceptions=[],
                )
            return FactsLayer(
                summary="Insufficient KB coverage for this topic yet.",
                claims=[],
                what_we_dont_know=["Add more science KB entries for this topic."],
                common_misconceptions=[],
            )
        
        facts_layer = _validate_and_build_facts_layer(facts_dict, valid_science_ids)
        if facts_layer:
            return facts_layer
        
        # Repair validation still failed
        logger.warning("Repair attempt validation failed, returning fallback")
        if response_language == "es":
            return FactsLayer(
                summary="Cobertura de KB insuficiente para este tema aún.",
                claims=[],
                what_we_dont_know=["Añade más entradas de ciencia al KB para este tema."],
                common_misconceptions=[],
            )
        return FactsLayer(
            summary="Insufficient KB coverage for this topic yet.",
            claims=[],
            what_we_dont_know=["Add more science KB entries for this topic."],
            common_misconceptions=[],
        )
    except Exception as e:
        logger.error(f"Error in repair attempt: {e}", exc_info=True)
        if response_language == "es":
            return FactsLayer(
                summary="Cobertura de KB insuficiente para este tema aún.",
                claims=[],
                what_we_dont_know=["Añade más entradas de ciencia al KB para este tema."],
                common_misconceptions=[],
            )
        return FactsLayer(
            summary="Insufficient KB coverage for this topic yet.",
            claims=[],
            what_we_dont_know=["Add more science KB entries for this topic."],
            common_misconceptions=[],
        )
