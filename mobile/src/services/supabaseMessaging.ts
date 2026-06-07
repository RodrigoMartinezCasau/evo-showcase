import { supabase } from '../../mobile/lib/supabase';
import {
  fetchFollowing,
  fetchFollowers,
  fetchProfilesBatch,
  isRealUserId,
  type BasicProfile,
} from '@evoconn/services/supabaseSocial';
import type {
  SendSharedItemArgs,
  SharedConversation,
  SharedInboxRow,
  SharedItem,
  SharedItemKind,
} from '@evoconn/types/messaging';

type DbConversation = {
  id: string;
  user_low_id: string;
  user_high_id: string;
  created_at: string;
  updated_at: string;
};

type DbSharedItem = {
  id: string;
  conversation_id: string;
  sender_id: string;
  kind: SharedItemKind;
  post_id: string | null;
  profile_user_id: string | null;
  created_at: string;
  read_at: string | null;
};

function mapConversation(row: DbConversation): SharedConversation {
  return {
    id: row.id,
    userLowId: row.user_low_id,
    userHighId: row.user_high_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSharedItem(row: DbSharedItem): SharedItem {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    kind: row.kind,
    postId: row.post_id,
    profileUserId: row.profile_user_id,
    createdAt: row.created_at,
    readAt: row.read_at,
  };
}

export function otherParticipantId(
  conversation: SharedConversation,
  myUserId: string,
): string {
  return conversation.userLowId === myUserId
    ? conversation.userHighId
    : conversation.userLowId;
}

export type SendSharedItemResult =
  | { ok: true; itemId: string }
  | { ok: false; error: string };

function mapSendSharedItemError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('not mutual friends')) {
    return 'En el servidor no aparecéis como amigos mutuos. Comprobad que os seguís los dos en la app real.';
  }
  if (m.includes('post not found')) {
    return 'Esta publicación no está guardada en el servidor y no se puede compartir.';
  }
  if (m.includes('profile not found')) {
    return 'No se encontró el perfil a compartir.';
  }
  if (m.includes('not authenticated')) {
    return 'Tu sesión ha caducado. Vuelve a iniciar sesión.';
  }
  if (m.includes('invalid recipient')) {
    return 'No puedes enviarte contenido a ti mismo.';
  }
  return 'No se pudo enviar. Inténtalo de nuevo en unos segundos.';
}

/** IDs de amigos mutuos (misma regla que el RPC send_shared_item). */
export async function fetchMutualFriendIds(userId: string): Promise<string[]> {
  if (!isRealUserId(userId)) return [];
  const [following, followers] = await Promise.all([
    fetchFollowing(userId),
    fetchFollowers(userId),
  ]);
  const followerSet = new Set(followers);
  return following.filter((id) => followerSet.has(id));
}

export type MutualFriendEntry = BasicProfile;

/** Amigos mutuos con perfil básico (fuente: Supabase, no cache local). */
export async function fetchMutualFriends(userId: string): Promise<MutualFriendEntry[]> {
  const ids = await fetchMutualFriendIds(userId);
  if (ids.length === 0) return [];
  const profiles = await fetchProfilesBatch(ids);
  const byId = new Map(profiles.map((p) => [p.id, p]));
  return ids
    .map((id) => byId.get(id))
    .filter((p): p is BasicProfile => !!p);
}

/** Envía un post o perfil a un amigo mutuo (RPC con validación en servidor). */
export async function sendSharedItem(args: SendSharedItemArgs): Promise<SendSharedItemResult> {
  const { data, error } = await supabase.rpc('send_shared_item', {
    p_recipient_id: args.recipientId,
    p_kind: args.kind,
    p_post_id: args.postId ?? null,
    p_profile_user_id: args.profileUserId ?? null,
  });
  if (error) {
    console.error('[Messaging] sendSharedItem:', error.message);
    return { ok: false, error: mapSendSharedItemError(error.message) };
  }
  if (typeof data !== 'string' || !data) {
    return { ok: false, error: mapSendSharedItemError('unknown') };
  }
  return { ok: true, itemId: data };
}

