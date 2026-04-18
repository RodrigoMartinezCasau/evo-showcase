/**
 * Phrase-mode API client.
 *
 * Currently exposes a single endpoint:
 *   POST /phrase/intro  → short Spanish AI intro for a user-submitted phrase.
 *
 * Reuses the same base URL as the debate API so all backend calls share one
 * configuration source.
 */
import { getApiBaseUrl } from './debateApi';

export type PhraseIntroRequest = {
  phrase: string;
  /** Author the user attributes the phrase to (optional). */
  author?: string | null;
};

export type PhraseIntroResponse = {
  intro: string | null;
};

/**
 * Generate a short conversational intro for the phrase. Returns `null` for the
 * intro if the backend was unable to generate one — callers should treat that
 * as "skip the intro block" rather than as an error.
 */
export async function generatePhraseIntro(
  payload: PhraseIntroRequest,
  options?: { signal?: AbortSignal },
): Promise<string | null> {
  const url = `${getApiBaseUrl()}/phrase/intro`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phrase: payload.phrase,
        author: payload.author ?? null,
      }),
      signal: options?.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as PhraseIntroResponse;
    const intro = (data?.intro ?? '').trim();
    return intro.length > 0 ? intro : null;
  } catch {
    // Network errors / aborted requests → no intro, phrase tools still work.
    return null;
  }
}
