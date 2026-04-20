/**
 * clanClassifier.ts
 *
 * Heuristic Spanish-language classifier that scores a piece of free text
 * (a reflection or a phrase) against the 8 philosophical clans.
 *
 * Used by ClassificationContext to convert every reflection/phrase the user
 * sends to the AI into a vector of clan scores that gets accumulated over
 * time and turned into the user's visible philosophical-percentages display.
 *
 * Design contract (mirrors the spec):
 *   - returns a score per clan in `Record<ClanId, number>`
 *   - scores are graded (not binary), allowing multi-clan resemblance
 *   - never returns an all-zero vector: if the text matches nothing, the
 *     closest fallback clans receive a small minimum score (`MIN_FALLBACK`)
 *   - scoring is purely local/deterministic so it works offline and in
 *     simulation, without any AI round-trip
 *   - scale is roughly 0..10, but downstream code only normalises so the
 *     absolute scale doesn't matter as long as it stays consistent
 */

export type ClanScoreId =
  | 'nihilista'
  | 'cientista'
  | 'estoico'
  | 'existencialista'
  | 'racionalista'
  | 'humanista'
  | 'realista'
  | 'trascendentalista';

export type ClanScores = Record<ClanScoreId, number>;

export const ALL_CLAN_IDS: ClanScoreId[] = [
  'nihilista',
  'cientista',
  'estoico',
  'existencialista',
  'racionalista',
  'humanista',
  'realista',
  'trascendentalista',
];

export const CLAN_LABELS: Record<ClanScoreId, string> = {
  nihilista: 'Nihilista',
  cientista: 'Cientista',
  estoico: 'Estoico',
  existencialista: 'Existencialista',
  racionalista: 'Racionalista',
  humanista: 'Humanista',
  realista: 'Realista',
  trascendentalista: 'Trascendentalista',
};

/** Minimum positive score given to the closest clan(s) when a text matches nothing. */
const MIN_FALLBACK = 0.5;

// ─── Keyword tables ──────────────────────────────────────────────────────────
//
// Each clan has weighted keywords. The classifier:
//   1. Normalises the input (lowercase, strip diacritics, collapse spaces).
//   2. Tokenises into words.
//   3. For every keyword, checks substring presence (so "racional" matches
//      "racionalismo", "racionalmente", etc.).
//   4. Sums the keyword weight into the clan score, with diminishing returns
//      to avoid any single repeated word dominating a long text.
//
// Keyword weights are heuristic but tuned to PART 18 of the spec so each
// clan has both broad (lower-weight) signals and strong (higher-weight)
// signals.

type KeywordWeight = readonly [string, number];

