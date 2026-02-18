import json
import logging
import os
from pathlib import Path
import time
import uuid
from dotenv import load_dotenv

logger = logging.getLogger(__name__)
load_dotenv(Path(__file__).resolve().parent.parent / ".env")
load_dotenv()

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from checks import CheckRunner
from db import Conversation, Message, get_session, init_db, new_id, save_spec
from pipeline import run_pipeline
from schemas import PhysicalSpec

app = FastAPI(title="Physics Copilot API")

# CORS: allow frontend origins so browser can call this API (e.g. Next.js on 3000)
_cors_origins = os.environ.get("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").strip()
_cors_list = [o.strip() for o in _cors_origins.split(",") if o.strip()] or ["http://localhost:3000", "http://127.0.0.1:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Minimal private beta protection: API key + rate limiting ---
TESTER_API_KEY = os.environ.get("TESTER_API_KEY") or ""
RATE_LIMIT_PER_MINUTE = 10
_RATE_WINDOW_SECONDS = 60
_rate_counters: dict[tuple[str, str], dict[str, float | int]] = {}

# --- Daily quota (per API key, per day) ---
DAILY_LIMIT = 30  # <-- edit this to change daily quota
_daily_usage: dict[tuple[str, str], int] = {}


def _get_client_ip(request: Request) -> str:
    """Return client IP, honoring X-Forwarded-For (Vercel/Proxies)."""
    xff = request.headers.get("x-forwarded-for")
    if xff:
        # Use first IP in comma-separated list
        return xff.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


@app.middleware("http")
async def beta_protection_middleware(request: Request, call_next):
    """
    Simple API-key + rate-limit guard for private beta.
    - Requires header x-api-key when TESTER_API_KEY is set.
    - Enforces 10 req/min per IP+path.
    """
    path = request.url.path

    # Skip health and CORS preflight
    if path == "/health" or request.method == "OPTIONS":
        return await call_next(request)

    # API key check (when configured)
    api_key = ""
    if TESTER_API_KEY:
        provided = request.headers.get("x-api-key") or ""
        if not provided or provided != TESTER_API_KEY:
            return JSONResponse(
                status_code=401,
                content={"detail": "Invalid or missing API key"},
            )
        api_key = provided or ""
    else:
        # For local dev without TESTER_API_KEY, group all usage under empty key
        api_key = request.headers.get("x-api-key") or ""

    # Rate limiting: per IP + path
    ip = _get_client_ip(request)
    key = (ip, path)
    now = time.time()
    bucket = _rate_counters.get(key)
    if not bucket or now >= bucket["reset"]:  # type: ignore[index]
        bucket = {"count": 1, "reset": now + _RATE_WINDOW_SECONDS}
        _rate_counters[key] = bucket
    else:
        bucket["count"] = int(bucket["count"]) + 1  # type: ignore[index]
        if bucket["count"] > RATE_LIMIT_PER_MINUTE:  # type: ignore[comparison-overlap]
            return JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded. Please wait a minute before retrying."},
            )

    def _is_generation_endpoint(p: str, method: str) -> bool:
        if method != "POST":
            return False
        # Core LLM pipelines
        if p in {"/debate", "/debate/chat", "/creator"}:
            return True
        # Create debate (initial message)
        if p == "/debates":
            return True
        # Persisted debate chat
        if p.startswith("/debates/") and p.endswith("/chat"):
            return True
        # Lazy-loaded blocks (facts, quotes, creator) per message
        if p.startswith("/messages/") and any(p.endswith(suffix) for suffix in ("/facts", "/quotes", "/creator")):
            return True
        return False

    is_generation = _is_generation_endpoint(path, request.method)

    # Daily quota check BEFORE executing the endpoint (only for generation routes)
    if is_generation:
        today = time.strftime("%Y-%m-%d", time.gmtime())
        usage_key = (api_key, today)
        used = _daily_usage.get(usage_key, 0)
        if used >= DAILY_LIMIT:
            return JSONResponse(
                status_code=429,
                content={"error": "Daily quota exceeded", "remaining": 0},
            )

    # Call downstream handler
    response = await call_next(request)

    # Increment quota ONLY after successful generation calls (and not for /usage)
    if is_generation and response.status_code < 400:
        today = time.strftime("%Y-%m-%d", time.gmtime())
        usage_key = (api_key, today)
        _daily_usage[usage_key] = _daily_usage.get(usage_key, 0) + 1

    return response


@app.get("/usage")
def get_usage(request: Request):
    """Return current daily usage for the calling API key."""
    # API key has already been validated by middleware (if TESTER_API_KEY is set)
    api_key = request.headers.get("x-api-key") or (TESTER_API_KEY or "")
    today = time.strftime("%Y-%m-%d", time.gmtime())
    usage_key = (api_key, today)
    used = _daily_usage.get(usage_key, 0)
    remaining = max(DAILY_LIMIT - used, 0)
    return {
        "dailyLimit": DAILY_LIMIT,
        "used": used,
        "remaining": remaining,
        "date": today,
    }


@app.on_event("startup")
def on_startup():
    import logging
    logging.basicConfig(level=logging.INFO)
    # Ensure debate tables exist and are migrated (e.g., add mode column if missing)
    import debate_db  # noqa: F401 - register Debate, DebateMessage, DebateMemory
    try:
        debate_db.init_debate_db()
    except Exception:
        # Migration is best-effort; if it fails we still start the app
        logging.exception("init_debate_db failed")
    init_db()


class ChatRequest(BaseModel):
    message: str
    conversation_id: str | None = None


class ChatResponse(BaseModel):
    message: str
    physical_spec: dict
    conversation_id: str
    check_report: dict
    kb_candidate_count: int = 0
    kb_candidates: list[dict] = []


class ValidateRequest(BaseModel):
    physical_spec: dict


class ValidateResponse(BaseModel):
    check_report: dict


# --- Debate Mode Models (Milestone D1)
class DebateRequest(BaseModel):
    topic: str
    user_message: str
    user_stance: str | None = None  # "unknown" | "theist" | "atheist" | "agnostic"


