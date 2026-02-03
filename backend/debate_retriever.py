import logging
from typing import List, Tuple
from debate_kb_schemas import KBScienceEntry, KBPhilosophyQuote, VerbatimQuote
from debate_kb_loader import ScienceKBLoader, PhilosophyKBLoader, QuotesKBLoader

logger = logging.getLogger(__name__)


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

    def retrieve_verbatim_quotes(
        self,
        topic: str,
        user_message: str,
        top_n: int = 3,
        language: str | None = None,
    ) -> List[Tuple[VerbatimQuote, int]]:
        """
        Retrieve top N verbatim quotes: 5*tagOverlap + 2*keywordOverlap, max 1 per author.
        Drops score==0. Prefers language (es/en) when set.
        """
        combined = f"{topic or ''} {user_message or ''}".strip()
        query_keywords = self._extract_keywords(combined)
        topic_tags = self._infer_topic_tags(user_message or "", topic or "")
        preferred_category = self._infer_quote_category(topic or "", user_message or "")
        all_quotes = self._quotes_loader.get_all()
        scored: List[Tuple[VerbatimQuote, float]] = []
        for q in all_quotes:
            # Quote tag tokens (strip #, split _)
            tag_tokens: set[str] = set()
            for t in (q.tags or []):
                raw = (t or "").replace("#", "").lower()
                tag_tokens.add(raw)
                tag_tokens.update(raw.split("_"))
            tag_tokens = {tk for tk in tag_tokens if len(tk) > 1}
            tag_overlap_count = len(topic_tags & tag_tokens)
            quote_text = " ".join(
                filter(
                    None,
                    [
                        (q.text_en or ""),
                        (q.text_es or ""),
                        q.author,
                        q.work,
                        " ".join(q.tags or []),
                    ],
                )
            )
            quote_keywords = self._extract_keywords(quote_text)
            keyword_overlap_count = len(query_keywords & quote_keywords)
            score = 5.0 * tag_overlap_count + 2.0 * keyword_overlap_count
            if preferred_category and q.category == preferred_category:
                score += 2.0
            if language:
                if language == "es" and (q.text_es or "").strip():
                    score += 1.0
                if language == "en" and (q.text_en or "").strip():
                    score += 1.0
            if score > 0:
                scored.append((q, score))
        scored.sort(key=lambda x: (-x[1], x[0].id))
        # Max 1 per author
        seen_authors: set[str] = set()
        result: List[Tuple[VerbatimQuote, int]] = []
        for q, s in scored:
            if len(result) >= top_n:
                break
            author_key = (q.author or "").strip().lower()
            if author_key in seen_authors:
                continue
            seen_authors.add(author_key)
            result.append((q, int(round(s))))
        if logger.isEnabledFor(logging.DEBUG) and result:
            logger.debug(
                "Verbatim quotes top %d: %s",
                len(result),
                [(q.id, sc) for q, sc in result],
            )
        return result
