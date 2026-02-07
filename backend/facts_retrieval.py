"""
Retrieve exactly 3 facts from knowledge_base_facts/ (JSON domain files + general fallback).
Facts are ONLY from this KB; no LLM, no quotes/literature/philosophy.
Score: hybrid lexical (0.55) + keyword overlap (0.25) + tag overlap (0.20). score_pct rescaled 20–100 for top 3.
"""
import json
import logging
import math
import re
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

KB_FACTS_DIR = Path(__file__).resolve().parent / "knowledge_base_facts"
GENERAL_FILE = KB_FACTS_DIR / "general.json"
MIN_TEXT_LEN = 40

# Simple stopwords (EN/ES) for scoring — lightweight, no external deps.
STOPWORDS = frozenset([
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "from",
    "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did",
    "will", "would", "could", "should", "may", "might", "must", "can", "this", "that", "these", "those",
    "it", "its", "as", "so", "if", "then", "than", "when", "where", "which", "who", "what", "how", "why",
    "un", "una", "el", "la", "los", "las", "de", "del", "en", "y", "o", "pero", "que", "con", "por", "para",
    "es", "son", "está", "están", "ser", "estar", "hay", "había", "fue", "fueron", "se", "lo", "le", "al", "a la",
])

# Punctuation to strip for keyword extraction
_PUNCT = re.compile(r"[\s.,;:!?¿¡\"'()\[\]\-–—/\\]+")

# Question starters (EN/ES) — reject facts that start with these (case-insensitive).
QUESTION_STARTERS = frozenset([
    "what", "why", "how", "when", "where", "who", "which", "is", "are", "can", "could", "would", "should", "does", "do", "did", "has", "have", "had", "will", "was", "were",
    "qué", "por qué", "cómo", "cuándo", "dónde", "quién", "cuál", "cuáles", "es", "son", "está", "están", "puede", "pueden", "se puede", "podría", "sería", "debería", "hay", "había", "fue", "fueron",
])


def _tokenize(text: str) -> set[str]:
    """Lowercase words, length > 1."""
    return {w.lower() for w in (text or "").split() if len(w) > 1}


def _tokenize_for_score(text: str) -> list[str]:
    """Lowercase tokens, length > 1, exclude stopwords. For scoring."""
    return [w.lower() for w in (text or "").split() if len(w) > 1 and w.lower() not in STOPWORDS]


def _normalize_plural(w: str) -> str:
    """Simple plural normalization: strip trailing 'es' or 's' (no heavy libs)."""
    if len(w) <= 4:
        return w
    if w.endswith("es") and len(w) > 5:
        return w[:-2]
    if w.endswith("s") and not w.endswith("ss") and len(w) > 4:
        return w[:-1]
    return w


def _extract_prompt_keywords(prompt_text: str) -> list[str]:
    """Extract keywords from prompt: lowercase, no stopwords, no punctuation, length >= 4, optional plural norm."""
    text = (prompt_text or "").strip()[:500]
    raw = _PUNCT.sub(" ", text).strip().lower()
    words = [w for w in raw.split() if w and w not in STOPWORDS and len(w) >= 4]
    return [_normalize_plural(w) for w in words]


def _term_counts(tokens: list[str]) -> dict[str, int]:
    """Bag-of-words counts."""
    out: dict[str, int] = {}
    for t in tokens:
        out[t] = out.get(t, 0) + 1
    return out


