"""
Milestone D7: Personality Policy — mandatory enforcement and validation for debate/creator outputs.
Ensures: no definitive conclusions, ≥3 Socratic questions, no forbidden phrases, calm open-ended tone.
"""
import json
import logging
from dataclasses import dataclass, field
from typing import Any

from llm import OpenAIClient

logger = logging.getLogger(__name__)

# Dev-only: log which rules were enforced (set to True in development)
LOG_POLICY_ENFORCEMENT = True


@dataclass
class PersonalityPolicy:
    min_socratic_questions: int = 3
    forbidden_phrases: list[str] = field(default_factory=lambda: [
        "queda demostrado",
        "la verdad es",
        "esto prueba definitivamente",
    ])
    require_open_ended_closing: bool = True
    require_facts_layer: bool = True
    quote_policy: str = "verbatim_from_kb_only"
    tone: str = "calm_open"


def _contains_forbidden(text: str, policy: PersonalityPolicy) -> list[str]:
    """Return list of forbidden phrases found in text (case-insensitive)."""
    if not text:
        return []
    t = text.lower()
    found = [p for p in policy.forbidden_phrases if p.lower() in t]
    return found


def _collect_debate_texts(resp: Any) -> list[tuple[str, str]]:
    """Collect (field_name, text) for all response text fields to check for forbidden phrases."""
    out: list[tuple[str, str]] = []
    # facts_layer
    fl = getattr(resp, "facts_layer", None)
    if fl:
        out.append(("facts_layer.summary", getattr(fl, "summary", "") or ""))
        for i, c in enumerate(getattr(fl, "claims", []) or []):
            out.append((f"facts_layer.claims[{i}].text", getattr(c, "text", "") or ""))
            out.append((f"facts_layer.claims[{i}].short_explanation", getattr(c, "short_explanation", "") or ""))
        for i, s in enumerate(getattr(fl, "what_we_dont_know", []) or []):
            out.append((f"facts_layer.what_we_dont_know[{i}]", s if isinstance(s, str) else ""))
        for i, s in enumerate(getattr(fl, "common_misconceptions", []) or []):
            out.append((f"facts_layer.common_misconceptions[{i}]", s if isinstance(s, str) else ""))
    # author_layer
    al = getattr(resp, "author_layer", None)
    if al:
        out.append(("author_layer.quote_policy_note", getattr(al, "quote_policy_note", "") or ""))
        for i, q in enumerate(getattr(al, "quotes", []) or []):
            out.append((f"author_layer.quotes[{i}].interpretation", getattr(q, "interpretation", "") or ""))
            out.append((f"author_layer.quotes[{i}].relevance", getattr(q, "relevance", "") or ""))
    # debate_layer
    dl = getattr(resp, "debate_layer", None)
    if dl:
        out.append(("debate_layer.steelman_of_user", getattr(dl, "steelman_of_user", "") or ""))
        out.append(("debate_layer.contrarian_position", getattr(dl, "contrarian_position", "") or ""))
        for i, s in enumerate(getattr(dl, "counterarguments", []) or []):
            out.append((f"debate_layer.counterarguments[{i}]", s if isinstance(s, str) else ""))
        for i, s in enumerate(getattr(dl, "socratic_questions", []) or []):
            out.append((f"debate_layer.socratic_questions[{i}]", s if isinstance(s, str) else ""))
        for i, s in enumerate(getattr(dl, "where_contrarian_might_fail", []) or []):
            out.append((f"debate_layer.where_contrarian_might_fail[{i}]", s if isinstance(s, str) else ""))
    # closing
    cl = getattr(resp, "closing", None)
    if cl:
        for i, s in enumerate(getattr(cl, "open_ended_takeaways", []) or []):
            out.append((f"closing.open_ended_takeaways[{i}]", s if isinstance(s, str) else ""))
        for i, s in enumerate(getattr(cl, "next_questions_for_user", []) or []):
            out.append((f"closing.next_questions_for_user[{i}]", s if isinstance(s, str) else ""))
    return out


def _collect_creator_texts(resp: Any) -> list[tuple[str, str]]:
    """Collect (field_name, text) for CreatorResponse text fields."""
    out: list[tuple[str, str]] = []
    for i, s in enumerate(getattr(resp, "title_options", []) or []):
        out.append((f"title_options[{i}]", s if isinstance(s, str) else ""))
    out.append(("hook", getattr(resp, "hook", "") or ""))
    for i, s in enumerate(getattr(resp, "outline", []) or []):
        out.append((f"outline[{i}]", s if isinstance(s, str) else ""))
    out.append(("script", getattr(resp, "script", "") or ""))
    for i, s in enumerate(getattr(resp, "audience_questions", []) or []):
        out.append((f"audience_questions[{i}]", s if isinstance(s, str) else ""))
    out.append(("disclaimer", getattr(resp, "disclaimer", "") or ""))
    return out



