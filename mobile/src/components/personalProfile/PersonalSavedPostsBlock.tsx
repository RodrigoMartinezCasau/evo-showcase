import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  Image,
} from 'react-native';
import type { CommunityPost } from '@evoconn/types';
import {
  BOTTOM_BLOCK_SIZE,
  BOTTOM_BLOCK_BORDER_RADIUS,
  SAVED_BLOCK_OFFSET_X,
  SAVED_BLOCK_OFFSET_Y,
  SAVED_BLOCK_SCALE,
  SAVED_LABEL_OFFSET_X,
  SAVED_LABEL_OFFSET_Y,
  SAVED_ICON_OFFSET_X,
  SAVED_ICON_OFFSET_Y,
  SAVED_ICON_SCALE,
} from '@evoconn/constants/personalProfileLayout';

const saveIconYellow = require('../../assets/icons/smallStats/save_active.png');

const ICON_BASE = 28;

function savedIconSize(scale: number) {
  const s = ICON_BASE * scale;
  return { width: s, height: s };
}

type Props = {
  savedPosts: CommunityPost[];
  onPostPress?: (post: CommunityPost) => void;
};

export const PersonalSavedPostsBlock = React.memo(function PersonalSavedPostsBlock({
  savedPosts,
  onPostPress,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const { width: screenW } = useWindowDimensions();

  const handleOpen = useCallback(() => setExpanded(true), []);
  const handleClose = useCallback(() => setExpanded(false), []);

  const cardW = Math.max(200, screenW * 0.72);
  const iconDims = savedIconSize(SAVED_ICON_SCALE);

  const renderItem = useCallback(
    ({ item }: { item: CommunityPost }) => {
      const isPhrase = item.type === 'phrase';
      return (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => onPostPress?.(item)}
          style={[modalStyles.card, { width: cardW }]}
        >
          {isPhrase ? (
            <View style={modalStyles.phraseWrap}>
              <Text style={modalStyles.quoteMarks}>"</Text>
              <Text style={modalStyles.phraseBody} numberOfLines={5}>
                {item.body}
              </Text>
              {item.quoteAuthor ? (
                <Text style={modalStyles.quoteAuthor}>— {item.quoteAuthor}</Text>
              ) : null}
            </View>
          ) : (
            <View style={modalStyles.reflectionWrap}>
              {item.title ? (
                <Text style={modalStyles.reflectionTitle} numberOfLines={2}>
                  {item.title}
                </Text>
              ) : null}
              <Text style={modalStyles.reflectionBody} numberOfLines={4}>
                {item.body}
              </Text>
            </View>
          )}
          <View style={modalStyles.footer}>
            <Text style={modalStyles.footerStat}>▲ {item.voteStats.up}</Text>
            <Text style={modalStyles.footerType}>{isPhrase ? 'Frase' : 'Reflexión'}</Text>
          </View>
        </TouchableOpacity>
      );
    },
    [cardW, onPostPress],
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
              { translateX: SAVED_BLOCK_OFFSET_X },
              { translateY: SAVED_BLOCK_OFFSET_Y },
              { scale: SAVED_BLOCK_SCALE },
            ],
          },
        ]}
      >
        {/* 1. Label at top */}
        <Text
          style={[
            styles.label,
            {
              transform: [
                { translateX: SAVED_LABEL_OFFSET_X },
                { translateY: SAVED_LABEL_OFFSET_Y },
              ],
            },
          ]}
        >
          Guardados
        </Text>

        {/* 2. Yellow saved icon — independently positioned */}
        <Image
          source={saveIconYellow}
          resizeMode="contain"
          style={[
            styles.icon,
            {
              width: iconDims.width,
              height: iconDims.height,
              transform: [{ translateX: SAVED_ICON_OFFSET_X }, { translateY: SAVED_ICON_OFFSET_Y }],
            },
          ]}
        />
      </TouchableOpacity>

      <Modal visible={expanded} transparent animationType="fade" onRequestClose={handleClose}>
        <Pressable style={modalStyles.backdrop} onPress={handleClose}>
          <View style={modalStyles.sheet}>
            <Text style={modalStyles.title}>Guardados ({savedPosts.length})</Text>
            <FlatList
              data={savedPosts}
              keyExtractor={(p) => p.id}
              renderItem={renderItem}
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
    overflow: 'hidden',
    paddingVertical: 8,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    opacity: 0.65,
  },
  icon: {
    marginVertical: 4,
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
    width: '90%',
    maxHeight: '70%',
    backgroundColor: '#111111',
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 16,
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
    gap: 12,
    alignItems: 'center',
    paddingBottom: 8,
  },
  card: {
    backgroundColor: '#000000',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 14,
    justifyContent: 'space-between',
    minHeight: 150,
  },
  phraseWrap: { flex: 1, justifyContent: 'center' },
  quoteMarks: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 32,
    marginBottom: 2,
  },
  phraseBody: { color: '#FFFFFF', fontSize: 13, fontStyle: 'italic', lineHeight: 19 },
  quoteAuthor: { color: '#FFFFFF', fontSize: 11, marginTop: 6, opacity: 0.7 },
  reflectionWrap: { flex: 1 },
  reflectionTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  reflectionBody: { color: '#FFFFFF', fontSize: 12, lineHeight: 18, opacity: 0.85 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  footerStat: { color: '#FFFFFF', fontSize: 11, fontWeight: '600', opacity: 0.7 },
  footerType: {
    color: '#FFFFFF',
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    opacity: 0.5,
  },
  closeBtn: {
    marginTop: 16,
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 32,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
  },
  closeTxt: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});