# Import Claim and FactsLayer from debate_facts_generator to avoid circular imports
from debate_facts_generator import Claim, FactsLayer
# Import Quote and AuthorLayer from debate_author_generator
from debate_author_generator import Quote, AuthorLayer
# Import DebateLayer and debate engine from debate_layer_generator
from debate_layer_generator import DebateLayer, generate_debate_layer, detect_stance


class Closing(BaseModel):
    open_ended_takeaways: list[str]
    next_questions_for_user: list[str]


class DebateResponse(BaseModel):
    facts_layer: FactsLayer
    author_layer: AuthorLayer
    debate_layer: DebateLayer
    closing: Closing


# --- Creator Mode (Milestone D6)
class CreatorRequest(BaseModel):
    topic: str
    user_message: str
    user_stance: str | None = None
    creator_style: str | None = None  # "etacon_calm" | "evoconn_dynamic"
    format: str | None = None         # "video_script" | "written_reflection"
    length: str | None = None         # "short" | "medium" | "long"


from debate_creator_generator import CreatorResponse as CreatorResponseModel, generate_creator_response, _build_content_pack
from personality_policy import get_validator


# --- Debate Chat (casual message -> DebateRequest -> pipeline)
class DebateChatRequest(BaseModel):
    message: str
    thread_id: str | None = None


class DebateChatResponse(BaseModel):
    assistant_text: str
    debate_response: DebateResponse
    next_question: str
    thread_id: str
    topic: str
    message_id: str | None = None  # for lazy fetch of facts/quotes/creator
    lang: str | None = None  # "es" | "en" for UI labels
    verbatim_quotes: list[dict] | None = None  # alias of debate_response.author_layer.quotes for API clarity


# --- Persisted Debates API ---

class CreateDebateRequest(BaseModel):
    """POST /debates: optional initial user message to generate short title, optional mode."""
    initial_message: str | None = None
    mode: str | None = None  # "debate" | "students" | "scripts", default "debate"


class DebateChatPayload(BaseModel):
    """POST /debates/{id}/chat: user message to send. Optional mode for future use; defaults to debate."""
    message: str
    mode: str | None = None  # "debate" | "students" | "scripts"; optional, default debate


class UpdateTitleRequest(BaseModel):
    """PATCH /debates/{id}/title: new title (max 30 chars)."""
    title: str


