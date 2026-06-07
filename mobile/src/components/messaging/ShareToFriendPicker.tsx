import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSimulation } from '@evoconn/hooks/SimulationContext';
import { useMessages } from '@evoconn/hooks/MessagesContext';
import { UserAvatarFrame } from '@evoconn/components/shared/UserAvatarFrame';
import type { SharedItemKind } from '@evoconn/types/messaging';
import { evoconnColors } from '@evoconn/theme/colors';
import { getClanColor } from '@evoconn/constants/clanColors';
import { useAuth } from '../../../mobile/lib/AuthContext';
import { fetchMutualFriends, type MutualFriendEntry } from '@evoconn/services/supabaseMessaging';
import { isRealUserId } from '@evoconn/services/supabaseSocial';
import { formatProfileUsername } from '@evoconn/state/otherProfileCache';

type Props = {
  visible: boolean;
  onClose: () => void;
  kind: SharedItemKind;
  postId?: string;
  profileUserId?: string;
  title?: string;
  onSent?: (recipientId: string) => void;
};

export function ShareToFriendPicker({
  visible,
  onClose,
  kind,
  postId,
  profileUserId,
  title,
  onSent,
}: Props) {
  const insets = useSafeAreaInsets();
  const { activeUserId } = useSimulation();
  const { sendSharedItem } = useMessages();
  const { profile: authProfile } = useAuth();
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [friends, setFriends] = useState<MutualFriendEntry[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const clanAccent = getClanColor(authProfile?.clan_id ?? null);

  const headerTitle = title ?? (kind === 'post' ? 'Enviar publicación' : 'Enviar perfil');

  useEffect(() => {
    if (!visible) return;
    if (!isRealUserId(activeUserId)) {
      setFriends([]);
      return;
    }
    let cancelled = false;
    setLoadingFriends(true);
    void fetchMutualFriends(activeUserId)
      .then((rows) => {
        if (!cancelled) setFriends(rows);
      })
      .finally(() => {
        if (!cancelled) setLoadingFriends(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, activeUserId]);

  const handleSelect = useCallback(
    async (friend: MutualFriendEntry) => {
      if (sendingTo) return;
      setSendingTo(friend.id);
      const result = await sendSharedItem({
        recipientId: friend.id,
        kind,
        postId: kind === 'post' ? postId : undefined,
        profileUserId: kind === 'profile' ? profileUserId : undefined,
      });
      setSendingTo(null);
      if (!result.ok) {
        Alert.alert('No se pudo enviar', result.error ?? 'Inténtalo de nuevo.');
        return;
      }
      onSent?.(friend.id);
      onClose();
    },
    [sendingTo, sendSharedItem, kind, postId, profileUserId, onSent, onClose],
  );

  const emptyMessage = useMemo(() => {
    if (!isRealUserId(activeUserId)) {
      return 'Inicia sesión con una cuenta real para enviar mensajes.';
    }
    if (loadingFriends) return null;
    if (friends.length === 0) {
      return 'No tienes amigos mutuos en el servidor. Solo puedes enviar a personas con las que os seguís los dos.';
    }
    return null;
  }, [activeUserId, loadingFriends, friends.length]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.headerBtn}>
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{headerTitle}</Text>
          <View style={styles.headerBtn} />
        </View>

        {loadingFriends ? (
          <View style={styles.emptyWrap}>
            <ActivityIndicator size="large" color={clanAccent} />
          </View>
        ) : emptyMessage ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="people-outline" size={40} color="rgba(255,255,255,0.25)" />
            <Text style={styles.emptyText}>{emptyMessage}</Text>
          </View>
        ) : (
          <FlatList
            data={friends}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const busy = sendingTo === item.id;
              return (
                <TouchableOpacity
                  style={styles.row}
                  activeOpacity={0.7}
                  disabled={!!sendingTo}
                  onPress={() => void handleSelect(item)}
                >
                  <UserAvatarFrame
                    clanId={item.clanId}
                    avatarUri={item.avatarUri}
                    size={44}
                    iconScale={1.05}
                    deferRender
                  />
                  <View style={styles.rowText}>
                    <Text style={styles.username} numberOfLines={1}>
                      {formatProfileUsername(item.username)}
                    </Text>
                  </View>
                  {busy ? (
                    <ActivityIndicator size="small" color={clanAccent} />
                  ) : (
                    <Ionicons name="send" size={20} color={clanAccent} />
                  )}
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: evoconnColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    height: 52,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  rowText: {
    flex: 1,
  },
  username: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
