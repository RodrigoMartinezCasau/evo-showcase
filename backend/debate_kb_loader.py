"""
Science and Philosophy KB loaders.

REPORT — Scientific Facts KB (UI "Scientific Facts" section):
- Schema: ScientificFact (debate_kb_schemas.py). Required YAML keys: id, topic, lang, claim,
  certainty, source_name, created_at. Optional: value, units, formula, source_note,
  tags, keywords, related_ids.
- Folder indexed: knowledge_base_science/facts/ — all *.yaml files (one document per file).
- Matching: ScienceFactsLoader.search_by_overlap() tokenizes query (topic + user_message +
  assistant draft) and each fact (topic + claim + keywords + tags); score = token overlap
  count; returns top max_k facts with score > 0. Case-insensitive.

MANUAL TEST CHECKLIST:
1. Backend: cd backend && .venv/bin/uvicorn main:app --reload (or python -m uvicorn main:app)
2. Frontend: cd frontend && npm run dev
3. Open debate, send a message, expand "Scientific Facts" for the assistant reply.
4. Test queries and expected Scientific Facts content:
   - "does god exist according to science?" -> expect sci.science.limits.en, sci.methodology.falsifiability.en, or sci.cosmology.finetuning.en (epistemic limits; no prove/disprove).
   - "big bang evidence" -> expect sci.cosmology.bigbang.en, sci.cosmology.cmb.en, sci.hubble.expansion.en.
   - "cosmic microwave background" -> expect sci.cosmology.cmb.en, sci.cosmology.bigbang.en.
   - "evolution vs creationism" -> expect sci.evolution.evidence.en, sci.evolution.creationism.en, sci.biology.fossils.en.
   - "climate science" or "global warming" -> expect sci.climate.basics.en.
"""
import logging
import yaml
from pathlib import Path
from typing import Any, List, Tuple

from debate_kb_schemas import KBScienceEntry, KBPhilosophyQuote, ScientificFact, VerbatimQuote

logger = logging.getLogger(__name__)

# Paths to knowledge base directories (resolve() so path works regardless of cwd)
SCIENCE_KB_DIR = Path(__file__).resolve().parent / "knowledge_base_science"
SCIENCE_FACTS_DIR = SCIENCE_KB_DIR / "facts"
PHILOSOPHY_KB_DIR = Path(__file__).resolve().parent / "knowledge_base_philosophy"
QUOTES_KB_DIR = Path(__file__).resolve().parent / "knowledge_base_quotes" / "quotes"

# Category (folder name) -> topic_domain when not set in YAML (backwards compatible)
CATEGORY_TO_TOPIC_DOMAIN: dict[str, str] = {
    "philosophy": "philosophy",
    "science": "science",
    "literature": "literature",
    "religion": "religion",
    "psychology": "psychology",
    "history": "history",
}


class ScienceKBLoader:
    """Loads and validates Science Knowledge Base entries from YAML files."""

    def __init__(self):
        self._entries: dict[str, KBScienceEntry] = {}
        self._load_all()

    def _load_all(self):
        """Load all YAML files from knowledge_base_science directory."""
        if not SCIENCE_KB_DIR.exists():
            return
        for yaml_file in SCIENCE_KB_DIR.glob("*.yaml"):
            self._load_file(yaml_file)

    def _load_file(self, yaml_path: Path):
        """Load entries from a single YAML file."""
        try:
            with open(yaml_path, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)
            if not isinstance(data, list):
                data = [data]
            for entry_dict in data:
                try:
                    entry = KBScienceEntry(**entry_dict)
                    if entry.id in self._entries:
                        raise ValueError(f"Duplicate Science KB entry id: {entry.id}")
                    self._entries[entry.id] = entry
                except Exception as e:
                    raise ValueError(f"Invalid entry in {yaml_path}: {e}") from e
        except Exception as e:
            raise RuntimeError(f"Failed to load {yaml_path}: {e}") from e

    def get_all(self) -> List[KBScienceEntry]:
        """Get all entries."""
        return list(self._entries.values())

    def get_by_id(self, entry_id: str) -> KBScienceEntry | None:
        """Get a specific entry by id."""
        return self._entries.get(entry_id)


