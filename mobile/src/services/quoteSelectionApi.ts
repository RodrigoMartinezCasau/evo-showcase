import { getApiBaseUrl } from '@evoconn/services/debateApi';
import { mergeApiHeaders } from '@evoconn/services/apiRuntimeConfig';
import type { Quote } from '@evoconn/types/quotes';

type QuoteCandidatePayload = {
  id: string;
  text: string;
  author: string;
  domain: string;
  tags: string[];
  themes: string[];
};

type SelectQuoteResponse = {
  quote_id?: string;
};

function toCandidatePayload(q: Quote): QuoteCandidatePayload {
  return {
    id: q.id,
    text: q.text,
    author: q.author,
    domain: q.domain,
    tags: q.tags,
    themes: q.themes,
  };
}

/**
 * Ask the backend LLM ranker to choose the best existing quote ID.
 * Returns null on any failure so callers can use the local selector fallback.
 */
export async function selectQuoteWithAI(
  reflectionText: string,
  candidates: Quote[],
): Promise<string | null> {
  if (!reflectionText.trim() || candidates.length === 0) return null;

  try {
    const res = await fetch(`${getApiBaseUrl()}/quotes/select`, {
      method: 'POST',
      headers: mergeApiHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        reflection: reflectionText,
        candidates: candidates.map(toCandidatePayload),
      }),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as SelectQuoteResponse;
    const id = typeof data.quote_id === 'string' ? data.quote_id : null;
    return id && candidates.some((q) => q.id === id) ? id : null;
  } catch {
    return null;
  }
}
