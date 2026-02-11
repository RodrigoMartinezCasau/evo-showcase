"""
Retrieve exactly 3 facts from knowledge_base_facts/ (JSON domain files + general fallback).
Facts are ONLY from this KB; no LLM, no quotes/literature/philosophy.
Score: hybrid lexical (0.55) + keyword overlap (0.25) + tag overlap (0.20). score_pct rescaled 20–100 for top 3.
Concept-based path: when query_concepts non-empty, filter by fact.concepts and score by concept + keyword overlap; else fallback to domain-based retrieval.
"""
import json
import logging
import math
import re
import unicodedata
from pathlib import Path
from typing import Any

import yaml

logger = logging.getLogger(__name__)

KB_FACTS_DIR = Path(__file__).resolve().parent / "knowledge_base_facts"
GENERAL_FILE = KB_FACTS_DIR / "general.json"
CONCEPT_MAP_PATH = Path(__file__).resolve().parent / "concept_map.yml"
MIN_TEXT_LEN = 40

# Calibration for relevance percentage. Scores below A ~ 0%, above B ~ 100%.
CALIB_A = 0.25
CALIB_B = 0.75

# Minimum raw similarity threshold for considering a fact "relevant enough" in the main pass.
MIN_SIM = 0.05

# Simple domain groups for adjacency (hierarchical fallback) and gating.
DOMAIN_ADJACENCY: dict[str, list[str]] = {
    "psicologia": ["sociologia", "biologia", "general"],
    "sociologia": ["psicologia", "historia", "general"],
    "economia": ["psicologia", "sociologia", "general"],
    "biologia": ["psicologia", "general"],
    "fisica": ["cosmologia", "matematicas", "general"],
    "cosmologia": ["fisica", "matematicas", "general"],
    "historia": ["sociologia", "general"],
    "tecnologia": ["computacion", "general"],
}

# History domain should only be used when query is explicitly historical.
HISTORY_QUERY_KEYWORDS = frozenset([
    "historia",
    "guerra",
    "guerras",
    "revolucion",
    "revolución",
    "revoluciones",
    "hitler",
    "nazi",
    "nazis",
    "wwii",
    "segunda guerra",
    "primera guerra",
])

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


def _normalize_for_concept(w: str) -> str:
    """Lowercase, strip diacritics, alphanumeric only. For concept-map matching."""
    if not w:
        return ""
    s = (w or "").lower().strip()
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return "".join(c for c in s if c.isalnum() or c == "_").strip()


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
                    "concepts": item.get("concepts") if isinstance(item.get("concepts"), list) else [],
                    "keywords": item.get("keywords") if isinstance(item.get("keywords"), list) else [],
                })
            result[domain] = facts
        except Exception as e:
            logger.warning("Failed to load %s: %s", path.name, e)
    return result


def _load_concept_map() -> tuple[dict[str, set[str]], dict[str, set[str]]]:
    """
    Load concept_map.yml and build:
    - surface_to_concepts: normalized surface token/phrase -> set of canonical concept_ids
    - concept_related: canonical concept_id -> set of related concept_ids

    Supports two formats for backwards compatibility:
    1) Legacy: {surface_word: concept_id}
    2) Structured: {concept_id: {aliases: [...], related: [...]} }
    """
    if not CONCEPT_MAP_PATH.exists():
        return {}, {}
    try:
        with open(CONCEPT_MAP_PATH, "r", encoding="utf-8") as f:
            raw = yaml.safe_load(f)
    except Exception as e:
        logger.warning("Failed to load concept_map.yml: %s", e)
        return {}, {}
    if not isinstance(raw, dict):
        return {}, {}

    # Legacy flat format: surface -> concept_id
    if raw and all(not isinstance(v, dict) for v in raw.values()):
        surface_to_concepts: dict[str, set[str]] = {}
        for k, v in (raw or {}).items():
            surface = _normalize_for_concept(str(k).strip())
            concept = (str(v).strip().lower() if v else "").replace(" ", "_")
            if surface and concept:
                surface_to_concepts.setdefault(surface, set()).add(concept)
        return surface_to_concepts, {}

    # Structured format: concept_id -> {aliases: [...], related: [...]}
    surface_to_concepts: dict[str, set[str]] = {}
    concept_related: dict[str, set[str]] = {}
    for raw_concept, cfg in (raw or {}).items():
        if not raw_concept:
            continue
        concept_id = str(raw_concept).strip().lower().replace(" ", "_")
        if not concept_id:
            continue
        if not isinstance(cfg, dict):
            continue
        aliases = cfg.get("aliases") or []
        related = cfg.get("related") or []
        # Map aliases (surface forms) -> concept_id
        for alias in aliases:
            surface = _normalize_for_concept(str(alias).strip())
            if surface:
                surface_to_concepts.setdefault(surface, set()).add(concept_id)
        # Map related concepts
        for rel in related:
            rel_id = str(rel).strip().lower().replace(" ", "_")
            if rel_id:
                concept_related.setdefault(concept_id, set()).add(rel_id)
    return surface_to_concepts, concept_related