def _fact_to_item_dict(f: ScientificFact) -> dict[str, Any]:
    """Convert ScientificFact to UI item dict (id, claim, value, units, formula, certainty, source_name, source_note, field, group)."""
    return {
        "id": f.id,
        "claim": f.claim,
        "value": f.value,
        "units": f.units,
        "formula": f.formula,
        "certainty": f.certainty.value if hasattr(f.certainty, "value") else str(f.certainty),
        "source_name": f.source_name,
        "source_note": f.source_note,
        "field": getattr(f, "field", None) or (f.topic or ""),
        "group": getattr(f, "group", None),
    }


def _extract_snippets_from_extended_yaml(data: dict, yaml_path: Path) -> List[dict]:
    """
    Extract fact snippets from extended-schema YAML (id, domain, field, title, summary,
    snippets with text/tag/source_hint, or core_claims, what_science_supports, etc.).
    Returns list of UI-shaped dicts (id, claim, certainty, source_name, value=None, etc.).
    """
    yaml_id = (data.get("id") or data.get("title") or yaml_path.stem) or "unknown"
    title = data.get("title") or yaml_id
    out: List[dict] = []
    # Block B style: snippets list with text, tag (EMPIRICAL/THEORETICAL), source_hint
    raw = data.get("snippets")
    if isinstance(raw, list) and raw:
        for i, s in enumerate(raw):
            if isinstance(s, dict):
                text = (s.get("text") or s.get("claim") or "").strip()
            else:
                text = str(s).strip()
            if not text or len(text) < 10:
                continue
            tag = (s.get("tag") if isinstance(s, dict) else "").strip().upper()
            source_hint = (s.get("source_hint") if isinstance(s, dict) else "") or title
            certainty = "measured" if tag == "EMPIRICAL" else "theoretical"
            field_val = data.get("field") or data.get("domain") or ""
            out.append({
                "id": f"{yaml_id}_{i}" if len(raw) > 1 else yaml_id,
                "claim": text[:500] if len(text) > 500 else text,
                "value": None,
                "units": None,
                "formula": None,
                "certainty": certainty,
                "source_name": source_hint,
                "source_note": None,
                "field": str(field_val) if field_val else "",
            })
        return out
    # Legacy: core_claims, what_science_supports, what_science_does_not_claim, facts, limitations
    bullets: List[str] = []
    for key in ("core_claims", "what_science_supports", "what_science_does_not_claim", "facts", "limitations"):
        val = data.get(key)
        if isinstance(val, list):
            bullets.extend(str(s).strip() for s in val if s)
    if not bullets and data.get("summary"):
        bullets = [str(data["summary"]).strip()]
    for i, text in enumerate(bullets):
        if not text or len(text) < 10:
            continue
        snippet_id = f"{yaml_id}_{i}" if len(bullets) > 1 else yaml_id
        field_val = data.get("field") or data.get("domain") or ""
        out.append({
            "id": snippet_id,
            "claim": text[:500] if len(text) > 500 else text,
            "value": None,
            "units": None,
            "formula": None,
            "certainty": "theoretical",
            "source_name": title,
            "source_note": None,
            "field": str(field_val) if field_val else "",
        })
    return out


