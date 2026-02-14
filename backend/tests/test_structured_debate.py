"""Tests for structured debate output: schema validation, constraints (titles <= 30 words, bullets non-trivial, etc.)."""
import unittest
from debate_layer_generator import (
    _validate_structured_debate,
    _derived_flat_from_stance_section,
    _word_count,
    MAX_TITLE_WORDS,
    MIN_BULLETS_PER_POINT,
    MAX_BULLETS_PER_POINT,
    MIN_BULLET_LEN,
    StructuredSection,
    QuestionSection,
)


def _valid_stance():
    return {
        "section_title": "TU POSTURA (EN SU MEJOR VERSIÓN)",
        "points": [
            {
                "index": 1,
                "title": "First argument",
                "bullets": [
                    {"text": "This is a bullet that is long enough to pass the minimum length check."},
                    {"text": "Another full sentence that meets the minimum character requirement."},
                ],
            },
            {
                "index": 2,
                "title": "Second argument",
                "bullets": [
                    {"text": "First bullet with sufficient length for validation."},
                    {"text": "Second bullet that is also long enough."},
                ],
            },
        ],
        "quick_summary": "A brief summary in one or two sentences.",
    }


def _valid_counter():
    return {
        "section_title": "CONTRAPOSTURA",
        "points": [
            {
                "index": 1,
                "title": "Counter first",
                "bullets": [
                    {"text": "A counter bullet that is long enough to pass."},
                    {"text": "Another counter bullet with sufficient length."},
                ],
            },
            {
                "index": 2,
                "title": "Counter second",
                "bullets": [
                    {"text": "First counter bullet with sufficient length."},
                    {"text": "Second counter bullet that is long enough."},
                ],
            },
        ],
        "quick_summary": "Counter summary in one or two sentences.",
    }


def _valid_question():
    return {"section_title": "PREGUNTA PARA TI", "socratic_question": "What would change your view on this?"}


class TestStructuredDebate(unittest.TestCase):
    """Structured debate validation and constraints."""

    def test_titles_max_30_words(self):
        """Titles must be <= 30 words."""
        self.assertEqual(_word_count("one two three"), 3)
        long_title = " ".join(["word"] * (MAX_TITLE_WORDS + 1))
        d = {
            "stance": {**_valid_stance(), "points": [{**_valid_stance()["points"][0], "title": long_title}]},
            "counter": _valid_counter(),
            "question": _valid_question(),
            "counterarguments": [],
            "where_contrarian_might_fail": [],
        }
        result = _validate_structured_debate(d)
        self.assertIsNone(result)

    def test_each_section_has_at_least_one_point(self):
        """Each section must have >= 1 point (validation requires at least 1)."""
        d = {
            "stance": {**_valid_stance(), "points": []},
            "counter": _valid_counter(),
            "question": _valid_question(),
            "counterarguments": [],
            "where_contrarian_might_fail": [],
        }
        result = _validate_structured_debate(d)
        self.assertIsNone(result)

    def test_bullets_non_trivial_min_length(self):
        """Bullets must be non-trivial (min length > 30 chars)."""
        short_bullet = "Short."
        d = {
            "stance": {
                **_valid_stance(),
                "points": [
                    {
                        "index": 1,
                        "title": "First",
                        "bullets": [
                            {"text": "This bullet is long enough to pass the minimum length."},
                            {"text": short_bullet},
                        ],
                    },
                ],
            },
            "counter": _valid_counter(),
            "question": _valid_question(),
            "counterarguments": [],
            "where_contrarian_might_fail": [],
        }
        result = _validate_structured_debate(d)
        self.assertIsNone(result)

    def test_quick_summary_exists(self):
        """quick_summary must exist and be non-empty."""
        d = {
            "stance": {**_valid_stance(), "quick_summary": ""},
            "counter": _valid_counter(),
            "question": _valid_question(),
            "counterarguments": [],
            "where_contrarian_might_fail": [],
        }
        result = _validate_structured_debate(d)
        self.assertIsNone(result)

    def test_socratic_question_one_line(self):
        """socratic_question must be a single line (no newlines)."""
        d = {
            "stance": _valid_stance(),
            "counter": _valid_counter(),
            "question": {"section_title": "PREGUNTA PARA TI", "socratic_question": "Line one.\nLine two."},
            "counterarguments": [],
            "where_contrarian_might_fail": [],
        }
        result = _validate_structured_debate(d)
        self.assertIsNone(result)

    def test_valid_structured_debate_returns_sections(self):
        """Valid payload returns (stance_section, counter_section, question_section)."""
        d = {
            "stance": _valid_stance(),
            "counter": _valid_counter(),
            "question": _valid_question(),
            "counterarguments": ["C1"],
            "where_contrarian_might_fail": ["W1"],
        }
        result = _validate_structured_debate(d)
        self.assertIsNotNone(result)
        stance_sec, counter_sec, question_sec = result
        self.assertIsInstance(stance_sec, StructuredSection)
        self.assertIsInstance(counter_sec, StructuredSection)
        self.assertIsInstance(question_sec, QuestionSection)
        self.assertGreaterEqual(len(stance_sec.points), 2)
        self.assertGreaterEqual(len(counter_sec.points), 2)
        self.assertTrue(stance_sec.quick_summary)
        self.assertTrue(counter_sec.quick_summary)
        self.assertTrue(question_sec.socratic_question)
        self.assertNotIn("\n", question_sec.socratic_question)
        for p in stance_sec.points + counter_sec.points:
            self.assertLessEqual(_word_count(p.title), MAX_TITLE_WORDS)
            self.assertTrue(MIN_BULLETS_PER_POINT <= len(p.bullets) <= MAX_BULLETS_PER_POINT)
            for b in p.bullets:
                self.assertGreaterEqual(len(b.text), MIN_BULLET_LEN)

    def test_derived_flat_from_stance_section(self):
        """Derived flat text includes titles, bullets, and quick_summary."""
        result = _validate_structured_debate({
            "stance": _valid_stance(),
            "counter": _valid_counter(),
            "question": _valid_question(),
            "counterarguments": [],
            "where_contrarian_might_fail": [],
        })
        self.assertIsNotNone(result)
        stance_sec, _, _ = result
        flat = _derived_flat_from_stance_section(stance_sec)
        self.assertIn("First argument", flat)
        self.assertIn("RESUMEN RÁPIDO", flat)
        self.assertIn(stance_sec.quick_summary, flat)
