export type SharedItemKind = 'post' | 'profile';

export type SharedItem = {
  id: string;
  conversationId: string;
  senderId: string;
  kind: SharedItemKind;
  postId: string | null;
  profileUserId: string | null;
  createdAt: string;
  readAt: string | null;
};

export type SharedConversation = {
  id: string;
  userLowId: string;
  userHighId: string;
  createdAt: string;
  updatedAt: string;
};

export type SharedInboxRow = {
  conversation: SharedConversation;
  otherUserId: string;
  lastItem: SharedItem | null;
  unreadCount: number;
};

export type SendSharedItemArgs = {
  recipientId: string;
  kind: SharedItemKind;
  postId?: string;
  profileUserId?: string;
};
