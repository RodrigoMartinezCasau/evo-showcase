"""
Debate persistence layer: Debate, DebateMessage, DebateMemory.
Uses same SQLite DB as physics chat (physics_copilot.db).
"""
import json
import uuid
from datetime import datetime
from pathlib import Path

from sqlalchemy import Column, Text
from sqlmodel import Field, Session, SQLModel, select

# Reuse main DB
from db import engine as debate_engine


class Debate(SQLModel, table=True):
    """Debate: id, title, mode, created_at, updated_at."""
    id: str = Field(primary_key=True)
    title: str = Field(default="Nuevo debate")
    mode: str = Field(default="debate")  # "debate" | "students" | "scripts"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class DebateMessage(SQLModel, table=True):
    """Message: id, debate_id, role (user|assistant), content, created_at, meta (JSON)."""
    id: str = Field(primary_key=True)
    debate_id: str = Field(foreign_key="debate.id")
    role: str  # "user" | "assistant"
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    meta_json: str | None = Field(default=None, sa_column=Column(Text, nullable=True))


class MessageDetails(SQLModel, table=True):
    """Lazy-cached expandable content: facts, quotes, creator per assistant message."""
    message_id: str = Field(primary_key=True)
    facts_json: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    quotes_json: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    creator_json: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class DebateMemory(SQLModel, table=True):
    """Per-debate memory: key_terms, assumptions, user_stance. Reduces repetition."""
    debate_id: str = Field(primary_key=True, foreign_key="debate.id")
    user_stance: str | None = Field(default=None)
    key_terms_json: str = Field(default="[]", sa_column=Column(Text))  # list[str], max 8
    assumptions_json: str = Field(default="[]", sa_column=Column(Text))  # list[str], max 5
    last_updated: datetime = Field(default_factory=datetime.utcnow)


def init_debate_db():
    """Ensure debate tables exist. Add mode column if missing (migration)."""
    from sqlalchemy import text
    try:
        with get_debate_session() as s:
            s.execute(text("ALTER TABLE debate ADD COLUMN mode VARCHAR DEFAULT 'debate'"))
            s.commit()
    except Exception:
        pass  # Column already exists or table not yet created


def new_debate_id() -> str:
    return uuid.uuid4().hex


def get_debate_session():
    return Session(debate_engine)


# --- CRUD ---

def list_debates(mode: str | None = None) -> list[dict]:
    """GET /debates: list debates (id, title, mode, updated_at), newest first. If mode is set, filter by it."""
    with get_debate_session() as s:
        q = select(Debate).order_by(Debate.updated_at.desc())
        if mode:
            q = q.where(Debate.mode == mode)
        rows = s.exec(q).all()
        return [
            {"id": r.id, "title": r.title, "mode": getattr(r, "mode", None) or "debate", "updated_at": r.updated_at.isoformat()}
            for r in rows
        ]


def create_debate(title: str = "Nuevo debate", mode: str = "debate") -> Debate:
    """POST /debates: create a new debate."""
    d = Debate(id=new_debate_id(), title=title, mode=mode)
    with get_debate_session() as s:
        s.add(d)
        s.commit()
        s.refresh(d)
    return d


def get_debate(debate_id: str) -> Debate | None:
    """GET /debates/{id}: fetch debate by id."""
    with get_debate_session() as s:
        return s.get(Debate, debate_id)


def get_debate_with_messages(debate_id: str) -> dict | None:
    """Full debate including messages. Returns None if not found."""
    with get_debate_session() as s:
        d = s.get(Debate, debate_id)
        if d is None:
            return None
        msgs = s.exec(
            select(DebateMessage).where(DebateMessage.debate_id == debate_id).order_by(DebateMessage.created_at)
        ).all()
        messages = []
        for m in msgs:
            msg = {"id": m.id, "role": m.role, "content": m.content, "created_at": m.created_at.isoformat()}
            if m.meta_json:
                try:
                    meta = json.loads(m.meta_json)
                except json.JSONDecodeError:
                    meta = {}
            else:
                meta = {}
            # Normalize: if minimal meta (steelman/contrarian) without debate_response, build it
            if meta.get("steelman") and not meta.get("debate_response"):
                meta["debate_response"] = {
                    "facts_layer": {"summary": "", "claims": [], "what_we_dont_know": [], "common_misconceptions": [], "facts": []},
                    "author_layer": {"quotes": [], "quote_policy_note": ""},
                    "debate_layer": {
                        "steelman_of_user": meta["steelman"],
                        "contrarian_position": meta.get("contrarian", ""),
                        "counterarguments": [],
                        "socratic_questions": [meta.get("next_question", "")],
                        "where_contrarian_might_fail": [],
                    },
                    "closing": {"open_ended_takeaways": [], "next_questions_for_user": [meta.get("next_question", "")]},
                }
                meta["next_question"] = meta.get("next_question", "")
            # Persisted Scientific Facts and Verbatim Quotes: attach from MessageDetails so they survive navigation/reload
            if m.role == "assistant":
                md = s.get(MessageDetails, m.id)
                if md:
                    if md.facts_json:
                        meta.setdefault("debate_response", {})["facts_layer"] = json.loads(md.facts_json)
                    if md.quotes_json:
                        meta.setdefault("debate_response", {})["author_layer"] = json.loads(md.quotes_json)
            msg["meta"] = meta
            messages.append(msg)
        return {
            "id": d.id,
            "title": d.title,
            "mode": getattr(d, "mode", None) or "debate",
            "created_at": d.created_at.isoformat(),
            "updated_at": d.updated_at.isoformat(),
            "messages": messages,
        }


