import type { CommunityPost, User } from '../types'

const authors: User[] = [
  { id: '1', username: '@DIEGOLLUBERES', clanId: 'nihilista', rank: 'maestro', followersCount: 1240, followingCount: 87 },
  { id: '2', username: '@ALEJANDROSERRANO', clanId: 'estoico', rank: 'filosofo', followersCount: 3580, followingCount: 214 },
  { id: '3', username: '@RODRIGOMARTINEZ', clanId: 'existencialista', rank: 'filosofo', followersCount: 8920, followingCount: 156 },
  { id: '4', username: '@HERNANCHACON', clanId: 'realista', rank: 'aprendiz', followersCount: 420, followingCount: 63 },
]

export const mockFeedPosts: CommunityPost[] = [
  {
    id: 'p1',
    type: 'reflection',
    author: authors[0],
    title: 'AHORRAR TIEMPO SUCKS',
    body: 'Intentamos ganar minutos, pero la vida no se acelera. ',
    voteStats: { up: 508, down: 347, save: 31 },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'p2',
    type: 'reflection',
    author: authors[1],
    title: 'EL EXITO ES UNA MIERDA',
    body: 'ehufhduo3qdjqsk1ehufhduo3qdjqsk1ehufhduo3qdjqsk1ehufhduo3qdjqsk1ehufhduo3qdjqsk1ehufhduo3qdjqsk1ehufhduo3qdjqsk1ehufhduo3qdjqsk1ehufhduo3qdjqsk1ehufhduo3qdjqsk1ehufhduo3qdjqsk1ehufhduo3qdjqsk1ehufhduo3qdjqsk1ehufhduo3qdjqsk1ehufhduo3qdjqsk1ehufhduo3qdjqsk1ehufhduo3qdjqsk1ehufhduo3qdjqsk1ehufhduo3qdjqsk1ehufhduo3qdjqsk1ehufhduo3qdjqsk1ehufhduo3qdjqsk1ehufhduo3qdjqsk1ehufhduo3qdjqsk1ehufhduo3qdjqsk1ehufhduo3qdjqsk1ehufhduo3qdjqsk1ehufhduo3qdjqsk1ehufhduo3qdjqsk1ehufhduo3qdjqsk1ehufhduo3qdjqsk1ehufhduo3qdjqsk1ehufhduo3qdjqsk1ehufhduo3qdjqsk1ehufhduo3qdjqsk1ehufhduo3qdjqsk1ehufhduo3qdjqsk1ehufhduo3qdjqsk1ehufhduo3qdjqsk1ehufhduo3qdjqsk1ehufhduo3qdjqsk1ehufhduo3qdjqsk1ehufhduo3qdjqsk1ehufhduo3qdjqsk1ehufhduo3qdiugkhoihlikyguigyyiughikughjhgyhjgyhujgyuhjgyhvfcdrtgdrtfgccdxrfdedrfddrfdxdrfgd', 
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
    body: 'njfwkf2wjnfkljnleqndanldkqdkmqkñdñqdlñamfwekenfewpdkqlñdmkqeenfdfdmekqfknmwmdñmdwññwwwkdmq',
    voteStats: { up: 420, down: 12, save: 88 },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'p5',
    type: 'phrase',
    author: authors[0],
    body: 'La duda es el principio de la sabiduría.',
    voteStats: { up: 2340, down: 45, save: 190 },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'p6',
    type: 'phrase',
    author: authors[1],
    body: 'No busques la felicidad fuera. Construye el camino desde dentro.',
    voteStats: { up: 1870, down: 22, save: 145 },
    createdAt: new Date().toISOString(),
  },
]

export function getPostById(id: string): CommunityPost | undefined {
  return mockFeedPosts.find((p) => p.id === id)
}
