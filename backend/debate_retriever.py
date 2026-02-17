import logging
import unicodedata
from pathlib import Path
from typing import List, Tuple

import yaml

from debate_kb_schemas import KBScienceEntry, KBPhilosophyQuote, VerbatimQuote
from debate_kb_loader import ScienceKBLoader, PhilosophyKBLoader, QuotesKBLoader

logger = logging.getLogger(__name__)

_BACKEND_DIR = Path(__file__).resolve().parent
QUOTE_STOPWORDS_PATH = _BACKEND_DIR / "quote_stopwords.txt"
QUOTE_SYNONYMS_PATH = _BACKEND_DIR / "quote_synonyms.yaml"
QUOTE_RETRIEVER_CONFIG_PATH = _BACKEND_DIR / "quote_retriever_config.yaml"
TOPIC_MAP_PATH = _BACKEND_DIR / "knowledge_base_quotes" / "topic_map.yml"


def _load_quote_stopwords() -> set[str]:
    """Load stopwords from quote_stopwords.txt (one word per line; # = comment)."""
    out: set[str] = set()
    if not QUOTE_STOPWORDS_PATH.exists():
        return out
    with open(QUOTE_STOPWORDS_PATH, "r", encoding="utf-8") as f:
        for line in f:
            line = line.split("#")[0].strip().lower()
            if line and not line.startswith("#"):
                out.add(line)
    return out


def _load_quote_synonyms() -> dict[str, list[str]]:
    """Load synonym map: canonical_entity -> [synonym1, ...]. Normalize keys/values to lowercase."""
    if not QUOTE_SYNONYMS_PATH.exists():
        return {}
    with open(QUOTE_SYNONYMS_PATH, "r", encoding="utf-8") as f:
        raw = yaml.safe_load(f)
    if not isinstance(raw, dict):
        return {}
    out: dict[str, list[str]] = {}
    for k, v in raw.items():
        key = (k or "").strip().lower()
        if not key:
            continue
        vals = v if isinstance(v, list) else [v]
        out[key] = [str(x).strip().lower() for x in vals if x]
    return out