class ScienceFactsLoader:
    """Loads ScientificFact entries and extended-schema YAML from knowledge_base_science/facts/*.yaml."""

    def __init__(self):
        self._facts: dict[str, ScientificFact] = {}
        self._snippets: List[dict] = []  # UI-shaped dicts from extended schema (id, claim, certainty, source_name, ...)
        self._load_all()

    def _load_all(self):
        """Load all YAML files from knowledge_base_science/facts directory."""
        if not SCIENCE_FACTS_DIR.exists():
            logger.warning("Science facts dir does not exist: %s", SCIENCE_FACTS_DIR)
            return
        files = sorted(SCIENCE_FACTS_DIR.glob("*.yaml"))
        logger.info("Science facts: discovered %d YAML files in %s", len(files), SCIENCE_FACTS_DIR)
        for yaml_file in files:
            self._load_file(yaml_file)
        logger.info(
            "Science facts: indexed %d ScientificFact entries, %d snippets from extended schema; sample ids: %s",
            len(self._facts),
            len(self._snippets),
            list(self._facts.keys())[:3] + [s.get("id") for s in self._snippets[:3]],
        )

    def _load_file(self, yaml_path: Path):
        """Load a single fact from one YAML file. ScientificFact schema or extended schema (snippets)."""
        try:
            with open(yaml_path, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)
        except yaml.YAMLError as e:
            logger.warning("Science facts: YAML parse error in %s: %s", yaml_path.name, e)
            return
        if data is None:
            return
        if not isinstance(data, dict):
            return
        # Try ScientificFact schema first
        try:
            entry = ScientificFact(**data)
            if entry.id in self._facts:
                logger.warning("Science facts: duplicate id %s in %s", entry.id, yaml_path.name)
                return
            self._facts[entry.id] = entry
            return
        except Exception:
            pass
        # Extended schema: snippets (Block B), or core_claims, what_science_supports, etc.
        if any(data.get(k) for k in ("snippets", "core_claims", "what_science_supports", "what_science_does_not_claim", "facts", "limitations", "summary")):
            for sn in _extract_snippets_from_extended_yaml(data, yaml_path):
                self._snippets.append(sn)

    def get_all(self) -> List[ScientificFact]:
        """Get all facts (ScientificFact schema only)."""
        return list(self._facts.values())

    def get_by_id(self, fact_id: str) -> ScientificFact | None:
        """Get a fact by id."""
        return self._facts.get(fact_id)

    def _tokenize(self, text: str) -> set:
        """Tokenize for overlap: lowercase words, length > 1."""
        return {t for t in (text or "").lower().split() if len(t) > 1}

    def search(self, query: str, lang: str | None = None, max_k: int = 10) -> List[Tuple[ScientificFact, int]]:
        """
        Return top facts by keyword/tag overlap with query (ScientificFact only).
        If lang is set, only return facts in that language.
        """
        query_lower = query.lower().strip()
        query_tokens = {t for t in query_lower.split() if len(t) > 1}
        candidates = self.get_all()
        if lang:
            candidates = [f for f in candidates if f.lang == lang]
        scored: List[Tuple[ScientificFact, int]] = []
        for fact in candidates:
            match_set = {k.lower() for k in fact.keywords + fact.tags}
            score = sum(1 for t in query_tokens if t in match_set or any(t in m for m in match_set))
            if score > 0:
                scored.append((fact, score))
        scored.sort(key=lambda x: (-x[1], x[0].id))
        return scored[:max_k]

    def search_by_overlap(
        self, query: str, lang: str | None = None, max_k: int = 3
    ) -> List[Tuple[dict, int]]:
        """
        Return top max_k fact items by token overlap: query vs (id + claim + source_name).
        Items are UI-shaped dicts (id, claim, value, units, formula, certainty, source_name, source_note).
        Deterministic sort: by (-score, id). Hard cap 3.
        """
        max_k = min(max_k, 3)
        query_tokens = self._tokenize(query)
        if not query_tokens:
            return []
        scored: List[Tuple[dict, int]] = []
        # Score ScientificFact entries (optionally filter by lang)
        for fact in self._facts.values():
            if lang and getattr(fact, "lang", None) and fact.lang != lang:
                continue
            fact_text = " ".join(
                filter(
                    None,
                    [
                        fact.topic,
                        fact.claim,
                        " ".join(fact.keywords or []),
                        " ".join(fact.tags or []),
                    ],
                )
            )
            fact_tokens = self._tokenize(fact_text)
            overlap = len(query_tokens & fact_tokens)
            if overlap > 0:
                scored.append((_fact_to_item_dict(fact), overlap))
        # Score snippets (no lang filter; use for both en and es)
        for sn in self._snippets:
            sn_text = " ".join(filter(None, [sn.get("id") or "", sn.get("claim") or "", sn.get("source_name") or ""]))
            sn_tokens = self._tokenize(sn_text)
            overlap = len(query_tokens & sn_tokens)
            if overlap > 0:
                scored.append((sn, overlap))
        scored.sort(key=lambda x: (-x[1], x[0].get("id", "")))
        return scored[:max_k]

    def _infer_debate_type(self, query: str, debate_title: str) -> str:
        """
        Infer debate type from query + title for field preference.
        Returns: "epistemic" | "cosmology" | "life" | "general".
        """
        text = f"{query} {debate_title}".lower()
        tokens = self._tokenize(text)
        epistemic = {"god", "prove", "evidence", "science", "existence", "falsifiability", "limit", "limits", "method", "empirical", "proof", "disprove"}
        cosmology_kw = {"cosmology", "cosmic", "big", "bang", "origin", "universe", "multiverse", "fine", "tuning", "cmb", "expansion"}
        life_kw = {"consciousness", "life", "mind", "evolution", "brain", "subjective", "abiogenesis", "natural", "selection"}
        if tokens & epistemic:
            return "epistemic"
        if tokens & cosmology_kw:
            return "cosmology"
        if tokens & life_kw:
            return "life"
        return "general"

    def _field_boost(self, fact_field: str, debate_type: str) -> float:
        """Return boost score when fact field matches debate type. Deterministic."""
        f = (fact_field or "").lower()
        if debate_type == "epistemic" and "philosophy" in f and "science" in f:
            return 2.0
        if debate_type == "cosmology" and "cosmology" in f:
            return 2.0
        if debate_type == "life" and any(x in f for x in ("neuroscience", "cognitive", "consciousness", "evolution", "biochem", "astrobiol")):
            return 2.0
        return 0.0

    def _redundancy_penalty(self, claim_tokens: set, selected_claim_tokens: list[set]) -> float:
        """
        Return penalty (positive number) if claim is too similar to already selected claims.
        Uses Jaccard-like overlap: penalty when max(|intersection|/|union|) > 0.5.
        """
        for sel in selected_claim_tokens:
            inter = len(claim_tokens & sel)
            union = len(claim_tokens | sel)
            if union > 0 and inter / union > 0.5:
                return 10.0
        return 0.0

    def _is_constants_mode(self, query: str, debate_title: str) -> bool:
        """True if query/title is about constants, fine-tuning, or laws of nature (aggregate mode)."""
        text = f"{query} {debate_title}".lower()
        tokens = self._tokenize(text)
        constants_keywords = {
            "fine", "tuning", "constants", "constant", "physical_constants",
            "laws_of_nature", "laws", "nature", "ajuste", "fino", "constantes",
            "leyes", "naturaleza", "finetuning", "fine_tuning",
        }
        return bool(tokens & constants_keywords)

    def _is_specific_constant_query(self, query: str, debate_title: str) -> bool:
        """True if user is asking for one specific constant (e.g. value of G, valor de G)."""
        text = f"{query} {debate_title}".lower()
        tokens = self._tokenize(text)
        # Include single-letter constant symbols (tokenize drops len<=1)
        for w in text.split():
            if len(w) == 1 and w in "gchrek":
                tokens = tokens | {w}
            if w in ("g", "c", "h", "r", "e", "k_b", "n_a", "hbar"):
                tokens = tokens | {w}
        value_like = {"value", "valor", "what", "qué", "define", "definition", "vale"}
        constant_symbols = {"g", "c", "h", "k_b", "n_a", "r", "e", "hbar", "avogadro", "boltzmann", "planck", "light", "gravitational", "gravitacional"}
        return bool(tokens & value_like and tokens & constant_symbols)

    def _specific_constant_boost(self, item: dict, query: str, debate_title: str) -> float:
        """When user asks for one constant by name, boost the matching atomic_constants fact."""
        if item.get("group") != "atomic_constants":
            return 0.0
        text = f"{query} {debate_title}".lower()
        tokens = self._tokenize(text)
        for w in text.split():
            if len(w) == 1 and w in "gchrek":
                tokens = tokens | {w}
            if w in ("g", "c", "h", "r", "e", "k_b", "n_a", "hbar"):
                tokens = tokens | {w}
        constant_symbols = {"g", "c", "h", "k_b", "n_a", "r", "e", "hbar", "avogadro", "boltzmann", "planck", "light", "gravitational", "gravitacional"}
        requested = tokens & constant_symbols
        if not requested:
            return 0.0
        item_id = (item.get("id") or "").lower()
        item_claim = (item.get("claim") or "").lower()
        # Match constant as a segment in id (e.g. .g. or .c.) so "c" does not match "constants"
        for sym in requested:
            if f".{sym}." in item_id or item_id.endswith(f".{sym}") or item_id.endswith(f".{sym}.en") or item_id.endswith(f".{sym}.es"):
                return 5.0
            if sym in item_claim and len(sym) > 1:
                return 5.0
        return 0.0

    def rank_facts_for_debate(
        self, query: str, debate_title: str, lang: str | None = None, max_k: int = 3
    ) -> List[Tuple[dict, float]]:
        """
        Deterministic ranking: top 1–3 facts by relevance to query + debate title.
        Uses: token overlap, field preference (philosophy_of_science/cosmology/life), redundancy penalization.
        Returns list of (item_dict, score) with stable ordering; max 3 items.
        """
        max_k = min(max_k, 3)
        combined = f"{query} {debate_title}".strip()
        query_tokens = self._tokenize(combined)
        if not query_tokens:
            return []

        candidates: List[Tuple[dict, float]] = []
        debate_type = self._infer_debate_type(query, debate_title or "")
        constants_mode = self._is_constants_mode(query, debate_title or "")
        specific_constant_query = self._is_specific_constant_query(query, debate_title or "")

        for fact in self._facts.values():
            if lang and getattr(fact, "lang", None) and fact.lang != lang:
                continue
            item = _fact_to_item_dict(fact)
            fact_text = " ".join(filter(None, [
                fact.topic, fact.claim,
                " ".join(fact.keywords or []),
                " ".join(fact.tags or []),
                item.get("field") or "",
            ]))
            fact_tokens = self._tokenize(fact_text)
            overlap = len(query_tokens & fact_tokens)
            if overlap > 0:
                field_boost = self._field_boost(item.get("field") or "", debate_type)
                score = float(overlap) + field_boost
                group = item.get("group")
                if constants_mode and not specific_constant_query:
                    if group == "rollup_constants":
                        score += 10.0
                    elif group == "atomic_constants":
                        score -= 5.0
                if specific_constant_query:
                    score += self._specific_constant_boost(item, query, debate_title or "")
                candidates.append((item, score))

        for sn in self._snippets:
            sn_text = " ".join(filter(None, [
                sn.get("id") or "",
                sn.get("claim") or "",
                sn.get("source_name") or "",
                sn.get("field") or "",
            ]))
            sn_tokens = self._tokenize(sn_text)
            overlap = len(query_tokens & sn_tokens)
            if overlap > 0:
                field_boost = self._field_boost(sn.get("field") or "", debate_type)
                candidates.append((sn, float(overlap) + field_boost))

        candidates.sort(key=lambda x: (-x[1], x[0].get("id", "")))

        selected: List[Tuple[dict, float]] = []
        selected_claim_tokens: List[set] = []
        has_atomic_constant = False

        for item, score in candidates:
            if len(selected) >= max_k:
                break
            group = item.get("group")
            if group == "atomic_constants":
                if has_atomic_constant:
                    continue
                has_atomic_constant = True
            claim = (item.get("claim") or "").strip()
            claim_tokens = self._tokenize(claim)
            penalty = self._redundancy_penalty(claim_tokens, selected_claim_tokens)
            if penalty > 0:
                continue
            selected.append((item, score))
            selected_claim_tokens.append(claim_tokens)

        return selected[:max_k]


