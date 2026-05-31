import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  EvoActionSheetModal,
  EvoConfirmModal,
} from '@evoconn/components/shared/EvoActionSheetModal';
import type { CommunityPost } from '@evoconn/types';
import {
  PERSONAL_POST_MENU_DOTS_OFFSET_X,
  PERSONAL_POST_MENU_DOTS_OFFSET_Y,
  PERSONAL_POST_MENU_DOTS_SCALE,
} from '@evoconn/constants/personalProfileLayout';
import { PanelStarField, PANEL_STAR_SURFACE_DEFAULT } from '@evoconn/components/animations/StarFieldBackground';
import { ClanCardFeedRimOverlay } from '../ClanCardFeedRimOverlay';
import { getClanColor } from '@evoconn/constants/clanColors';
import { formatPhraseBodyForDisplay } from '@evoconn/utils/phrasePublish';

type MenuAction = 'hide' | 'delete' | 'unsave';

type Props = {
  post: CommunityPost;
  cardWidth: number;
  onPress: (post: CommunityPost) => void;
  /** When provided, renders the three-dots menu button on the card. */
  onMenuAction?: (action: MenuAction, postId: string) => void;
  /** Whether this post is currently hidden from public. Affects menu label. */
  isHidden?: boolean;
  /** Remove the right margin (use in grid layouts instead of sliders). */
  noMarginRight?: boolean;
  /**
   * Kept for API compatibility with the grid screen. The redesigned card no
   * longer renders a stats bar, so this is intentionally unused.
   */
  gridStatsScale?: number;
  /**
   * Controls which menu items appear when the three-dots icon is tapped.
   * - 'own'   (default): "Ocultar / Hacer público" + "Eliminar post"
   * - 'saved': "Quitar de guardados" only
   */
  menuMode?: 'own' | 'saved';
};

/** Outer rounded-square radius — kept identical to the previous preview card. */
const CARD_RADIUS = 14;
/** Glowing-rim arm length (pt). Shorter than the full feed cards (52) to fit the smaller square. */
const RIM_ARM = 44;

export const PersonalRecentPostCard = React.memo(function PersonalRecentPostCard({
  post,
  cardWidth,
  onPress,
  onMenuAction,
  isHidden = false,
  noMarginRight = false,
  gridStatsScale: _gridStatsScale = 1,
  menuMode = 'own',
}: Props) {
  const isPhrase = post.type === 'phrase';
  // Frases → frase completa · Reflexiones → solo el título.
  const mainText = isPhrase
    ? formatPhraseBodyForDisplay(post.body)
    : (post.title ?? post.body);

  const clanColor = getClanColor(post.author.clanId);

  const [menuVisible, setMenuVisible] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const [dims, setDims] = useState<{ width: number; height: number } | null>(null);
  const onCardLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setDims((prev) =>
      prev?.width === width && prev?.height === height ? prev : { width, height },
    );
  }, []);

  const handleDotsPress = useCallback(() => {
    setMenuVisible(true);
  }, []);

  const sheetOptions = useMemo(() => {
    if (!onMenuAction) return [];
    if (menuMode === 'saved') {
      return [
        {
          key: 'unsave',
          label: 'Quitar de guardados',
          onPress: () => onMenuAction('unsave', post.id),
        },
      ];
    }
    return [
      {
        key: 'hide',
        label: isHidden ? 'Hacer público' : 'Ocultar para el público',
        onPress: () => onMenuAction('hide', post.id),
      },
      {
        key: 'delete',
        label: 'Eliminar post',
        destructive: true,
        onPress: () => setDeleteConfirmOpen(true),
      },
    ];
  }, [onMenuAction, menuMode, post.id, isHidden]);

  const confirmDeletePost = useCallback(() => {
    setDeleteConfirmOpen(false);
    onMenuAction?.('delete', post.id);
  }, [onMenuAction, post.id]);

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onPress(post)}
        onLayout={onCardLayout}
        style={[
          styles.card,
          { width: cardWidth },
          noMarginRight && { marginRight: 0 },
          isHidden && styles.cardHidden,
        ]}
      >
        {/* Fondo de estrellas (mismo que las tarjetas de "Siguiendo"). */}
        <View
          style={[StyleSheet.absoluteFill, { borderRadius: CARD_RADIUS, overflow: 'hidden' }]}
          pointerEvents="none"
        >
          <PanelStarField surfaceColor={PANEL_STAR_SURFACE_DEFAULT} />
        </View>

        {/* Reborde con glow estilo Apple en color de clan (blanco en el centro). */}
        {dims ? (
          <ClanCardFeedRimOverlay
            width={dims.width}
            height={dims.height}
            borderRadius={CARD_RADIUS}
            clanColor={clanColor}
            rimArm={RIM_ARM}
          />
        ) : null}

        {/* Contenido: solo el texto, centrado. */}
        <View style={styles.content}>
          <Text
            style={isPhrase ? styles.phraseBody : styles.reflectionTitle}
            numberOfLines={isPhrase ? 5 : 4}
          >
            {mainText}
          </Text>
        </View>

        {/* Botón de tres puntos / candado — solo cuando hay onMenuAction.
            Si el post está oculto (privado), muestra un candado en su lugar. */}
        {onMenuAction && (
          <TouchableOpacity
            onPress={handleDotsPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[
              styles.menuButton,
              {
                transform: [
                  { translateX: PERSONAL_POST_MENU_DOTS_OFFSET_X },
                  { translateY: PERSONAL_POST_MENU_DOTS_OFFSET_Y },
                  { scale: PERSONAL_POST_MENU_DOTS_SCALE },
                ],
              },
            ]}
          >
            <Ionicons
              name={isHidden ? 'lock-closed' : 'ellipsis-horizontal'}
              size={16}
              color={isHidden ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.55)'}
            />
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {onMenuAction ? (
        <>
          <EvoActionSheetModal
            visible={menuVisible}
            onClose={() => setMenuVisible(false)}
            title="Publicación"
            options={sheetOptions}
          />
          <EvoConfirmModal
            visible={deleteConfirmOpen}
            onClose={() => setDeleteConfirmOpen(false)}
            title="Eliminar post"
            message="¿Seguro que quieres eliminar esta publicación? Esta acción no se puede deshacer."
            confirmLabel="Eliminar"
            destructive
            onConfirm={confirmDeletePost}
          />
        </>
      ) : null}
    </>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: CARD_RADIUS,
    marginRight: 12,
    minHeight: 170,
    overflow: 'hidden',
    backgroundColor: PANEL_STAR_SURFACE_DEFAULT,
  },
  cardHidden: {
    opacity: 0.65,
  },
  content: {
    flex: 1,
    minHeight: 170,
    paddingHorizontal: 20,
    paddingVertical: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 3,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reflectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
    lineHeight: 22,
    textAlign: 'center',
  },
  phraseBody: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    fontStyle: 'italic',
    lineHeight: 22,
    textAlign: 'center',
  },
});
