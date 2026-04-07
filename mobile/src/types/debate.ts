/**
 * Debate/reflection types — mirrors backend Pydantic models.
 * Ported from frontend/app/debate/types.ts for mobile use.
 */

export type Claim = {
  text: string;
  certainty: string;
  source_ids: string[];
  short_explanation: string;
};

export type ScienceFactItem = {
  id: string;
  claim: string;
  value?: string | null;
  units?: string | null;
  formula?: string | null;
  certainty: string;
  source_name: string;
  source_note?: string | null;
  score?: number | null;
  score_pct?: number | null;
};

export type FactsLayer = {
  summary?: string;
  claims?: Claim[];
  what_we_dont_know?: string[];
  common_misconceptions?: string[];
  facts?: ScienceFactItem[];
  facts_domain?: 'science' | 'other';
  verification_points?: string[];
};

export type Quote = {
  quote_id: string;
  author: string;
  work: string;
  quote: string;
  interpretation: string;
  relevance: string;
};

export type AuthorLayer = {
  quotes: Quote[];
  quote_policy_note: string;
};

export type BulletPoint = { text: string };

export type ArgumentPoint = {
  index: number;
  title: string;
  bullets: BulletPoint[];
};

export type StructuredSection = {
  section_title: string;
  points: ArgumentPoint[];
  quick_summary: string;
  /** Prose-format body (new format). When present, takes priority over points[]. */
  body?: string;
};

export type QuestionSection = {
  section_title: string;
  socratic_question: string;
};

export type DebateLayer = {
  steelman_of_user: string;
  contrarian_position: string;
  counterarguments: string[];
  socratic_questions: string[];
  where_contrarian_might_fail: string[];
  stance_section?: StructuredSection;
  counter_section?: StructuredSection;
  question_section?: QuestionSection;
};

export type Closing = {
  open_ended_takeaways: string[];
  next_questions_for_user: string[];
};

export type DebateResponse = {
  facts_layer: FactsLayer;
  author_layer: AuthorLayer;
  debate_layer: DebateLayer;
  closing: Closing;
};

export type SendMessageResponse = {
  assistant_text: string;
  debate_response: DebateResponse;
  next_question: string;
  thread_id: string;
  topic: string;
  message_id?: string;
  lang?: string;
};

export type DebateMessage =
  | { role: 'user'; content: string; id?: string }
  | {
      role: 'assistant';
      content: string;
      id?: string;
      streaming?: boolean;
      debateResponse?: DebateResponse;
      nextQuestion?: string;
      topic?: string;
      lang?: string;
    };

export type DebateThread = {
  id: string;
  title: string;
  messages: DebateMessage[];
  createdAt: number;
};

export type DebateListItem = {
  id: string;
  title: string;
  updated_at: string;
  is_favorite?: boolean;
  folder_id?: string | null;
};

export type FullDebate = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    created_at: string;
    meta?: {
      debate_response?: unknown;
      next_question?: string;
      topic?: string;
      steelman?: string;
      contrarian?: string;
      lang?: string;
    };
  }>;
};

/** Client-side short title fallback. Backend generates via short_title.py. */
export function getShortTitle(firstUserMessage: string): string {
  const raw = (firstUserMessage || '').trim();
  if (!raw) return 'Nuevo debate';

  const stopwords = new Set([
    'de', 'la', 'el', 'en', 'un', 'una', 'y', 'que', 'es', 'por', 'para',
    'con', 'no', 'los', 'las', 'del', 'al', 'lo', 'como', 'más', 'pero',
    'sus', 'le', 'ya', 'o', 'fue', 'este', 'ha', 'si', 'sí', 'porque',
    'esta', 'entre', 'cuando', 'muy', 'sin', 'sobre', 'ser', 'tiene', 'me',
    'hasta', 'hay', 'donde', 'han', 'quien', 'desde', 'todo', 'nos',
    'durante', 'qué', 'cómo', 'a', 'se', 'su', 'te', 'mi', 'tu',
    'creo', 'pienso', 'opino', 'parece',
  ]);
  const words = raw
    .replace(/[¿?!.,;:()"—]/g, ' ')
    .split(/\s+/)
    .map((w) => w.toLowerCase().trim())
    .filter((w) => w.length > 1 && !stopwords.has(w));

  const take = words.slice(0, 3);
  if (take.length > 0) {
    const title = take.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return title.length > 25
      ? take.slice(0, 2).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') + '…'
      : title;
  }

  const fallback = raw.slice(0, 20).trim();
  return (fallback.length < raw.length ? fallback + '…' : fallback) || 'Nuevo debate';
}
