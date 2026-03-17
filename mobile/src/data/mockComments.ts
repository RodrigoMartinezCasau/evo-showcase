import type { Comment, User } from '../types'

const users: User[] = [
  { id: 'u1', username: 'FILOSOFO1', clanId: 'humanista', rank: 'filosofo' },
  { id: 'u2', username: 'APRENDIZ2', clanId: 'nihilista', rank: 'aprendiz' },
  { id: 'u3', username: 'MAESTRO3', clanId: 'cientista', rank: 'maestro' },
]

export const mockComments: Comment[] = [
  { id: 'co1', author: users[0], body: 'Comentario sobre la reflexión.', upCount: 12, createdAt: new Date().toISOString() },
  { id: 'co2', author: users[1], body: 'Muy de acuerdo con la frase.', upCount: 5, createdAt: new Date().toISOString() },
  { id: 'co3', author: users[2], body: 'Interesante perspectiva.', upCount: 8, createdAt: new Date().toISOString() },
]
