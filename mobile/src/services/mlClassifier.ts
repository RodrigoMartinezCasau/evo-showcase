/**
 * mlClassifier.ts
 *
 * TypeScript inference engine that replicates exactly the sklearn pipeline:
 *   TfidfVectorizer (smooth_idf, L2-norm) → LogisticRegression (multinomial)
 *
 * The model weights (vocabulary, IDF, coefficients, intercept, class order)
 * are loaded from a static JSON file bundled by Metro at build time.
 * No network call, no native module, no external dependency.
 *
 * Fallback behaviour:
 *   - If the weights file is a placeholder (empty vocabulary/coefficients),
 *     `classifyTextML` returns a zero-filled `ClanScores` object.
 *     The hybrid classifier in `clanClassifier.ts` detects this and falls
 *     back to heuristic + semantic only.
 *   - If any error occurs during inference, same zero result is returned.
 *
 * To regenerate the model with updated data:
 *   cd scripts && python train_model.py
 * The output goes directly to `mobile/src/assets/ml/modelWeights.json`.
 * After that, reload the app (Metro will pick up the updated JSON).
 *
 * Sklearn replication details:
 *   TF-IDF:   TF = raw count, IDF = log((1+N)/(1+df))+1 (smooth_idf=True),
 *             final vector L2-normalised (norm='l2').
 *   Logistic: logit[k] = dot(coef[k], x) + intercept[k]
 *             prob[k]  = softmax(logit)[k]
 */

import { ALL_CLAN_IDS, makeZeroScores, type ClanScoreId, type ClanScores } from './clanClassifier';

// ─── Model weights type ──────────────────────────────────────────────────────

type ModelWeights = {
  __meta?: {
    placeholder?: boolean;
    train_accuracy?: number;
    n_samples?: number;
    n_features?: number;
  };
  vocabulary: Record<string, number>;   // word → column index
  idf: number[];                        // [n_features]  IDF per term
  coefficients: number[][];             // [n_classes][n_features]
  intercept: number[];                  // [n_classes]
  classes: string[];                    // ["existencialista", "nihilista", ...]
};

// ─── Load weights (lazily, once) ─────────────────────────────────────────────

// Metro bundler resolves require() of JSON files at build time.
// The result is an in-memory JS object — no async I/O needed.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const RAW_WEIGHTS = require('../assets/ml/modelWeights.json') as ModelWeights;

/**
 * Validates that the loaded weights are real (not the placeholder).
 * Returns false if the JSON is the initial placeholder with empty data.
 */
function isModelReady(w: ModelWeights): boolean {
  return (
    !w.__meta?.placeholder &&
    Object.keys(w.vocabulary).length > 0 &&
    w.coefficients.length > 0 &&
    w.classes.length === 8
  );
}

// ─── Text preprocessing (must match train_model.py exactly) ─────────────────

