from enum import Enum
from pydantic import BaseModel, Field
from typing import Optional


class Certainty(str, Enum):
    CONSENSUS = "consensus"
    DEBATED = "debated"
    SPECULATIVE = "speculative"


class KBScienceEntry(BaseModel):
    """Science Knowledge Base entry schema."""
    id: str
    topic: str
    certainty: Certainty
    claims: list[str] = Field(default_factory=list)
    misconceptions: list[str] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)
    keywords: list[str] = Field(default_factory=list)


class KBSource(BaseModel):
    """Source metadata for KB entries (ingestion pipeline)."""
    origin_file: str
    imported_at: str  # ISO datetime


class ScientificFactCertainty(str, Enum):
    EXACT = "exact"
    MEASURED = "measured"
    THEORETICAL = "theoretical"
    MODEL_DEPENDENT = "model-dependent"


class ScientificFact(BaseModel):
    """Scientific Facts Knowledge Base schema (files-based)."""
    id: str
    topic: str
    lang: str  # "es" | "en"
    claim: str
    value: Optional[str] = None
    units: Optional[str] = None
    formula: Optional[str] = None
    certainty: ScientificFactCertainty
    source_name: str
    source_note: Optional[str] = None
    tags: list[str] = Field(default_factory=list)
    keywords: list[str] = Field(default_factory=list)
    related_ids: list[str] = Field(default_factory=list)
    created_at: str  # ISO datetime
    group: Optional[str] = None  # e.g. atomic_constants, rollup_constants (for retrieval mutual exclusion)


class KBPhilosophyQuote(BaseModel):
    """Philosophy Knowledge Base quote entry schema."""
    quote_id: str
    author: str
    work: str
    year: Optional[int] = None
    quote: str
    themes: list[str] = Field(default_factory=list)
    interpretation_notes: list[str] = Field(default_factory=list)
    counter_readings: list[str] = Field(default_factory=list)
    keywords: list[str] = Field(default_factory=list)
    language: Optional[str] = None  # "es" | "en", from ingestion
    section: Optional[str] = None
    source: Optional[KBSource] = None


class VerbatimQuote(BaseModel):
    """Verbatim Quotes KB entry schema (knowledge_base_quotes/quotes/**/*.yaml)."""
    id: str
    domain: str = "quotes"
    category: str  # philosophy | science | literature | religion | psychology
    tags: list[str] = Field(default_factory=list)
    author: str
    work: str
    era: str = ""
    language_original: str = "en"
    text_original: str = ""
    text_en: Optional[str] = None
    text_es: Optional[str] = None
    attribution_confidence: str = "medium"  # high | medium | low
    notes: Optional[str] = None
    license_note: str = "unknown"  # public_domain | unknown | needs_review
    # Optional topic fields for precision retrieval (backwards compatible)
    topic_domain: Optional[str] = None  # e.g. religion, politics, history, philosophy, science, literature, psychology
    subdomain: str = ""  # e.g. religion.theism, politics.communism, politics.fascism
    entities: list[str] = Field(default_factory=list)  # canonical tokens: dios, marx, hitler, nazismo, etc.
    topics: list[str] = Field(default_factory=list)  # canonical topics: god, faith, atheism, love, friendship, sadness, stoicism, communism, nazism, ethics, etc.
