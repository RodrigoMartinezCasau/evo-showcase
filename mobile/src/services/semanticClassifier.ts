/**
 * semanticClassifier.ts
 *
 * Lightweight semantic classifier that complements `clanClassifier.ts`.
 *
 * Why this design (and not OpenAI/transformers.js):
 *   - Calling a remote embeddings API (OpenAI, Cohere…) from the mobile
 *     client would either expose an API key or require a backend round-trip
 *     for every reflection — too expensive, slow, and breaks offline use.
 *   - Bundling a real transformer model (e.g. all-MiniLM-L6) in React Native
 *     adds tens of MB and isn't viable on Expo without native modules.
 *
 * The compromise:
 *   - We build a deterministic local "embedding" for every text using a mix
 *     of word tokens, Spanish stem tokens (suffix stripping), and
 *     character-trigrams. This bag is L2-normalized and compared with the
 *     pre-computed bag of each clan description via cosine similarity.
 *   - This is genuine vector similarity (real cosine, real embeddings space),
 *     just with a small/cheap encoder. It catches morphological variants
 *     ("racional", "racionalmente", "racionalidad") and partial matches
 *     that the substring keyword matcher of `clanClassifier.ts` misses.
 *
 * Pluggable upgrade path:
 *   The single function `embedText` is the only place that turns text into
 *   a vector. Swap its implementation for a remote embeddings call when /
 *   if a backend endpoint is added — nothing else changes. Clan vectors
 *   would then need to be re-embedded once, which is also handled inside
 *   `getClanVector` (cached lazily).
 */
import {
  ALL_CLAN_IDS,
  makeZeroScores,
  type ClanScoreId,
  type ClanScores,
} from './clanClassifier';

// ─── Clan descriptions ──────────────────────────────────────────────────────
//
// Rich Spanish "semantic field" per clan. Each description is intentionally
// dense in synonyms / related concepts so the resulting clan vector covers
// the conceptual neighbourhood, not just one keyword. This is what gives
// the semantic layer its "understanding without exact match" power.

const clanDescriptions: Record<ClanScoreId, string> = {
  nihilista:
    'la vida no tiene sentido vacío absurdo nada importa todo carece de propósito ' +
    'rechazo de valores absolutos verdad relativa ilusión inutilidad apatía ' +
    'indiferencia desencanto destruir falsas narrativas cuestionar todo no creo ' +
    'nihilismo moral nula sin esperanza desmontar significados ruptura ' +
    'aniquilación de sentido vacuo nulo desesperanza pesimismo',
  cientista:
    'ciencia evidencia datos método científico experimento hipótesis observación ' +
    'investigación empírica análisis verificable falsable laboratorio neurociencia ' +
    'biología física química matemáticas estadística probabilidad demostración ' +
    'conocimiento racional verificación teoría comprobada estudios revisión por pares ' +
    'cerebro evolución genética modelo cuantitativo',
  estoico:
    'aceptar lo que no depende de mí controlar las emociones disciplina virtud ' +
    'paz interior serenidad calma resiliencia paciencia austeridad templanza firmeza ' +
    'autocontrol dominio propio constancia perspectiva soportar adversidad seneca ' +
    'marco aurelio epicteto sabiduría práctica desapego deber moral fortaleza interna ' +
    'no me afecta lo externo gratitud',
  existencialista:
    'libertad responsabilidad sentido individual yo creo mi propio significado ' +
    'autenticidad identidad quien soy elección decisión angustia náusea ' +
    'existencia precede a la esencia camus sartre kierkegaard heidegger ' +
    'individuo proyecto vital absurdo libre albedrío vivir mi propia vida ' +
    'compromiso personal autodefinición soledad existencial',
  racionalista:
    'razón lógica argumento estructura coherencia premisa conclusión deducción ' +
    'inferencia silogismo sistema axioma principio evidente analítico claridad ' +
    'descartes kant spinoza leibniz pensamiento ordenado mente racional ' +
    'detectar contradicciones consistencia interna geometría euclídea método deductivo ' +
    'razonamiento puro argumentación rigurosa',
  humanista:
    'empatía compasión dignidad humana solidaridad bienestar comunidad ayudar ' +
    'cuidar conexión humana ética moral justicia social cooperación amistad amor ' +
    'familia respeto al otro potencial humano educación derechos humanos ' +
    'florecimiento personal armonía social construir puentes suavizar conflictos ' +
    'valores compartidos humanidad común',
  realista:
    'realismo pragmatismo hechos concretos lo que funciona sin idealizar sin filtros ' +
    'cruda realidad utilidad práctica directo limitaciones aceptar el mundo tal cual es ' +
    'aterrizar ideas mundo real tangible objetivo eficiencia eficaz sin fantasía ' +
    'sentido común poner los pies en la tierra resultados visibles ' +
    'evaluar costos y beneficios',
  trascendentalista:
    'espíritu alma divino sagrado dios religión fe oración meditación contemplación ' +
    'conciencia universal cosmos naturaleza intuición más allá de lo físico ' +
    'eternidad infinito místico energía conexión espiritual emerson thoreau ' +
    'absoluto superior elevado profundo despertar iluminación realidad trascendente ' +
    'unidad con el todo sentido cósmico propósito sagrado',
};