def _run_debate_pipeline(
    payload: DebateRequest,
    debate_memory: dict | None = None,
    response_language: str = "en",
) -> DebateResponse:
    """Shared debate pipeline: retrieval + facts + author + debate layers + personality validation."""
    logger.info("_run_debate_pipeline: response_language=%s topic=%s", response_language, (payload.topic or "")[:60])
    try:
        from debate_retriever import DebateRetriever
        from debate_facts_generator import generate_facts_layer, generate_science_context_block
        from debate_author_generator import generate_author_layer
        from llm import OpenAIClient

        retriever = DebateRetriever()
        science_results = retriever.retrieve_science(payload.topic, payload.user_message, top_n=5)
        philosophy_results = retriever.retrieve_philosophy(payload.topic, payload.user_message, top_n=5)
        science_entries = [entry for entry, _ in science_results]
        philosophy_quotes = [quote for quote, _ in philosophy_results]

        llm_client = OpenAIClient()
        facts_layer = generate_facts_layer(
            topic=payload.topic,
            user_message=payload.user_message,
            science_entries=science_entries,
            llm_client=llm_client,
            response_language=response_language,
        )
        # Generate LLM-based scientific context + verification bullets for the Hechos científicos UI block.
        ctx_summary, verification_points = generate_science_context_block(
            payload.topic or "",
            payload.user_message or "",
            llm_client=llm_client,
            response_language=response_language,
        )
        facts_layer = FactsLayer(
            summary=ctx_summary or facts_layer.summary,
            claims=facts_layer.claims,
            what_we_dont_know=facts_layer.what_we_dont_know,
            common_misconceptions=facts_layer.common_misconceptions,
            facts=None,
            facts_domain="science",
            verification_points=verification_points,
        )
        # Verbatim Quotes KB: deterministic retrieval (max 3, max 1 per author); if any match, use them
        verbatim_results = retriever.retrieve_verbatim_quotes(
            payload.topic or "",
            payload.user_message or "",
            top_n=3,
            language=response_language,
        )
        verbatim_quotes_for_layer = [q for q, _ in verbatim_results]
        verbatim_quotes_for_layer = retriever.pad_verbatim_quotes_to_n(verbatim_quotes_for_layer, 3)
        if verbatim_results:
            if logger.isEnabledFor(logging.DEBUG):
                logger.debug(
                    "Verbatim quotes retrieved (top %d): %s",
                    len(verbatim_results),
                    [(q.id, score) for q, score in verbatim_results],
                )
        else:
            logger.info("Verbatim quotes retrieval returned 0 for topic=%s", (payload.topic or "")[:60])
        if verbatim_quotes_for_layer:
            policy_note_en = "Verbatim quotes from the knowledge base (tag-matched to this topic)."
            policy_note_es = "Citas textuales de la base de conocimiento (asociadas por etiquetas a este tema)."
            author_layer = AuthorLayer(
                quotes=[
                    Quote(
                        quote_id=vq.id,
                        author=vq.author,
                        work=vq.work,
                        quote=(vq.text_es if response_language == "es" else None) or vq.text_en or vq.text_es or vq.text_original,
                        interpretation=vq.notes or "",
                        relevance="Tags: " + ", ".join(vq.tags) if vq.tags else "",
                    )
                    for vq in verbatim_quotes_for_layer
                ],
                quote_policy_note=policy_note_es if response_language == "es" else policy_note_en,
            )
            logger.info("Author layer from Verbatim Quotes KB (ids): %s", [vq.id for vq in verbatim_quotes_for_layer])
        else:
            author_layer = generate_author_layer(
                topic=payload.topic,
                user_message=payload.user_message,
                philosophy_quotes=philosophy_quotes,
                llm_client=llm_client,
                response_language=response_language,
            )
        stance = detect_stance(payload.user_stance, payload.user_message)
        debate_layer = generate_debate_layer(
            topic=payload.topic,
            user_message=payload.user_message,
            stance=stance,
            facts_summary=facts_layer.summary,
            llm_client=llm_client,
            debate_memory=debate_memory,
            response_language=response_language,
        )

        takeaways = []
        next_questions: list[str]
        if response_language == "es":
            if science_entries:
                takeaways.append(f"Este tema involucra múltiples perspectivas científicas (ej., {science_entries[0].topic}).")
            if philosophy_quotes:
                takeaways.append(f"Consideraciones filosóficas incluyen visiones de {philosophy_quotes[0].author}.")
            if not takeaways:
                takeaways.append("Este es un tema complejo con múltiples perspectivas.")
            next_questions = [
                "¿Qué aspectos de este tema te gustaría explorar más?",
                "¿Cómo respondes a los contraargumentos presentados?",
                "¿Qué evidencia adicional fortalecería tu posición?",
            ]
        else:
            if science_entries:
                takeaways.append(f"This topic involves multiple scientific perspectives (e.g., {science_entries[0].topic}).")
            if philosophy_quotes:
                takeaways.append(f"Philosophical considerations include views from {philosophy_quotes[0].author}.")
            if not takeaways:
                takeaways.append("This is a complex topic with multiple perspectives.")
            next_questions = [
                "What aspects of this topic would you like to explore further?",
                "How do you respond to the counterarguments presented?",
                "What additional evidence would strengthen your position?",
            ]

        response = DebateResponse(
            facts_layer=facts_layer,
            author_layer=author_layer,
            debate_layer=debate_layer,
            closing=Closing(open_ended_takeaways=takeaways, next_questions_for_user=next_questions),
        )
        logger.info(f"Debate retrieval: science_candidate_count={len(science_results)}, philosophy_candidate_count={len(philosophy_results)}")

        validator = get_validator()
        personality_errors = validator.validate_debate_response(response)
        if personality_errors:
            logger.warning("PersonalityPolicy validation failed for debate response: %s", personality_errors)
            repaired = validator.repair_debate_response(response, personality_errors, llm_client=llm_client)
            if repaired is not None:
                logger.info("PersonalityPolicy: applied repair for debate response")
                response = DebateResponse(**repaired)
            else:
                logger.info("PersonalityPolicy: applied fallback for debate response (path=personality_fallback)")
                response = DebateResponse(**validator.fallback_debate_response(payload.topic, payload.user_message, response_language))
        return response
    except Exception as e:
        logger.error(f"Unexpected error in debate pipeline: {e}", exc_info=True)
        return DebateResponse(
            facts_layer=FactsLayer(
                summary=f"Unexpected error: {str(e)}",
                claims=[
                    Claim(text="An error occurred while processing your request.", certainty="speculative", source_ids=[], short_explanation="System error."),
                ],
                what_we_dont_know=["Unable to process request."],
                common_misconceptions=[],
            ),
            author_layer=AuthorLayer(quotes=[], quote_policy_note="No verbatim quotes available in the current knowledge base for this topic."),
            debate_layer=DebateLayer(
                steelman_of_user=f"Steelman of user's position: {payload.user_message}",
                contrarian_position="A contrarian position to consider.",
                counterarguments=["Consider alternative perspectives."],
                socratic_questions=[
                    "What evidence would change your mind?",
                    "How do you reconcile this with alternative perspectives?",
                    "What assumptions underlie this position?",
                ],
                where_contrarian_might_fail=["Contrarian position may have limitations."],
            ),
            closing=Closing(
                open_ended_takeaways=["This is a complex topic with multiple perspectives."],
                next_questions_for_user=[
                    "What aspects of this topic would you like to explore further?",
                    "How do you respond to the counterarguments presented?",
                    "What additional evidence would strengthen your position?",
                ],
            ),
        )


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/kb/philosophy/stats")
def kb_philosophy_stats():
    """Debug endpoint: counts by author/work for Philosophy KB."""
    from debate_kb_loader import PhilosophyKBLoader
    loader = PhilosophyKBLoader()
    entries = loader.get_all()
    by_author: dict[str, int] = {}
    by_work: dict[str, int] = {}
    for e in entries:
        by_author[e.author] = by_author.get(e.author, 0) + 1
        by_work[f"{e.author} / {e.work}"] = by_work.get(f"{e.author} / {e.work}", 0) + 1
    return {"total": len(entries), "by_author": by_author, "by_work": by_work}


@app.get("/kb/science/stats")
def kb_science_stats():
    """Debug endpoint: counts for Scientific Facts KB (by_topic, by_lang)."""
    from debate_kb_loader import ScienceFactsLoader
    loader = ScienceFactsLoader()
    facts = loader.get_all()
    by_topic: dict[str, int] = {}
    by_lang: dict[str, int] = {}
    for f in facts:
        by_topic[f.topic] = by_topic.get(f.topic, 0) + 1
        by_lang[f.lang] = by_lang.get(f.lang, 0) + 1
    return {"count_total": len(facts), "by_topic": by_topic, "by_lang": by_lang}


@app.get("/kb/science/search")
def kb_science_search(q: str = "", lang: str | None = None, k: int = 8):
    """Search Scientific Facts KB by keyword/tag. Returns top k facts (optionally filtered by lang)."""
    from debate_kb_loader import ScienceFactsLoader
    loader = ScienceFactsLoader()
    scored = loader.search(query=q or "", lang=lang, max_k=k)
    return [{"fact": s[0].model_dump(mode="json"), "score": s[1]} for s in scored]