def _load_quote_retriever_config() -> dict:
    """Load weights, generic_tags, entity_to_domains, keyword_domain_hints from YAML."""
    if not QUOTE_RETRIEVER_CONFIG_PATH.exists():
        return {}
    with open(QUOTE_RETRIEVER_CONFIG_PATH, "r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def _normalize_token(s: str) -> str:
    """Lowercase, remove diacritics, keep alphanumeric and underscore."""
    if not s:
        return ""
    s = (s or "").lower().strip()
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return "".join(c for c in s if c.isalnum() or c == "_").strip()


def _normalize_query_text(text: str) -> list[str]:
    """Normalize query: lowercase, remove punctuation/diacritics, trim, split. Returns list of tokens."""
    if not (text or "").strip():
        return []
    tokens: list[str] = []
    for word in (text or "").split():
        t = _normalize_token(word)
        if len(t) > 1:
            tokens.append(t)
    return tokens


def _build_synonym_to_canonical(synonym_map: dict[str, list[str]]) -> dict[str, str]:
    """Build token -> canonical_entity so we can detect query_entities from normalized tokens."""
    out: dict[str, str] = {}
    for canonical, synonyms in synonym_map.items():
        for syn in synonyms:
            norm = _normalize_token(syn)
            if norm:
                out[norm] = canonical
    return out


def _load_topic_map() -> Tuple[dict[str, list[str]], dict[str, str]]:
    """
    Load topic_map.yml: canonical_topic -> [surface_forms].
    Returns (canonical_to_surfaces, surface_to_canonical) with normalized surface forms.
    """
    if not TOPIC_MAP_PATH.exists():
        return {}, {}
    with open(TOPIC_MAP_PATH, "r", encoding="utf-8") as f:
        raw = yaml.safe_load(f)
    if not isinstance(raw, dict):
        return {}, {}
    canonical_to_surfaces: dict[str, list[str]] = {}
    surface_to_canonical: dict[str, str] = {}
    for canonical, forms in raw.items():
        key = (canonical or "").strip().lower()
        if not key:
            continue
        vals = forms if isinstance(forms, list) else [forms]
        norm_forms = [str(x).strip().lower() for x in vals if x]
        canonical_to_surfaces[key] = [_normalize_token(f) for f in norm_forms if _normalize_token(f)]
        for f in norm_forms:
            n = _normalize_token(f)
            if n:
                surface_to_canonical[n] = key
    return canonical_to_surfaces, surface_to_canonical


def _ngrams(tokens: list[str], n: int) -> list[str]:
    """Return n-grams as joined strings (underscore)."""
    if n <= 0 or n > len(tokens):
        return []
    out: list[str] = []
    for i in range(len(tokens) - n + 1):
        out.append("_".join(tokens[i : i + n]))
    return out


def _extract_query_topics(topic: str, user_message: str, surface_to_canonical: dict[str, str]) -> set[str]:
    """
    From (topic, user_message): normalize, build tokens + ngrams (1-3 words), match topic_map.
    Returns set of canonical topics.
    """
    combined = f"{topic or ''} {user_message or ''}".strip()
    tokens = _normalize_query_text(combined)
    if not tokens:
        return set()
    query_topics: set[str] = set()
    for t in tokens:
        if t in surface_to_canonical:
            query_topics.add(surface_to_canonical[t])
    for n in (2, 3):
        for ng in _ngrams(tokens, n):
            if ng in surface_to_canonical:
                query_topics.add(surface_to_canonical[ng])
    return query_topics


class DebateRetriever:
    """Deterministic keyword-based retriever for Science, Philosophy, and Verbatim Quotes KBs."""

    # Map prompt/topic words (ES/EN) to KB-style tags (no #) for quote tag overlap
    _TOPIC_TAG_MAP: dict[str, list[str]] = {
        "dios": ["god", "faith", "religion"],
        "god": ["god", "faith"],
        "ciencia": ["science_method", "science", "evidence", "epistemology"],
        "science": ["science_method", "science", "evidence"],
        "existir": ["existence", "meaning"],
        "existe": ["existence", "meaning"],
        "existence": ["existence", "meaning"],
        "existencia": ["existence", "meaning"],
        "falsabilidad": ["science_method", "truth", "evidence"],
        "falsify": ["science_method", "truth", "evidence"],
        "popper": ["science_method", "epistemology"],
        "fe": ["faith", "god"],
        "faith": ["faith", "god"],
        "razón": ["reason", "truth"],
        "reason": ["reason", "truth"],
        "verdad": ["truth", "epistemology"],
        "truth": ["truth", "epistemology"],
        "ética": ["ethics", "meaning"],
        "ethics": ["ethics", "meaning"],
        "conocimiento": ["knowledge", "epistemology"],
        "knowledge": ["knowledge", "epistemology"],
        "conciencia": ["consciousness"],
        "consciousness": ["consciousness"],
        "evidencia": ["evidence", "truth"],
        "evidence": ["evidence", "truth"],
        "creencia": ["belief"],
        "belief": ["belief"],
        "duda": ["doubt", "skepticism"],
        "doubt": ["doubt", "skepticism"],
        "significado": ["meaning"],
        "meaning": ["meaning"],
        "naturaleza": ["nature", "laws_of_nature"],
        "nature": ["nature", "laws_of_nature"],
    }

    def __init__(self):
        self._science_loader = ScienceKBLoader()
        self._philosophy_loader = PhilosophyKBLoader()
        self._quotes_loader = QuotesKBLoader()
        self._quote_stopwords = _load_quote_stopwords()
        self._quote_synonyms = _load_quote_synonyms()
        self._synonym_to_canonical = _build_synonym_to_canonical(self._quote_synonyms)
        self._quote_config = _load_quote_retriever_config()
        self._canonical_to_surfaces, self._surface_to_canonical = _load_topic_map()

    def _extract_keywords(self, text: str) -> set[str]:
        """Extract keywords from text (case-insensitive, filter short words)."""
        words = text.lower().split()
        stop_words = {"the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "is", "are", "was", "were", "be", "been", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "must", "can", "de", "la", "el", "en", "y", "que", "por", "un", "una", "los", "las", "del", "al", "se", "no", "como", "más", "pero", "sus", "le", "lo", "ya", "o", "fue", "este", "ha", "sí", "porque", "esta", "entre", "cuando", "muy", "sin", "sobre", "ser", "tiene", "me", "hasta", "hay", "donde", "han", "quien", "desde", "todo", "nos", "durante", "estados", "uno", "les", "ni", "contra", "otros", "ese", "eso", "ante", "ellos", "e", "esto", "mi", "antes", "algunos", "qué", "unos", "yo", "otro", "otra", "otras", "también", "es", "son", "fue", "ser", "era", "eran", "según"}
        keywords = {w.strip() for w in words if len(w.strip()) > 2 and w.strip() not in stop_words}
        return keywords

    def _infer_topic_tags(self, prompt: str, topic: str) -> set[str]:
        """Infer KB-style tags from prompt + topic for tag-overlap scoring (ES/EN)."""
        combined = f"{topic} {prompt}".lower()
        raw_tokens = combined.split()
        out: set[str] = set()
        for t in raw_tokens:
            normalized = "".join(c for c in t if c.isalnum() or c in "_").strip()
            if len(normalized) > 1 and normalized in self._TOPIC_TAG_MAP:
                out.update(self._TOPIC_TAG_MAP[normalized])
        return out

    def _score_entry(self, entry_keywords: List[str], query_keywords: set[str]) -> int:
        """Score an entry based on keyword overlap (case-insensitive)."""
        entry_keywords_lower = {k.lower() for k in entry_keywords}
        query_keywords_lower = {k.lower() for k in query_keywords}
        overlap = len(entry_keywords_lower & query_keywords_lower)
        return overlap

    def retrieve_science(self, topic: str, user_message: str, top_n: int = 5) -> List[Tuple[KBScienceEntry, int]]:
        """
        Retrieve top N science entries ranked by keyword overlap.
        Returns list of (entry, score) tuples sorted by score descending.
        """
        query_keywords = self._extract_keywords(f"{topic} {user_message}")
        all_entries = self._science_loader.get_all()
        
        scored = []
        for entry in all_entries:
            # Combine topic and keywords for matching
            entry_text = f"{entry.topic} {' '.join(entry.keywords)}"
            entry_keywords = [entry.topic] + entry.keywords
            score = self._score_entry(entry_keywords, query_keywords)
            if score > 0:
                scored.append((entry, score))
        
        # Sort by score descending, then by topic for determinism
        scored.sort(key=lambda x: (-x[1], x[0].topic))
        return scored[:top_n]

    def retrieve_philosophy(self, topic: str, user_message: str, top_n: int = 5) -> List[Tuple[KBPhilosophyQuote, int]]:
        """
        Retrieve top N philosophy quotes ranked by keyword overlap.
        Returns list of (quote, score) tuples sorted by score descending.
        """
        query_keywords = self._extract_keywords(f"{topic} {user_message}")
        all_quotes = self._philosophy_loader.get_all()
        
        scored = []
        for quote in all_quotes:
            # Combine themes and keywords for matching
            quote_keywords = quote.themes + quote.keywords
            score = self._score_entry(quote_keywords, query_keywords)
            if score > 0:
                scored.append((quote, score))
        
        # Sort by score descending, then by quote_id for determinism
        scored.sort(key=lambda x: (-x[1], x[0].quote_id))
        return scored[:top_n]

    def _infer_quote_category(self, topic: str, user_message: str) -> str | None:
        """Infer preferred quote category from topic + user message for scoring boost."""
        text = f"{topic or ''} {user_message or ''}".lower()
        if any(w in text for w in ("god", "faith", "belief", "religion", "pascal", "aquinas", "theology")):
            return "religion"
        if any(w in text for w in ("experiment", "falsify", "science", "method", "evidence", "popper", "hypothesis")):
            return "science"
        if any(w in text for w in ("mind", "cognition", "psychology", "belief", "perception")):
            return "psychology"
        if any(w in text for w in ("novel", "literature", "story", "author", "book")):
            return "literature"
        if any(w in text for w in ("philosophy", "ethics", "epistemology", "meaning", "virtue", "stoic")):
            return "philosophy"
        return None

    def _extract_topic_signals(self, topic: str, user_message: str) -> Tuple[set[str], set[str], set[str]]:
        """
        From (topic, user_message) build query_keywords, query_entities, preferred_domains.
        Returns (query_keywords, query_entities, preferred_domains).
        """
        combined = f"{topic or ''} {user_message or ''}".strip()
        raw_tokens = _normalize_query_text(combined)
        query_keywords: set[str] = {t for t in raw_tokens if t not in self._quote_stopwords}
        query_entities: set[str] = set()
        for t in raw_tokens:
            if t in self._synonym_to_canonical:
                query_entities.add(self._synonym_to_canonical[t])
        preferred_domains: set[str] = set()
        entity_to_domains = (self._quote_config.get("entity_to_domains") or {})
        for ent in query_entities:
            for d in entity_to_domains.get(ent, [ent]):
                preferred_domains.add(d)
        keyword_hints = (self._quote_config.get("keyword_domain_hints") or {})
        for kw in query_keywords:
            if kw in keyword_hints:
                preferred_domains.add(keyword_hints[kw])
        return query_keywords, query_entities, preferred_domains

    def _quote_entity_match_set(self, q: VerbatimQuote) -> set[str]:
        """Normalized tokens from quote that can match query_entities: entities, tags, text, author, work."""
        out: set[str] = set()
        for e in (q.entities or []):
            out.add(_normalize_token(e))
        for t in (q.tags or []):
            raw = (t or "").replace("#", "").lower()
            out.add(_normalize_token(raw))
            for part in raw.split("_"):
                out.add(_normalize_token(part))
        text = " ".join(
            filter(
                None,
                [(q.text_en or ""), (q.text_es or ""), q.author or "", q.work or ""],
            )
        )
        for tok in _normalize_query_text(text):
            out.add(tok)
        return {x for x in out if len(x) > 1}

    def _quote_keyword_set(self, q: VerbatimQuote, expanded_synonyms: set[str]) -> set[str]:
        """Quote tokens for keyword overlap (include expanded synonyms for query side)."""
        text = " ".join(
            filter(
                None,
                [
                    (q.text_en or ""),
                    (q.text_es or ""),
                    q.author or "",
                    q.work or "",
                    " ".join(q.tags or []),
                    " ".join(q.entities or []),
                ],
            )
        )
        tokens = set(_normalize_query_text(text))
        return tokens | (tokens & expanded_synonyms)

    def _quote_topic_set(self, q: VerbatimQuote) -> set[str]:
        """Canonical topics on the quote (normalized)."""
        raw = getattr(q, "topics", None) or []
        return {_normalize_token(t) for t in raw if _normalize_token(t)}

    def _quote_contains_surface_forms(self, q: VerbatimQuote, surface_forms: set[str]) -> bool:
        """True if quote tags or text (normalized) contain any of the surface forms."""
        text = " ".join(
            filter(
                None,
                [
                    (q.text_en or ""),
                    (q.text_es or ""),
                    " ".join(q.tags or []),
                    " ".join(getattr(q, "topics", None) or []),
                ],
            )
        )
        tokens = set(_normalize_query_text(text))
        tag_tokens: set[str] = set()
        for t in (q.tags or []):
            raw = (t or "").replace("#", "").lower()
            tag_tokens.add(_normalize_token(raw))
            tag_tokens.update(_normalize_token(p) for p in raw.split("_"))
        combined = tokens | tag_tokens
        return bool(combined & surface_forms)

    def retrieve_verbatim_quotes(
        self,
        topic: str,
        user_message: str,
        top_n: int = 3,
        language: str | None = None,
    ) -> List[Tuple[VerbatimQuote, int]]:
        """
        Retrieve top N verbatim quotes. Topic/keyword driven when query_topics non-empty;
        else fallback to tag/category algorithm. Max 1 per author; optional topic spread.
        Deterministic; no LLM. Never returns empty if KB has any quote.
        """
        top_n = max(1, min(top_n, 3))
        all_quotes = self._quotes_loader.get_all()
        query_topics = _extract_query_topics(
            topic or "", user_message or "", self._surface_to_canonical
        )

        if query_topics:
            return self._retrieve_verbatim_quotes_topic_driven(
                topic, user_message, query_topics, all_quotes, top_n, language
            )
        return self._retrieve_verbatim_quotes_fallback(
            topic, user_message, all_quotes, top_n, language
        )

    def _retrieve_verbatim_quotes_topic_driven(
        self,
        topic: str,
        user_message: str,
        query_topics: set[str],
        all_quotes: List[VerbatimQuote],
        top_n: int,
        language: str | None,
    ) -> List[Tuple[VerbatimQuote, int]]:
        """Topic-driven path: gating by quote.topics ∩ query_topics; scoring 10*topic + 2*keyword + lang - generic."""
        query_norm = _normalize_query_text(f"{topic or ''} {user_message or ''}")
        query_keywords = {t for t in query_norm if t not in self._quote_stopwords}
        expanded_query_keywords = set(query_keywords)
        for ct in query_topics:
            for surf in self._canonical_to_surfaces.get(ct, []):
                expanded_query_keywords.add(surf)
        surface_forms: set[str] = set()
        for ct in query_topics:
            surface_forms.update(self._canonical_to_surfaces.get(ct, []))

        # Gating: only quotes where quote.topics ∩ query_topics
        candidates = [q for q in all_quotes if self._quote_topic_set(q) & query_topics]
        if len(candidates) < 10:
            relaxed = [q for q in all_quotes if q not in candidates and self._quote_contains_surface_forms(q, surface_forms)]
            seen_ids = {q.id for q in candidates}
            for q in relaxed:
                if q.id not in seen_ids:
                    seen_ids.add(q.id)
                    candidates.append(q)
        if not candidates:
            candidates = list(all_quotes)

        cfg = self._quote_config or {}
        generic_tags_set = set((cfg.get("generic_tags") or []))
        w_generic = float((cfg.get("weights") or {}).get("generic_penalty", 4.0))
        w_lang = float((cfg.get("weights") or {}).get("language_bonus", 1.0))

        scored: List[Tuple[VerbatimQuote, float]] = []
        for q in candidates:
            q_topics = self._quote_topic_set(q)
            topic_overlap_count = len(q_topics & query_topics)
            quote_kw = self._quote_keyword_set(q, expanded_query_keywords)
            keyword_overlap_count = len(expanded_query_keywords & quote_kw)
            tag_tokens: set[str] = set()
            for t in (q.tags or []):
                raw = (t or "").replace("#", "").lower()
                tag_tokens.add(_normalize_token(raw))
                tag_tokens.update(_normalize_token(p) for p in raw.split("_"))
            tag_tokens = {tk for tk in tag_tokens if len(tk) > 1}
            only_generic = (
                topic_overlap_count == 0
                and keyword_overlap_count == 0
                and len(tag_tokens & query_keywords) > 0
                and (tag_tokens & query_keywords) <= generic_tags_set
            )
            generic_penalty = float(w_generic) if only_generic else 0.0
            score = (
                10.0 * topic_overlap_count
                + 2.0 * keyword_overlap_count
                - generic_penalty
            )
            if language:
                if language == "es" and (q.text_es or "").strip():
                    score += w_lang
                if language == "en" and (q.text_en or "").strip():
                    score += w_lang
            scored.append((q, score))

        scored.sort(key=lambda x: (-x[1], x[0].id))

        result: List[Tuple[VerbatimQuote, int]] = []
        seen_ids_set: set[str] = set()
        seen_authors: set[str] = set()
        for q, s in scored:
            if len(result) >= top_n:
                break
            if q.id in seen_ids_set:
                continue
            author_key = (q.author or "").strip().lower()
            if author_key in seen_authors:
                continue
            seen_ids_set.add(q.id)
            seen_authors.add(author_key)
            result.append((q, int(round(s))))

        if len(result) < top_n:
            for q, s in scored:
                if len(result) >= top_n:
                    break
                if q.id in seen_ids_set:
                    continue
                seen_ids_set.add(q.id)
                result.append((q, int(round(s))))

        if not result and all_quotes:
            result = [(all_quotes[0], 0)]
        if logger.isEnabledFor(logging.DEBUG) and result:
            logger.debug("Verbatim quotes (topic-driven) top %d: %s", len(result), [(q.id, sc) for q, sc in result])
        return result

    def _retrieve_verbatim_quotes_fallback(
        self,
        topic: str,
        user_message: str,
        all_quotes: List[VerbatimQuote],
        top_n: int,
        language: str | None,
    ) -> List[Tuple[VerbatimQuote, int]]:
        """Fallback: current tag/category algorithm when query_topics is empty."""
        query_keywords, query_entities, preferred_domains = self._extract_topic_signals(topic or "", user_message or "")
        topic_tags = self._infer_topic_tags(user_message or "", topic or "")
        cfg = self._quote_config
        w = (cfg.get("weights") or {})
        w_entity = float(w.get("entity_match", 12.0))
        w_subdomain = float(w.get("subdomain_match", 6.0))
        w_domain = float(w.get("domain_match", 3.0))
        w_tag = float(w.get("tag_overlap", 2.0))
        w_keyword = float(w.get("keyword_overlap", 1.0))
        w_generic = float(w.get("generic_penalty", 4.0))
        w_lang = float(w.get("language_bonus", 1.0))
        generic_tags_set = set((cfg.get("generic_tags") or []))
        expanded_query_keywords = set(query_keywords)
        for ent in query_entities:
            for syn in self._quote_synonyms.get(ent, []):
                expanded_query_keywords.add(_normalize_token(syn))

        if query_entities:
            entity_match_quotes = [q for q in all_quotes if any(_normalize_token(e) in self._quote_entity_match_set(q) for e in query_entities)]
            if len(entity_match_quotes) >= 10:
                candidates = entity_match_quotes
            else:
                domain_match_quotes = [q for q in all_quotes if (getattr(q, "topic_domain", None) or q.category or "") in preferred_domains]
                seen_ids = set()
                candidates = []
                for q in entity_match_quotes + domain_match_quotes:
                    if q.id not in seen_ids:
                        seen_ids.add(q.id)
                        candidates.append(q)
            if not candidates:
                candidates = list(all_quotes)
        else:
            candidates = list(all_quotes)

        scored: List[Tuple[VerbatimQuote, float]] = []
        for q in candidates:
            q_entity_tokens = self._quote_entity_match_set(q)
            entity_match_count = sum(1 for e in query_entities if _normalize_token(e) in q_entity_tokens)
            q_domain = getattr(q, "topic_domain", None) or q.category or ""
            q_sub = (getattr(q, "subdomain", None) or "").strip()
            subdomain_match = 1.0 if q_sub and (q_domain in preferred_domains or entity_match_count > 0) else 0.0
            domain_match = 1.0 if q_domain in preferred_domains else 0.0
            tag_tokens = {_normalize_token(p) for t in (q.tags or []) for p in ((t or "").replace("#", "").lower().split("_"))} | {_normalize_token((t or "").replace("#", "").lower()) for t in (q.tags or [])}
            tag_tokens = {tk for tk in tag_tokens if len(tk) > 1}
            tag_overlap_count = len(topic_tags & tag_tokens)
            quote_kw = self._quote_keyword_set(q, expanded_query_keywords)
            keyword_overlap_count = len(expanded_query_keywords & quote_kw)
            overlapping_tags = topic_tags & tag_tokens
            only_generic = tag_overlap_count > 0 and entity_match_count == 0 and not q_sub and len(overlapping_tags) > 0 and overlapping_tags <= generic_tags_set
            generic_penalty = float(w_generic) if only_generic else 0.0
            score = w_entity * entity_match_count + w_subdomain * subdomain_match + w_domain * domain_match + w_tag * tag_overlap_count + w_keyword * keyword_overlap_count - generic_penalty
            if language:
                if language == "es" and (q.text_es or "").strip():
                    score += w_lang
                if language == "en" and (q.text_en or "").strip():
                    score += w_lang
            scored.append((q, score))

        scored.sort(key=lambda x: (-x[1], x[0].id))
        result = []
        seen_ids = set()
        seen_a = set()
        seen_sub = set()
        for q, s in scored:
            if len(result) >= top_n:
                break
            if q.id in seen_ids:
                continue
            author_key = (q.author or "").strip().lower()
            subdomain_key = (getattr(q, "subdomain", None) or "").strip().lower()
            if author_key in seen_a:
                continue
            if subdomain_key and subdomain_key in seen_sub:
                continue
            seen_ids.add(q.id)
            seen_a.add(author_key)
            if subdomain_key:
                seen_sub.add(subdomain_key)
            result.append((q, int(round(s))))
        if len(result) < top_n:
            for q, s in scored:
                if len(result) >= top_n:
                    break
                if q.id in seen_ids:
                    continue
                if (q.author or "").strip().lower() in seen_a:
                    continue
                seen_ids.add(q.id)
                seen_a.add((q.author or "").strip().lower())
                result.append((q, int(round(s))))
        if len(result) < top_n:
            for q, s in scored:
                if len(result) >= top_n:
                    break
                if q.id not in seen_ids:
                    seen_ids.add(q.id)
                    result.append((q, int(round(s))))
        if not result and all_quotes:
            result = [(all_quotes[0], 0)]
        return result

    def pad_verbatim_quotes_to_n(
        self, quotes: List[VerbatimQuote], n: int = 3
    ) -> List[VerbatimQuote]:
        """
        Ensure at least n quotes by appending from KB (sorted by id).
        Skips duplicate quote id and author. Deterministic; no LLM; only picks from existing KB.
        """
        if len(quotes) >= n:
            return list(quotes[:n])
        all_q = self._quotes_loader.get_all()
        seen_ids = {q.id for q in quotes}
        seen_authors = {(q.author or "").strip().lower() for q in quotes}
        rest = [q for q in all_q if q.id not in seen_ids]
        rest.sort(key=lambda x: x.id)
        out = list(quotes)
        for q in rest:
            if len(out) >= n:
                break
            author_key = (q.author or "").strip().lower()
            if author_key in seen_authors:
                continue
            seen_authors.add(author_key)
            seen_ids.add(q.id)
            out.append(q)
        return out

    def get_padding_verbatim_quotes(
        self,
        existing_quote_ids: set,
        existing_authors: set,
        need: int,
    ) -> List[VerbatimQuote]:
        """
        Return up to `need` quotes from KB (sorted by id), skipping ids and authors in the given sets.
        Used to pad author_layer.quotes to 3 for display. Does not mutate the input sets.
        """
        if need <= 0:
            return []
        all_q = self._quotes_loader.get_all()
        seen_ids = set(existing_quote_ids)
        seen_authors = set(existing_authors)
        rest = [q for q in all_q if q.id not in seen_ids]
        rest.sort(key=lambda x: x.id)
        out = []
        for q in rest:
            if len(out) >= need:
                break
            author_key = (q.author or "").strip().lower()
            if author_key in seen_authors:
                continue
            seen_authors.add(author_key)
            seen_ids.add(q.id)
            out.append(q)
        return out


def debug_quote_retrieval(sample_prompts: List[str] | None = None) -> None:
    """
    Print selected quote IDs for sample prompts. No UI changes.
    Use for quick validation that quotes are on-topic (religion/theism, politics.communism, history/nazism).
    """
    if sample_prompts is None:
        sample_prompts = [
            "existe dios segun la ciencia?",
            "el comunismo funciona?",
            "era hitler bueno?",
        ]
    retriever = DebateRetriever()
    for prompt in sample_prompts:
        results = retriever.retrieve_verbatim_quotes("", prompt, top_n=3, language=None)
        ids = [q.id for q, _ in results]
        print(f"Prompt: {prompt!r}")
        print(f"  Quote IDs: {ids}")
        print()