const KEYWORDS: Record<ClanScoreId, KeywordWeight[]> = {
  nihilista: [
    ['nada', 1.2],
    ['vacio', 2.0],
    ['vacia', 2.0],
    ['sin sentido', 3.0],
    ['no tiene sentido', 3.0],
    ['carece de sentido', 3.0],
    ['inutil', 1.4],
    ['absurdo', 2.5],
    ['absurda', 2.5],
    ['nihilis', 4.0],
    ['todo da igual', 3.0],
    ['nihil', 3.5],
    ['cuestionar todo', 2.0],
    ['no creo en', 1.5],
    ['no hay verdad', 2.5],
    ['ilusion', 1.4],
    ['destruir', 1.6],
    ['ruptura', 1.4],
    ['narrativa', 1.2],
    ['rechazo', 1.4],
    ['nada importa', 3.0],
    ['indiferencia', 1.8],
    ['apatia', 1.8],
    ['vacuo', 1.8],
    ['nulo', 1.4],
    ['desmonta', 1.8],
    ['falso', 1.2],
    ['no existe', 1.4],
  ],
  cientista: [
    ['ciencia', 3.0],
    ['cientific', 3.0],
    ['evidencia', 3.0],
    ['datos', 2.5],
    ['dato', 1.6],
    ['estudio', 2.0],
    ['estudios', 2.0],
    ['investigacion', 2.5],
    ['investigaciones', 2.5],
    ['hipotesis', 2.5],
    ['experimento', 2.5],
    ['experimental', 2.0],
    ['empiri', 2.5],
    ['metodo', 1.8],
    ['observacion', 1.8],
    ['fisica', 2.0],
    ['quimica', 2.0],
    ['biologia', 2.0],
    ['neuro', 1.8],
    ['cerebro', 1.4],
    ['probabilidad', 1.8],
    ['estadistic', 2.0],
    ['demostrar', 1.6],
    ['verificar', 2.0],
    ['falsable', 2.5],
    ['teoria', 1.4],
    ['investigar', 1.6],
    ['analisis', 1.6],
    ['analitic', 1.6],
    ['conocimiento', 1.0],
    ['evolucion', 1.4],
  ],
  estoico: [
    ['estoic', 4.0],
    ['aceptar', 2.0],
    ['aceptacion', 2.5],
    ['controlar', 2.0],
    ['control', 1.6],
    ['no depende de mi', 3.0],
    ['no depende de ti', 2.5],
    ['lo que depende', 2.0],
    ['paciencia', 2.0],
    ['disciplina', 2.5],
    ['virtud', 2.5],
    ['calma', 2.0],
    ['serenidad', 2.5],
    ['paz interior', 2.5],
    ['resilien', 2.5],
    ['perspectiva', 1.6],
    ['marco aurelio', 4.0],
    ['seneca', 4.0],
    ['epicteto', 4.0],
    ['soportar', 1.6],
    ['constancia', 1.8],
    ['firmeza', 1.6],
    ['templanza', 2.5],
    ['sufrir', 1.0],
    ['no me afecta', 2.0],
    ['emocion', 0.8],
    ['dominio propio', 2.5],
    ['autocontrol', 2.5],
    ['austeridad', 1.8],
  ],
  existencialista: [
    ['existencial', 4.0],
    ['existencia', 2.5],
    ['sentido de la vida', 3.0],
    ['mi sentido', 2.5],
    ['propio sentido', 3.0],
    ['crear sentido', 3.0],
    ['libertad', 2.0],
    ['libre albedrio', 3.0],
    ['eleccion', 2.0],
    ['elegir', 1.8],
    ['responsabilidad', 2.0],
    ['angustia', 2.5],
    ['autenticidad', 2.5],
    ['autentic', 2.0],
    ['identidad', 2.0],
    ['quien soy', 2.5],
    ['quien eres', 2.0],
    ['ser uno mismo', 2.5],
    ['mi vida', 1.0],
    ['mi camino', 1.4],
    ['sartre', 4.0],
    ['camus', 3.5],
    ['kierkegaard', 4.0],
    ['heidegger', 3.5],
    ['decision', 1.4],
    ['proyecto', 1.2],
    ['mi propia', 1.4],
    ['eleccion personal', 2.5],
    ['individuo', 1.4],
    ['mi sentido', 2.5],
  ],
  racionalista: [
    ['razon', 2.5],
    ['razonar', 2.5],
    ['logica', 3.0],
    ['logico', 2.5],
    ['logicamente', 2.5],
    ['racional', 3.0],
    ['racionalismo', 4.0],
    ['deduccion', 2.5],
    ['deducir', 2.0],
    ['premisa', 2.5],
    ['conclusion', 1.8],
    ['argumento', 2.0],
    ['argumentar', 2.0],
    ['coherencia', 2.5],
    ['coherente', 2.0],
    ['contradiccion', 2.0],
    ['silogismo', 3.0],
    ['inferencia', 2.5],
    ['descartes', 4.0],
    ['kant', 3.5],
    ['leibniz', 3.5],
    ['spinoza', 3.5],
    ['estructur', 1.4],
    ['ordenado', 1.2],
    ['sistema', 1.0],
    ['axioma', 2.5],
    ['principio', 1.0],
    ['evidente', 1.4],
    ['matematic', 1.8],
  ],
  humanista: [
    ['humanism', 4.0],
    ['humanidad', 2.5],
    ['humano', 1.4],
    ['humanos', 1.4],
    ['empatia', 3.0],
    ['empatic', 2.5],
    ['compasion', 2.5],
    ['solidari', 2.5],
    ['dignidad', 2.5],
    ['etica', 1.8],
    ['etico', 1.8],
    ['moral', 1.4],
    ['bienestar', 2.5],
    ['ayudar', 2.0],
    ['comunidad', 2.0],
    ['conexion', 1.6],
    ['conectar', 1.6],
    ['amor', 1.4],
    ['amistad', 1.6],
    ['cuidar', 1.8],
    ['gente', 1.0],
    ['sociedad', 1.4],
    ['social', 1.0],
    ['justicia', 2.0],
    ['cooperar', 1.8],
    ['armonia', 1.8],
    ['equilibrio entre', 1.6],
    ['potencial humano', 3.0],
    ['constructivo', 1.8],
    ['suavizar', 1.4],
  ],
  realista: [
    ['realista', 4.0],
    ['realismo', 4.0],
    ['realidad', 2.0],
    ['hechos', 2.0],
    ['hecho', 1.0],
    ['practico', 2.5],
    ['practica', 1.6],
    ['pragmati', 3.0],
    ['concreto', 2.0],
    ['concreta', 2.0],
    ['util', 1.6],
    ['lo que funciona', 2.5],
    ['sin idealiz', 2.5],
    ['sin filtros', 2.0],
    ['sin fantasia', 2.5],
    ['cruda realidad', 3.0],
    ['frio', 1.6],
    ['directo', 1.6],
    ['limites', 1.6],
    ['limitacion', 2.0],
    ['aceptar el mundo', 2.5],
    ['aterriza', 2.5],
    ['poner los pies', 2.5],
    ['no idealiz', 2.5],
    ['mundo real', 2.5],
    ['sin ideales', 2.0],
    ['tangible', 1.8],
    ['objetivo', 1.4],
    ['eficaz', 1.6],
    ['eficiente', 1.6],
  ],
  trascendentalista: [
    ['trascend', 4.0],
    ['transcend', 4.0],
    ['espiritu', 2.5],
    ['espiritual', 3.0],
    ['alma', 2.5],
    ['dios', 3.0],
    ['divino', 2.5],
    ['sagrado', 2.5],
    ['religion', 2.0],
    ['religios', 2.0],
    ['fe ', 2.0],
    [' fe.', 2.0],
    ['oracion', 2.0],
    ['meditacion', 2.5],
    ['meditar', 2.5],
    ['conciencia', 2.5],
    ['universo', 1.6],
    ['cosmos', 1.8],
    ['naturaleza', 1.6],
    ['intuicion', 2.5],
    ['mas alla', 2.5],
    ['mas grande', 1.6],
    ['eterno', 2.0],
    ['eternidad', 2.5],
    ['infinito', 2.0],
    ['mistic', 3.0],
    ['energia', 1.8],
    ['conexion universal', 3.0],
    ['emerson', 4.0],
    ['thoreau', 3.5],
    ['superior', 1.4],
    ['absoluto', 2.0],
    ['profund', 1.0],
    ['elevad', 1.6],
    ['contempla', 1.8],
  ],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Lowercase + remove diacritics + collapse whitespace, so matching is robust. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Count non-overlapping occurrences of `needle` in `haystack`. */
function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let from = 0;
  while (true) {
    const idx = haystack.indexOf(needle, from);
    if (idx < 0) return count;
    count += 1;
    from = idx + needle.length;
  }
}

