"""
Regression test: Spanish responses must vary by input, not return the same template.
Run: cd backend && python -m pytest tests/test_spanish_not_constant.py -v
Skips if no OPENAI_API_KEY / LLM_API_KEY.
"""
import os


def test_spanish_outputs_differ_for_different_questions():
    """Call pipeline twice with different Spanish questions; assert outputs differ and are Spanish."""
    if not os.getenv("OPENAI_API_KEY") and not os.getenv("LLM_API_KEY"):
        print("Skipped test_spanish_outputs_differ_for_different_questions (no API key)")
        return

    from main import _run_debate_pipeline, DebateRequest

    req1 = DebateRequest(
        topic="Existencia de Dios",
        user_message="¿Existe Dios según la ciencia? ¿Qué dice el ajuste fino?",
        user_stance=None,
    )
    req2 = DebateRequest(
        topic="Origen del universo",
        user_message="¿Por qué hay algo en vez de nada? ¿Tiene sentido la pregunta?",
        user_stance=None,
    )

    r1 = _run_debate_pipeline(req1, debate_memory=None, response_language="es")
    r2 = _run_debate_pipeline(req2, debate_memory=None, response_language="es")

    pos1 = (r1.debate_layer.steelman_of_user or "").strip()
    pos2 = (r2.debate_layer.steelman_of_user or "").strip()
    ctr1 = (r1.debate_layer.contrarian_position or "").strip()
    ctr2 = (r2.debate_layer.contrarian_position or "").strip()

    combined1 = pos1 + " " + ctr1
    combined2 = pos2 + " " + ctr2

    assert pos1 != pos2, "Position text should not be identical for different questions"
    assert combined1 != combined2, "Full debate text should differ"
    assert combined1[:120] != combined2[:120], "First 120 characters should differ"

    for text, label in [(combined1, "response1"), (combined2, "response2")]:
        assert any(
            w in text.lower() for w in ["que", "para", "por", "evidencia"]
        ), f"Spanish {label} should contain at least one of que/para/por/evidencia: {text[:200]}..."
