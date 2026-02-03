"""
Classify user intent: debate vs practical vs informational.
Heuristic (no LLM). Used to soft-reframe non-debate questions.
"""
import re

# Practical: how-to, recipes, steps
PRACTICAL_PATTERNS = [
    r"\bhow\s+to\s+",
    r"\bcómo\s+(hacer|hacerlo|preparar|cocinar)\b",
    r"\bhow\s+do\s+i\b",
    r"\bpasos?\s+para\b",
    r"\bsteps?\s+to\b",
    r"\breceta\b",
    r"\brecipe\b",
    r"\bingredients?\b",
    r"\bingredientes\b",
    r"\btortilla\b",
    r"\bomelette\b",
]

# Informational: factual queries
INFORMATIONAL_PATTERNS = [
    r"\bwhat\s+is\b",
    r"\bqué\s+es\b",
    r"\bwho\s+was\b",
    r"\bquién\s+fue\b",
    r"\bwhen\s+did\b",
    r"\bcuándo\b",
    r"\bwhere\s+is\b",
    r"\bdónde\s+está\b",
]

# Debate: normative, abstract, philosophical
DEBATE_PATTERNS = [
    r"\bcreo\s+que\b",
    r"\bi\s+believe\b",
    r"\bdebería\b",
    r"\bshould\b",
    r"\bexiste\b",
    r"\bexist\b",
    r"\bmoral\b",
    r"\bética\b",
    r"\blibertad\b",
    r"\bliberty\b",
    r"\bverdad\b",
    r"\btruth\b",
    r"\bargumentos?\b",
    r"\barguments?\b",
    r"\b¿\s*",  # Spanish question mark often indicates debate-style
]


def classify_intent(text: str) -> str:
    """
    Classify intent: "debate" | "practical" | "informational" | "unknown".
    If uncertain → "unknown" (treat as non_debate for reframing).
    """
    if not text or not text.strip():
        return "unknown"
    t = (text or "").strip().lower()

    practical_score = sum(1 for p in PRACTICAL_PATTERNS if re.search(p, t, re.IGNORECASE))
    info_score = sum(1 for p in INFORMATIONAL_PATTERNS if re.search(p, t, re.IGNORECASE))
    debate_score = sum(1 for p in DEBATE_PATTERNS if re.search(p, t, re.IGNORECASE))

    if debate_score > 0 and debate_score >= practical_score and debate_score >= info_score:
        return "debate"
    if practical_score > 0 and practical_score >= info_score:
        return "practical"
    if info_score > 0 and info_score > practical_score:
        return "informational"
    return "unknown"


def is_debate(text: str) -> bool:
    """Return True if intent is debate, False otherwise (non_debate)."""
    return classify_intent(text) == "debate"