def _extract_query_concepts(query_text: str, surface_to_concepts: dict[str, set[str]]) -> set[str]:
    """
    From query text: tokenize, normalize, map to concepts via concept_map.
    Uses unigrams and simple bigrams. Returns set of canonical concept_ids.
    """
    if not surface_to_concepts:
        return set()
    text = (query_text or "").strip()[:500]
    tokens = _PUNCT.sub(" ", text).strip().lower().split()
    query_concepts: set[str] = set()
    # Unigrams
    for w in tokens:
        if not w or w in STOPWORDS:
            continue
        norm = _normalize_for_concept(w)
        if norm and norm in surface_to_concepts:
            query_concepts.update(surface_to_concepts[norm])
    # Simple bigrams for phrases like "segunda guerra"
    for i in range(len(tokens) - 1):
        w1, w2 = tokens[i], tokens[i + 1]
        if not w1 or not w2:
            continue
        bigram = f"{w1} {w2}"
        norm = _normalize_for_concept(bigram)
        if norm and norm in surface_to_concepts:
            query_concepts.update(surface_to_concepts[norm])
    return query_concepts


def _fact_concepts_for_matching(
    fact: dict,
    surface_to_concepts: dict[str, set[str]],
) -> set[str]:
    """
    Derive canonical concept_ids for a fact from:
    - explicit fact['concepts'] (already canonical ids)
    - tags mapped via concept_map aliases (including simple bigrams)
    """
    concepts: set[str] = set()
    # Explicit concepts
    for c in fact.get("concepts") or []:
        norm_id = _normalize_for_concept(str(c)).replace(" ", "_")
        if norm_id:
            concepts.add(norm_id)
    # Concepts from tags using alias map
    tags = fact.get("tags") or []
    for tag in tags:
        tag_text = str(tag or "").lower()
        if not tag_text:
            continue
        # Whole tag phrase
        phrase_norm = _normalize_for_concept(tag_text)
        if phrase_norm and phrase_norm in surface_to_concepts:
            concepts.update(surface_to_concepts[phrase_norm])
        # Tokens and bigrams from tag
        tag_tokens = _PUNCT.sub(" ", tag_text.replace("_", " ")).split()
        for w in tag_tokens:
            if not w or w in STOPWORDS:
                continue
            norm = _normalize_for_concept(w)
            if norm and norm in surface_to_concepts:
                concepts.update(surface_to_concepts[norm])
        for i in range(len(tag_tokens) - 1):
            w1, w2 = tag_tokens[i], tag_tokens[i + 1]
            if not w1 or not w2:
                continue
            bigram = f"{w1} {w2}"
            norm = _normalize_for_concept(bigram)
            if norm and norm in surface_to_concepts:
                concepts.update(surface_to_concepts[norm])
    return concepts


