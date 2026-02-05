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


class DebateFavorite(SQLModel, table=True):
    """Favorites: debate_id is favorited if a row exists."""
    debate_id: str = Field(primary_key=True, foreign_key="debate.id")


class Folder(SQLModel, table=True):
    """Folder: id, name, created_at."""
    id: str = Field(primary_key=True)
    name: str = Field()
    created_at: datetime = Field(default_factory=datetime.utcnow)


class FolderDebate(SQLModel, table=True):
    """Assignment: one debate belongs to at most one folder."""
    folder_id: str = Field(foreign_key="folder.id", primary_key=True)
    debate_id: str = Field(foreign_key="debate.id", primary_key=True)


def init_debate_db():
    """Ensure debate tables exist (including favorites, folders). Add mode column if missing (migration)."""
    from sqlmodel import SQLModel
    SQLModel.metadata.create_all(debate_engine)
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
    """GET /debates: list debates (id, title, mode, updated_at, is_favorite, folder_id), newest first."""
    fav_ids = set(list_favorite_ids())
    folder_by_debate = {}
    for folder in list_folders():
        for did in folder["chatIds"]:
            folder_by_debate[did] = folder["id"]
    with get_debate_session() as s:
        q = select(Debate).order_by(Debate.updated_at.desc())
        if mode:
            q = q.where(Debate.mode == mode)
        rows = s.exec(q).all()
        return [
            {
                "id": r.id,
                "title": r.title,
                "mode": getattr(r, "mode", None) or "debate",
                "updated_at": r.updated_at.isoformat(),
                "is_favorite": r.id in fav_ids,
                "folder_id": folder_by_debate.get(r.id),
            }
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
    """DELETE /debates/{id}. Returns True if deleted. Also removes from favorites and folder assignment."""
    with get_debate_session() as s:
        d = s.get(Debate, debate_id)
        if d is None:
            return False
        fav = s.get(DebateFavorite, debate_id)
        if fav is not None:
            s.delete(fav)
        fd = s.exec(select(FolderDebate).where(FolderDebate.debate_id == debate_id)).first()
        if fd is not None:
            s.delete(fd)
        s.delete(d)
        s.commit()
        return True


# --- Favorites ---

def list_favorite_ids() -> list[str]:
    """Return list of debate ids that are favorited."""
    with get_debate_session() as s:
        rows = s.exec(select(DebateFavorite)).all()
        return [r.debate_id for r in rows]


def toggle_favorite(debate_id: str) -> bool:
    """Toggle favorite for debate_id. Returns True if now favorited, False if removed."""
    with get_debate_session() as s:
        row = s.get(DebateFavorite, debate_id)
        if row is None:
            s.add(DebateFavorite(debate_id=debate_id))
            s.commit()
            return True
        s.delete(row)
        s.commit()
        return False


def is_favorite(debate_id: str) -> bool:
    """Check if debate is favorited."""
    with get_debate_session() as s:
        return s.get(DebateFavorite, debate_id) is not None


# --- Folders ---

def list_folders() -> list[dict]:
    """Return folders with id, name, created_at, and list of debate_ids."""
    with get_debate_session() as s:
        folders = s.exec(select(Folder).order_by(Folder.created_at)).all()
        result = []
        for f in folders:
            links = s.exec(select(FolderDebate).where(FolderDebate.folder_id == f.id)).all()
            result.append({
                "id": f.id,
                "name": f.name,
                "created_at": f.created_at.isoformat(),
                "chatIds": [fd.debate_id for fd in links],
            })
        return result


def create_folder(name: str) -> Folder:
    """Create a folder. name trimmed, max 100 chars."""
    n = (name or "Nueva carpeta").strip()[:100] or "Nueva carpeta"
    fid = uuid.uuid4().hex
    f = Folder(id=fid, name=n)
    with get_debate_session() as s:
        s.add(f)
        s.commit()
        s.refresh(f)
    return f


def update_folder_name(folder_id: str, name: str) -> bool:
    """Rename folder. Returns False if not found."""
    n = (name or "").strip()[:100]
    if not n:
        return False
    with get_debate_session() as s:
        f = s.get(Folder, folder_id)
        if f is None:
            return False
        f.name = n
        s.commit()
        return True


def delete_folder(folder_id: str) -> bool:
    """Delete folder and all folder_debate mappings. Debates are not deleted. Returns True if folder existed."""
    with get_debate_session() as s:
        f = s.get(Folder, folder_id)
        if f is None:
            return False
        for fd in s.exec(select(FolderDebate).where(FolderDebate.folder_id == folder_id)).all():
            s.delete(fd)
        s.delete(f)
        s.commit()
        return True


def get_debate_folder_id(debate_id: str) -> str | None:
    """Return folder_id for debate, or None."""
    with get_debate_session() as s:
        row = s.exec(select(FolderDebate).where(FolderDebate.debate_id == debate_id)).first()
        return row.folder_id if row else None


def set_debate_folder(debate_id: str, folder_id: str | None) -> None:
    """Assign debate to folder (or remove from folder if folder_id is None)."""
    with get_debate_session() as s:
        existing = s.exec(select(FolderDebate).where(FolderDebate.debate_id == debate_id)).first()
        if existing:
            s.delete(existing)
        if folder_id:
            s.add(FolderDebate(folder_id=folder_id, debate_id=debate_id))
        s.commit()


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
