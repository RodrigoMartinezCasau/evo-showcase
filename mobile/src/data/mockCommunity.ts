import type { CommunityPost, User } from '../types'

const authors: User[] = [
  { id: '1', username: 'DIEGOLLUBERES', clanId: 'racionalista', rank: 'maestro' },
  { id: '2', username: 'ALEJANDROSERRANO', clanId: 'humanista', rank: 'filosofo' },
  { id: '3', username: 'RODRIGOMARTINEZ', clanId: 'estoico', rank: 'filosofo' },
  { id: '4', username: 'HERNANCHACON', clanId: 'cientista', rank: 'aprendiz' },
]

export const mockFeedPosts: CommunityPost[] = [
  {
    id: 'p1',
    type: 'reflection',
    author: authors[0],
    title: 'AHORRAR TIEMPO SUCKS',
    body: 'Intentamos ganar minutos, pero la vida no se acelera. Cuando al fin llega el tiempo, aparece otra pregunta: ¿qué hacemos con él?',
    voteStats: { up: 508, down: 347, save: 31 },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'p2',
    type: 'reflection',
    author: authors[1],
    title: 'EL EXITO ES UNA MIERDA',
    body: 'Creen que el éxito es ir más lejos que los demás. Pero el verdadero éxito es silencioso: despertar, sentir que tu vida pertenece a ti, y elegir con calma cada paso. A veces duele admitirlo, pero libera. Cuando entiendes eso, el ruido deja de mandar.',
    voteStats: { up: 867, down: 12, save: 23 },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'p3',
    type: 'phrase',
    author: authors[2],
    body: 'Hay personas que llegan a tu vida para quedarse. Y otras que llegan para enseñarte algo.',
    voteStats: { up: 127000, down: 987, save: 300 },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'p4',
    type: 'reflection',
    author: authors[3],
    title: 'NO TENGAS MIEDO PRECIOSA',
    body: 'El miedo tiene una forma curiosa de mentirnos. Nos dice que no estamos preparados, que no es el momento, que todo saldrá mal. Pero mira alrededor: cada paso que das con miedo es un entrenamiento. Respira, insiste, y deja que la duda se vuelva camino. No necesitas certeza, necesitas movimiento. Cuando falles, no significa que estás roto. Significa que estás aprendiendo. Las veces que te caes te enseñan a sostenerte. Practica, observa y vuelve a intentarlo hasta que el miedo pierda su voz y te deje actuar.',
    voteStats: { up: 420, down: 12, save: 88 },
    createdAt: new Date().toISOString(),
  },
]

export function getPostById(id: string): CommunityPost | undefined {
  return mockFeedPosts.find((p) => p.id === id)
}