class PhilosophyKBLoader:
    """Loads and validates Philosophy Knowledge Base entries from YAML files."""

    def __init__(self):
        self._entries: dict[str, KBPhilosophyQuote] = {}
        self._load_all()

    def _load_all(self):
        """Load all YAML files from knowledge_base_philosophy directory."""
        if not PHILOSOPHY_KB_DIR.exists():
            return
        for yaml_file in PHILOSOPHY_KB_DIR.glob("*.yaml"):
            self._load_file(yaml_file)

    def _load_file(self, yaml_path: Path):
        """Load entries from a single YAML file."""
        try:
            with open(yaml_path, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)
            if not isinstance(data, list):
                data = [data]
            for entry_dict in data:
                try:
                    entry = KBPhilosophyQuote(**entry_dict)
                    if entry.quote_id in self._entries:
                        raise ValueError(f"Duplicate Philosophy KB quote_id: {entry.quote_id}")
                    self._entries[entry.quote_id] = entry
                except Exception as e:
                    raise ValueError(f"Invalid entry in {yaml_path}: {e}") from e
        except Exception as e:
            raise RuntimeError(f"Failed to load {yaml_path}: {e}") from e

    def get_all(self) -> List[KBPhilosophyQuote]:
        """Get all entries."""
        return list(self._entries.values())

    def get_by_id(self, quote_id: str) -> KBPhilosophyQuote | None:
        """Get a specific quote by quote_id."""
        return self._entries.get(quote_id)


