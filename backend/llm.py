import json
import os
from abc import ABC, abstractmethod

# Prefer OPENAI_API_KEY; fallback to LLM_API_KEY for compatibility
API_KEY = os.getenv("OPENAI_API_KEY") or os.getenv("LLM_API_KEY")
BASE_URL = os.getenv("LLM_BASE_URL")  # e.g. https://api.together.xyz/v1
MODEL = os.getenv("LLM_MODEL", "gpt-4o-mini")
# Same for EN and ES flows; ensure rich output (enough for long steelman + contrarian + JSON)
MAX_TOKENS_DEBATE = int(os.getenv("LLM_MAX_TOKENS_DEBATE", "2000"))


def _language_instruction(lang: str | None) -> str:
    """Build strict language instruction for system prompt."""
    if not lang or lang not in ("es", "en"):
        return ""
    if lang == "es":
        return "You MUST answer strictly in Spanish. Do not mix languages.\n\n"
    return "You MUST answer strictly in English. Do not mix languages.\n\n"


class LLMClient(ABC):
    @abstractmethod
    def complete(self, system: str | None, user: str, language: str | None = None, max_tokens: int | None = None, prompt_id: str | None = None) -> str:
        pass


class OpenAIClient(LLMClient):
    def __init__(self, api_key: str | None = None, base_url: str | None = None, model: str | None = None):
        self._api_key = api_key or API_KEY
        self._base_url = base_url or BASE_URL
        self._model = model or MODEL

    def complete(self, system: str | None, user: str, language: str | None = None, max_tokens: int | None = None, prompt_id: str | None = None) -> str:
        try:
            from openai import OpenAI
        except ImportError:
            raise RuntimeError("Install openai: pip install openai")
        import logging
        _log = logging.getLogger(__name__)
        _log.debug("llm.complete: model=%s max_tokens=%s prompt_id=%s", self._model, max_tokens, prompt_id or "N/A")
        lang_prepend = _language_instruction(language)
        system_content = (lang_prepend + (system or "")) if lang_prepend else system
        client = OpenAI(api_key=self._api_key, base_url=self._base_url) if self._base_url else OpenAI(api_key=self._api_key)
        msgs = []
        if system_content:
            msgs.append({"role": "system", "content": system_content})
        msgs.append({"role": "user", "content": user})
        kwargs = {"model": self._model, "messages": msgs}
        if max_tokens is not None:
            kwargs["max_tokens"] = max_tokens
            kwargs["temperature"] = 0.7
        r = client.chat.completions.create(**kwargs)
        return (r.choices[0].message.content or "").strip()

    def complete_stream(
        self,
        system: str | None,
        user: str,
        language: str | None = None,
        max_tokens: int | None = None,
        prompt_id: str | None = None,
    ):
        """
        Stream completion token-by-token. Yields content deltas (str) as they arrive.
        Does not yield a final empty string; caller should treat end of iteration as done.
        """
        try:
            from openai import OpenAI
        except ImportError:
            raise RuntimeError("Install openai: pip install openai")
        import logging
        _log = logging.getLogger(__name__)
        _log.debug("llm.complete_stream: model=%s max_tokens=%s", self._model, max_tokens)
        lang_prepend = _language_instruction(language)
        system_content = (lang_prepend + (system or "")) if lang_prepend else system
        client = OpenAI(api_key=self._api_key, base_url=self._base_url) if self._base_url else OpenAI(api_key=self._api_key)
        msgs = []
        if system_content:
            msgs.append({"role": "system", "content": system_content})
        msgs.append({"role": "user", "content": user})
        kwargs = {"model": self._model, "messages": msgs, "stream": True}
        if max_tokens is not None:
            kwargs["max_tokens"] = max_tokens
            kwargs["temperature"] = 0.7
        stream = client.chat.completions.create(**kwargs)
        for chunk in stream:
            if chunk.choices and len(chunk.choices) > 0:
                delta = chunk.choices[0].delta
                if getattr(delta, "content", None):
                    yield delta.content