def _select_with_diversity(
    scored: list[tuple[dict, float, set[str]]],
    query_concepts: set[str],
    max_n: int,
) -> list[tuple[dict, float]]:
    """
    Given scored facts (fact, score, fact_concepts), select up to max_n with:
    - preference for different primary concepts (1 per concept when possible)
    - deterministic order (input scored must already be sorted)
    """
    selected: list[tuple[dict, float]] = []
    seen_ids: set[str] = set()
    used_concepts: set[str] = set()

    def primary_concept(concepts: set[str]) -> str | None:
        if not concepts:
            return None
        direct = concepts & query_concepts
        if direct:
            return sorted(direct)[0]
        return sorted(concepts)[0]

    # First pass: enforce one per primary concept when possible
    for fact, sc, concepts in scored:
        if len(selected) >= max_n:
            break
        fid = (fact.get("id") or "").strip()
        if not fid or fid in seen_ids:
            continue
        pc = primary_concept(concepts)
        if pc and pc in used_concepts:
            continue
        seen_ids.add(fid)
        if pc:
            used_concepts.add(pc)
        selected.append((fact, sc))

    # Second pass: relax concept diversity but keep id uniqueness
    if len(selected) < max_n:
        for fact, sc, concepts in scored:
            if len(selected) >= max_n:
                break
            fid = (fact.get("id") or "").strip()
            if not fid or fid in seen_ids:
                continue
            seen_ids.add(fid)
            selected.append((fact, sc))

    return selected


def _get_facts_concept_based(
    query_text: str,
    domains_data: dict[str, list[dict]],
    general_facts: list[dict],
    surface_to_concepts: dict[str, set[str]],
    concept_related: dict[str, set[str]],
    max_n: int = 3,
) -> list[tuple[dict, float]]:
    """
    Concept-based retrieval path.
    Returns up to max_n (fact, score) pairs, possibly empty.
    - Phase 1: exact concept matches only.
    - Phase 2: exact + related concepts.
    """
    if not surface_to_concepts:
        return []

    query_concepts = _extract_query_concepts(query_text, surface_to_concepts)
    if not query_concepts:
        return []

    # Related concepts for broader match if needed
    related_concepts: set[str] = set()
    for c in query_concepts:
        related_concepts.update(concept_related.get(c, set()))

    all_facts: list[dict] = []
    for facts in domains_data.values():
        all_facts.extend(facts)
    all_facts.extend(general_facts)

    # Precompute concepts for each fact
    fact_concepts_set: dict[int, set[str]] = {}
    for f in all_facts:
        fact_concepts_set[id(f)] = _fact_concepts_for_matching(f, surface_to_concepts)

    # Keywords from query for minor signal
    query_keywords = set(_extract_prompt_keywords(query_text))

    def _score_fact_for_concepts(
        f: dict,
        concepts: set[str],
        allow_related: bool,
    ) -> float:
        exact_overlap = len(concepts & query_concepts)
        if not allow_related and exact_overlap == 0:
            return 0.0
        related_overlap = 0
        if allow_related and related_concepts:
            related_overlap = len(concepts & related_concepts)
        if exact_overlap == 0 and related_overlap == 0:
            return 0.0
        text = (f.get("text") or "").lower()
        tags_str = " ".join(str(t) for t in (f.get("tags") or [])).lower()
        kw_str = " ".join(str(k) for k in (f.get("keywords") or [])).lower()
        combined = f"{text} {tags_str} {kw_str}"
        keyword_overlap = sum(
            1
            for qw in query_keywords
            if qw and (qw in combined)
        )
        # Exact concepts dominate, related concepts secondary, keywords minor.
        return 10.0 * exact_overlap + 5.0 * related_overlap + 1.0 * keyword_overlap

    # Phase 1: only exact concept matches
    scored_exact: list[tuple[dict, float, set[str]]] = []
    for f in all_facts:
        concepts = fact_concepts_set.get(id(f), set())
        if not concepts:
            continue
        sc = _score_fact_for_concepts(f, concepts, allow_related=False)
        if sc <= 0:
            continue
        scored_exact.append((f, sc, concepts))

    if scored_exact:
        scored_exact.sort(key=lambda x: (-x[1], (x[0].get("id") or "")))
        return _select_with_diversity(scored_exact, query_concepts, max_n)

    # Phase 2: allow related concepts as well
    if not related_concepts:
        return []

    scored_all: list[tuple[dict, float, set[str]]] = []
    for f in all_facts:
        concepts = fact_concepts_set.get(id(f), set())
        if not concepts:
            continue
        sc = _score_fact_for_concepts(f, concepts, allow_related=True)
        if sc <= 0:
            continue
        scored_all.append((f, sc, concepts))

    if not scored_all:
        return []

    scored_all.sort(key=lambda x: (-x[1], (x[0].get("id") or "")))
    return _select_with_diversity(scored_all, query_concepts, max_n)