function stripDiacritics(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Tokenize: lowercase → strip diacritics → remove non-alphanumeric → split.
 * Minimum token length: 2 characters.
 *
 * This function is the ONLY place that must stay in perfect sync with
 * the `tokenize()` function in `train_model.py`.
 */
function tokenize(text: string): string[] {
  return stripDiacritics(text.toLowerCase())
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

// ─── TF-IDF vector construction ──────────────────────────────────────────────

/**
 * Build a sparse TF-IDF vector for `text` using the stored vocabulary and
 * IDF weights. Returns an array of [col_index, tfidf_value] pairs.
 *
 * Replicates sklearn's TfidfVectorizer(norm='l2'):
 *   raw_tf[i]   = number of times token i appears in the text
 *   tfidf[i]    = raw_tf[i] * idf[i]
 *   (then L2-normalised across all non-zero entries)
 */
function buildTfIdfVector(
  text: string,
  vocabulary: Record<string, number>,
  idf: number[],
): [number, number][] {
  const tokens = tokenize(text);
  if (tokens.length === 0) return [];

  // Count raw term frequencies.
  const tf = new Map<number, number>();
  for (const token of tokens) {
    const idx = vocabulary[token];
    if (idx !== undefined) {
      tf.set(idx, (tf.get(idx) ?? 0) + 1);
    }
  }

  if (tf.size === 0) return [];

  // Multiply by IDF.
  const raw: [number, number][] = [];
  for (const [idx, count] of tf) {
    raw.push([idx, count * idf[idx]]);
  }

  // L2-normalise.
  let sumSq = 0;
  for (const [, v] of raw) sumSq += v * v;
  if (sumSq === 0) return [];

  const norm = Math.sqrt(sumSq);
  return raw.map(([idx, v]) => [idx, v / norm]);
}

// ─── Softmax ──────────────────────────────────────────────────────────────────

/**
 * Numerically stable softmax: subtract max(logits) before exp to prevent
 * overflow. Produces probabilities summing to 1.
 */
function softmax(logits: number[]): number[] {
  const max = Math.max(...logits);
  const exps = logits.map((x) => Math.exp(x - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

// ─── Clan index mapping ───────────────────────────────────────────────────────

/**
 * Pre-compute model-class → ClanScoreId mapping so the hot-path doesn't
 * do string comparisons on every call. Built once on first use.
 */
let classIndexMap: Map<string, ClanScoreId> | null = null;

function getClassIndexMap(classes: string[]): Map<string, ClanScoreId> {
  if (classIndexMap && classIndexMap.size === classes.length) return classIndexMap;
  classIndexMap = new Map(
    classes
      .filter((c): c is ClanScoreId => (ALL_CLAN_IDS as string[]).includes(c))
      .map((c) => [c, c as ClanScoreId]),
  );
  return classIndexMap;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Classify `text` using the trained TF-IDF + Logistic Regression model.
 *
 * Returns `ClanScores` with values in [0, 10]:
 *   score[clan] = softmax_probability[clan] * 10
 *
 * When the model is a placeholder or an error occurs, returns all-zeros.
 * The caller (classifyTextHybrid) treats zeros as "ML unavailable" and
 * adjusts the blend ratio accordingly.
 *
 * Synchronous: weights are bundled as a require()-d JSON object; no I/O.
 */
export function classifyTextML(text: string): ClanScores {
  const zeros = makeZeroScores();

  if (!text || !text.trim()) return zeros;
  if (!isModelReady(RAW_WEIGHTS)) return zeros;

  try {
    const { vocabulary, idf, coefficients, intercept, classes } = RAW_WEIGHTS;
    const classMap = getClassIndexMap(classes);

    // 1. Build sparse TF-IDF vector.
    const sparseVec = buildTfIdfVector(text, vocabulary, idf);
    if (sparseVec.length === 0) return zeros;

    // 2. Compute logits: logit[k] = dot(coef[k], x) + intercept[k]
    const logits = classes.map((_, k) => {
      let dot = intercept[k] ?? 0;
      for (const [colIdx, val] of sparseVec) {
        dot += (coefficients[k]?.[colIdx] ?? 0) * val;
      }
      return dot;
    });

    // 3. Softmax → probabilities.
    const probs = softmax(logits);

    // 4. Map to ClanScores in [0, 10].
    const scores = makeZeroScores();
    for (let k = 0; k < classes.length; k++) {
      const clanId = classMap.get(classes[k]);
      if (clanId) {
        scores[clanId] = Math.min(10, probs[k] * 10);
      }
    }
    return scores;
  } catch {
    return zeros;
  }
}

/**
 * Whether the bundled model is trained (not the initial placeholder).
 * Useful for logging / debug — the classifier itself handles the fallback.
 */
export function isMLModelReady(): boolean {
  return isModelReady(RAW_WEIGHTS);
}

/**
 * Training metadata from the bundled model (for the debug panel, if any).
 */
export function getMLModelMeta(): {
  ready: boolean;
  accuracy: number;
  vocabSize: number;
  nSamples: number;
} {
  const m = RAW_WEIGHTS.__meta ?? {};
  return {
    ready: isModelReady(RAW_WEIGHTS),
    accuracy: m.train_accuracy ?? 0,
    vocabSize: m.n_features ?? 0,
    nSamples: m.n_samples ?? 0,
  };
}
