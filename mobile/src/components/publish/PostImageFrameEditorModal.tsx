import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { CommunityPost } from '@evoconn/types';
import { evoconnColors } from '@evoconn/theme/colors';
import {
  clampPostImageFocusY,
  DEFAULT_POST_IMAGE_FOCUS_Y,
  type PostImageFocusY,
} from '@evoconn/utils/postImageCoverLayout';
import { postShowsImageInParaTi, postShowsImageInSiguiendo } from '@evoconn/utils/postImageDisplay';
import { ReflectionDetailItem } from '../ReflectionDetailItem';
import { CommunityPostCard } from '../CommunityPostCard';

type Props = {
  visible: boolean;
  post: CommunityPost;
  focusYParaTi: PostImageFocusY;
  focusYSiguiendo: PostImageFocusY;
  imageShowParaTi: boolean;
  imageShowSiguiendo: boolean;
  clanAccent?: string;
  onCancel: () => void;
  onConfirm: (
    paraTi: PostImageFocusY,
    siguiendo: PostImageFocusY,
    showParaTi: boolean,
    showSiguiendo: boolean,
  ) => void;
  /** Ambos displays sin foto: borrar adjunto por completo. */
  onPhotoFullyRemoved?: () => void;
};

const HEADER_HEIGHT = 52;
const DOT = 6;

/**
 * Encuadre sobre la misma previsualización que el modal de vista previa.
 * Sin scroll: solo flechas + puntos para cambiar de display; arrastre vertical en la foto.
 */
