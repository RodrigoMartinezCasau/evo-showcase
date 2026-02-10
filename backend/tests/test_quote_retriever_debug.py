"""Quick validation: print selected quote IDs for sample prompts (no UI changes)."""
import sys
from pathlib import Path

# Ensure backend is on path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from debate_retriever import debug_quote_retrieval


def test_debug_quote_retrieval():
    """Run debug_quote_retrieval for the three sample prompts."""
    debug_quote_retrieval(
        sample_prompts=[
            "existe dios segun la ciencia?",
            "el comunismo funciona?",
            "era hitler bueno?",
        ]
    )


if __name__ == "__main__":
    test_debug_quote_retrieval()
