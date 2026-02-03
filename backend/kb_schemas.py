from enum import Enum
from pydantic import BaseModel, Field


class KBType(str, Enum):
    LAW = "law"
    PRINCIPLE = "principle"
    LIMIT = "limit"
    CONSTANT = "constant"


class KBDomain(str, Enum):
    MECHANICS = "mechanics"
    THERMODYNAMICS = "thermodynamics"
    ELECTROMAGNETISM = "electromagnetism"
    QUANTUM = "quantum"


class KBStatus(str, Enum):
    POSTULATE = "postulate"
    DERIVED = "derived"
    EMPIRICAL = "empirical"
    DEFINITION = "definition"


class KBRequirements(BaseModel):
    """Requirements for a KB entry to be applicable."""
    variables: list[str] = Field(default_factory=list)  # Required variable names
    assumptions: list[str] = Field(default_factory=list)  # Required assumption keywords


class KBEntry(BaseModel):
    id: str
    type: KBType
    domain: KBDomain
    status: KBStatus
    name: str
    equation: str | None = None
    variables: dict[str, str] | None = None  # variable name -> description
    assumptions: list[str] = Field(default_factory=list)
    validity_limits: list[str] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)
    requirements: KBRequirements | None = None  # Requirements for this entry to be applicable