export async function fetchMyConversations(userId: string): Promise<SharedConversation[]> {
  const { data, error } = await supabase
    .from('shared_conversations')
    .select('*')
    .or(`user_low_id.eq.${userId},user_high_id.eq.${userId}`)
    .order('updated_at', { ascending: false });
  if (error) {
    console.error('[Messaging] fetchMyConversations:', error.message);
    return [];
  }
  return (data ?? []).map((row) => mapConversation(row as DbConversation));
}

export async function fetchSharedItemsForConversation(
  conversationId: string,
): Promise<SharedItem[]> {
  const { data, error } = await supabase
    .from('shared_items')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) {
    console.error('[Messaging] fetchSharedItemsForConversation:', error.message);
    return [];
  }
  return (data ?? []).map((row) => mapSharedItem(row as DbSharedItem));
}

async function fetchLatestItemsByConversationIds(
  conversationIds: string[],
): Promise<Map<string, SharedItem>> {
  const out = new Map<string, SharedItem>();
  if (conversationIds.length === 0) return out;

  const CHUNK = 40;
  for (let i = 0; i < conversationIds.length; i += CHUNK) {
    const chunk = conversationIds.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from('shared_items')
      .select('*')
      .in('conversation_id', chunk)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[Messaging] fetchLatestItemsByConversationIds:', error.message);
      continue;
    }
    for (const row of data ?? []) {
      const item = mapSharedItem(row as DbSharedItem);
      if (!out.has(item.conversationId)) {
        out.set(item.conversationId, item);
      }
    }
  }
  return out;
}

export async function fetchUnreadSharedCount(userId: string): Promise<number> {
  const conversations = await fetchMyConversations(userId);
  if (conversations.length === 0) return 0;

  const ids = conversations.map((c) => c.id);
  const { count, error } = await supabase
    .from('shared_items')
    .select('id', { count: 'exact', head: true })
    .in('conversation_id', ids)
    .neq('sender_id', userId)
    .is('read_at', null);
  if (error) {
    console.error('[Messaging] fetchUnreadSharedCount:', error.message);
    return 0;
  }
  return count ?? 0;
}

export async function fetchSharedInbox(userId: string): Promise<SharedInboxRow[]> {
  const conversations = await fetchMyConversations(userId);
  if (conversations.length === 0) return [];

  const ids = conversations.map((c) => c.id);
  const [latestByConv, unreadRes] = await Promise.all([
    fetchLatestItemsByConversationIds(ids),
    supabase
      .from('shared_items')
      .select('conversation_id')
      .in('conversation_id', ids)
      .neq('sender_id', userId)
      .is('read_at', null),
  ]);

  const unreadByConv = new Map<string, number>();
  if (!unreadRes.error) {
    for (const row of unreadRes.data ?? []) {
      const cid = (row as { conversation_id: string }).conversation_id;
      unreadByConv.set(cid, (unreadByConv.get(cid) ?? 0) + 1);
    }
  }

  return conversations.map((conversation) => ({
    conversation,
    otherUserId: otherParticipantId(conversation, userId),
    lastItem: latestByConv.get(conversation.id) ?? null,
    unreadCount: unreadByConv.get(conversation.id) ?? 0,
  }));
}

export async function markSharedConversationRead(conversationId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_shared_conversation_read', {
    p_conversation_id: conversationId,
  });
  if (error) console.error('[Messaging] markSharedConversationRead:', error.message);
}

export async function findConversationWithUser(
  myUserId: string,
  otherUserId: string,
): Promise<SharedConversation | null> {
  const low = myUserId < otherUserId ? myUserId : otherUserId;
  const high = myUserId < otherUserId ? otherUserId : myUserId;
  const { data, error } = await supabase
    .from('shared_conversations')
    .select('*')
    .eq('user_low_id', low)
    .eq('user_high_id', high)
    .maybeSingle();
  if (error || !data) return null;
  return mapConversation(data as DbConversation);
}
