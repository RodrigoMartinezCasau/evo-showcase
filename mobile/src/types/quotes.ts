/** A stored phrase from the phrase database. */
export interface Quote {
  /** Unique identifier — used to track unlocked/locked state. */
  id: string;
  /** The phrase text. */
  text: string;
  /** Attributed author. */
  author: string;
  /** Optional source book or work. */
  sourceBook?: string;
  /** Short keyword tags used for retrieval matching. */
  tags: string[];
  /** Broader conceptual areas for thematic matching. */
  themes: string[];
  /** Domain key (matches a domain file, e.g. "filosofia"). */
  domain: string;
  /** Approximate difficulty / abstraction level. */
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

// ─── Domain metadata ──────────────────────────────────────────────────────────

export interface DomainMeta {
  id:    string;
  label: string;
  color: string;
}

export const DOMAINS: DomainMeta[] = [
  { id: 'filosofia',  label: 'Filosofía',   color: '#7C3AED' },
  { id: 'existencia', label: 'Existencia',  color: '#10B981' },
  { id: 'libertad',   label: 'Libertad',    color: '#0891B2' },
  { id: 'sabiduria',  label: 'Sabiduría',   color: '#C2A23E' },
  { id: 'amor',       label: 'Amor',        color: '#DB2777' },
  { id: 'poder',      label: 'Poder',       color: '#DC2626' },
  { id: 'politica',   label: 'Política',    color: '#3B82F6' },
  { id: 'disciplina', label: 'Disciplina',  color: '#0D9488' },
  { id: 'muerte',     label: 'Muerte',      color: '#64748B' },
  { id: 'dolor',      label: 'Dolor',       color: '#6366F1' },
  { id: 'ambicion',   label: 'Ambición',    color: '#D97706' },
  { id: 'identidad',  label: 'Identidad',   color: '#8B5CF6' },
  { id: 'sociedad',   label: 'Sociedad',    color: '#059669' },
  { id: 'exito',      label: 'Éxito',       color: '#F59E0B' },
  { id: 'fracaso',    label: 'Fracaso',     color: '#78716C' },
];

export const DOMAIN_MAP: Record<string, DomainMeta> = Object.fromEntries(
  DOMAINS.map(d => [d.id, d]),
);