@app.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest):
    msg = (payload.message or "").strip()
    if not msg:
        raise HTTPException(status_code=400, detail="message is required and cannot be empty")

    cid: str
    with get_session() as s:
        if payload.conversation_id:
            c = s.get(Conversation, payload.conversation_id)
            if c is None:
                raise HTTPException(status_code=404, detail="conversation not found")
            cid = payload.conversation_id
        else:
            c = Conversation(id=new_id())
            s.add(c)
            s.commit()
            cid = c.id

    try:
        spec, reply, kb_debug = run_pipeline(msg)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pipeline error: {e}")

    with get_session() as s:
        mid = new_id()
        s.add(Message(id=mid, conversation_id=cid, role="user", content=msg))
        s.commit()

    save_spec(cid, mid, spec)

    runner = CheckRunner()
    check_report = runner.run_all(spec)
    
    # Add KB warning if no candidates found
    if kb_debug.get("kb_candidate_count", 0) == 0:
        from checks import CheckItem
        check_report.items.append(CheckItem(
            id="kb_no_matches",
            name="KB lookup",
            status="warning",
            message="No KB entries matched; expand KB tags/keywords.",
            metadata={"kb_debug": kb_debug},
        ))

    with get_session() as s:
        s.add(Message(id=new_id(), conversation_id=cid, role="assistant", content=reply))
        s.commit()

    return ChatResponse(
        message=reply,
        physical_spec=spec.model_dump(mode="json"),
        conversation_id=cid,
        check_report=check_report.model_dump(mode="json"),
        kb_candidate_count=kb_debug.get("kb_candidate_count", 0),
        kb_candidates=kb_debug.get("kb_candidates", []),
    )


@app.post("/validate", response_model=ValidateResponse)
def validate(payload: ValidateRequest):
    spec = PhysicalSpec.model_validate(payload.physical_spec)
    runner = CheckRunner()
    report = runner.run_all(spec)
    return ValidateResponse(check_report=report.model_dump(mode="json"))


@app.post("/debate", response_model=DebateResponse)
def debate(payload: DebateRequest):
    """Debate mode endpoint — full pipeline (KB + facts + author + debate + personality)."""
    from language_detector import detect_language
    lang = detect_language(payload.user_message or payload.topic or "")
    return _run_debate_pipeline(payload, response_language=lang)


@app.post("/debate/chat", response_model=DebateChatResponse)
def debate_chat(payload: DebateChatRequest):
    """
    Casual chat-style debate: message -> MessageParser -> DebateRequest -> pipeline.
    Returns assistant_text (short preface + key points), full debate_response, next_question, thread_id.
    """
    from debate_creator_generator import reframe_to_debate
    from intent_classifier import classify_intent
    from language_detector import detect_language
    from message_parser import parse_message

    msg = (payload.message or "").strip()
    if not msg:
        raise HTTPException(status_code=400, detail="message is required and cannot be empty")

    lang = detect_language(msg)
    intent = classify_intent(msg)
    parsed = parse_message(msg)
    topic = parsed["topic"]
    if intent != "debate":
        topic = reframe_to_debate(msg, lang)
    debate_request = DebateRequest(
        topic=topic,
        user_message=parsed["user_message"],
        user_stance=parsed.get("user_stance"),
    )
    response = _run_debate_pipeline(debate_request, response_language=lang)

    # Friendly short preface + key points (language-aware)
    topic_for_intro = topic  # topic may be reframed when intent != debate
    summary = (response.facts_layer.summary or "").strip()
    if len(summary) > 280:
        summary = summary[:277] + "..."
    key_point = ""
    if response.debate_layer.counterarguments:
        key_point = response.debate_layer.counterarguments[0]
    elif response.debate_layer.contrarian_position:
        key_point = (response.debate_layer.contrarian_position or "")[:200]
        if len(response.debate_layer.contrarian_position or "") > 200:
            key_point += "..."
    next_q_list = response.debate_layer.socratic_questions or response.closing.next_questions_for_user
    next_question = (
        next_q_list[0]
        if next_q_list
        else ("¿Qué te gustaría explorar más?" if lang == "es" else "What would you like to explore further?")
    )
    if lang == "es":
        intro = f"Aquí hay algunas perspectivas sobre {topic_for_intro}."
        q_label = f"Una pregunta para reflexionar: {next_question}"
    else:
        intro = f"Here are some perspectives on {topic_for_intro}."
        q_label = f"A question to consider: {next_question}"
    parts = [intro]
    if intent != "debate":
        reframe = (
            "Esto no es exactamente un debate, pero podemos plantearlo así: "
            if lang == "es"
            else "This is not exactly a debate, but we can reflect on it this way: "
        )
        parts.insert(0, reframe)
    if summary:
        parts.append(summary)
    if key_point:
        parts.append(key_point)
    parts.append(q_label)
    assistant_text = " ".join(parts)

    thread_id = (payload.thread_id or "").strip() or str(uuid.uuid4())
    return DebateChatResponse(
        assistant_text=assistant_text,
        debate_response=response,
        next_question=next_question,
        thread_id=thread_id,
        topic=topic_for_intro,
        lang=lang,
        verbatim_quotes=[q.model_dump(mode="json") for q in response.author_layer.quotes],
    )


# --- Persisted Debates Endpoints ---

@app.get("/debates")
def list_debates(mode: str | None = None):
    """GET /debates -> list debates (id, title, mode, updated_at), newest first. Optional ?mode=debate|students|scripts."""
    from debate_db import list_debates as _list
    return {"debates": _list(mode=mode)}


@app.post("/debates")
def create_debate(payload: CreateDebateRequest):
    """POST /debates -> create debate. If initial_message provided, generate short title. Optional mode."""
    from debate_db import create_debate as _create
    from short_title import generate_short_title

    title = "Nuevo debate"
    if payload.initial_message and (m := (payload.initial_message or "").strip()):
        title = generate_short_title(m)
    mode = (payload.mode or "debate").strip().lower()
    if mode not in ("debate", "students", "scripts"):
        mode = "debate"
    d = _create(title=title, mode=mode)
    return {"id": d.id, "title": d.title, "mode": d.mode, "created_at": d.created_at.isoformat(), "updated_at": d.updated_at.isoformat()}


@app.get("/debates/{debate_id}")
def get_debate(debate_id: str):
    """GET /debates/{id} -> full debate including messages."""
    from debate_db import get_debate_with_messages

    data = get_debate_with_messages(debate_id)
    if data is None:
        raise HTTPException(status_code=404, detail="Debate not found")
    return data


