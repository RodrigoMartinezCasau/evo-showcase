import React, { useCallback, useMemo, useState } from 'react';
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
import { usePersonalProfile } from '@evoconn/hooks/PersonalProfileContext';
import { useMessages } from '@evoconn/hooks/MessagesContext';
import { UserAvatarFrame } from '@evoconn/components/shared/UserAvatarFrame';
import type { FollowingEntry } from '@evoconn/data/mockPersonalProfile';
import type { SharedItemKind } from '@evoconn/types/messaging';
import { evoconnColors } from '@evoconn/theme/colors';
import { getClanColor } from '@evoconn/constants/clanColors';
import { useAuth } from '../../../mobile/lib/AuthContext';

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
  const { friends } = usePersonalProfile();
  const { sendSharedItem } = useMessages();
  const { profile: authProfile } = useAuth();
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const clanAccent = getClanColor(authProfile?.clan_id ?? null);

  const headerTitle = title ?? (kind === 'post' ? 'Enviar publicación' : 'Enviar perfil');

  const handleSelect = useCallback(
    async (friend: FollowingEntry) => {
      if (sendingTo) return;
      setSendingTo(friend.id);
      const ok = await sendSharedItem({
        recipientId: friend.id,
        kind,
        postId: kind === 'post' ? postId : undefined,
        profileUserId: kind === 'profile' ? profileUserId : undefined,
      });
      setSendingTo(null);
      if (!ok) {
        Alert.alert(
          'No se pudo enviar',
          'Solo puedes compartir con amigos (seguimiento mutuo).',
        );
        return;
      }
      onSent?.(friend.id);
      onClose();
    },
    [sendingTo, sendSharedItem, kind, postId, profileUserId, onSent, onClose],
  );

  const emptyMessage = useMemo(
    () =>
      friends.length === 0
        ? 'Aún no tienes amigos. Los amigos son personas con las que os seguís mutuamente.'
        : null,
    [friends.length],
  );

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

        {emptyMessage ? (
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
                      {item.username}
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