def translate_debate_layer_to_es(
    steelman: str,
    contrarian: str,
    counterarguments: list[str],
    socratic_questions: list[str],
    where_contrarian_might_fail: list[str],
    llm_client: "OpenAIClient | None" = None,
) -> tuple[str, str, list[str], list[str], list[str]] | None:
    """
    Translate debate_layer from English to Spanish. STRICT: preserves length, density, structure.
    Returns (steelman_es, contrarian_es, counterarguments_es, socratic_questions_es, where_contrarian_might_fail_es) or None if failed.
    """
    if llm_client is None:
        llm_client = OpenAIClient()
    system = """You are a professional translator. Translate from English to Spanish (Spain).

STRICT RULES:
- DO NOT summarize. DO NOT shorten. Match length and argument density.
- Keep the same rhetorical structure.
- Keep exactly ONE question; keep it as a question.
- If the English includes examples/claims, keep them.
- Preserve technical terms accurately (fine-tuning -> ajuste fino, falsifiability -> falsabilidad, methodological naturalism -> naturalismo metodológico).
- Output natural, fluent Spanish with same depth as original.
- Return ONLY valid JSON with keys: steelman_of_user, contrarian_position, counterarguments, socratic_questions, where_contrarian_might_fail."""

    user = f"""Translate to Spanish. DO NOT SHORTEN. Match length and specificity.

steelman_of_user: {steelman}
contrarian_position: {contrarian}
counterarguments: {json.dumps(counterarguments, ensure_ascii=False)}
socratic_questions: {json.dumps(socratic_questions, ensure_ascii=False)}
where_contrarian_might_fail: {json.dumps(where_contrarian_might_fail, ensure_ascii=False)}

Output ONLY the JSON object, no markdown."""

    try:
        raw = llm_client.complete(system=system, user=user, language=None, max_tokens=1500, prompt_id="TRANSLATE_ES")
        raw = (raw or "").strip()
        if raw.startswith("```"):
            lines = raw.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            raw = "\n".join(lines)
        data = json.loads(raw)
        return (
            str(data.get("steelman_of_user", steelman)).strip(),
            str(data.get("contrarian_position", contrarian)).strip(),
            [str(x).strip() for x in data.get("counterarguments", counterarguments)],
            [str(x).strip() for x in data.get("socratic_questions", socratic_questions)],
            [str(x).strip() for x in data.get("where_contrarian_might_fail", where_contrarian_might_fail)],
        )
    except Exception:
        return None


def translate_debate_layer_structured_to_es(
    steelman_blocks: list[dict],
    steelman_resumen: str,
    contrarian_blocks: list[dict],
    contrarian_resumen: str,
    counterarguments: list[str],
    socratic_questions: list[str],
    where_contrarian_might_fail: list[str],
    llm_client: "OpenAIClient | None" = None,
) -> tuple[list[dict], str, list[dict], str, list[str], list[str], list[str]] | None:
    """
    Translate structured debate layer (blocks + resumen) from English to Spanish.
    Returns (steelman_blocks_es, steelman_resumen_es, contrarian_blocks_es, contrarian_resumen_es,
             counterarguments_es, socratic_questions_es, where_contrarian_might_fail_es) or None.
    """
    if llm_client is None:
        llm_client = OpenAIClient()
    system = """You are a professional translator. Translate from English to Spanish (Spain).

STRICT RULES:
- DO NOT summarize or shorten. Preserve structure: same number of blocks, same number of bullets per block.
- Titles and bullets: conceptual, same density. Max 30 words per title, max 20 words per bullet.
- Return ONLY valid JSON with keys: steelman_blocks, steelman_resumen, contrarian_blocks, contrarian_resumen, counterarguments, socratic_questions, where_contrarian_might_fail.
- steelman_blocks and contrarian_blocks are arrays of { "title": "...", "bullets": ["...", ...] }."""

    user = f"""Translate to Spanish. Preserve structure and length.

steelman_blocks: {json.dumps(steelman_blocks, ensure_ascii=False)}
steelman_resumen: {json.dumps(steelman_resumen, ensure_ascii=False)}
contrarian_blocks: {json.dumps(contrarian_blocks, ensure_ascii=False)}
contrarian_resumen: {json.dumps(contrarian_resumen, ensure_ascii=False)}
counterarguments: {json.dumps(counterarguments, ensure_ascii=False)}
socratic_questions: {json.dumps(socratic_questions, ensure_ascii=False)}
where_contrarian_might_fail: {json.dumps(where_contrarian_might_fail, ensure_ascii=False)}

Output ONLY the JSON object, no markdown."""

    try:
        raw = llm_client.complete(system=system, user=user, language=None, max_tokens=2000, prompt_id="TRANSLATE_ES_STRUCTURED")
        raw = (raw or "").strip()
        if raw.startswith("```"):
            lines = raw.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            raw = "\n".join(lines)
        data = json.loads(raw)
        sb = data.get("steelman_blocks") or []
        sr = str(data.get("steelman_resumen", steelman_resumen)).strip()
        cb = data.get("contrarian_blocks") or []
        cr = str(data.get("contrarian_resumen", contrarian_resumen)).strip()
        steelman_blocks_es = [{"title": str(b.get("title", "")).strip(), "bullets": [str(x).strip() for x in b.get("bullets", [])]} for b in sb]
        contrarian_blocks_es = [{"title": str(b.get("title", "")).strip(), "bullets": [str(x).strip() for x in b.get("bullets", [])]} for b in cb]
        return (
            steelman_blocks_es,
            sr,
            contrarian_blocks_es,
            cr,
            [str(x).strip() for x in data.get("counterarguments", counterarguments)],
            [str(x).strip() for x in data.get("socratic_questions", socratic_questions)],
            [str(x).strip() for x in data.get("where_contrarian_might_fail", where_contrarian_might_fail)],
        )
    except Exception:
        return None
