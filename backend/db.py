import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from sqlalchemy import Column, Text
from sqlmodel import Field, Session, SQLModel, create_engine

from schemas import PhysicalSpec

# Vercel serverless: filesystem is read-only except /tmp
if os.environ.get("VERCEL"):
    DB_PATH = Path("/tmp") / "physics_copilot.db"
else:
    DB_PATH = Path(__file__).parent / "physics_copilot.db"
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})


class Conversation(SQLModel, table=True):
    id: str = Field(primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Message(SQLModel, table=True):
    id: str = Field(primary_key=True)
    conversation_id: str = Field(foreign_key="conversation.id")
    role: str  # "user" | "assistant"
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class PhysicalSpecSnapshot(SQLModel, table=True):
    id: str = Field(primary_key=True)
    conversation_id: str = Field(foreign_key="conversation.id")
    message_id: str = Field(foreign_key="message.id")
    spec_json: str = Field(sa_column=Column(Text))
    created_at: datetime = Field(default_factory=datetime.utcnow)


class PhilosophicalProfile(SQLModel, table=True):
    """Persists AI-generated philosophical profile blocks per user."""

    __tablename__ = "philosophical_profile"

    user_id: str = Field(primary_key=True)
    summary: Optional[str] = Field(default=None, sa_column=Column(Text))
    summary_updated_at: Optional[datetime] = Field(default=None)
    philosophers: Optional[str] = Field(default=None, sa_column=Column(Text))
    philosophers_updated_at: Optional[datetime] = Field(default=None)
    books: Optional[str] = Field(default=None, sa_column=Column(Text))
    books_updated_at: Optional[datetime] = Field(default=None)
    jobs: Optional[str] = Field(default=None, sa_column=Column(Text))
    jobs_updated_at: Optional[datetime] = Field(default=None)


def init_db():
    SQLModel.metadata.create_all(engine)


def new_id() -> str:
    return uuid.uuid4().hex


def get_session():
    return Session(engine)


def save_spec(conversation_id: str, message_id: str, spec: PhysicalSpec) -> str:
    with get_session() as s:
        row = PhysicalSpecSnapshot(
            id=new_id(),
            conversation_id=conversation_id,
            message_id=message_id,
            spec_json=spec.model_dump_json(),
        )
        s.add(row)
        s.commit()
        return row.id


def spec_from_json(s: str) -> PhysicalSpec:
    return PhysicalSpec.model_validate_json(s)