/**
 * Diminishing-returns transform so a single keyword repeated 50 times in a
 * very long text doesn't dominate. First match counts full weight, second
 * half, third a third, etc. (harmonic).
 */
function diminished(occurrences: number, weight: number): number {
  if (occurrences <= 0) return 0;
  let total = 0;
  for (let i = 1; i <= Math.min(occurrences, 5); i++) {
    total += weight / i;
  }
  return total;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export type InputType = 'reflection' | 'phrase';

/**
 * Classify a piece of text into the 8 clans.
 *
 * Always returns positive scores for at least one clan (the minimum
 * non-zero rule). For reflections, longer texts tend to produce
 * higher absolute scores, which is fine — accumulation normalises.
 */
export function classifyText(text: string, _type: InputType = 'reflection'): ClanScores {
  const norm = ' ' + normalize(text) + ' ';

  const scores = makeZeroScores();

  for (const clan of ALL_CLAN_IDS) {
    let total = 0;
    for (const [keyword, weight] of KEYWORDS[clan]) {
      const occ = countOccurrences(norm, keyword);
      if (occ > 0) total += diminished(occ, weight);
    }
    scores[clan] = total;
  }

  // Cap individual clan scores so a single keyword-stuffed text can't
  // permanently lock a user into one clan.
  for (const clan of ALL_CLAN_IDS) {
    if (scores[clan] > 10) scores[clan] = 10;
  }

  // Min non-zero rule: if the entire vector came back zero, fall back
  // to a soft default. We try to bias toward clans that match the
  // overall *tone* of an unclassified reflection (introspective →
  // existencialista, neutral statement → realista). If we can't tell,
  // distribute MIN_FALLBACK across both.
  const sum = ALL_CLAN_IDS.reduce((a, c) => a + scores[c], 0);
  if (sum <= 0) {
    const lower = norm.trim();
    const introspective =
      lower.includes(' yo ') ||
      lower.includes(' mi ') ||
      lower.includes(' siento') ||
      lower.includes(' pienso') ||
      lower.includes(' creo');
    if (introspective) {
      scores.existencialista = MIN_FALLBACK * 1.5;
      scores.humanista = MIN_FALLBACK * 0.7;
    } else {
      scores.realista = MIN_FALLBACK * 1.2;
      scores.racionalista = MIN_FALLBACK * 0.8;
    }
  }

  return scores;
}

/** Build a fresh zero-filled score record. */
export function makeZeroScores(): ClanScores {
  return {
    nihilista: 0,
    cientista: 0,
    estoico: 0,
    existencialista: 0,
    racionalista: 0,
    humanista: 0,
    realista: 0,
    trascendentalista: 0,
  };
}

/** Sum of all 8 clan scores. */
export function totalOf(scores: ClanScores): number {
  return ALL_CLAN_IDS.reduce((acc, c) => acc + scores[c], 0);
}

/**
 * Convert raw accumulated clan totals into integer percentages that sum
 * to exactly 100. Uses the largest-remainder method so rounding doesn't
 * leave the panel showing 99% or 101%.
 *
 * If totals sum to zero (no inputs yet), returns an empty object so the
 * UI can render an empty state.
 */
export function totalsToPercentages(totals: ClanScores): Record<ClanScoreId, number> {
  const sum = totalOf(totals);
  if (sum <= 0) {
    return {
      nihilista: 0,
      cientista: 0,
      estoico: 0,
      existencialista: 0,
      racionalista: 0,
      humanista: 0,
      realista: 0,
      trascendentalista: 0,
    };
  }

  const exact: Record<ClanScoreId, number> = {} as Record<ClanScoreId, number>;
  const floor: Record<ClanScoreId, number> = {} as Record<ClanScoreId, number>;
  let floorSum = 0;
  for (const c of ALL_CLAN_IDS) {
    const e = (totals[c] / sum) * 100;
    exact[c] = e;
    floor[c] = Math.floor(e);
    floorSum += floor[c];
  }
  let remainder = 100 - floorSum;

  // Distribute remaining percentage points to the clans with the largest
  // fractional parts.
  const fractional = ALL_CLAN_IDS
    .map((c) => ({ c, frac: exact[c] - floor[c] }))
    .sort((a, b) => b.frac - a.frac);

  const out: Record<ClanScoreId, number> = { ...floor };
  let i = 0;
  while (remainder > 0 && i < fractional.length) {
    out[fractional[i].c] += 1;
    remainder -= 1;
    i += 1;
  }
  return out;
}

// ─── Hybrid classifier (heuristic + semantic + ML) ──────────────────────────
//
// Three-signal blend:
//
//   Signal       | Weight (ML ready) | Weight (ML unavailable)
//   -------------|-------------------|------------------------
//   Heuristic    |       0.50        |   0.625  (renormalised)
//   Semantic     |       0.30        |   0.375  (renormalised)
//   ML model     |       0.20        |    N/A
//
// Rationale for weights:
//   - Heuristic (50%): highest precision — when a keyword fires, it's almost
//     always the right clan. Gets the majority share.
//   - Semantic (30%): high recall — catches morphological variants, phrases
//     without exact keywords, general philosophical "tone".
//   - ML (20%): trained on the actual dataset — learns from example sentences
//     the specific style of each clan as written by users. Acts as a tie-
//     breaker when heuristic + semantic give a noisy signal.
//
// When the ML JSON is the placeholder (weights not yet generated):
//   classifyTextML() returns all-zeros, which is detected and the two
//   remaining signals are renormalised to 0.625/0.375.

const WEIGHT_HEURISTIC_WITH_ML    = 0.50;
const WEIGHT_SEMANTIC_WITH_ML     = 0.30;
const WEIGHT_ML                   = 0.20;

// Renormalised fallback weights when ML is unavailable (sum still = 1.0):
const WEIGHT_HEURISTIC_WITHOUT_ML = WEIGHT_HEURISTIC_WITH_ML / (WEIGHT_HEURISTIC_WITH_ML + WEIGHT_SEMANTIC_WITH_ML);
const WEIGHT_SEMANTIC_WITHOUT_ML  = WEIGHT_SEMANTIC_WITH_ML  / (WEIGHT_HEURISTIC_WITH_ML + WEIGHT_SEMANTIC_WITH_ML);

/**
 * Three-signal hybrid classifier.
 *
 * Combines:
 *   1. Heuristic (`classifyText`)          — deterministic, precise
 *   2. Local semantic (`classifyTextSemantic`) — vector similarity, recall
 *   3. Trained ML (`classifyTextML`)       — learnt from clan_dataset.json
 *
 * Async because the semantic layer is async (designed for future remote API
 * swap). The ML layer is synchronous (bundled JSON) so adds no latency.
 *
 * Graceful degradation:
 *   - Semantic fails → heuristic only.
 *   - ML not trained yet (placeholder) → heuristic + semantic (0.625/0.375).
 *   - ML fails → heuristic + semantic (0.625/0.375).
 */
export async function classifyTextHybrid(
  text: string,
  type: InputType = 'reflection',
): Promise<ClanScores> {
  const heuristic = classifyText(text, type);

  // ── Semantic layer (async, dynamic import to avoid circular ref) ────────
  let semantic: ClanScores | null = null;
  try {
    const mod = await import('./semanticClassifier');
    semantic = await mod.classifyTextSemantic(text);
  } catch {
    // Semantic unavailable → fall back to heuristic only.
    return heuristic;
  }

  // ── ML layer (synchronous, bundled JSON) ────────────────────────────────
  let ml: ClanScores | null = null;
  try {
    const mod = await import('./mlClassifier');
    const raw = mod.classifyTextML(text);
    // Zero-filled result = placeholder or failure = treat as unavailable.
    const mlSum = ALL_CLAN_IDS.reduce((a, c) => a + raw[c], 0);
    if (mlSum > 0) ml = raw;
  } catch {
    // ML module unavailable — continue without it.
  }

  // ── Blend ────────────────────────────────────────────────────────────────
  const out = makeZeroScores();
  if (ml) {
    for (const c of ALL_CLAN_IDS) {
      out[c] =
        heuristic[c] * WEIGHT_HEURISTIC_WITH_ML +
        semantic[c]  * WEIGHT_SEMANTIC_WITH_ML  +
        ml[c]        * WEIGHT_ML;
    }
  } else {
    for (const c of ALL_CLAN_IDS) {
      out[c] =
        heuristic[c] * WEIGHT_HEURISTIC_WITHOUT_ML +
        semantic[c]  * WEIGHT_SEMANTIC_WITHOUT_ML;
    }
  }
  return out;
}