def _cosine_sim(counts_a: dict[str, int], counts_b: dict[str, int]) -> float:
    """Cosine similarity between two term-count dicts. Returns 0..1."""
    if not counts_a or not counts_b:
        return 0.0
    dot = sum(counts_a.get(t, 0) * counts_b.get(t, 0) for t in set(counts_a) & set(counts_b))
    norm_a = math.sqrt(sum(c * c for c in counts_a.values()))
    norm_b = math.sqrt(sum(c * c for c in counts_b.values()))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def score_fact(prompt_text: str, fact_text: str, tags: list[str], domain: str) -> float:
    """
    Hybrid relevance score 0..1: 0.55*lexical + 0.25*kw_score + 0.20*tags_score.
    - lexical: bag-of-words cosine between prompt and fact text + tags.
    - kw_score: fraction of prompt keywords (len>=4, no stopwords) that appear in fact_text.
    - tags_score: fraction of fact tags that appear in prompt or match prompt keywords.
    """
    prompt_text = (prompt_text or "").strip()[:500]
    fact_text = (fact_text or "").strip()
    tags = list(tags or [])
    domain = (domain or "").strip().lower()

    # Prompt keywords (length >= 4) for kw_score and tag matching
    prompt_keywords = _extract_prompt_keywords(prompt_text)
    prompt_keyword_set = set(prompt_keywords)
    prompt_lower = prompt_text.lower()

    # Lexical: bag-of-words cosine (all tokens >1, no stopwords)
    prompt_tokens = _tokenize_for_score(prompt_text)
    fact_combined = " ".join([fact_text] + tags + ([domain] if domain else []))
    fact_tokens = _tokenize_for_score(fact_combined)
    prompt_counts = _term_counts(prompt_tokens)
    fact_counts = _term_counts(fact_tokens)
    lexical = _cosine_sim(prompt_counts, fact_counts)
    lexical = max(0.0, min(1.0, lexical))

    # Tag overlap: (# tags that appear in prompt or match prompt keywords) / max(1, #tags)
    tags_matching = 0
    for tag in tags:
        tag_norm = tag.lower().replace(" ", "_").replace("-", "_")
        tag_plain = tag.lower().replace(" ", "").replace("-", "")
        if tag_norm in prompt_lower or tag_plain in prompt_lower:
            tags_matching += 1
            continue
        if any(tag_norm in kw or tag_plain in kw or kw in tag_norm or kw in tag_plain for kw in prompt_keyword_set):
            tags_matching += 1
    tags_score = tags_matching / max(1, len(tags))

    # Keyword overlap: (# prompt keywords that appear in fact_text) / max(1, #keywords_prompt)
    fact_lower = fact_text.lower()
    kw_matching = sum(1 for kw in prompt_keywords if kw in fact_lower)
    kw_score = kw_matching / max(1, len(prompt_keywords))

    score = 0.55 * lexical + 0.25 * kw_score + 0.20 * tags_score
    score = max(0.0, min(1.0, round(score, 4)))
    return score


def _is_question(text: str) -> bool:
    """True if text is a question (ends with ? or starts with question word)."""
    t = (text or "").strip()
    if not t:
        return True
    if t.endswith("?"):
        return True
    first_word = t.split()[0].lower() if t.split() else ""
    if first_word in QUESTION_STARTERS:
        return True
    # Spanish: "¿Qué ..." etc.
    if t.startswith("¿"):
        rest = t[1:].lstrip()
        f = rest.split()[0].lower() if rest.split() else ""
        if f in QUESTION_STARTERS:
            return True
    return False


def _load_domain_facts() -> dict[str, list[dict]]:
    """Load all JSON files from knowledge_base_facts/. Returns {domain_name: [fact_dict, ...]}."""
    result: dict[str, list[dict]] = {}
    if not KB_FACTS_DIR.exists():
        logger.warning("knowledge_base_facts dir does not exist: %s", KB_FACTS_DIR)
        return result
    for path in sorted(KB_FACTS_DIR.glob("*.json")):
        domain = path.stem.lower()
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            if not isinstance(data, list):
                data = [data]
            facts = []
            for item in data:
                if not isinstance(item, dict):
                    continue
                text = (item.get("text") or "").strip()
                if not text or len(text) < MIN_TEXT_LEN:
                    continue
                if _is_question(text):
                    continue
                facts.append({
                    "id": (item.get("id") or f"{domain}_{len(facts)}").strip(),
                    "text": text,
                    "tags": item.get("tags") or [],
                    "sources": item.get("sources") or [],
                })
            result[domain] = facts
        except Exception as e:
            logger.warning("Failed to load %s: %s", path.name, e)
    return result


def _fact_to_ui_item(
    fact: dict,
    score: float | None = None,
    score_pct: int | None = None,
) -> dict[str, Any]:
    """Convert KB fact dict to UI shape: id, claim, certainty, source_name, source_note, score, score_pct."""
    sources = fact.get("sources") or []
    source_name = (sources[0] if sources else "KB").strip()
    source_note = (sources[1] if len(sources) > 1 else None)
    out: dict[str, Any] = {
        "id": (fact.get("id") or "").strip(),
        "claim": (fact.get("text") or "").strip(),
        "value": None,
        "units": None,
        "formula": None,
        "certainty": "verified",
        "source_name": source_name,
        "source_note": source_note,
    }
    if score is not None:
        out["score"] = round(score, 4)
        if score_pct is not None:
            out["score_pct"] = min(100, max(0, score_pct))
        else:
            out["score_pct"] = min(100, max(0, round(score * 100)))
    return out