export function PostImageFrameEditorModal({
  visible,
  post,
  focusYParaTi: initialParaTi,
  focusYSiguiendo: initialSiguiendo,
  imageShowParaTi: initialShowParaTi,
  imageShowSiguiendo: initialShowSiguiendo,
  clanAccent = '#FFFFFF',
  onCancel,
  onConfirm,
  onPhotoFullyRemoved,
}: Props) {
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const [draftParaTi, setDraftParaTi] = useState(initialParaTi);
  const [draftSiguiendo, setDraftSiguiendo] = useState(initialSiguiendo);
  const [draftShowParaTi, setDraftShowParaTi] = useState(initialShowParaTi);
  const [draftShowSiguiendo, setDraftShowSiguiendo] = useState(initialShowSiguiendo);

  useEffect(() => {
    if (!visible) return;
    setPage(0);
    setDraftParaTi(clampPostImageFocusY(initialParaTi));
    setDraftSiguiendo(clampPostImageFocusY(initialSiguiendo));
    setDraftShowParaTi(initialShowParaTi);
    setDraftShowSiguiendo(initialShowSiguiendo);
  }, [
    visible,
    initialParaTi,
    initialSiguiendo,
    initialShowParaTi,
    initialShowSiguiendo,
  ]);

  const paraTiPost = useMemo(
    (): CommunityPost => ({
      ...post,
      imageCropFocusY: draftParaTi,
      imageShowParaTi: draftShowParaTi,
    }),
    [post, draftParaTi, draftShowParaTi],
  );

  const siguiendoPost = useMemo(
    (): CommunityPost => ({
      ...post,
      imageCropFocusY: draftParaTi,
      imageCropFocusYFollowing: draftSiguiendo,
      imageShowSiguiendo: draftShowSiguiendo,
    }),
    [post, draftParaTi, draftSiguiendo, draftShowSiguiendo],
  );

  const itemHeight = Math.max(
    320,
    screenH - insets.top - insets.bottom - HEADER_HEIGHT,
  );

  const goPrev = useCallback(() => setPage((p) => Math.max(0, p - 1)), []);
  const goNext = useCallback(() => setPage((p) => Math.min(1, p + 1)), []);

  const handleConfirm = useCallback(() => {
    if (!draftShowParaTi && !draftShowSiguiendo) {
      onPhotoFullyRemoved?.();
      return;
    }
    onConfirm(
      clampPostImageFocusY(draftParaTi),
      clampPostImageFocusY(draftSiguiendo),
      draftShowParaTi,
      draftShowSiguiendo,
    );
  }, [draftParaTi, draftSiguiendo, draftShowParaTi, draftShowSiguiendo, onConfirm, onPhotoFullyRemoved]);

  const removeFromCurrentDisplay = useCallback(() => {
    if (page === 0) setDraftShowParaTi(false);
    else setDraftShowSiguiendo(false);
  }, [page]);

  if (!post.imageUrl) return null;

  const paraTiCropActive = postShowsImageInParaTi(paraTiPost);
  const siguiendoCropActive = postShowsImageInSiguiendo(siguiendoPost);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel} statusBarTranslucent>
      <GestureHandlerRootView style={styles.flex1}>
        <View style={[styles.root, { paddingTop: insets.top }]}>
          <View style={[styles.header, { height: HEADER_HEIGHT }]}>
            <TouchableOpacity onPress={onCancel} hitSlop={12} style={styles.headerSide}>
              <Ionicons name="close" size={26} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.pageSwitcher}>
              <TouchableOpacity
                onPress={goPrev}
                disabled={page === 0}
                hitSlop={10}
                style={styles.arrowBtn}
                accessibilityLabel="Display anterior"
              >
                <Ionicons
                  name="chevron-back"
                  size={18}
                  color={page === 0 ? 'rgba(255,255,255,0.2)' : clanAccent}
                />
              </TouchableOpacity>

              <View style={styles.dots} pointerEvents="none">
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: clanAccent, opacity: page === 0 ? 1 : 0.22 },
                  ]}
                />
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: clanAccent, opacity: page === 1 ? 1 : 0.22 },
                  ]}
                />
              </View>

              <TouchableOpacity
                onPress={goNext}
                disabled={page === 1}
                hitSlop={10}
                style={styles.arrowBtn}
                accessibilityLabel="Display siguiente"
              >
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={page === 1 ? 'rgba(255,255,255,0.2)' : clanAccent}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={handleConfirm} hitSlop={12} style={styles.headerSide}>
              <Ionicons name="checkmark" size={28} color={clanAccent} />
            </TouchableOpacity>
          </View>

          <View style={[styles.stage, { height: itemHeight, width: screenW }]}>
            {page === 0 ? (
              <ReflectionDetailItem
                post={paraTiPost}
                itemHeight={itemHeight}
                previewMode
                communityVerticalFeed
                onAuthorPress={() => {}}
                onClanPress={() => {}}
                reflectionStarSurfaceColor={evoconnColors.background}
                photoCropInteractive={
                  paraTiCropActive
                    ? {
                        onFocusYChange: setDraftParaTi,
                        onRemoveFromDisplay: removeFromCurrentDisplay,
                      }
                    : undefined
                }
              />
            ) : (
              <View style={[styles.siguiendoStage, { height: itemHeight }]}>
                <CommunityPostCard
                  post={siguiendoPost}
                  followingFeedStyle
                  showPhraseAuthor={siguiendoPost.type === 'phrase'}
                  slotOuterHeight={itemHeight}
                  onPress={() => {}}
                  onAuthorPress={() => {}}
                  photoCropInteractive={
                    siguiendoCropActive
                      ? {
                          focusY: draftSiguiendo,
                          onFocusYChange: setDraftSiguiendo,
                          onRemoveFromDisplay: removeFromCurrentDisplay,
                        }
                      : undefined
                  }
                />
              </View>
            )}
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

export { DEFAULT_POST_IMAGE_FOCUS_Y };

const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  root: {
    flex: 1,
    backgroundColor: evoconnColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerSide: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageSwitcher: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  arrowBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
  },
  stage: {
    overflow: 'hidden',
  },
  siguiendoStage: {
    justifyContent: 'flex-start',
    paddingTop: 8,
  },
});