@app.post("/debates/{debate_id}/chat", response_model=DebateChatResponse)
def debate_chat_persisted(debate_id: str, payload: DebateChatPayload):
    """
    POST /debates/{id}/chat: append user message, run pipeline with memory,
    append assistant message, update memory. Returns assistant_text, debate_response, etc.
    """
    from debate_db import (
        append_message,
        get_debate,
        get_debate_with_messages,
        get_debate_memory,
        update_debate_title,
        upsert_debate_memory,
    )
    from debate_memory import extract_memory
    from intent_classifier import classify_intent
    from language_detector import detect_language
    from message_parser import parse_message

    msg = (payload.message or "").strip()
    if not msg:
        raise HTTPException(status_code=400, detail="message is required and cannot be empty")

    d = get_debate(debate_id)
    if d is None:
        raise HTTPException(status_code=404, detail="Debate not found")

    # Update title from first user message if still "Nuevo debate"
    full = get_debate_with_messages(debate_id)
    if full and len(full["messages"]) == 0 and d.title == "Nuevo debate":
        from short_title import generate_short_title
        update_debate_title(debate_id, generate_short_title(msg))

    # Append user message
    append_message(debate_id, "user", msg)

    # Load memory
    memory = get_debate_memory(debate_id)

    # Detect language and intent
    lang = detect_language(msg)
    intent = classify_intent(msg)

    # Parse and run pipeline
    parsed = parse_message(msg)
    topic = parsed["topic"]
    if intent != "debate":
        from debate_creator_generator import reframe_to_debate
        topic = reframe_to_debate(msg, lang)
    debate_request = DebateRequest(
        topic=topic,
        user_message=parsed["user_message"],
        user_stance=parsed.get("user_stance"),
    )
    response = _run_debate_pipeline(
        debate_request, debate_memory=memory, response_language=lang
    )

    steelman = (response.debate_layer.steelman_of_user or "").strip()
    contrarian = (response.debate_layer.contrarian_position or "").strip()
    next_q_list = response.debate_layer.socratic_questions or response.closing.next_questions_for_user
    next_question = (
        (next_q_list[0] or "").strip()
        if next_q_list
        else ("¿Qué te gustaría explorar más?" if lang == "es" else "What would you like to explore further?")
    )

    # Quality gate (no cache; pipeline runs fresh per message)
    from quality_gate import validate_main_reply, repair_main_reply, fallback_main_reply
    q_errors = validate_main_reply(steelman, contrarian, next_question, lang)
    generator_path = "pipeline_ok"
    if q_errors:
        repaired = repair_main_reply(
            topic, msg, steelman, contrarian, next_question, q_errors, lang
        )
        if repaired:
            steelman, contrarian, next_question = repaired
            generator_path = "quality_gate_repaired"
        else:
            # Prefer pipeline output over generic fallback so responses vary by input (both EN and ES)
            pipeline_usable = (
                len((steelman or "").strip()) >= 10
                and len((contrarian or "").strip()) >= 10
                and (next_question or "").strip()
                and ("?" in next_question or "¿" in next_question)
            )
            if pipeline_usable:
                generator_path = "quality_gate_kept_pipeline"
            else:
                steelman, contrarian, next_question = fallback_main_reply(topic, lang)
                generator_path = "quality_gate_fallback"
    logger.debug("debate_chat: debate_id=%s lang=%s path=%s", debate_id, lang, generator_path)

    # Build assistant text (language-aware)
    summary = (response.facts_layer.summary or "").strip()
    if len(summary) > 280:
        summary = summary[:277] + "..."
    key_point = ""
    if response.debate_layer.counterarguments:
        key_point = response.debate_layer.counterarguments[0]
    elif contrarian:
        key_point = contrarian[:200] + ("..." if len(contrarian) > 200 else "")
    if lang == "es":
        intro = f"Aquí hay algunas perspectivas sobre {topic}."
        q_label = f"Una pregunta para reflexionar: {next_question}"
    else:
        intro = f"Here are some perspectives on {topic}."
        q_label = f"A question to consider: {next_question}"
    parts = [intro]
    if intent != "debate":
        reframe = (
            "Esto no es exactamente un debate, pero podemos plantearlo así: "
            if lang == "es"
            else "This is not exactly a debate, but we can reflect on it this way: "
        )
        parts.insert(0, reframe)
    if summary:
        parts.append(summary)
    if key_point:
        parts.append(key_point)
    parts.append(q_label)
    assistant_text = " ".join(parts)

    # Append assistant message with minimal meta + store details for lazy expand
    from debate_db import upsert_message_details
    m = append_message(
        debate_id,
        "assistant",
        assistant_text,
        meta={
            "steelman": steelman,
            "contrarian": contrarian,
            "next_question": next_question,
            "topic": topic,
            "lang": lang,
            "facts_summary": (response.facts_layer.summary or "").strip(),
        },
    )
    upsert_message_details(
        m.id,
        facts_json=json.dumps(response.facts_layer.model_dump(mode="json")),
        quotes_json=json.dumps(response.author_layer.model_dump(mode="json")),
    )

    # Build response with possibly repaired debate_layer
    repaired_layer = DebateLayer(
        steelman_of_user=steelman,
        contrarian_position=contrarian,
        counterarguments=response.debate_layer.counterarguments,
        socratic_questions=[next_question],
        where_contrarian_might_fail=response.debate_layer.where_contrarian_might_fail,
    )
    response_for_frontend = DebateResponse(
        facts_layer=response.facts_layer,
        author_layer=response.author_layer,
        debate_layer=repaired_layer,
        closing=response.closing,
    )

    # Update memory (merge with existing)
    extracted = extract_memory(
        user_message=msg,
        assistant_content=assistant_text,
        steelman=steelman,
        counterarguments=response.debate_layer.counterarguments or [],
    )
    prev = memory or {}
    prev_terms = prev.get("key_terms", [])
    prev_assumptions = prev.get("assumptions", [])
    new_terms = extracted.get("key_terms", [])
    new_assumptions = extracted.get("assumptions", [])
    merged_terms = list(dict.fromkeys(prev_terms + new_terms))[:8]
    merged_assumptions = list(dict.fromkeys(prev_assumptions + new_assumptions))[:5]
    upsert_debate_memory(
        debate_id,
        user_stance=extracted.get("user_stance") or prev.get("user_stance"),
        key_terms=merged_terms if merged_terms else None,
        assumptions=merged_assumptions if merged_assumptions else None,
    )

    return DebateChatResponse(
        assistant_text=assistant_text,
        debate_response=response_for_frontend,
        next_question=next_question,
        thread_id=debate_id,
        topic=topic,
        message_id=m.id,
        lang=lang,
        verbatim_quotes=[q.model_dump(mode="json") for q in response_for_frontend.author_layer.quotes],
    )


