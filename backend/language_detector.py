"""
Detect input language (Spanish vs English). Heuristic, no LLM.
Returns "es" | "en" (stable enum-like string). Mixed content uses majority; tie defaults to "en".
"""
import logging
from typing import Literal

logger = logging.getLogger(__name__)
LanguageCode = Literal["es", "en"]

# Strong Spanish signals: if present, treat as Spanish
ES_STRONG_SIGNALS = {"¿", "¡", "ñ"}
ES_STRONG_WORDS = {"que", "qué", "como", "cómo", "segun", "según", "dios", "ciencia", "existe", "por qué"}

# High-frequency Spanish words (common)
ES_INDICATORS = {
    "el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del", "al", "a", "en", "con",
    "por", "para", "que", "qué", "como", "cómo", "cuando", "cuándo", "donde", "dónde",
    "esto", "esta", "estos", "estas", "eso", "esa", "aquello", "aquella",
    "pero", "si", "sí", "no", "muy", "más", "menos", "bien", "mal", "aquí", "ahí", "allí",
    "hay", "tiene", "tienen", "es", "son", "está", "están", "ser", "estar", "hacer", "tener",
    "creo", "pienso", "opino", "me", "te", "se", "nos", "le", "les",
    "porque", "aunque", "aunque", "también", "solo", "sólo", "siempre", "nunca",
    "algo", "nada", "alguien", "nadie", "todo", "todos", "cada",
}

# High-frequency English words
EN_INDICATORS = {
    "the", "a", "an", "of", "to", "in", "for", "on", "with", "at", "by", "from",
    "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
    "do", "does", "did", "will", "would", "could", "should", "may", "might",
    "this", "that", "these", "those", "it", "its", "they", "them",
    "what", "which", "who", "whom", "when", "where", "why", "how",
    "and", "but", "or", "nor", "so", "yet", "if", "because", "although",
}


def detect_language(text: str) -> LanguageCode:
    """
    Detect language from text. Returns "es" or "en" (stable, no other values).
    First checks strong Spanish signals (¿ ¡ ñ, or common Spanish words).
    Then uses word frequency: count Spanish vs English indicator words.
    No fallback to English if Spanish is detected.
    """
    if not text or not text.strip():
        logger.info("detect_language: empty input -> en")
        return "en"
    t = text.strip().lower()
    # Strong Spanish signals take precedence
    if any(c in text for c in ES_STRONG_SIGNALS):
        logger.info("detect_language: strong signal (¿¡ñ) -> es")
        return "es"
    words = set(w for w in t.replace(".", " ").replace(",", " ").replace("?", " ").split() if len(w) > 1)
    if any(w in ES_STRONG_WORDS for w in words):
        logger.info("detect_language: strong word (que/cómo/según/dios/ciencia/existe) -> es")
        return "es"
    # Word frequency fallback
    es_count = sum(1 for w in words if w in ES_INDICATORS)
    en_count = sum(1 for w in words if w in EN_INDICATORS)
    if es_count > en_count:
        logger.info("detect_language: word freq -> es (es=%d en=%d)", es_count, en_count)
        return "es"
    logger.info("detect_language: -> en (es=%d en=%d)", es_count, en_count)
    return "en"
