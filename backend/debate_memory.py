"""
Per-debate memory extraction. Heuristic (no LLM) to keep cost low.
Extracts: key_terms (max 8), assumptions (max 5), user_stance (1 sentence).
"""
import re
from collections import Counter

from short_title import KEYWORD_MAP, STOPWORDS

MAX_KEY_TERMS = 8
MAX_ASSUMPTIONS = 5


def _tokenize(text: str) -> list[str]:
    """Lowercase tokens, filter stopwords and short words."""
    if not text:
        return []
    text = re.sub(r"[¿?!.,;:()\"—–\-]", " ", text)
    words = [w.lower() for w in text.split() if len(w) > 2 and w.lower() not in STOPWORDS]
    return words


def _extract_key_terms(user_message: str, assistant_content: str, steelman: str) -> list[str]:
    """
    Extract up to 8 key terms: prefer mapped keywords, then significant nouns.
    Combine user message, assistant content, and steelman.
    """
    combined = f"{user_message} {assistant_content} {steelman}"
    words = _tokenize(combined)

    # Prefer KEYWORD_MAP terms first
    seen = set()
    result = []
    for w in words:
        if w in KEYWORD_MAP and w not in seen:
            result.append(KEYWORD_MAP[w])
            seen.add(w)
            if len(result) >= MAX_KEY_TERMS:
                return result

    # Add high-frequency terms (excluding common words)
    counts = Counter(words)
    common = {"que", "como", "para", "este", "esta", "esto", "hay", "una", "uno"}
    for w, _ in counts.most_common(20):
        if w not in seen and w not in common and len(result) < MAX_KEY_TERMS:
            result.append(w[0].upper() + w[1:] if len(w) > 1 else w.upper())
            seen.add(w)

    return result[:MAX_KEY_TERMS]


def _extract_assumptions(steelman: str, counterarguments: list[str]) -> list[str]:
    """
    Extract up to 5 assumptions from steelman and counterarguments.
    Heuristic: sentences that contain "asume", "asumir", "supone", "implica", "presupone".
    """
    result = []
    patterns = [
        r"(?:asume|asumiendo|asumir)\s+que\s+([^.!?]+)",
        r"(?:supone|suponiendo)\s+que\s+([^.!?]+)",
        r"(?:implica|implicando)\s+([^.!?]+)",
        r"(?:presupone|presuponiendo)\s+([^.!?]+)",
        r"la\s+idea\s+de\s+que\s+([^.!?]+)",
    ]
    text = f"{steelman} " + " ".join(counterarguments or [])
    for pat in patterns:
        for m in re.finditer(pat, text, re.IGNORECASE):
            s = m.group(1).strip()
            if len(s) > 10 and len(s) < 120 and s not in result:
                result.append(s[:100])
                if len(result) >= MAX_ASSUMPTIONS:
                    return result

    # Fallback: first 2 short sentences from steelman
    if len(result) < MAX_ASSUMPTIONS and steelman:
        sentences = re.split(r"[.!?]", steelman)
        for s in sentences:
            s = s.strip()
            if 15 < len(s) < 80 and s not in result:
                result.append(s[:100])
                if len(result) >= MAX_ASSUMPTIONS:
                    break

    return result[:MAX_ASSUMPTIONS]


def _extract_user_stance(user_message: str, steelman: str) -> str | None:
    """One-sentence summary of user's stance. Prefer steelman if short enough."""
    if steelman and len(steelman) < 200:
        return steelman.strip()
    if user_message:
        first = re.split(r"[.!?]", user_message)[0].strip()
        if len(first) > 20:
            return first[:150] + ("…" if len(first) > 150 else "")
        return first or None
    return None


def extract_memory(
    user_message: str,
    assistant_content: str,
    steelman: str,
    counterarguments: list[str],
) -> dict:
    """
    Extract DebateMemory fields from a turn.
    Returns: { "key_terms": [...], "assumptions": [...], "user_stance": "..." }
    """
    key_terms = _extract_key_terms(user_message, assistant_content, steelman)
    assumptions = _extract_assumptions(steelman, counterarguments)
    user_stance = _extract_user_stance(user_message, steelman)

    return {
        "key_terms": key_terms,
        "assumptions": assumptions,
        "user_stance": user_stance,
    }
