import json
import logging
from typing import List

from llm import OpenAIClient
from debate_kb_schemas import KBPhilosophyQuote
from pydantic import BaseModel


class Quote(BaseModel):
    quote_id: str
    author: str
    work: str
    quote: str
    interpretation: str
    relevance: str


class AuthorLayer(BaseModel):
    quotes: list[Quote]
    quote_policy_note: str


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


def generate_author_layer(
    topic: str,
    user_message: str,
    philosophy_quotes: List[KBPhilosophyQuote],
    llm_client: OpenAIClient | None = None,
    response_language: str = "en",
) -> AuthorLayer:
    """
    Generate author_layer using LLM with Philosophy KB quotes.
    Returns validated AuthorLayer with verbatim quotes or empty quotes if generation/validation fails.
    """
    if llm_client is None:
        llm_client = OpenAIClient()

    # If no philosophy quotes, return empty AuthorLayer (language-aware)
    if not philosophy_quotes:
        logger.info("No philosophy KB quotes provided, returning empty AuthorLayer")
        note = "No hay citas textuales disponibles en la base de conocimiento para este tema." if response_language == "es" else "No verbatim quotes available in the current knowledge base for this topic."
        return AuthorLayer(quotes=[], quote_policy_note=note)

    # Build quote lookup map for verbatim validation
    quote_map: dict[str, KBPhilosophyQuote] = {q.quote_id: q for q in philosophy_quotes}
    valid_quote_ids = set(quote_map.keys())

    # Build Philosophy KB context for LLM
    kb_context = "=== Philosophy Knowledge Base Quotes ===\n"
    for quote in philosophy_quotes:
        kb_context += f"\nQuote ID: {quote.quote_id}\n"
        kb_context += f"Author: {quote.author}\n"
        kb_context += f"Work: {quote.work}\n"
        kb_context += f"Quote (VERBATIM): {quote.quote}\n"
        if quote.themes:
            kb_context += f"Themes: {', '.join(quote.themes)}\n"

    # Build LLM prompt
    lang_name = "Spanish" if response_language == "es" else "English"
    system_prompt = f"""You are a philosophy quote selector. Select 0-3 relevant quotes from the provided Philosophy KB and provide interpretations.

CRITICAL RULES:
1. Output ONLY valid JSON, no markdown, no explanation.
2. quotes array MUST have 0 to 3 items (0 if no quotes are relevant).
3. Each quote.quote_id MUST exist in the provided KB quote IDs.
4. Each quote.quote text MUST match the KB quote text EXACTLY (verbatim, character-for-character).
5. Do NOT invent quotes. If no suitable quote exists, return quotes=[].
6. interpretation and relevance MUST be open-ended, NO conclusions.
7. quote_policy_note should explain the quote selection policy.
8. Output interpretation, relevance, and quote_policy_note strictly in {lang_name}."""

    user_prompt = f"""Topic: {topic}
User Message: {user_message}

{kb_context}

Generate an author_layer JSON object with this exact structure:
{{
  "quotes": [
    {{
      "quote_id": "valid_id_from_KB",
      "author": "Author name from KB",
      "work": "Work name from KB",
      "quote": "EXACT VERBATIM quote text from KB (character-for-character match required)",
      "interpretation": "Open-ended interpretation, no conclusions",
      "relevance": "Open-ended relevance explanation, no conclusions"
    }}
  ],
  "quote_policy_note": "Policy note about quote selection"
}}

REQUIREMENTS:
- quotes MUST have 0 to 3 items
- If quotes length > 0:
  - Each quote_id MUST be from: {list(valid_quote_ids)}
  - Each quote text MUST match KB quote text EXACTLY (verbatim)
- Do NOT invent quotes. If none are relevant, use quotes=[]
- interpretation and relevance MUST be open-ended, NO conclusions
- Output ONLY the JSON object, no markdown fences, no extra text"""

    # First LLM call
    try:
        raw_response = llm_client.complete(system=system_prompt, user=user_prompt, language=response_language)
        author_dict = _extract_json(raw_response)
        
        if author_dict is None:
            logger.warning("Failed to parse LLM JSON for author_layer, attempting repair")
            return _repair_author_layer(
                topic, user_message, philosophy_quotes, quote_map, valid_quote_ids, llm_client, "Failed to parse JSON", response_language
            )
        
        # Validate and build AuthorLayer
        author_layer = _validate_and_build_author_layer(author_dict, quote_map, valid_quote_ids)
        if author_layer:
            return author_layer
        
        # Validation failed, attempt repair
        logger.warning("AuthorLayer validation failed, attempting repair")
        return _repair_author_layer(
            topic, user_message, philosophy_quotes, quote_map, valid_quote_ids, llm_client, "Validation failed", response_language
        )
        
    except Exception as e:
        logger.error(f"Error generating author_layer: {e}", exc_info=True)
        note = "No hay citas textuales disponibles en la base de conocimiento para este tema." if response_language == "es" else "No verbatim quotes available in the current knowledge base for this topic."
        return AuthorLayer(quotes=[], quote_policy_note=note)


