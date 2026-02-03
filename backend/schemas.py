from enum import Enum
from pydantic import BaseModel, Field


class Domain(str, Enum):
    MECHANICS = "mechanics"
    THERMODYNAMICS = "thermodynamics"
    ELECTROMAGNETISM = "electromagnetism"
    OPTICS = "optics"
    QUANTUM_MECHANICS = "quantum_mechanics"
    FLUID_DYNAMICS = "fluid_dynamics"
    WAVES = "waves"
    RELATIVITY = "relativity"
    OTHER = "other"


class Variable(BaseModel):
    name: str
    meaning: str
    unit: str


class CandidateLaw(BaseModel):
    name: str
    form: str
    why_applicable: str


class SuggestedLaw(BaseModel):
    kb_id: str
    name: str
    equation: str
    explanation: str
    status: str  # "postulate" | "empirical" | "derived" | "definition"
    assumptions: list[str] = Field(default_factory=list)
    validity_limits: list[str] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)


class PhysicalSpec(BaseModel):
    domain: Domain
    goal: str
    assumptions: list[str] = Field(default_factory=list)
    variables: list[Variable] = Field(default_factory=list)
    constraints: list[str] = Field(default_factory=list)
    candidate_laws: list[CandidateLaw] = Field(default_factory=list)
    suggested_laws: list[SuggestedLaw] = Field(default_factory=list)
    questions: list[str] = Field(default_factory=list)


# --- CheckReport (Milestone 2) + actionable (2.5)
class FixSuggestion(BaseModel):
    op: str  # "set"
    path: str
    value: str | int | float | bool | None  # unit strings, etc.
    label: str


class CheckItem(BaseModel):
    id: str
    name: str
    status: str  # "passed" | "warning" | "failed"
    message: str | None = None
    related_fields: list[str] = Field(default_factory=list)
    fix_suggestions: list[FixSuggestion] | None = None
    metadata: dict | None = None  # e.g. {"suggested_law": "N = m*g*cos(theta)"}


class CheckReport(BaseModel):
    items: list[CheckItem] = Field(default_factory=list)
