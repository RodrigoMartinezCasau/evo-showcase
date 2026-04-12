import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  Pressable,
} from 'react-native';
import { getClanColor } from '@evoconn/constants/clanColors';
import type { FriendEntry } from '@evoconn/data/mockPersonalProfile';
import {
  BOTTOM_BLOCK_SIZE,
  BOTTOM_BLOCK_BORDER_RADIUS,
  FRIENDS_BLOCK_OFFSET_X,
  FRIENDS_BLOCK_OFFSET_Y,
  FRIENDS_BLOCK_SCALE,
} from '@evoconn/constants/personalProfileLayout';

const PREVIEW_COUNT = 4;

type Props = {
  friends: FriendEntry[];
};

export const PersonalFriendsBlock = React.memo(function PersonalFriendsBlock({ friends }: Props) {
  const [expanded, setExpanded] = useState(false);

  const preview = friends.slice(0, PREVIEW_COUNT);

  const handleOpen = useCallback(() => setExpanded(true), []);
  const handleClose = useCallback(() => setExpanded(false), []);

  const renderFriend = useCallback(
    ({ item }: { item: FriendEntry }) => (
      <View style={modalStyles.row}>
        <Text style={[modalStyles.username, { color: getClanColor(item.clanId) }]}>
          {item.username}
        </Text>
      </View>
    ),
    [],
  );

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={handleOpen}
        style={[
          styles.block,
          {
            width: BOTTOM_BLOCK_SIZE,
            height: BOTTOM_BLOCK_SIZE,
            borderRadius: BOTTOM_BLOCK_BORDER_RADIUS,
            transform: [
              { translateX: FRIENDS_BLOCK_OFFSET_X },
              { translateY: FRIENDS_BLOCK_OFFSET_Y },
              { scale: FRIENDS_BLOCK_SCALE },
            ],
          },
        ]}
      >
        <Text style={styles.title}>Amigos</Text>
        <View style={styles.previewList}>
          {preview.map((f) => (
            <Text
              key={f.id}
              style={[styles.previewName, { color: getClanColor(f.clanId) }]}
              numberOfLines={1}
            >
              {f.username}
            </Text>
          ))}
          {friends.length > PREVIEW_COUNT && (
            <Text style={styles.more}>+{friends.length - PREVIEW_COUNT} más</Text>
          )}
        </View>
      </TouchableOpacity>

      <Modal visible={expanded} transparent animationType="fade" onRequestClose={handleClose}>
        <Pressable style={modalStyles.backdrop} onPress={handleClose}>
          <View style={modalStyles.sheet}>
            <Text style={modalStyles.title}>Amigos ({friends.length})</Text>
            <FlatList
              data={friends}
              keyExtractor={(f) => f.id}
              renderItem={renderFriend}
              contentContainerStyle={modalStyles.list}
              showsVerticalScrollIndicator={false}
            />
            <TouchableOpacity style={modalStyles.closeBtn} onPress={handleClose}>
              <Text style={modalStyles.closeTxt}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  );
});

const styles = StyleSheet.create({
  block: {
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
    opacity: 0.65,
  },
  previewList: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  previewName: {
    fontSize: 10,
    fontWeight: '600',
  },
  more: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 2,
  },
});

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheet: {
    width: '82%',
    maxHeight: '65%',
    backgroundColor: '#111111',
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
    textAlign: 'center',
  },
  list: {
    gap: 10,
    paddingBottom: 8,
  },
  row: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  closeBtn: {
    marginTop: 16,
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 32,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
  },
  closeTxt: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
