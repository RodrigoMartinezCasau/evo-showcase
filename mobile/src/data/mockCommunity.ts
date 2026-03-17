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
    body: 'Nos pasamos la vida intentando ahorrar tiempo. Corremos, organizamos, optimizamos cada minuto... como si el tiempo fuera dinero. Pero hay algo extraño en todo esto. Porque cuando finalmente conseguimos tiempo... no sabemos qué hacer con él.',
    voteStats: { up: 508, down: 347, save: 31 },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'p2',
    type: 'reflection',
    author: authors[1],
    title: 'EL EXITO ES UNA MIERDA',
    body: 'La gente cree que el éxito es llegar más lejos que los demás. Pero el verdadero éxito es algo más silencioso. Es levantarte cada día y sentir que la vida que estás viviendo no pertenece a nadie más que a ti.',
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
    body: 'El miedo tiene una forma curiosa de mentirnos. Nos dice que no estamos preparados. Que no es el momento. Que podríamos fallar.',
    voteStats: { up: 420, down: 12, save: 88 },
    createdAt: new Date().toISOString(),
  },
]

export function getPostById(id: string): CommunityPost | undefined {
  return mockFeedPosts.find((p) => p.id === id)
}
