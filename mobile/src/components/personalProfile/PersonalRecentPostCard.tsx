import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  EvoActionSheetModal,
  EvoConfirmModal,
} from '@evoconn/components/shared/EvoActionSheetModal';
import type { CommunityPost } from '@evoconn/types';
import { PROFILE_POST_PREVIEW_LAYOUT as L } from '@evoconn/constants/postPreviewLayout';
import {
  PERSONAL_POST_MENU_DOTS_OFFSET_X,
  PERSONAL_POST_MENU_DOTS_OFFSET_Y,
  PERSONAL_POST_MENU_DOTS_SCALE,
} from '@evoconn/constants/personalProfileLayout';

// Active (colored) versions — same assets as "Para ti" active state
import UpvoteIcon from '../../assets/detailActions/32.svg';
import DownvoteIcon from '../../assets/detailActions/30.svg';
import {
  VOTE_RATIO_HIGH_COLOR,
  VOTE_RATIO_LOW_COLOR,
} from '@evoconn/constants/voteButtonAppearance';
import SavedIcon from '../../assets/detailActions/34.svg';    // yellow #ffde59
import FlechaIcon from '../../assets/detailActions/flecha.svg'; // currentColor → computed from %

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
   * Extra scale multiplier for the stats bar (icons + numbers).
   * Applied ON TOP of the base profilePreviewStatsBarScale.
   * Use PERSONAL_POSTS_GRID_STATS_SCALE from personalProfileLayout.ts.
   * Defaults to 1 (no change). Only pass this from the grid screen.
   */
  gridStatsScale?: number;
  /**
   * Controls which menu items appear when the three-dots icon is tapped.
   * - 'own'   (default): "Ocultar / Hacer público" + "Eliminar post"
   * - 'saved': "Quitar de guardados" only
   */
  menuMode?: 'own' | 'saved';
};

function voteRatioPct(up: number, down: number): number {
  return Math.round((up / Math.max(1, up + down)) * 100);
}

/** Color for the flecha/percentage icon, mirroring the "Para ti" active palette. */
function flechaColor(pct: number): string {
  if (pct >= 90) return VOTE_RATIO_HIGH_COLOR;
  if (pct >= 50) return '#ffde59';
  return VOTE_RATIO_LOW_COLOR;
}

/**
 * Compact count formatter — max 4 visible characters.
 * 0–999 → exact · 1 000–999 999 → "Xk" · ≥1 000 000 → "XM"
 */
function compactCount(n: number): string {
  if (n >= 1_000_000) return `${Math.floor(n / 1_000_000)}M`;
  if (n >= 1_000) return `${Math.floor(n / 1_000)}k`;
  return String(n);
}

/**
 * Time since publication in compact Spanish.
 * Rules: min → h → meses → años
 */
function timeSince(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const mins   = Math.floor(diffMs / 60_000);
  if (mins < 1)    return 'ahora';
  if (mins < 60)   return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24)  return `${hours} h`;
  const days  = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  if (months < 1)  return `${days} d`;
  if (months < 12) return `${months} ${months === 1 ? 'mes' : 'meses'}`;
  const years = Math.floor(months / 12);
  return `${years} ${years === 1 ? 'año' : 'años'}`;
}