def _rescale_score_pct(scores: list[float]) -> list[int]:
    """
    Rescale raw scores (top 3) to display percentages 20–100.
    Best fact gets 100%, worst of the three gets 20%. If all equal, 50%.
    """
    if not scores:
        return []
    min_s = min(scores)
    max_s = max(scores)
    if max_s - min_s < 1e-6:
        return [50] * len(scores)
    return [
        min(100, max(0, round(20 + 80 * (s - min_s) / (max_s - min_s))))
        for s in scores
    ]


def get_three_facts(query_text: str) -> list[dict]:
    """
    Return exactly 3 facts from knowledge_base_facts/.
    - Score: deterministic score_fact(prompt, fact_text, tags, domain) 0..1 (cosine + tag/domain bonus).
    - Load all facts from all domains; score each; sort by score desc; take top 3.
    - If all scores < 0.08, still return top 3 (best available). Each fact includes score and score_pct.
    """
    query_text = (query_text or "").strip()[:500] or "general"

    domains_data = _load_domain_facts()
    general_facts = domains_data.pop("general", [])
    if not general_facts and not GENERAL_FILE.exists():
        logger.warning("general.json missing or empty; creating minimal fallback")
        general_facts = [
            {"id": "gen_fallback_1", "text": "El método científico se basa en observación, hipótesis y replicabilidad.", "tags": ["ciencia"], "sources": ["KB"]},
            {"id": "gen_fallback_2", "text": "Las afirmaciones extraordinarias requieren evidencia extraordinaria.", "tags": ["evidencia"], "sources": ["KB"]},
            {"id": "gen_fallback_3", "text": "La correlación no implica causalidad; pueden existir factores confundantes.", "tags": ["estadística"], "sources": ["KB"]},
        ]

    # Build (fact, domain) for all domains including general
    all_candidates: list[tuple[dict, str]] = []
    for domain, facts in domains_data.items():
        for f in facts:
            all_candidates.append((f, domain))
    for f in general_facts:
        all_candidates.append((f, "general"))

    # Score each with deterministic score_fact
    scored: list[tuple[dict, str, float]] = []
    for fact, domain in all_candidates:
        text = (fact.get("text") or "").strip()
        tags = fact.get("tags") or []
        sc = score_fact(query_text, text, tags, domain)
        scored.append((fact, domain, sc))

    # Sort by score desc, then by id for stability
    scored.sort(key=lambda x: (-x[2], (x[0].get("id") or "")))

    # Take top 3, dedupe by id; collect (fact, score) for rescaling
    seen_ids: set[str] = set()
    top3: list[tuple[dict, float]] = []
    for fact, _domain, sc in scored:
        if len(top3) >= 3:
            break
        fid = (fact.get("id") or "").strip()
        if fid in seen_ids:
            continue
        seen_ids.add(fid)
        top3.append((fact, sc))

    # Fill from general if fewer than 3 (score 0)
    for f in general_facts:
        if len(top3) >= 3:
            break
        fid = (f.get("id") or "").strip()
        if fid in seen_ids:
            continue
        seen_ids.add(fid)
        top3.append((f, 0.0))

    # Last resort: pad with generic line (score 0)
    while len(top3) < 3:
        fid = f"gen_pad_{len(top3)}"
        top3.append(({
            "id": fid,
            "text": "Hecho verificado desde la base de conocimiento (consulta general).",
            "tags": [],
            "sources": ["KB"],
        }, 0.0))

    # Rescale score_pct for display: 20–100 among top 3 (best=100%, worst=20%, tie=50)
    scores_only = [s for _, s in top3]
    score_pcts = _rescale_score_pct(scores_only)

    result: list[dict] = []
    for i, (fact, sc) in enumerate(top3[:3]):
        pct = score_pcts[i] if i < len(score_pcts) else 50
        result.append(_fact_to_ui_item(fact, sc, score_pct=pct))

    return result