def append_message(debate_id: str, role: str, content: str, meta: dict | None = None) -> DebateMessage:
    """Append a message and bump debate.updated_at."""
    m = DebateMessage(
        id=new_debate_id(),
        debate_id=debate_id,
        role=role,
        content=content,
        meta_json=json.dumps(meta) if meta else None,
    )
    with get_debate_session() as s:
        s.add(m)
        d = s.get(Debate, debate_id)
        if d:
            d.updated_at = datetime.utcnow()
        s.commit()
        s.refresh(m)
    return m


def update_debate_title(debate_id: str, title: str) -> bool:
    """Update debate title (e.g. after first user message)."""
    with get_debate_session() as s:
        d = s.get(Debate, debate_id)
        if d is None:
            return False
        d.title = title
        d.updated_at = datetime.utcnow()
        s.commit()
        return True


def get_message(message_id: str) -> DebateMessage | None:
    """Get a single message by id."""
    with get_debate_session() as s:
        return s.get(DebateMessage, message_id)


def get_or_create_message_details(message_id: str) -> MessageDetails:
    """Get MessageDetails for a message; create empty row if not exists."""
    with get_debate_session() as s:
        md = s.get(MessageDetails, message_id)
        if md is None:
            md = MessageDetails(message_id=message_id)
            s.add(md)
            s.commit()
            s.refresh(md)
        return md


def upsert_message_details(
    message_id: str,
    facts_json: str | None = None,
    quotes_json: str | None = None,
    creator_json: str | None = None,
) -> None:
    """Update message_details. Pass only the fields to set."""
    with get_debate_session() as s:
        md = s.get(MessageDetails, message_id)
        if md is None:
            md = MessageDetails(message_id=message_id)
            s.add(md)
        if facts_json is not None:
            md.facts_json = facts_json
        if quotes_json is not None:
            md.quotes_json = quotes_json
        if creator_json is not None:
            md.creator_json = creator_json
        md.updated_at = datetime.utcnow()
        s.commit()


def delete_debate(debate_id: str) -> bool:
    """DELETE /debates/{id}. Returns True if deleted."""
    with get_debate_session() as s:
        d = s.get(Debate, debate_id)
        if d is None:
            return False
        s.delete(d)
        s.commit()
        return True


# --- DebateMemory ---

def get_debate_memory(debate_id: str) -> dict | None:
    """Load memory for a debate. Returns None if none exists."""
    with get_debate_session() as s:
        mem = s.get(DebateMemory, debate_id)
        if mem is None:
            return None
        return {
            "user_stance": mem.user_stance,
            "key_terms": json.loads(mem.key_terms_json) if mem.key_terms_json else [],
            "assumptions": json.loads(mem.assumptions_json) if mem.assumptions_json else [],
            "last_updated": mem.last_updated.isoformat(),
        }


def upsert_debate_memory(
    debate_id: str,
    user_stance: str | None = None,
    key_terms: list[str] | None = None,
    assumptions: list[str] | None = None,
) -> None:
    """Insert or update DebateMemory. Max 8 key_terms, 5 assumptions."""
    with get_debate_session() as s:
        mem = s.get(DebateMemory, debate_id)
        if mem is None:
            mem = DebateMemory(debate_id=debate_id)
            s.add(mem)
        if user_stance is not None:
            mem.user_stance = user_stance[:500] if len(user_stance) > 500 else user_stance
        if key_terms is not None:
            mem.key_terms_json = json.dumps(key_terms[:8])
        if assumptions is not None:
            mem.assumptions_json = json.dumps(assumptions[:5])
        mem.last_updated = datetime.utcnow()
        s.commit()
