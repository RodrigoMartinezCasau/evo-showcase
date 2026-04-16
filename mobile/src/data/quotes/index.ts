import type { Quote } from '@evoconn/types/quotes';

import { filosofiaQuotes }  from './domains/filosofia';
import { existenciaQuotes } from './domains/existencia';
import { libertadQuotes }   from './domains/libertad';
import { sabiduriiaQuotes } from './domains/sabiduria';
import { amorQuotes }       from './domains/amor';
import { poderQuotes }      from './domains/poder';
import { politicaQuotes }   from './domains/politica';
import { disciplinaQuotes } from './domains/disciplina';
import { muerteQuotes }     from './domains/muerte';
import { dolorQuotes }      from './domains/dolor';
import { ambicionQuotes }   from './domains/ambicion';
import { identidadQuotes }  from './domains/identidad';
import { sociedadQuotes }   from './domains/sociedad';
import { exitoQuotes }      from './domains/exito';
import { fracasoQuotes }    from './domains/fracaso';

/** The complete phrase database. All phrases in the app come from this source. */
export const ALL_QUOTES: Quote[] = [
  ...filosofiaQuotes,
  ...existenciaQuotes,
  ...libertadQuotes,
  ...sabiduriiaQuotes,
  ...amorQuotes,
  ...poderQuotes,
  ...politicaQuotes,
  ...disciplinaQuotes,
  ...muerteQuotes,
  ...dolorQuotes,
  ...ambicionQuotes,
  ...identidadQuotes,
  ...sociedadQuotes,
  ...exitoQuotes,
  ...fracasoQuotes,
];

/** Quick lookup by id. */
export const QUOTES_BY_ID: Record<string, Quote> = Object.fromEntries(
  ALL_QUOTES.map(q => [q.id, q]),
);

/** Get all quotes for a specific domain. */
export function getQuotesByDomain(domainId: string): Quote[] {
  return ALL_QUOTES.filter(q => q.domain === domainId);
}