// ─── Text → vector (the "encoder") ──────────────────────────────────────────

/** Map<feature, raw count>. */
type SparseVector = Map<string, number>;

/** Spanish suffixes stripped to obtain crude stems. Order matters (longest first). */
const SPANISH_SUFFIXES = [
  'mente',
  'ciones',
  'cion',
  'idades',
  'idad',
  'ismos',
  'ismo',
  'istas',
  'ista',
  'ables',
  'able',
  'ibles',
  'ible',
  'amos',
  'emos',
  'imos',
  'aron',
  'ieron',
  'ando',
  'iendo',
  'ado',
  'ido',
  'aba',
  'ian',
  'ais',
  'eis',
  'ar',
  'er',
  'ir',
  'es',
  'as',
  'os',
  'a',
  'o',
  'e',
];

function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function tokenize(text: string): string[] {
  return stripDiacritics(text.toLowerCase())
    .replace(/[^a-z0-9\s]+/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

/** Crude Spanish stemmer: strip the longest matching suffix down to a 3+ char stem. */
function stem(token: string): string {
  for (const suf of SPANISH_SUFFIXES) {
    if (token.length > suf.length + 2 && token.endsWith(suf)) {
      return token.slice(0, token.length - suf.length);
    }
  }
  return token;
}

/** All character trigrams of a word (for sub-word morphological similarity). */
function charTrigrams(token: string): string[] {
  if (token.length < 3) return [];
  const out: string[] = [];
  const padded = `^${token}$`;
  for (let i = 0; i <= padded.length - 3; i++) {
    out.push(padded.slice(i, i + 3));
  }
  return out;
}

/**
 * THE ENCODER. Convert text into a sparse, L2-normalized feature vector.
 *
 * Features (with relative weights):
 *   - whole-word tokens          (weight 2.0)  — strongest signal
 *   - Spanish stem of each word  (weight 1.5)  — morphology
 *   - character trigrams         (weight 0.4)  — fuzzy / sub-word
 *
 * This is wrapped in `Promise` so that swapping in a real remote embedding
 * model later (OpenAI, sentence-transformers via backend) requires changing
 * only this one function.
 */
async function embedText(text: string): Promise<SparseVector> {
  const vec: SparseVector = new Map();
  const add = (key: string, weight: number) => {
    vec.set(key, (vec.get(key) ?? 0) + weight);
  };

  for (const token of tokenize(text)) {
    add(`w:${token}`, 2.0);
    const st = stem(token);
    if (st !== token) add(`s:${st}`, 1.5);
    for (const tri of charTrigrams(token)) {
      add(`t:${tri}`, 0.4);
    }
  }

  return l2Normalize(vec);
}

function l2Normalize(vec: SparseVector): SparseVector {
  let sumSq = 0;
  for (const v of vec.values()) sumSq += v * v;
  if (sumSq === 0) return vec;
  const norm = Math.sqrt(sumSq);
  const out: SparseVector = new Map();
  for (const [k, v] of vec) out.set(k, v / norm);
  return out;
}

function cosineSimilarity(a: SparseVector, b: SparseVector): number {
  // Iterate over the smaller vector for speed.
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let dot = 0;
  for (const [k, v] of small) {
    const w = large.get(k);
    if (w !== undefined) dot += v * w;
  }
  // Both vectors are L2-normalized → cosine == dot product.
  return dot;
}

// ─── Caches ─────────────────────────────────────────────────────────────────

/** Lazy cache of clan vectors. Computed once on first use. */
let clanVectorCache: Record<ClanScoreId, SparseVector> | null = null;

async function getClanVectors(): Promise<Record<ClanScoreId, SparseVector>> {
  if (clanVectorCache) return clanVectorCache;
  const cache = {} as Record<ClanScoreId, SparseVector>;
  await Promise.all(
    ALL_CLAN_IDS.map(async (c) => {
      cache[c] = await embedText(clanDescriptions[c]);
    }),
  );
  clanVectorCache = cache;
  return cache;
}

/**
 * Tiny LRU for recent text → score lookups. Bounded so a long session can't
 * grow memory without limit. Keys are the trimmed/lowercased text.
 */
const TEXT_CACHE_MAX = 64;
const textScoreCache = new Map<string, ClanScores>();

function cacheKey(text: string): string {
  return text.trim().toLowerCase();
}

function readCache(key: string): ClanScores | null {
  const hit = textScoreCache.get(key);
  if (!hit) return null;
  // LRU bump: re-insert so it becomes the most recently used entry.
  textScoreCache.delete(key);
  textScoreCache.set(key, hit);
  return { ...hit };
}

function writeCache(key: string, scores: ClanScores): void {
  textScoreCache.set(key, { ...scores });
  if (textScoreCache.size > TEXT_CACHE_MAX) {
    // Drop the oldest entry (Map iteration order is insertion order).
    const oldest = textScoreCache.keys().next().value;
    if (oldest !== undefined) textScoreCache.delete(oldest);
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Score a piece of text against the 8 clans using cosine similarity over the
 * local embedding.
 *
 * Returns scores roughly in the 0..10 range so they live in the same scale as
 * `classifyText` (heuristic). The exact mapping is `sim * 10` clamped to
 * [0, 10]; in practice cosine similarities for short texts tend to fall in
 * 0.05..0.45 against any single clan, so individual scores typically land
 * in 0.5..4.5 — well within the heuristic's range.
 *
 * Async by design: this is the swap point for a remote embedding API.
 */
export async function classifyTextSemantic(text: string): Promise<ClanScores> {
  const trimmed = text.trim();
  if (!trimmed) return makeZeroScores();

  const key = cacheKey(trimmed);
  const cached = readCache(key);
  if (cached) return cached;

  const [clanVecs, textVec] = await Promise.all([getClanVectors(), embedText(trimmed)]);

  const scores = makeZeroScores();
  for (const c of ALL_CLAN_IDS) {
    const sim = cosineSimilarity(textVec, clanVecs[c]);
    // Clamp negatives to 0 (cosine on non-negative vectors should never be
    // negative, but guard anyway), and map to 0..10.
    scores[c] = Math.max(0, Math.min(10, sim * 10));
  }

  writeCache(key, scores);
  return scores;
}

/** Test/debug helper: forget cached clan vectors. */
export function _resetSemanticCaches(): void {
  clanVectorCache = null;
  textScoreCache.clear();
}
