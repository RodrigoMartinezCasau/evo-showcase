import type { ConversationItem } from '../types'

export const mockConversations: ConversationItem[] = [
  { id: 'c1', type: 'reflection', title: 'Dios', updatedAt: new Date().toISOString(), isFavorite: true, folderId: 'f1' },
  { id: 'c2', type: 'phrase', title: 'Holaaa', updatedAt: new Date().toISOString(), isFavorite: true },
  { id: 'c3', type: 'reflection', title: 'Inevitablement', updatedAt: new Date().toISOString(), folderId: 'f1' },
  { id: 'c4', type: 'reflection', title: 'Amor', updatedAt: new Date().toISOString() },
  { id: 'c5', type: 'phrase', title: 'Perfectamente', updatedAt: new Date().toISOString(), isFavorite: false },
  { id: 'c6', type: 'reflection', title: 'Comunismo', updatedAt: new Date().toISOString(), folderId: 'f2' },
  { id: 'c7', type: 'reflection', title: 'Existencia', updatedAt: new Date().toISOString() },
]
