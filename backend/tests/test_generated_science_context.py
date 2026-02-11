import os

import pytest


pytestmark = pytest.mark.skipif(
    not (os.getenv("OPENAI_API_KEY") or os.getenv("LLM_API_KEY")),
    reason="LLM API key not configured",
)


@pytest.mark.parametrize(
    "topic,user_message",
    [
        ("¿Existe Dios según la ciencia?", "Quiero entender qué dice la ciencia sobre Dios."),
        ("¿Era Hitler bueno?", "Quiero hablar de la moralidad y la historia de Hitler."),
        ("¿El comunismo funciona?", "Me interesa la evidencia económica sobre comunismo."),
        ("¿Existe el mundo más allá de mi mente?", "Duda sobre realidad externa y mente."),
    ],
)
def test_generated_science_context_non_empty(topic: str, user_message: str) -> None:
    from llm import OpenAIClient
    from debate_facts_generator import generate_science_context_block

    client = OpenAIClient()
    ctx, bullets = generate_science_context_block(
        topic=topic,
        user_message=user_message,
        llm_client=client,
        response_language="es",
    )
    assert isinstance(ctx, str) and ctx.strip(), "Context paragraph must be non-empty"
    assert isinstance(bullets, list) and 1 <= len(bullets) <= 3, "There must be between 1 and 3 verification bullets"
    assert all(isinstance(b, str) and b.strip() for b in bullets), "All bullets must be non-empty strings"

