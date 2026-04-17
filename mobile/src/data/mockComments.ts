/**
 * mockComments.ts — comments authored by real simulated users.
 */
import type { Comment, User } from '../types';
import { SIM_USERS_BY_ID } from './simulation/simulatedNetwork';

function user(id: string): User {
  const u = SIM_USERS_BY_ID[id];
  return u
    ? { id: u.id, username: u.username, clanId: u.clanId, rank: u.rank }
    : { id, username: '?', clanId: null, rank: 'aprendiz' };
}

const now = new Date().toISOString();

export const mockComments: Comment[] = [
  { id: 'co1', author: user('u1'), body: 'Exactamente lo que sentí al leer a Sartre por primera vez.', upCount: 3, createdAt: now },
  { id: 'co2', author: user('u4'), body: 'El libre albedrío como carga — tema inagotable.', upCount: 2, createdAt: now },
  { id: 'co3', author: user('u5'), body: 'Marco Aurelio siempre en el momento justo.', upCount: 5, createdAt: now },
  { id: 'co4', author: user('u1'), body: 'Nietzsche nunca decepciona.', upCount: 1, createdAt: now },
  { id: 'co5', author: user('u5'), body: 'El viaje interior es el único que vale la pena.', upCount: 4, createdAt: now },
  { id: 'co6', author: user('u3'), body: 'La base de todo pensamiento crítico moderno.', upCount: 2, createdAt: now },
];
