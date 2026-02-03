// Types matching backend; shared across debate components

/** App mode: determines route, center view, input placeholder, and conversation filter. */
export type AppMode = 'debate' | 'students' | 'scripts'
// export type AppMode = 'debate' | 'students' | 'scripts' | 'copilot'  // future

export type Claim = {
  text: string
  certainty: string
  source_ids: string[]
  short_explanation: string
}

/** One fact from Science KB (lazy-loaded, cached per message). */
export type ScienceFactItem = {
  id: string
  claim: string
  value?: string | null
  units?: string | null
  formula?: string | null
  certainty: string
  source_name: string
  source_note?: string | null
}

export type FactsLayer = {
  summary?: string
  claims?: Claim[]
  what_we_dont_know?: string[]
  common_misconceptions?: string[]
  /** Science KB facts (from POST /messages/{id}/facts). */
  facts?: ScienceFactItem[]
}

export type Quote = {
  quote_id: string
  author: string
  work: string
  quote: string
  interpretation: string
  relevance: string
}

export type AuthorLayer = {
  quotes: Quote[]
  quote_policy_note: string
}

export type DebateLayer = {
  steelman_of_user: string
  contrarian_position: string
  counterarguments: string[]
  socratic_questions: string[]
  where_contrarian_might_fail: string[]
}

export type Closing = {
  open_ended_takeaways: string[]
  next_questions_for_user: string[]
}

export type DebateResponse = {
  facts_layer: FactsLayer
  author_layer: AuthorLayer
  debate_layer: DebateLayer
  closing: Closing
}

export type CreatorResponse = {
  title_options: string[]
  hook: string
  outline: string[]
  script: string
  audience_questions: string[]
  disclaimer: string
  sources_used: { science_ids: string[]; quote_ids: string[] }
}

export type Message =
  | { role: 'user'; content: string; id?: string }
  | {
      role: 'assistant'
      content: string
      id?: string
      /** True while response is being streamed or typewriter-revealed. No "Thinking…" placeholder. */
      streaming?: boolean
      debateResponse?: DebateResponse
      nextQuestion?: string
      topic?: string
      lang?: string
      creatorResponse?: CreatorResponse
      factsCache?: FactsLayer
      quotesCache?: AuthorLayer
    }

export type Thread = {
  id: string
  title: string
  messages: Message[]
  createdAt: number
}

/** Short thread title for display (client-side fallback). Backend generates via short_title.py. */
export function getShortTitle(firstUserMessage: string): string {
  const raw = (firstUserMessage || '').trim()
  if (!raw) return 'Nuevo debate'

  const stopwords = new Set([
    'de', 'la', 'el', 'en', 'un', 'una', 'y', 'que', 'es', 'por', 'para', 'con', 'no', 'los', 'las', 'del', 'al', 'lo',
    'como', 'más', 'pero', 'sus', 'le', 'ya', 'o', 'fue', 'este', 'ha', 'si', 'sí', 'porque', 'esta', 'entre', 'cuando',
    'muy', 'sin', 'sobre', 'ser', 'tiene', 'me', 'hasta', 'hay', 'donde', 'han', 'quien', 'desde', 'todo', 'nos', 'durante',
    'qué', 'cómo', 'cuál', 'cuáles', 'cuánto', 'cuánta', 'por qué', 'a', 'se', 'su', 'te', 'mi', 'tu', 'qué argumentos',
    'hay', 'favor', 'contra', 'sobre', 'existencia', 'creo', 'pienso', 'opino', 'me', 'parece', 'pregunta', 'preguntas',
  ])
  const words = raw
    .replace(/[¿?!.,;:()"—]/g, ' ')
    .split(/\s+/)
    .map((w) => w.toLowerCase().trim())
    .filter((w) => w.length > 1 && !stopwords.has(w))

  const take = words.slice(0, 3)
  if (take.length > 0) {
    const title = take.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    return title.length > 25 ? take.slice(0, 2).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') + '…' : title
  }

  const fallback = raw.slice(0, 20).trim()
  return (fallback.length < raw.length ? fallback + '…' : fallback) || 'Nuevo debate'
}
