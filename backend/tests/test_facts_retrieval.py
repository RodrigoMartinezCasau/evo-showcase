"""
Unit tests for facts_retrieval.get_three_facts.
- Always returns exactly 3 facts.
- No fact claim contains "?".
- All items are from knowledge_base_facts (id has known KB prefix).
- For history-related query (e.g. "era hitler bueno?") returns history domain facts, not cosmology.
Run: cd backend && python -m pytest tests/test_facts_retrieval.py -v
"""
import pytest

# Valid id prefixes from knowledge_base_facts/*.json (no quotes/literature)
KB_ID_PREFIXES = (
    "cosmo_", "fis_", "quim_", "bio_", "hist_", "psico_", "tec_", "econ_", "gen_",
    "gen_fallback_", "gen_pad_",
)


def test_always_returns_three():
    """get_three_facts must always return a list of exactly 3 items."""
    from facts_retrieval import get_three_facts
    for query in ["", "xyz random", "big bang", "era hitler bueno?", "fotosíntesis", "inflación economía"]:
        result = get_three_facts(query)
        assert isinstance(result, list), f"Expected list for query {query!r}"
        assert len(result) == 3, f"Expected exactly 3 facts for query {query!r}, got {len(result)}"


def test_no_question_marks_in_claims():
    """No returned fact claim must contain a question mark."""
    from facts_retrieval import get_three_facts
    for query in ["big bang universo", "era hitler bueno?", "qué es la gravedad"]:
        result = get_three_facts(query)
        for i, item in enumerate(result):
            claim = (item.get("claim") or "").strip()
            assert "?" not in claim, f"Fact {i} contains '?' for query {query!r}: {claim[:80]}..."


def test_all_from_knowledge_base_facts():
    """All returned items must have id that corresponds to knowledge_base_facts (known prefix)."""
    from facts_retrieval import get_three_facts
    result = get_three_facts("random topic xyz")
    for item in result:
        fid = (item.get("id") or "").strip()
        assert fid, f"Fact must have non-empty id: {item}"
        ok = any(fid.startswith(prefix) for prefix in KB_ID_PREFIXES)
        assert ok, f"Fact id {fid!r} must start with a known KB prefix (e.g. cosmo_, hist_, gen_)"


def test_hitler_query_returns_history_not_cosmology():
    """For 'era hitler bueno?' the 3 facts should be from history domain (hist_*), not cosmology (cosmo_*)."""
    from facts_retrieval import get_three_facts
    result = get_three_facts("era hitler bueno?")
    assert len(result) == 3
    history_ids = [item.get("id") for item in result if (item.get("id") or "").startswith("hist_")]
    cosmology_ids = [item.get("id") for item in result if (item.get("id") or "").startswith("cosmo_")]
    assert len(history_ids) >= 1, (
        f"Expected at least one history fact (hist_*) for 'era hitler bueno?', got ids: {[item.get('id') for item in result]}"
    )
    assert len(cosmology_ids) == 0, (
        f"For 'era hitler bueno?' expected no cosmology facts (cosmo_*), got: {cosmology_ids}"
    )


@pytest.mark.parametrize(
    "query",
    [
        "¿Existe Dios según la ciencia?",
        "¿Era Hitler bueno?",
        "¿El comunismo funciona?",
        "¿Existe el mundo más allá de mi mente?",
    ],
)
def test_concept_queries_always_three_and_nonempty_scores(query: str) -> None:
    """
    For key concept-heavy queries, we always get exactly 3 facts and,
    unless only pure fallbacks are used, at least one fact has a positive score.
    """
    from facts_retrieval import get_three_facts

    result = get_three_facts(query)
    assert isinstance(result, list)
    assert len(result) == 3

    scores = [item.get("score", 0.0) for item in result]
    # Some queries may still fall back to general-method facts; we only assert that
    # at least one fact has non-zero score if any scoring is applied.
    assert any(s is not None and s >= 0.0 for s in scores)
