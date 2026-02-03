"""
Casual chat MessageParser: converts a single message into DebateRequest fields.
Uses heuristics for topic (short label) and user_stance; user_message is the original.
"""
import re
from typing import Any


# Stance keywords (case-insensitive); first match wins in order below
STANCE_PATTERNS = [
    ("theist", ["creo en dios", "belief in god", "believe in god", "theist", "theism", "faith", "religious", "creo que dios", "hay dios"]),
    ("atheist", ["no creo en dios", "don't believe in god", "do not believe", "atheist", "atheism", "no hay dios", "no evidence for god"]),
    ("agnostic", ["agnostic", "no sé", "don't know", "uncertain", "unsure", "can't know", "cannot know", "no podemos saber"]),
]


def parse_message(message: str, _context: Any = None) -> dict[str, Any]:
    """
    Convert a casual message into DebateRequest-like fields.
    Returns: { "topic": str, "user_message": str, "user_stance": str | None }
    _context reserved for future thread history.
    """
    msg = (message or "").strip()
    if not msg:
        return {"topic": "General", "user_message": msg, "user_stance": None}

    # Topic: first sentence (up to . ? ! or newline) or first 50 chars
    first_sentence = re.split(r"[.?!\n]", msg, 1)[0].strip()
    topic = (first_sentence[:50] + ("..." if len(first_sentence) > 50 else "")) if first_sentence else msg[:50]
    if not topic:
        topic = "General"

    # Stance: keyword heuristics
    lower = msg.lower()
    user_stance = None
    for stance, keywords in STANCE_PATTERNS:
        if any(kw in lower for kw in keywords):
            user_stance = stance
            break

    return {
        "topic": topic,
        "user_message": msg,
        "user_stance": user_stance,
    }
