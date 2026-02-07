"""
Simple heuristic classifier for debate topic domain.
Used to decide whether to show science KB facts or "Hechos verificados" + placeholder.
Return values: "science" | "history" | "politics" | "philosophy" | "religion" | "psychology" | "other"
"""

# Keywords per domain (lowercased). Order matters: first match wins for ambiguous cases.
_SCIENCE = frozenset([
    "ciencia", "científico", "science", "scientific", "big bang", "bigbang", "evolución", "evolution",
    "dios según la ciencia", "god according to science", "física", "physics", "química", "chemistry",
    "biología", "biology", "cosmología", "cosmology", "genética", "genetics", "adn", "dna", "hubble",
    "constantes físicas", "physical constants", "empírico", "empirical", "experimento", "experiment",
    "neurociencia", "neuroscience", "clima", "climate", "fósil", "fossil", "natural selection",
    "selección natural", "nucleosíntesis", "multiverso", "multiverse", "falsabilidad", "falsifiability",
])

_HISTORY = frozenset([
    "historia", "history", "histórico", "historical", "guerra", "war", "hitler", "nazi", "nazismo",
    "holocausto", "segunda guerra", "world war", "revolución", "revolution", "imperio", "empire",
])

_POLITICS = frozenset([
    "política", "politics", "político", "político", "gobierno", "government", "democracia", "democracy",
    "dictadura", "dictatorship", "voto", "vote", "elección", "election", "ley", "law",
])

_PHILOSOPHY = frozenset([
    "filosofía", "philosophy", "filosófico", "philosophical", "ética", "ethics", "moral", "existencia",
    "existence", "epistemología", "epistemology", "estoic", "stoic", "sentido de la vida", "meaning of life",
])

_RELIGION = frozenset([
    "religión", "religion", "religioso", "religious", "dios", "god", "fe", "faith", "creencia", "belief",
    "iglesia", "church", "biblia", "bible", "ateísmo", "atheism", "teísmo", "theism",
])

_PSYCHOLOGY = frozenset([
    "psicología", "psychology", "psicológico", "psychological", "mente", "mind", "cognición", "cognition",
    "creencia", "belief", "sesgo", "bias",
])


def classify_domain(topic: str, user_message: str) -> str:
    """
    Classify the debate topic/message into a domain.
    Returns one of: "science" | "history" | "politics" | "philosophy" | "religion" | "psychology" | "other"
    """
    combined = f"{topic} {user_message}".lower().strip()
    if not combined:
        return "other"

    # Check science first (many topics can overlap; we want to avoid showing science facts for non-science)
    for kw in _SCIENCE:
        if kw in combined:
            return "science"

    for kw in _HISTORY:
        if kw in combined:
            return "history"

    for kw in _POLITICS:
        if kw in combined:
            return "politics"

    for kw in _PHILOSOPHY:
        if kw in combined:
            return "philosophy"

    for kw in _RELIGION:
        if kw in combined:
            return "religion"

    for kw in _PSYCHOLOGY:
        if kw in combined:
            return "psychology"

    return "other"
