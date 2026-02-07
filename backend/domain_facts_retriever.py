"""
Retrieve verified facts from non-science KBs (quotes by domain) for the "Hechos verificados" block.
Domain -> quote category mapping and keyword-based retrieval. Never returns science KB content.
"""
import logging
from typing import List, Tuple

from debate_kb_loader import QuotesKBLoader
from debate_kb_schemas import VerbatimQuote

logger = logging.getLogger(__name__)

# Domain (from domain_classifier) -> quote category in knowledge_base_quotes/quotes/{category}/
# Only domains with existing quote categories are used; others return [].
DOMAIN_TO_QUOTE_CATEGORY: dict[str, str | None] = {
    "science": None,  # caller uses Science KB; never use this module for science
    "philosophy": "philosophy",
    "religion": "religion",
    "psychology": "psychology",
    "history": "literature",  # no "history" folder; use literature for historical figures/context
    "politics": None,  # no politics folder
    "other": None,
}

# Keywords that indicate science-only content; reject such quotes when domain != science.
_SCIENCE_ONLY_TOKENS = frozenset([
    "cosmology", "cosmological", "big bang", "bigbang", "evolution", "evolución", "dna", "adn",
    "hubble", "cosmic", "cmb", "nucleosynthesis", "multiverse", "multiverso", "fossil", "fósil",
    "natural selection", "selección natural", "empirical", "empírico", "falsifiability", "falsabilidad",
])


def _extract_keywords(text: str) -> set[str]:
    """Extract keywords from query (names, years, key nouns). Simple heuristic: split, drop stopwords, len>2."""
    if not (text or "").strip():
        return set()
    words = (text or "").lower().split()
    stop = {
        "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with",
        "is", "are", "was", "were", "be", "been", "have", "has", "had", "do", "does", "did",
        "de", "la", "el", "en", "y", "que", "por", "un", "una", "los", "las", "del", "al",
        "se", "no", "como", "más", "pero", "sus", "le", "lo", "ya", "o", "fue", "este", "ha",
        "sí", "porque", "esta", "entre", "cuando", "muy", "sin", "sobre", "ser", "tiene",
    }
    out = set()
    for w in words:
        clean = "".join(c for c in w if c.isalnum() or c in "-_").strip()
        if len(clean) > 2 and clean not in stop:
            out.add(clean)
    # Keep likely years (4 digits)
    for w in words:
        if len(w) == 4 and w.isdigit():
            out.add(w)
    return out


def _contains_science_only(quote: VerbatimQuote) -> bool:
    """True if quote text/tags contain science-only topics (cosmology, evolution, etc.)."""
    combined = " ".join(
        filter(
            None,
            [
                (quote.text_en or ""),
                (quote.text_es or ""),
                (quote.work or ""),
                " ".join(quote.tags or []),
            ],
        )
    ).lower()
    for tok in _SCIENCE_ONLY_TOKENS:
        if tok in combined:
            return True
    return False


def _quote_to_fact_dict(q: VerbatimQuote, lang: str) -> dict:
    """Shape a VerbatimQuote as a fact item for the UI (id, claim, certainty, source_name, source_note)."""
    claim = (q.text_es or q.text_en or q.text_original or "").strip()
    if lang == "es" and (q.text_es or "").strip():
        claim = (q.text_es or "").strip()
    elif (q.text_en or "").strip():
        claim = (q.text_en or "").strip()
    if len(claim) > 400:
        claim = claim[:397] + "..."
    return {
        "id": q.id,
        "claim": claim,
        "value": None,
        "units": None,
        "formula": None,
        "certainty": "verified",
        "source_name": (q.author or "").strip(),
        "source_note": (q.work or "").strip() or None,
    }


def get_verified_facts_for_domain(
    domain: str,
    query: str,
    lang: str = "en",
    max_k: int = 3,
) -> List[dict]:
    """
    Retrieve verified facts from the domain-appropriate KB (quotes by category).
    Only used when domain != "science". Never returns science KB content.
    Returns list of fact-shaped dicts (id, claim, certainty, source_name, source_note).
    """
    if domain == "science":
        return []
    category = DOMAIN_TO_QUOTE_CATEGORY.get(domain)
    if not category:
        return []

    loader = QuotesKBLoader()
    all_quotes = loader.get_all()
    query_keywords = _extract_keywords(query)
    if not query_keywords:
        query_keywords = _extract_keywords(query[:200])

    scored: List[Tuple[VerbatimQuote, int]] = []
    for q in all_quotes:
        if (q.category or "").lower() != category:
            continue
        if _contains_science_only(q):
            continue
        text = " ".join(
            filter(
                None,
                [
                    (q.text_en or ""),
                    (q.text_es or ""),
                    q.author,
                    q.work,
                    " ".join(q.tags or []),
                ],
            )
        )
        entry_keywords = _extract_keywords(text)
        overlap = len(query_keywords & entry_keywords)
        if overlap > 0:
            scored.append((q, overlap))

    scored.sort(key=lambda x: (-x[1], x[0].id))
    result = [_quote_to_fact_dict(q, lang) for q, _ in scored[:max_k]]
    if result:
        logger.info("Domain facts (domain=%s category=%s): %d items", domain, category, len(result))
    return result