def _validate_and_build_author_layer(
    author_dict: dict,
    quote_map: dict[str, KBPhilosophyQuote],
    valid_quote_ids: set[str],
) -> AuthorLayer | None:
    """Validate author_dict and build AuthorLayer if valid, return None if invalid."""
    try:
        quotes_list = author_dict.get("quotes", [])
        
        # Check quotes length (0 to 3)
        if len(quotes_list) > 3:
            return None
        
        # Validate each quote
        validated_quotes = []
        for quote_dict in quotes_list:
            # Check required fields
            if not all(k in quote_dict for k in ["quote_id", "author", "work", "quote", "interpretation", "relevance"]):
                return None
            
            quote_id = quote_dict["quote_id"]
            
            # Check quote_id exists in KB
            if quote_id not in valid_quote_ids:
                return None
            
            # Get KB quote for verbatim comparison
            kb_quote = quote_map[quote_id]
            
            # Check verbatim match (exact character match)
            if quote_dict["quote"] != kb_quote.quote:
                return None
            
            # Check author and work match (should match KB)
            if quote_dict["author"] != kb_quote.author or quote_dict["work"] != kb_quote.work:
                return None
            
            validated_quotes.append(
                Quote(
                    quote_id=quote_id,
                    author=quote_dict["author"],
                    work=quote_dict["work"],
                    quote=quote_dict["quote"],  # Already verified verbatim
                    interpretation=quote_dict["interpretation"],
                    relevance=quote_dict["relevance"],
                )
            )
        
        # Build AuthorLayer
        return AuthorLayer(
            quotes=validated_quotes,
            quote_policy_note=author_dict.get("quote_policy_note", "Quotes are provided for educational purposes."),
        )
    except Exception as e:
        logger.error(f"Error validating AuthorLayer: {e}", exc_info=True)
        return None


def _repair_author_layer(
    topic: str,
    user_message: str,
    philosophy_quotes: List[KBPhilosophyQuote],
    quote_map: dict[str, KBPhilosophyQuote],
    valid_quote_ids: set[str],
    llm_client: OpenAIClient,
    error_message: str,
    response_language: str = "en",
) -> AuthorLayer:
    """Attempt one repair call, return empty AuthorLayer if repair fails."""
    kb_context = "=== Philosophy Knowledge Base Quotes ===\n"
    for quote in philosophy_quotes:
        kb_context += f"\nQuote ID: {quote.quote_id}\n"
        kb_context += f"Author: {quote.author}\n"
        kb_context += f"Work: {quote.work}\n"
        kb_context += f"Quote (VERBATIM - COPY EXACTLY): {quote.quote}\n"
        if quote.themes:
            kb_context += f"Themes: {', '.join(quote.themes)}\n"

    repair_prompt = f"""Previous attempt failed with error: {error_message}

Topic: {topic}
User Message: {user_message}

{kb_context}

VALIDATION ERRORS:
- quotes array MUST have 0 to 3 items
- Each quote_id MUST be from this list: {list(valid_quote_ids)}
- Each quote text MUST match KB quote text EXACTLY (character-for-character, verbatim)
- Do NOT invent quotes. If none are relevant, use quotes=[]
- interpretation and relevance MUST be open-ended, NO conclusions

Generate CORRECTED JSON ONLY:
{{
  "quotes": [
    {{
      "quote_id": "valid_id_from_list",
      "author": "Author from KB",
      "work": "Work from KB",
      "quote": "EXACT VERBATIM quote from KB (copy character-for-character)",
      "interpretation": "Open-ended interpretation",
      "relevance": "Open-ended relevance"
    }}
  ],
  "quote_policy_note": "..."
}}

Output ONLY the corrected JSON object, no markdown, no explanation."""

    try:
        raw_response = llm_client.complete(
            system="Output valid JSON only. Fix all validation errors. Use only provided quote_ids and exact verbatim quotes.",
            user=repair_prompt,
            language=response_language,
        )
        author_dict = _extract_json(raw_response)
        
        if author_dict is None:
            logger.warning("Repair attempt failed to parse JSON, returning empty AuthorLayer")
            note = "No hay citas textuales disponibles en la base de conocimiento para este tema." if response_language == "es" else "No verbatim quotes available in the current knowledge base for this topic."
            return AuthorLayer(quotes=[], quote_policy_note=note)
        
        author_layer = _validate_and_build_author_layer(author_dict, quote_map, valid_quote_ids)
        if author_layer:
            return author_layer
        
        # Repair validation still failed
        logger.warning("Repair attempt validation failed, returning empty AuthorLayer")
        note = "No hay citas textuales disponibles en la base de conocimiento para este tema." if response_language == "es" else "No verbatim quotes available in the current knowledge base for this topic."
        return AuthorLayer(quotes=[], quote_policy_note=note)
    except Exception as e:
        logger.error(f"Error in repair attempt: {e}", exc_info=True)
        note = "No hay citas textuales disponibles en la base de conocimiento para este tema." if response_language == "es" else "No verbatim quotes available in the current knowledge base for this topic."
        return AuthorLayer(quotes=[], quote_policy_note=note)