@app.post("/debates/{debate_id}/messages")
def append_debate_message(debate_id: str, payload: dict):
    """Append a single message (role=user|assistant). Body: { role, content, meta? }."""
    from debate_db import append_message, get_debate

    if get_debate(debate_id) is None:
        raise HTTPException(status_code=404, detail="Debate not found")
    role = (payload.get("role") or "").strip().lower()
    if role not in ("user", "assistant"):
        raise HTTPException(status_code=400, detail="role must be 'user' or 'assistant'")
    content = (payload.get("content") or "").strip()
    if not content:
        raise HTTPException(status_code=400, detail="content is required")
    meta = payload.get("meta")
    m = append_message(debate_id, role, content, meta=meta)
    return {"id": m.id, "role": m.role, "content": m.content, "created_at": m.created_at.isoformat()}


@app.post("/messages/{message_id}/facts")
def fetch_message_facts(message_id: str):
    """Lazy-load scientific context for an assistant message. Returns from cache or generates via LLM."""
    from debate_db import get_debate_with_messages, get_message, get_or_create_message_details, upsert_message_details
    from language_detector import detect_language
    from debate_facts_generator import generate_science_context_block
    from llm import OpenAIClient

    msg = get_message(message_id)
    if not msg or msg.role != "assistant":
        raise HTTPException(status_code=404, detail="Assistant message not found")
    md = get_or_create_message_details(message_id)
    if md.facts_json:
        return json.loads(md.facts_json)
    # Backward compat: check meta for old format with full debate_response
    if msg.meta_json:
        meta = json.loads(msg.meta_json)
        dr = meta.get("debate_response")
        if isinstance(dr, dict) and dr.get("facts_layer"):
            facts = dr["facts_layer"]
            upsert_message_details(message_id, facts_json=json.dumps(facts))
            return facts

    # Get topic and last user message for context generation
    debate = get_debate_with_messages(msg.debate_id) if msg.debate_id else None
    meta = json.loads(msg.meta_json) if msg.meta_json else {}
    topic = (meta.get("topic") or "").strip()
    steelman = (meta.get("steelman") or "").strip()
    contrarian = (meta.get("contrarian") or "").strip()
    next_q = (meta.get("next_question") or "").strip()
    assistant_reply = " ".join(filter(None, [steelman, contrarian, next_q])) or msg.content or ""

    last_user_content = ""
    if debate and debate.get("messages"):
        for m in reversed(debate["messages"]):
            if m.get("role") == "user":
                last_user_content = (m.get("content") or "").strip()
                break

    # Build language-aware scientific context + verification bullets (no KB facts).
    lang = (meta.get("lang") or "").strip() or detect_language(last_user_content or topic or assistant_reply)
    llm_client = OpenAIClient()
    ctx_summary, verification_points = generate_science_context_block(
        topic or "",
        last_user_content or assistant_reply,
        llm_client=llm_client,
        response_language=lang,
    )
    response = {
        "facts": [],
        "facts_domain": "science",
        "summary": ctx_summary or meta.get("facts_summary") or "",
        "claims": [],
        "verification_points": verification_points,
    }
    upsert_message_details(message_id, facts_json=json.dumps(response))
    return response


def _pad_quotes_response_to_three(quotes_payload: dict, language: str = "en") -> dict:
    """If quotes_payload['quotes'] has < 3 items, pad from KB (deterministic). Returns modified dict."""
    current = list(quotes_payload.get("quotes") or [])
    if len(current) >= 3:
        return quotes_payload
    from debate_retriever import DebateRetriever

    existing_ids = {q.get("quote_id") for q in current if q.get("quote_id")}
    existing_authors = {(q.get("author") or "").strip().lower() for q in current}
    retriever = DebateRetriever()
    padding = retriever.get_padding_verbatim_quotes(existing_ids, existing_authors, 3 - len(current))
    for vq in padding:
        text = (vq.text_es if language == "es" else None) or vq.text_en or vq.text_es or vq.text_original
        current.append({
            "quote_id": vq.id,
            "author": vq.author,
            "work": vq.work,
            "quote": text or "",
            "interpretation": vq.notes or "",
            "relevance": "",
        })
    quotes_payload["quotes"] = current
    return quotes_payload


@app.post("/messages/{message_id}/quotes")
def fetch_message_quotes(message_id: str):
    """Lazy-load quotes for an assistant message. Returns from cache. Always returns 3 quotes when KB has enough."""
    from debate_db import get_message, get_or_create_message_details, upsert_message_details

    msg = get_message(message_id)
    if not msg or msg.role != "assistant":
        raise HTTPException(status_code=404, detail="Assistant message not found")
    md = get_or_create_message_details(message_id)
    if md.quotes_json:
        payload = json.loads(md.quotes_json)
        return _pad_quotes_response_to_three(payload, language="en")
    if msg.meta_json:
        meta = json.loads(msg.meta_json)
        dr = meta.get("debate_response")
        if isinstance(dr, dict) and dr.get("author_layer"):
            quotes = dict(dr["author_layer"])
            quotes = _pad_quotes_response_to_three(quotes, language="en")
            upsert_message_details(message_id, quotes_json=json.dumps(quotes))
            return quotes
    return _pad_quotes_response_to_three({"quotes": [], "quote_policy_note": ""})