class QuotesKBLoader:
    """Loads Verbatim Quotes KB from knowledge_base_quotes/quotes/**/*.yaml."""

    def __init__(self):
        self._quotes: dict[str, VerbatimQuote] = {}
        self._load_all()

    def _load_all(self):
        """Load all YAML files from quotes/philosophy, quotes/science, etc."""
        if not QUOTES_KB_DIR.exists():
            logger.warning("Quotes KB dir does not exist: %s", QUOTES_KB_DIR)
            return
        for yaml_file in sorted(QUOTES_KB_DIR.rglob("*.yaml")):
            self._load_file(yaml_file)
        logger.info("Quotes KB: loaded %d verbatim quotes", len(self._quotes))

    def _load_file(self, yaml_path: Path):
        """Load entries from a single YAML file (list or single dict)."""
        try:
            with open(yaml_path, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)
        except (yaml.YAMLError, OSError) as e:
            logger.warning("Quotes KB: skip %s: %s", yaml_path.name, e)
            return
        if data is None:
            return
        items = data if isinstance(data, list) else [data]
        for entry_dict in items:
            if not isinstance(entry_dict, dict):
                continue
            try:
                # Build dict with only model fields; set topic_domain, subdomain, entities (backwards compatible)
                d = {k: v for k, v in entry_dict.items() if k in VerbatimQuote.model_fields}
                domain_val = entry_dict.get("domain", "quotes")
                if domain_val and domain_val != "quotes":
                    topic_domain_from_yaml = domain_val
                    d["domain"] = "quotes"
                else:
                    topic_domain_from_yaml = None
                cat = entry_dict.get("category", "")
                d["topic_domain"] = (
                    entry_dict.get("topic_domain")
                    or topic_domain_from_yaml
                    or CATEGORY_TO_TOPIC_DOMAIN.get(cat, cat)
                )
                d["subdomain"] = entry_dict.get("subdomain", "")
                d["entities"] = entry_dict.get("entities", [])
                d["topics"] = entry_dict.get("topics", [])
                entry = VerbatimQuote(**d)
                if entry.id in self._quotes:
                    logger.warning("Quotes KB: duplicate id %s in %s", entry.id, yaml_path.name)
                    continue
                self._quotes[entry.id] = entry
            except Exception as e:
                logger.warning("Quotes KB: invalid entry in %s: %s", yaml_path.name, e)

    def get_all(self) -> List[VerbatimQuote]:
        """Get all verbatim quotes."""
        return list(self._quotes.values())

    def get_by_id(self, quote_id: str) -> VerbatimQuote | None:
        """Get a quote by id."""
        return self._quotes.get(quote_id)
