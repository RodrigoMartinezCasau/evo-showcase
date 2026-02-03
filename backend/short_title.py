"""
Short title generator for debates. Deterministic heuristic (no LLM).
Max 18 chars. Language-aware stopwords + keyword mapping.
Examples: "¿Existe Dios?" -> "Dios", "does god exist according to science?" -> "God"
"""
import re
from collections import Counter

from language_detector import detect_language

MAX_TITLE_LEN = 18

# English stopwords (lowercase)
EN_STOP = {
    "does", "do", "did", "is", "are", "was", "were", "can", "could", "should", "would",
    "what", "why", "how", "when", "where", "who", "which",
    "the", "a", "an", "to", "of", "in", "on", "for", "with", "about", "according",
}

# Spanish stopwords (lowercase)
ES_STOP = {
    "que", "qué", "como", "cómo", "cuando", "cuándo", "donde", "dónde", "quien", "quién",
    "el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del", "en", "por", "para", "con", "sobre", "segun", "según",
    "y", "es", "no", "al", "lo", "más", "pero", "sus", "le", "ya", "o", "fue", "este", "ha", "si", "sí",
    "porque", "esta", "entre", "muy", "sin", "ser", "tiene", "me", "hasta", "hay", "han", "desde",
    "todo", "nos", "durante", "cuál", "cuáles", "cuánto", "cuánta", "a", "se", "su", "te", "mi", "tu",
    "creo", "pienso", "opino", "parece", "pregunta", "preguntas", "argumentos", "favor", "contra",
}

# Domain keywords (prefer these when present)
EN_KEYWORDS = ["god", "science", "consciousness", "universe", "free", "will", "truth", "morality", "existence", "tortilla"]
ES_KEYWORDS = ["dios", "ciencia", "conciencia", "universo", "libre", "albedrío", "verdad", "moral", "existencia", "tortilla"]

# Legacy: combined for backward compat (used by debate_memory)
STOPWORDS = ES_STOP | EN_STOP

# High-priority keywords for common philosophy topics (map to preferred short form)
KEYWORD_MAP = {
    "dios": "Dios",
    "dolor": "Dolor",
    "amor": "Amor",
    "muerte": "Muerte",
    "libertad": "Libertad",
    "conciencia": "Conciencia",
    "moral": "Moral",
    "sentido": "Sentido",
    "tiempo": "Tiempo",
    "ciencia": "Ciencia",
    "universo": "Universo",
    "mal": "Mal",
    "bien": "Bien",
    "verdad": "Verdad",
    "realidad": "Realidad",
    "existir": "Existencia",
    "existencia": "Existencia",
    "libre": "Libertad",
    "albedrío": "Albedrío",
    "determinismo": "Determinismo",
    "mente": "Mente",
    "cuerpo": "Cuerpo",
    "ética": "Ética",
    "conocimiento": "Conocimiento",
    "tortilla": "Tortilla",
    "patatas": "Patatas",
    "god": "God",
    "consciousness": "Consciousness",
    "science": "Science",
}

def generate_short_title(first_user_message: str, lang: str | None = None) -> str:
    """
    Generate a short title (max 18 chars) from the first user message.
    Language-aware: uses EN_STOP or ES_STOP and prefers domain keywords.
    Returns "Debate" if uncertain.
    """
    raw = (first_user_message or "").strip()
    if not raw:
        return "Debate"

    if lang is None:
        lang = detect_language(raw)
    stop = ES_STOP if lang == "es" else EN_STOP
    keywords = ES_KEYWORDS if lang == "es" else EN_KEYWORDS

    # Normalize: remove punctuation, split words
    text = re.sub(r"[¿?!.,;:()\"—–\-]", " ", raw)
    words = [w.lower().strip() for w in text.split() if len(w.strip()) > 1]
    words = [w for w in words if w not in stop]

    if not words:
        fallback = raw[:MAX_TITLE_LEN].strip()
        return (fallback + "…") if len(raw) > MAX_TITLE_LEN else fallback or "Debate"

    # Prefer mapped keywords (first match)
    for w in words:
        if w in KEYWORD_MAP:
            title = KEYWORD_MAP[w]
            return title[:MAX_TITLE_LEN] if len(title) > MAX_TITLE_LEN else title

    # Prefer domain keywords when present
    for kw in keywords:
        if kw in words:
            title = kw[0].upper() + kw[1:] if len(kw) > 1 else kw.upper()
            return title[:MAX_TITLE_LEN] if len(title) > MAX_TITLE_LEN else title

    # Else: pick longest remaining token (more meaningful than highest freq)
    candidates = sorted(words, key=lambda w: -len(w))
    best = candidates[0]
    title = best[0].upper() + best[1:] if len(best) > 1 else best.upper()

    if len(title) > MAX_TITLE_LEN:
        title = title[:MAX_TITLE_LEN - 1] + "…"

    return title or "Debate"