def _score_domains(query_text: str, domains_data: dict[str, list[dict]]) -> dict[str, float]:
    """
    Lightweight domain scoring using fact tags and domain name.
    Returns {domain: score in 0..1}.
    """
    keywords = set(_extract_prompt_keywords(query_text))
    query_lower = (query_text or "").lower()
    if not keywords:
        return {}
    scores: dict[str, float] = {}
    for domain, facts in domains_data.items():
        if domain == "general":
            continue
        # Hard gating for history: only allow when query is explicitly historical.
        if domain == "historia":
            if not any(k in query_lower for k in HISTORY_QUERY_KEYWORDS):
                continue
        domain_tokens: set[str] = {domain.lower()}
        for f in facts:
            for tag in f.get("tags") or []:
                for w in _PUNCT.sub(" ", str(tag).lower()).split():
                    if len(w) > 2 and w not in STOPWORDS:
                        domain_tokens.add(_normalize_plural(w))
        if not domain_tokens:
            continue
        overlap = 0
        for kw in keywords:
            for tok in domain_tokens:
                if kw in tok or tok in kw:
                    overlap += 1
                    break
        if overlap == 0:
            continue
        scores[domain] = overlap / max(1, len(domain_tokens))
    return scores


def _expand_domains(primary_domains: list[str]) -> list[str]:
    """
    Hierarchical domain fallback: start from primary domains, then add adjacent ones.
    History is never added unless explicitly in primary_domains (gated above).
    """
    if not primary_domains:
        # Safe default when we cannot infer domain: prefer human/soft-science and general science.
        return ["psicologia", "sociologia", "economia", "biologia", "general", "cosmologia", "fisica"]
    allowed: set[str] = set(primary_domains)
    for d in primary_domains:
        for adj in DOMAIN_ADJACENCY.get(d, []):
            allowed.add(adj)
    return list(allowed)


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
    Map raw scores to calibrated percentages 0–100 using linear window [CALIB_A, CALIB_B].
    Scores <= CALIB_A -> 0, scores >= CALIB_B -> 100.
    """
    pcts: list[int] = []
    denom = CALIB_B - CALIB_A if CALIB_B != CALIB_A else 1.0
    for s in scores:
        adj = (s - CALIB_A) / denom
        if adj < 0:
            adj = 0.0
        elif adj > 1:
            adj = 1.0
        pct = int(round(adj * 100))
        # Never render 0%; treat extremely low scores as 10% to avoid "nonsense zero" perception.
        if pct == 0:
            pct = 10
        pcts.append(pct)
    return pcts


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

    # Concept-based path: when query_concepts are detected, try concept/keyword retrieval first.
    surface_to_concepts, concept_related = _load_concept_map()
    concept_top = _get_facts_concept_based(
        query_text=query_text,
        domains_data=domains_data,
        general_facts=general_facts,
        surface_to_concepts=surface_to_concepts,
        concept_related=concept_related,
        max_n=3,
    )

    # We will accumulate up to 3 facts, first from concept-based path, then from domain/general fallback.
    selected: list[tuple[dict, float]] = []
    seen_ids: set[str] = set()

    if concept_top:
        for fact, sc in concept_top:
            if len(selected) >= 3:
                break
            fid = (fact.get("id") or "").strip()
            if not fid or fid in seen_ids:
                continue
            seen_ids.add(fid)
            selected.append((fact, sc))

    # Domain-level scoring to prioritize likely relevant domains (fallback after concepts)
    domain_scores = _score_domains(query_text, domains_data)
    sorted_domains = sorted(domain_scores.items(), key=lambda x: -x[1])
    top_domains = [d for d, _ in sorted_domains[:4] if domain_scores.get(d, 0.0) > 0]
    allowed_domains = _expand_domains(top_domains)

    # Build (fact, domain) for all domains including general
    all_candidates: list[tuple[dict, str]] = []
    for domain, facts in domains_data.items():
        for f in facts:
            all_candidates.append((f, domain))
    for f in general_facts:
        all_candidates.append((f, "general"))

    # Score each with deterministic score_fact + small domain bonus
    scored: list[tuple[dict, str, float]] = []
    for fact, domain in all_candidates:
        text = (fact.get("text") or "").strip()
        tags = fact.get("tags") or []
        base = score_fact(query_text, text, tags, domain)
        dom_bonus = 0.0
        if domain != "general":
            dom_bonus = 0.2 * domain_scores.get(domain, 0.0)
        sc = max(0.0, min(1.0, round(base + dom_bonus, 4)))
        scored.append((fact, domain, sc))

    # Sort by score desc, then by id for stability
    scored.sort(key=lambda x: (-x[2], (x[0].get("id") or "")))

    # Prefer candidates from allowed/top domains first, then adjacent fallback only
    primary: list[tuple[dict, str, float]] = []
    fallback_scored: list[tuple[dict, str, float]] = []
    for fact, domain, sc in scored:
        if domain in top_domains:
            primary.append((fact, domain, sc))
        elif domain in allowed_domains:
            fallback_scored.append((fact, domain, sc))

    def _consume(
        candidates: list[tuple[dict, str, float]],
        min_sim: float,
    ) -> None:
        nonlocal selected, seen_ids
        for fact, _domain, sc in candidates:
            if len(selected) >= 3:
                break
            if sc < min_sim:
                continue
            fid = (fact.get("id") or "").strip()
            if not fid or fid in seen_ids:
                continue
            seen_ids.add(fid)
            selected.append((fact, sc))

    # First pass: only facts above MIN_SIM from top domains, then adjacent ones.
    if len(selected) < 3:
        _consume(primary, MIN_SIM)
    if len(selected) < 3:
        _consume(fallback_scored, MIN_SIM)

    # Second pass (relaxed): if still not enough, allow lower scores but keep domain gating.
    if len(selected) < 3:
        _consume(primary, 0.0)
    if len(selected) < 3:
        _consume(fallback_scored, 0.0)

    # Fill from general if fewer than 3 (score 0) – general method fallback.
    for f in general_facts:
        if len(selected) >= 3:
            break
        fid = (f.get("id") or "").strip()
        if not fid or fid in seen_ids:
            continue
        seen_ids.add(fid)
        selected.append((f, 0.0))

    # Last resort: pad with generic line (score 0) if KB/general.json is missing.
    while len(selected) < 3:
        fid = f"gen_pad_{len(selected)}"
        selected.append((
            {
                "id": fid,
                "text": "Hecho verificado desde la base de conocimiento (consulta general).",
                "tags": [],
                "sources": ["KB"],
            },
            0.0,
        ))

    # Rescale score_pct for display among final 3
    scores_only = [s for _, s in selected]
    score_pcts = _rescale_score_pct(scores_only)

    result: list[dict] = []
    for i, (fact, sc) in enumerate(selected[:3]):
        pct = score_pcts[i] if i < len(score_pcts) else 50
        result.append(_fact_to_ui_item(fact, sc, score_pct=pct))

    return result