def _closing_is_open_ended(resp: Any, policy: PersonalityPolicy) -> bool:
    """Closing must contain open-ended language: questions or uncertainty."""
    if not policy.require_open_ended_closing:
        return True
    cl = getattr(resp, "closing", None)
    if not cl:
        return False
    next_q = getattr(cl, "next_questions_for_user", []) or []
    if len(next_q) > 0:
        return True
    takeaways = getattr(cl, "open_ended_takeaways", []) or []
    uncertainty_markers = ["?", "might", "could", "perhaps", "multiple", "various", "diferentes", "perspectivas", "open", "uncertain"]
    for t in takeaways:
        t_lower = (t or "").lower()
        if "?" in t or any(m in t_lower for m in uncertainty_markers):
            return True
    return False


class PersonalityValidator:
    """Runs after LLM generation; validates and optionally repairs DebateResponse and CreatorResponse."""

    def __init__(self, policy: PersonalityPolicy | None = None):
        self.policy = policy or PersonalityPolicy()

    def validate_debate_response(self, resp: Any) -> list[str]:
        """Return list of validation error messages. Empty if valid."""
        errors: list[str] = []
        if LOG_POLICY_ENFORCEMENT:
            enforced: list[str] = []

        # min_socratic_questions
        dl = getattr(resp, "debate_layer", None)
        if dl:
            sq = getattr(dl, "socratic_questions", []) or []
            if len(sq) < self.policy.min_socratic_questions:
                errors.append(
                    f"debate_layer.socratic_questions must have at least {self.policy.min_socratic_questions} items (got {len(sq)})."
                )
            if LOG_POLICY_ENFORCEMENT:
                enforced.append("min_socratic_questions")
        else:
            errors.append("debate_layer is missing.")

        # forbidden_phrases
        for field_name, text in _collect_debate_texts(resp):
            found = _contains_forbidden(text, self.policy)
            if found:
                errors.append(f"Forbidden phrase(s) {found} in {field_name}.")
        if LOG_POLICY_ENFORCEMENT and not any("Forbidden" in e for e in errors):
            enforced.append("forbidden_phrases (none found)")

        # require_open_ended_closing
        if not _closing_is_open_ended(resp, self.policy):
            errors.append("Closing must contain open-ended language (e.g. next_questions_for_user non-empty or takeaways with questions/uncertainty).")
        if LOG_POLICY_ENFORCEMENT:
            enforced.append("require_open_ended_closing")

        # require_facts_layer
        fl = getattr(resp, "facts_layer", None)
        if self.policy.require_facts_layer and not fl:
            errors.append("facts_layer is required.")
        if LOG_POLICY_ENFORCEMENT and fl:
            enforced.append("require_facts_layer")
        if LOG_POLICY_ENFORCEMENT and self.policy.quote_policy:
            enforced.append("quote_policy (verbatim_from_kb_only assumed enforced by AuthorLayer)")

        if LOG_POLICY_ENFORCEMENT:
            logger.info("PersonalityPolicy rules checked: %s", enforced)

        return errors

    def validate_creator_response(self, resp: Any) -> list[str]:
        """Return list of validation error messages for CreatorResponse."""
        errors: list[str] = []
        if LOG_POLICY_ENFORCEMENT:
            enforced: list[str] = []

        # audience_questions as Socratic-style; require at least min_socratic_questions
        aq = getattr(resp, "audience_questions", []) or []
        if len(aq) < self.policy.min_socratic_questions:
            errors.append(
                f"audience_questions must have at least {self.policy.min_socratic_questions} items (got {len(aq)})."
            )
        if LOG_POLICY_ENFORCEMENT:
            enforced.append("min_socratic_questions (audience_questions)")

        # forbidden_phrases
        for field_name, text in _collect_creator_texts(resp):
            found = _contains_forbidden(text, self.policy)
            if found:
                errors.append(f"Forbidden phrase(s) {found} in {field_name}.")
        if LOG_POLICY_ENFORCEMENT:
            enforced.append("forbidden_phrases (creator)")

        if LOG_POLICY_ENFORCEMENT:
            logger.info("PersonalityPolicy rules checked (creator): %s", enforced)

        return errors

    def repair_debate_response(
        self,
        resp: Any,
        errors: list[str],
        llm_client: OpenAIClient | None = None,
    ) -> dict | None:
        """One repair call: pass errors and policy rules, request corrected JSON. Returns dict for DebateResponse or None."""
        if llm_client is None:
            llm_client = OpenAIClient()
        try:
            raw = resp.model_dump() if hasattr(resp, "model_dump") else resp
            system = """You are a corrector. Fix the given DebateResponse JSON so it satisfies the PersonalityPolicy rules.
RULES:
- debate_layer.socratic_questions must have at least 3 items.
- No Spanish phrases meaning "it is proven", "the truth is", "this definitively proves" (e.g. "queda demostrado", "la verdad es", "esto prueba definitivamente").
- closing must be open-ended: next_questions_for_user non-empty and/or takeaways with questions or uncertainty.
- Tone calm and non-polemical.
Return ONLY the corrected full JSON object for DebateResponse (facts_layer, author_layer, debate_layer, closing). No markdown, no explanation."""
            user = f"Validation errors:\n" + "\n".join(errors) + "\n\nCurrent JSON:\n" + json.dumps(raw, ensure_ascii=False, indent=2)
            reply = llm_client.chat(system_prompt=system, user_prompt=user, max_tokens=4000)
            text = getattr(reply, "content", None) or str(reply)
            if text.startswith("```"):
                lines = text.split("\n")
                if lines[0].strip().startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].strip() == "```":
                    lines = lines[:-1]
                text = "\n".join(lines)
            data = json.loads(text)
            # Re-validate on dict (avoid circular import with main)
            new_errors = self._validate_debate_dict(data)
            if not new_errors:
                return data
        except Exception as e:
            logger.debug("Repair debate response failed: %s", e)
        return None

    def _validate_debate_dict(self, data: dict) -> list[str]:
        """Run same rules on a debate response dict (for repair re-validation)."""
        errors: list[str] = []
        dl = data.get("debate_layer") or {}
        sq = dl.get("socratic_questions") or []
        if len(sq) < self.policy.min_socratic_questions:
            errors.append(f"debate_layer.socratic_questions must have at least {self.policy.min_socratic_questions} items.")
        # Forbidden in all text fields
        def texts_from_debate(d: dict) -> list[tuple[str, str]]:
            out: list[tuple[str, str]] = []
            fl = d.get("facts_layer") or {}
            out.append(("facts_layer.summary", fl.get("summary") or ""))
            for i, c in enumerate(fl.get("claims") or []):
                out.append((f"claims[{i}].text", (c.get("text") or "")))
                out.append((f"claims[{i}].short_explanation", (c.get("short_explanation") or "")))
            for i, s in enumerate(fl.get("what_we_dont_know") or []):
                out.append((f"what_we_dont_know[{i}]", s if isinstance(s, str) else ""))
            for i, s in enumerate(fl.get("common_misconceptions") or []):
                out.append((f"common_misconceptions[{i}]", s if isinstance(s, str) else ""))
            al = d.get("author_layer") or {}
            out.append(("quote_policy_note", al.get("quote_policy_note") or ""))
            for i, q in enumerate(al.get("quotes") or []):
                out.append((f"quotes[{i}].interpretation", (q.get("interpretation") or "")))
                out.append((f"quotes[{i}].relevance", (q.get("relevance") or "")))
            dl2 = d.get("debate_layer") or {}
            out.append(("steelman_of_user", dl2.get("steelman_of_user") or ""))
            out.append(("contrarian_position", dl2.get("contrarian_position") or ""))
            for i, s in enumerate(dl2.get("counterarguments") or []):
                out.append((f"counterarguments[{i}]", s if isinstance(s, str) else ""))
            for i, s in enumerate(dl2.get("socratic_questions") or []):
                out.append((f"socratic_questions[{i}]", s if isinstance(s, str) else ""))
            for i, s in enumerate(dl2.get("where_contrarian_might_fail") or []):
                out.append((f"where_contrarian_might_fail[{i}]", s if isinstance(s, str) else ""))
            cl = d.get("closing") or {}
            for i, s in enumerate(cl.get("open_ended_takeaways") or []):
                out.append((f"open_ended_takeaways[{i}]", s if isinstance(s, str) else ""))
            for i, s in enumerate(cl.get("next_questions_for_user") or []):
                out.append((f"next_questions_for_user[{i}]", s if isinstance(s, str) else ""))
            return out
        for _fn, text in texts_from_debate(data):
            if _contains_forbidden(text, self.policy):
                errors.append("Forbidden phrase still present after repair.")
                break
        cl = data.get("closing") or {}
        next_q = cl.get("next_questions_for_user") or []
        takeaways = cl.get("open_ended_takeaways") or []
        if not next_q and not any("?" in (t or "") or "might" in (t or "").lower() or "could" in (t or "").lower() for t in takeaways):
            errors.append("Closing must be open-ended.")
        return errors

    def repair_creator_response(
        self,
        resp: Any,
        errors: list[str],
        llm_client: OpenAIClient | None = None,
    ) -> dict | None:
        """One repair call for CreatorResponse. Returns dict or None."""
        if llm_client is None:
            llm_client = OpenAIClient()
        try:
            raw = resp.model_dump() if hasattr(resp, "model_dump") else resp
            system = """You are a corrector. Fix the given CreatorResponse JSON so it satisfies the PersonalityPolicy rules.
RULES:
- audience_questions must have at least 3 items.
- No Spanish phrases: "queda demostrado", "la verdad es", "esto prueba definitivamente".
- Tone calm and open-ended; no definitive conclusions.
Return ONLY the corrected full JSON object for CreatorResponse. No markdown, no explanation."""
            user = f"Validation errors:\n" + "\n".join(errors) + "\n\nCurrent JSON:\n" + json.dumps(raw, ensure_ascii=False, indent=2)
            reply = llm_client.chat(system_prompt=system, user_prompt=user, max_tokens=4000)
            text = getattr(reply, "content", None) or str(reply)
            if text.startswith("```"):
                lines = text.split("\n")
                if lines[0].strip().startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].strip() == "```":
                    lines = lines[:-1]
                text = "\n".join(lines)
            data = json.loads(text)
            new_errors = self._validate_creator_dict(data)
            if not new_errors:
                return data
        except Exception as e:
            logger.debug("Repair creator response failed: %s", e)
        return None

    def _validate_creator_dict(self, data: dict) -> list[str]:
        """Run same rules on a creator response dict (for repair re-validation)."""
        errors: list[str] = []
        aq = data.get("audience_questions") or []
        if len(aq) < self.policy.min_socratic_questions:
            errors.append(f"audience_questions must have at least {self.policy.min_socratic_questions} items.")
        for key in ["title_options", "hook", "outline", "script", "audience_questions", "disclaimer"]:
            val = data.get(key)
            if isinstance(val, list):
                for i, s in enumerate(val):
                    if _contains_forbidden(str(s) if s else "", self.policy):
                        errors.append(f"Forbidden phrase in {key}[{i}].")
                        break
            elif isinstance(val, str) and _contains_forbidden(val, self.policy):
                errors.append(f"Forbidden phrase in {key}.")
        return errors

    def fallback_debate_response(self, topic: str, user_message: str, lang: str = "en") -> dict:
        """Return a dict that main can use as DebateResponse(**d). Facts neutral, open-ended questions, explicit uncertainty."""
        if lang == "es":
            return {
                "facts_layer": {
                    "summary": f"Este tema ({topic}) involucra múltiples perspectivas; lo siguiente es solo para reflexión.",
                    "claims": [
                        {
                            "text": "Existen diferentes puntos de vista sobre este tema.",
                            "certainty": "speculative",
                            "source_ids": [],
                            "short_explanation": "Presentado para discusión.",
                        }
                    ],
                    "what_we_dont_know": ["Mucho permanece incierto; no pretendemos zanjar la cuestión."],
                    "common_misconceptions": [],
                },
                "author_layer": {
                    "quotes": [],
                    "quote_policy_note": "Las citas, cuando aparecen, son textuales de la base de conocimiento.",
                },
                "debate_layer": {
                    "steelman_of_user": f"Una lectura caritativa de tu posición: {user_message or 'Estás considerando este tema.'} "
                    "La posición más fuerte distingue entre lo empírico y lo metafísico. "
                    "La ciencia tiene límites claros para abordar afirmaciones trascendentes.",
                    "contrarian_position": "Un contrapunto señala los límites del método empírico, "
                    "la carga de la prueba en afirmaciones existenciales, "
                    "y las alternativas explicativas que no apelan a causas trascendentes.",
                    "counterarguments": [
                        "Existen interpretaciones alternativas de la evidencia.",
                        "Marcos epistemológicos distintos llevan a conclusiones razonables distintas.",
                    ],
                    "socratic_questions": [
                        "¿Qué evidencia empírica fortalecería o debilitaría tu posición?",
                        "¿Cómo responderías a la objeción de que la ciencia no puede abordar afirmaciones no falsables?",
                        "¿Qué suposiciones epistemológicas sustentan tu visión?",
                    ],
                    "where_contrarian_might_fail": ["La crítica contraria puede no aplicarse en todos los casos."],
                },
                "closing": {
                    "open_ended_takeaways": [
                        "Esta discusión es abierta; no concluimos de forma definitiva.",
                        "Múltiples perspectivas permanecen sobre la mesa.",
                    ],
                    "next_questions_for_user": [
                        "¿Qué aspectos te gustaría explorar más?",
                        "¿Cómo respondes a los contraargumentos presentados?",
                        "¿Qué evidencia adicional te importaría?",
                    ],
                },
            }
        return {
            "facts_layer": {
                "summary": f"This topic ({topic}) involves multiple perspectives; the following points are for reflection only.",
                "claims": [
                    {
                        "text": "Different viewpoints exist on this subject.",
                        "certainty": "speculative",
                        "source_ids": [],
                        "short_explanation": "Presented for discussion.",
                    }
                ],
                "what_we_dont_know": ["Much remains uncertain; we do not claim to settle the matter."],
                "common_misconceptions": [],
            },
            "author_layer": {
                "quotes": [],
                "quote_policy_note": "Quotes, when present, are verbatim from the knowledge base only.",
            },
            "debate_layer": {
                "steelman_of_user": f"A charitable reading of your view: {user_message or 'You are considering this topic.'} "
                "The strongest version of this position distinguishes between what can be established empirically "
                "and questions that transcend direct observation. "
                "Proponents might argue that the internal coherence of theoretical frameworks "
                "provides a form of rational support distinct from direct verification.",
                "contrarian_position": "A rigorous counterpoint would highlight the limits of empirical evidence "
                "and the burden of proof in existential claims. "
                "One might also consider alternative explanations that do not appeal to transcendent causes "
                "and can account for the same phenomena with greater parsimony. "
                "Methodological naturalism requires that explanations remain within what is falsifiable.",
                "counterarguments": [
                    "Other interpretations of the evidence are possible and may be equally coherent.",
                    "Evidence can be read in different ways depending on one's epistemic framework.",
                    "The scope of scientific inquiry may not extend to all questions worth asking.",
                ],
                "socratic_questions": [
                    f"What evidence or reasoning would change your position on {topic}?",
                    "How might someone who disagrees with you respond to your strongest argument?",
                    "What assumptions are we making, and are they shared by everyone?",
                ],
                "where_contrarian_might_fail": [
                    "The contrarian view may not apply equally in all cases.",
                    "Some objections may be less relevant to your specific formulation.",
                ],
            },
            "closing": {
                "open_ended_takeaways": [
                    "This discussion is open-ended; we do not conclude definitively.",
                    "Multiple perspectives remain on the table.",
                ],
                "next_questions_for_user": [
                    "What would you like to explore further?",
                    "How do you respond to the counterarguments?",
                    "What additional evidence would matter to you?",
                ],
            },
        }

    def fallback_creator_response(self, topic: str, allowed_science_ids: list[str], allowed_quote_ids: list[str]) -> dict:
        """Return a dict for CreatorResponse. Open-ended, no conclusions."""
        return {
            "title_options": [
                f"Exploring {topic}",
                f"{topic}: Open Questions",
                "Perspectives and Uncertainty",
            ],
            "hook": f"This piece explores different perspectives on {topic}, without drawing final conclusions.",
            "outline": [
                "Introduce the topic.",
                "Present key points from available sources.",
                "Consider alternative viewpoints.",
                "Acknowledge limits and uncertainty.",
                "End with open-ended questions.",
            ],
            "script": f"Discussion of {topic}. We present facts and perspectives neutrally. What evidence would you want to see? How might someone disagree? We do not claim to prove or conclude.",
            "audience_questions": [
                "What evidence would strengthen or weaken the main arguments?",
                "How might someone with a different view respond?",
                "What would you want to explore further?",
            ],
            "disclaimer": "This is one perspective; others exist. We aim to encourage reflection, not to impose a conclusion.",
            "sources_used": {
                "science_ids": list(allowed_science_ids)[:5],
                "quote_ids": list(allowed_quote_ids)[:5],
            },
        }


# Singleton for use in main
_default_validator: PersonalityValidator | None = None


def get_validator() -> PersonalityValidator:
    global _default_validator
    if _default_validator is None:
        _default_validator = PersonalityValidator(PersonalityPolicy())
    return _default_validator
