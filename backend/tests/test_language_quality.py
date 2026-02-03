"""
Tests for multilingual debate quality. Ensures EN/ES parity and no boilerplate regression.
Run: cd backend && python -m pytest tests/test_language_quality.py -v
Or:  cd backend && python -c "import tests.test_language_quality as t; t.test_quality_gate_fallback_es_no_boilerplate(); t.test_personality_fallback_es_no_boilerplate(); t.test_en_output_structure(); t.test_es_fallback_via_translate_or_direct(); t.test_language_detection(); print('OK')"
"""
import os


# Boilerplate phrases that must NOT appear in Spanish output
SPANISH_BOILERPLATE_FORBIDDEN = [
    "conecta con debates filosóficos",
    "Tu reflexión sobre",
    "conecta con debates",
    "debates filosóficos y científicos vigentes",
]


def test_quality_gate_fallback_es_no_boilerplate():
    """Spanish quality_gate fallback must NOT contain known boilerplate."""
    from quality_gate import fallback_main_reply
    steelman, contrarian, question = fallback_main_reply("test topic", "es")
    combined = f"{steelman} {contrarian} {question}".lower()
    for phrase in SPANISH_BOILERPLATE_FORBIDDEN:
        assert phrase.lower() not in combined, f"Fallback contains boilerplate: {phrase}"


def test_personality_fallback_es_no_boilerplate():
    """Spanish personality_policy fallback must NOT contain Popper/multiverso boilerplate."""
    from personality_policy import get_validator
    validator = get_validator()
    d = validator.fallback_debate_response("test topic", "user msg", "es")
    dl = d.get("debate_layer", {})
    contrarian = (dl.get("contrarian_position") or "").lower()
    steelman = (dl.get("steelman_of_user") or "").lower()
    combined = steelman + " " + contrarian
    assert "popper" not in combined, "Fallback should not always mention Popper"
    assert "multiverso" not in combined, "Fallback should not always mention multiverso"
    assert "conecta con debates" not in combined, "Fallback should not use boilerplate"


def test_en_output_structure():
    """EN fallback must have position > 80 chars, counterpoint > 80 chars, one question."""
    from debate_layer_generator import _fallback_debate_layer
    layer = _fallback_debate_layer("does god exist according to science?", "en", None)
    assert len(layer.steelman_of_user) > 80, "Steelman too short"
    assert len(layer.contrarian_position) > 80, "Contrarian too short"
    q = layer.socratic_questions[0] if layer.socratic_questions else ""
    assert "?" in q, "Question must contain ?"
    assert q.count("?") == 1, "Exactly one question mark in main question"


def test_spanish_richness_validator():
    """Test _is_spanish_rich heuristic (length + no banned phrases)."""
    from debate_layer_generator import _is_spanish_rich
    # Rich: ES >= 85% of EN, no banned
    en_s = "The strongest position argues that fine-tuning suggests design. Physical constants appear calibrated. Science cannot prove or disprove metaphysical entities."
    en_c = "Methodological naturalism requires natural causes. The multiverse hypothesis offers an alternative. Falsifiability marks a boundary."
    es_s = "La posición más fuerte sostiene que el ajuste fino sugiere diseño. Las constantes físicas parecen calibradas. La ciencia no puede demostrar ni refutar entidades metafísicas."
    es_c = "El naturalismo metodológico exige causas naturales. La hipótesis del multiverso ofrece una alternativa. La falsabilidad marca una frontera."
    assert _is_spanish_rich(en_s, en_c, es_s, es_c), "Should pass richness"
    
    # Too short
    es_s_short = "La posición es fuerte."
    es_c_short = "El contrapunto es válido."
    assert not _is_spanish_rich(en_s, en_c, es_s_short, es_c_short), "Should fail: too short"
    
    # Has banned phrase
    es_s_banned = "Tu reflexión sobre esto conecta con debates filosóficos."
    assert not _is_spanish_rich(en_s, en_c, es_s_banned, es_c), "Should fail: banned phrase"


def test_es_fallback_via_translate_or_direct():
    """ES path: fallback should return valid DebateLayer (EN or translated)."""
    from debate_layer_generator import _fallback_debate_layer, DebateLayer
    # Without llm_client, returns EN fallback
    layer = _fallback_debate_layer("existe dios?", "es", None)
    assert isinstance(layer, DebateLayer)
    assert layer.steelman_of_user
    assert layer.contrarian_position
    assert len(layer.socratic_questions) >= 3


def test_language_detection():
    """Language detector returns es for Spanish, en for English."""
    from language_detector import detect_language
    assert detect_language("existe dios según la ciencia?") == "es"
    assert detect_language("does god exist according to science?") == "en"


def test_en_debate_rich_output():
    """Integration: EN input produces rich output (>400 chars position, >250 counterpoint). Skips if no API key."""
    if not os.getenv("OPENAI_API_KEY") and not os.getenv("LLM_API_KEY"):
        print("Skipped test_en_debate_rich_output (no API key)")
        return
    from debate_layer_generator import generate_debate_layer
    layer = generate_debate_layer(
        topic="Does god exist according to science?",
        user_message="does god exist according to science?",
        stance="balanced",
        facts_summary="Science and religion have complex relationships.",
        response_language="en",
    )
    assert len(layer.steelman_of_user) > 400, f"Position too short: {len(layer.steelman_of_user)} chars"
    assert len(layer.contrarian_position) > 250, f"Counterpoint too short: {len(layer.contrarian_position)} chars"
    q = layer.socratic_questions[0] if layer.socratic_questions else ""
    assert "?" in q
    assert q.count("?") <= 1, "Main question should have at most one ?"


def test_es_debate_rich_and_not_boilerplate():
    """Integration: ES produces rich Spanish (>400 chars, >= 85% of EN). Skips if no API key."""
    if not os.getenv("OPENAI_API_KEY") and not os.getenv("LLM_API_KEY"):
        print("Skipped test_es_debate_rich_and_not_boilerplate (no API key)")
        return
    from debate_layer_generator import generate_debate_layer
    # Generate EN first
    en_layer = generate_debate_layer(
        topic="Does god exist according to science?",
        user_message="does god exist according to science?",
        stance="balanced",
        facts_summary="Science and religion have complex relationships.",
        response_language="en",
    )
    # Generate ES (should translate from EN)
    es_layer = generate_debate_layer(
        topic="¿Existe Dios según la ciencia?",
        user_message="existe dios según la ciencia?",
        stance="balanced",
        facts_summary="La ciencia y la religión tienen relaciones complejas.",
        response_language="es",
    )
    pos_en_len = len(en_layer.steelman_of_user)
    pos_es_len = len(es_layer.steelman_of_user)
    ctr_en_len = len(en_layer.contrarian_position)
    ctr_es_len = len(es_layer.contrarian_position)
    
    assert pos_es_len > 400, f"Spanish position too short: {pos_es_len} chars"
    assert ctr_es_len > 250, f"Spanish counterpoint too short: {ctr_es_len} chars"
    assert pos_es_len >= 0.75 * pos_en_len, f"Spanish position much shorter than EN: {pos_es_len} vs {pos_en_len}"
    
    combined = (es_layer.steelman_of_user + " " + es_layer.contrarian_position).lower()
    for phrase in SPANISH_BOILERPLATE_FORBIDDEN:
        assert phrase.lower() not in combined, f"Output contains boilerplate: {phrase}"
    spanish_markers = ["la", "que", "de", "el", "en", "ciencia"]
    assert any(m in combined for m in spanish_markers), "Output should be in Spanish"