@app.post("/messages/{message_id}/creator")
def fetch_message_creator(message_id: str):
    """Lazy-load creator content. Generates if not cached."""
    from debate_db import get_message, get_or_create_message_details, upsert_message_details

    msg = get_message(message_id)
    if not msg or msg.role != "assistant":
        raise HTTPException(status_code=404, detail="Assistant message not found")
    md = get_or_create_message_details(message_id)
    if md.creator_json:
        return json.loads(md.creator_json)
    meta = json.loads(msg.meta_json) if msg.meta_json else {}
    topic = meta.get("topic", "General")
    from debate_db import get_debate_session
    from debate_db import DebateMessage
    from sqlmodel import select
    with get_debate_session() as s:
        all_msgs = s.exec(
            select(DebateMessage)
            .where(DebateMessage.debate_id == msg.debate_id)
            .order_by(DebateMessage.created_at)
        ).all()
    user_content = topic
    for i, m in enumerate(all_msgs):
        if m.id == message_id and i > 0 and all_msgs[i - 1].role == "user":
            user_content = all_msgs[i - 1].content
            break
    try:
        creator_resp = _run_creator(topic, user_content)
        creator_dict = creator_resp.model_dump(mode="json")
        upsert_message_details(message_id, creator_json=json.dumps(creator_dict))
        return creator_dict
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _run_creator(topic: str, user_message: str):
    """Run creator pipeline (extracted for reuse)."""
    from debate_retriever import DebateRetriever
    from debate_facts_generator import generate_facts_layer
    from debate_author_generator import generate_author_layer
    from debate_layer_generator import detect_stance, generate_debate_layer
    from debate_creator_generator import _build_content_pack, generate_creator_response
    from llm import OpenAIClient

    llm = OpenAIClient()
    retriever = DebateRetriever()
    science_results = retriever.retrieve_science(topic, user_message, top_n=5)
    philosophy_results = retriever.retrieve_philosophy(topic, user_message, top_n=5)
    science_entries = [e for e, _ in science_results]
    philosophy_quotes = [q for q, _ in philosophy_results]
    facts_layer = generate_facts_layer(topic, user_message, science_entries, llm_client=llm)
    verbatim_results = retriever.retrieve_verbatim_quotes(
        topic or "", user_message or "", top_n=3, language="en"
    )
    verbatim_quotes_for_layer = [q for q, _ in verbatim_results]
    verbatim_quotes_for_layer = retriever.pad_verbatim_quotes_to_n(verbatim_quotes_for_layer, 3)
    if verbatim_quotes_for_layer:
        author_layer = AuthorLayer(
            quotes=[
                Quote(
                    quote_id=vq.id,
                    author=vq.author,
                    work=vq.work,
                    quote=vq.text_en or vq.text_es or vq.text_original,
                    interpretation=vq.notes or "",
                    relevance="Tags: " + ", ".join(vq.tags) if vq.tags else "",
                )
                for vq in verbatim_quotes_for_layer
            ],
            quote_policy_note="Verbatim quotes from the knowledge base (tag-matched to this topic).",
        )
    else:
        author_layer = generate_author_layer(topic, user_message, philosophy_quotes, llm_client=llm)
    stance = detect_stance(None, user_message)
    debate_layer = generate_debate_layer(
        topic, user_message, stance, facts_layer.summary,
        llm_client=llm, response_language="en"
    )
    content_pack = _build_content_pack(facts_layer, author_layer, debate_layer)
    allowed_science = list({sid for c in facts_layer.claims for sid in c.source_ids})
    allowed_quotes = [q.quote_id for q in author_layer.quotes]
    verbatim = [q.quote for q in author_layer.quotes]
    return generate_creator_response(
        content_pack, topic, "etacon_calm", "video_script", "medium",
        allowed_science, allowed_quotes, verbatim, llm_client=llm,
    )


# --- Favorites & Folders (persisted) ---

class ToggleFavoriteResponse(BaseModel):
    favorited: bool  # True if now favorited, False if removed


class MoveToFolderRequest(BaseModel):
    folder_id: str | None = None  # null = remove from folder


class CreateFolderRequest(BaseModel):
    name: str = "Nueva carpeta"


class UpdateFolderRequest(BaseModel):
    name: str


@app.post("/debates/{debate_id}/favorite", response_model=ToggleFavoriteResponse)
def toggle_debate_favorite(debate_id: str):
    """Toggle favorite for debate. Returns { favorited: true|false }."""
    from debate_db import get_debate, toggle_favorite

    if get_debate(debate_id) is None:
        raise HTTPException(status_code=404, detail="Debate not found")
    favorited = toggle_favorite(debate_id)
    return ToggleFavoriteResponse(favorited=favorited)


@app.post("/debates/{debate_id}/move-to-folder")
def move_debate_to_folder(debate_id: str, payload: MoveToFolderRequest):
    """Assign debate to folder (folder_id) or remove (folder_id=null)."""
    from debate_db import get_debate, set_debate_folder, get_debate_session
    from debate_db import Folder as FolderModel

    if get_debate(debate_id) is None:
        raise HTTPException(status_code=404, detail="Debate not found")
    if payload.folder_id is not None:
        with get_debate_session() as s:
            if s.get(FolderModel, payload.folder_id) is None:
                raise HTTPException(status_code=404, detail="Folder not found")
    set_debate_folder(debate_id, payload.folder_id)
    return {"ok": True, "folder_id": payload.folder_id}


@app.get("/folders")
def list_folders_endpoint():
    """GET /folders -> list folders with id, name, created_at, chatIds."""
    from debate_db import list_folders as _list_folders
    return {"folders": _list_folders()}


@app.post("/folders")
def create_folder_endpoint(payload: CreateFolderRequest):
    """POST /folders -> create folder. Body: { name }."""
    from debate_db import create_folder as _create_folder

    name = (payload.name or "Nueva carpeta").strip()[:100] or "Nueva carpeta"
    f = _create_folder(name)
    return {"id": f.id, "name": f.name, "created_at": f.created_at.isoformat(), "chatIds": []}


@app.patch("/folders/{folder_id}")
def update_folder_endpoint(folder_id: str, payload: UpdateFolderRequest):
    """PATCH /folders/{id} -> rename folder."""
    from debate_db import update_folder_name

    name = (payload.name or "").strip()[:100]
    if not name:
        raise HTTPException(status_code=400, detail="name cannot be empty")
    if not update_folder_name(folder_id, name):
        raise HTTPException(status_code=404, detail="Folder not found")
    return {"ok": True, "name": name}