export const PersonalRecentPostCard = React.memo(function PersonalRecentPostCard({
  post,
  cardWidth,
  onPress,
  onMenuAction,
  isHidden = false,
  noMarginRight = false,
  gridStatsScale = 1,
  menuMode = 'own',
}: Props) {
  const isPhrase = post.type === 'phrase';
  const typeLabel = isPhrase ? 'FRASE' : 'REFLEXIÓN';
  const mainText = isPhrase
    ? post.body
    : (post.title ?? post.body.slice(0, 80));

  const pct         = voteRatioPct(post.voteStats.up, post.voteStats.down);
  const pctColor    = flechaColor(pct);
  const timeStr     = timeSince(post.createdAt);

  const [menuVisible, setMenuVisible] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

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

  // ── Derived stats-bar dimensions — all scale from ONE constant ──────────
  // gridStatsScale is 1 in the slider, and PERSONAL_POSTS_GRID_STATS_SCALE in the grid.
  const barScale    = L.profilePreviewStatsBarScale * gridStatsScale;
  const iconPx      = Math.round(L.profilePreviewStatsIconBaseSize * barScale);
  const countFontSz = Math.round(L.profilePreviewStatsCountBaseFontSize * barScale);
  const colGap      = Math.round(3 * barScale);
  const rowGap      = Math.round(L.profilePreviewStatsColSpacing * barScale);

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onPress(post)}
        style={[
          styles.card,
          { width: cardWidth },
          noMarginRight && { marginRight: 0 },
          isHidden && styles.cardHidden,
        ]}
      >
        {/* ── Whole internal content wrapper ── */}
        <View
          style={[
            styles.innerContent,
            {
              transform: [
                { translateX: L.profilePreviewContentOffsetX },
                { translateY: L.profilePreviewContentOffsetY },
                { scale: L.profilePreviewContentScale },
              ],
            },
          ]}
        >
          {/* ── Top: type label + time + dots ── */}
          <View style={styles.topSection}>

            {/* Meta row: type label | time | spacer | dots */}
            <View style={styles.metaRowOuter}>
              <View style={styles.metaRow}>
                <View
                  style={{
                    transform: [
                      { translateX: L.profilePreviewTypeLabelOffsetX },
                      { translateY: L.profilePreviewTypeLabelOffsetY },
                      { scale: L.profilePreviewTypeLabelScale },
                    ],
                  }}
                >
                  <Text style={[styles.typeLabel, { color: L.profilePreviewTypeLabelColor }]}>
                    {typeLabel}
                  </Text>
                </View>
                <View
                  style={{
                    transform: [
                      { translateX: L.profilePreviewTimeLabelOffsetX },
                      { translateY: L.profilePreviewTimeLabelOffsetY },
                      { scale: L.profilePreviewTimeLabelScale },
                    ],
                  }}
                >
                  <Text style={[styles.timeLabel, { color: L.profilePreviewTimeLabelColor }]}>
                    · {timeStr}
                  </Text>
                </View>
              </View>

              {/* Three-dots / padlock button — only shown when onMenuAction is provided.
                  When the post is hidden (private), shows a closed padlock instead of dots.
                  Both icons open the same action menu. */}
              {onMenuAction && (
                <TouchableOpacity
                  onPress={handleDotsPress}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{
                    transform: [
                      { translateX: PERSONAL_POST_MENU_DOTS_OFFSET_X },
                      { translateY: PERSONAL_POST_MENU_DOTS_OFFSET_Y },
                      { scale: PERSONAL_POST_MENU_DOTS_SCALE },
                    ],
                  }}
                >
                  <Ionicons
                    name={isHidden ? 'lock-closed' : 'ellipsis-horizontal'}
                    size={14}
                    color={isHidden ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.4)'}
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* Main content */}
            <View
              style={{
                transform: [
                  { translateX: L.profilePreviewMainTextOffsetX },
                  { translateY: L.profilePreviewMainTextOffsetY },
                  { scale: L.profilePreviewMainTextScale },
                ],
              }}
            >
              <Text
                style={isPhrase ? styles.phraseBody : styles.reflectionTitle}
                numberOfLines={isPhrase ? 4 : 2}
              >
                {mainText}
              </Text>
            </View>

          </View>

          {/* ── Stats block ── */}
          <View
            style={[
              styles.statsBlock,
              {
                transform: [
                  { translateX: L.profilePreviewStatsBlockOffsetX },
                  { translateY: L.profilePreviewStatsBlockOffsetY },
                ],
              },
            ]}
          >
            <View style={[styles.statsRow, { gap: rowGap }]}>

              {/* ── Upvote column ── */}
              <View
                style={[
                  styles.statCol,
                  { gap: colGap },
                  {
                    transform: [
                      { translateX: L.profilePreviewUpColOffsetX },
                      { translateY: L.profilePreviewUpColOffsetY },
                    ],
                  },
                ]}
              >
                <View style={{ width: iconPx, height: iconPx, overflow: 'hidden' }}>
                  <UpvoteIcon width={iconPx} height={iconPx} />
                </View>
                <Text style={[styles.statCount, { fontSize: countFontSz, lineHeight: Math.ceil(countFontSz * 1.25) }]}>
                  {compactCount(post.voteStats.up)}
                </Text>
              </View>

              {/* ── Downvote column ── */}
              <View
                style={[
                  styles.statCol,
                  { gap: colGap },
                  {
                    transform: [
                      { translateX: L.profilePreviewDownColOffsetX },
                      { translateY: L.profilePreviewDownColOffsetY },
                    ],
                  },
                ]}
              >
                <View style={{ width: iconPx, height: iconPx, overflow: 'hidden' }}>
                  <DownvoteIcon width={iconPx} height={iconPx} />
                </View>
                <Text style={[styles.statCount, { fontSize: countFontSz, lineHeight: Math.ceil(countFontSz * 1.25) }]}>
                  {compactCount(post.voteStats.down)}
                </Text>
              </View>

              {/* ── Saved column ── */}
              <View
                style={[
                  styles.statCol,
                  { gap: colGap },
                  {
                    transform: [
                      { translateX: L.profilePreviewSavedColOffsetX },
                      { translateY: L.profilePreviewSavedColOffsetY },
                    ],
                  },
                ]}
              >
                <View style={{ width: iconPx, height: iconPx, overflow: 'hidden' }}>
                  <SavedIcon width={iconPx} height={iconPx} />
                </View>
                <Text style={[styles.statCount, { fontSize: countFontSz, lineHeight: Math.ceil(countFontSz * 1.25) }]}>
                  {compactCount(post.voteStats.save)}
                </Text>
              </View>

              {/* ── Percentage column ── */}
              <View
                style={[
                  styles.statCol,
                  { gap: colGap },
                  {
                    transform: [
                      { translateX: L.profilePreviewPercentageColOffsetX },
                      { translateY: L.profilePreviewPercentageColOffsetY },
                    ],
                  },
                ]}
              >
                <View
                  style={{
                    width: iconPx,
                    height: iconPx,
                    overflow: 'hidden',
                    transform: [
                      { translateX: L.profilePreviewFlechaIconOffsetX },
                      { translateY: L.profilePreviewFlechaIconOffsetY },
                      { scale: L.profilePreviewFlechaIconScale },
                    ],
                  }}
                >
                  <FlechaIcon width={iconPx} height={iconPx} color={pctColor} />
                </View>
                <Text style={[styles.statPercentage, { fontSize: countFontSz, lineHeight: Math.ceil(countFontSz * 1.25), color: pctColor }]}>
                  {pct}%
                </Text>
              </View>

            </View>
          </View>
        </View>
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
    backgroundColor: '#000000',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 14,
    marginRight: 12,
    minHeight: 170,
    overflow: 'hidden',
  },
  cardHidden: {
    borderColor: 'rgba(255,255,255,0.05)',
    opacity: 0.65,
  },
  innerContent: {
    minHeight: 142,
    justifyContent: 'space-between',
  },
  topSection: {
    gap: 6,
  },
  metaRowOuter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'nowrap',
    flex: 1,
  },
  typeLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    lineHeight: 12,
  },
  timeLabel: {
    fontSize: 9,
    fontWeight: '500',
    lineHeight: 12,
  },
  reflectionTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
    lineHeight: 20,
  },
  phraseBody: {
    color: '#FFFFFF',
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 19,
  },
  statsBlock: {
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  statCol: {
    alignItems: 'center',
  },
  statCount: {
    color: '#FFFFFF',
    fontWeight: '600',
    opacity: 0.8,
    includeFontPadding: false,
  },
  statPercentage: {
    color: '#FFFFFF',
    fontWeight: '700',
    opacity: 0.6,
    letterSpacing: 0.2,
    alignSelf: 'flex-end',
    includeFontPadding: false,
  },
});