@app.delete("/folders/{folder_id}")
def delete_folder_endpoint(folder_id: str):
    """DELETE /folders/{id} -> delete folder. Debates inside are unassigned, not deleted."""
    from debate_db import delete_folder as _delete_folder

    if not _delete_folder(folder_id):
        raise HTTPException(status_code=404, detail="Folder not found")
    return {"ok": True}


@app.patch("/debates/{debate_id}/title")
def update_debate_title_endpoint(debate_id: str, payload: UpdateTitleRequest):
    """PATCH /debates/{id}/title: update debate title. Max 30 chars, no empty."""
    from debate_db import get_debate, update_debate_title as _update

    title = (payload.title or "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="title cannot be empty")
    if len(title) > 30:
        raise HTTPException(status_code=400, detail="title must be at most 30 characters")
    if get_debate(debate_id) is None:
        raise HTTPException(status_code=404, detail="Debate not found")
    _update(debate_id, title)
    return {"ok": True, "title": title}


@app.delete("/debates/{debate_id}")
def delete_debate(debate_id: str):
    """DELETE /debates/{id} -> delete debate."""
    from debate_db import delete_debate as _delete

    if not _delete(debate_id):
        raise HTTPException(status_code=404, detail="Debate not found")
    return {"ok": True}


@app.post("/creator", response_model=CreatorResponseModel)
def creator(payload: CreatorRequest):
    """
    Creator Mode (D6): Generate video/script draft from existing structured layers.
    Reuses the debate pipeline (facts + author + debate), then runs creator LLM.
    """
    try:
        from debate_retriever import DebateRetriever
        from debate_facts_generator import generate_facts_layer
        from debate_author_generator import generate_author_layer
        from llm import OpenAIClient

        llm_client = OpenAIClient()
        retriever = DebateRetriever()
        science_results = retriever.retrieve_science(payload.topic, payload.user_message, top_n=5)
        philosophy_results = retriever.retrieve_philosophy(payload.topic, payload.user_message, top_n=5)
        science_entries = [e for e, _ in science_results]
        philosophy_quotes = [q for q, _ in philosophy_results]

        facts_layer = generate_facts_layer(
            topic=payload.topic,
            user_message=payload.user_message,
            science_entries=science_entries,
            llm_client=llm_client,
        )
        verbatim_results = retriever.retrieve_verbatim_quotes(
            payload.topic or "",
            payload.user_message or "",
            top_n=3,
            language=payload.lang or "en",
        )
        verbatim_quotes_for_layer = [q for q, _ in verbatim_results]
        verbatim_quotes_for_layer = retriever.pad_verbatim_quotes_to_n(verbatim_quotes_for_layer, 3)
        if verbatim_quotes_for_layer:
            author_layer = AuthorLayer(
                quotes=[
                    Quote(
                        quote_id=vq.id,
                        author=vq.author,
                        work=vq.work,
                        quote=(vq.text_es if (payload.lang or "en") == "es" else None) or vq.text_en or vq.text_es or vq.text_original,
                        interpretation=vq.notes or "",
                        relevance="Tags: " + ", ".join(vq.tags) if vq.tags else "",
                    )
                    for vq in verbatim_quotes_for_layer
                ],
                quote_policy_note="Verbatim quotes from the knowledge base (tag-matched to this topic).",
            )
        else:
            author_layer = generate_author_layer(
                topic=payload.topic,
                user_message=payload.user_message,
                philosophy_quotes=philosophy_quotes,
                llm_client=llm_client,
            )
        stance = detect_stance(payload.user_stance, payload.user_message)
        debate_layer = generate_debate_layer(
            topic=payload.topic,
            user_message=payload.user_message,
            stance=stance,
            facts_summary=facts_layer.summary,
            llm_client=llm_client,
        )

        content_pack = _build_content_pack(facts_layer, author_layer, debate_layer)
        allowed_science_ids = list({sid for c in facts_layer.claims for sid in c.source_ids})
        allowed_quote_ids = [q.quote_id for q in author_layer.quotes]
        verbatim_quotes = [q.quote for q in author_layer.quotes]
        creator_style = (payload.creator_style or "etacon_calm").strip().lower()
        if creator_style not in ("etacon_calm", "evoconn_dynamic"):
            creator_style = "etacon_calm"
        format_type = (payload.format or "video_script").strip().lower()
        if format_type not in ("video_script", "written_reflection"):
            format_type = "video_script"
        length = (payload.length or "medium").strip().lower()
        if length not in ("short", "medium", "long"):
            length = "medium"

        creator_response = generate_creator_response(
            content_pack=content_pack,
            topic=payload.topic,
            creator_style=creator_style,
            format_type=format_type,
            length=length,
            allowed_science_ids=allowed_science_ids,
            allowed_quote_ids=allowed_quote_ids,
            verbatim_quotes=verbatim_quotes,
            llm_client=llm_client,
        )
        # D7: PersonalityValidator — run after LLM generation
        validator = get_validator()
        personality_errors = validator.validate_creator_response(creator_response)
        if personality_errors:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning("PersonalityPolicy validation failed for creator response: %s", personality_errors)
            repaired = validator.repair_creator_response(creator_response, personality_errors, llm_client=llm_client)
            if repaired is not None:
                logger.info("PersonalityPolicy: applied repair for creator response")
                creator_response = CreatorResponseModel(**repaired)
            else:
                logger.info("PersonalityPolicy: applied fallback for creator response")
                creator_response = CreatorResponseModel(**validator.fallback_creator_response(
                    payload.topic, allowed_science_ids=allowed_science_ids, allowed_quote_ids=allowed_quote_ids
                ))
        return creator_response
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Creator endpoint error: {e}", exc_info=True)
        from debate_creator_generator import _fallback_creator_response
        return _fallback_creator_response(
            topic=payload.topic,
            allowed_science_ids=[],
            allowed_quote_ids=[],
        )
