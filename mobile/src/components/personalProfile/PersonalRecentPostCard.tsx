import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { CommunityPost } from '@evoconn/types';
import { PROFILE_POST_PREVIEW_LAYOUT as L } from '@evoconn/constants/postPreviewLayout';

// Active (colored) versions — same assets as "Para ti" active state
import UpvoteIcon from '../../assets/detailActions/32.svg';   // green  #89D957
import DownvoteIcon from '../../assets/detailActions/30.svg'; // red    #ff4a31
import SavedIcon from '../../assets/detailActions/34.svg';    // yellow #ffde59
import FlechaIcon from '../../assets/detailActions/flecha.svg'; // currentColor → computed from %

type Props = {
  post: CommunityPost;
  cardWidth: number;
  onPress: (post: CommunityPost) => void;
};

function voteRatioPct(up: number, down: number): number {
  return Math.round((up / Math.max(1, up + down)) * 100);
}

/** Color for the flecha/percentage icon, mirroring the "Para ti" active palette. */
function flechaColor(pct: number): string {
  if (pct >= 90) return '#89D957';
  if (pct >= 50) return '#ffde59';
  return '#ff4a31';
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

export const PersonalRecentPostCard = React.memo(function PersonalRecentPostCard({ post, cardWidth, onPress }: Props) {
  const isPhrase = post.type === 'phrase';
  const typeLabel = isPhrase ? 'FRASE' : 'REFLEXIÓN';
  const mainText = isPhrase
    ? post.body
    : (post.title ?? post.body.slice(0, 80));

  const pct         = voteRatioPct(post.voteStats.up, post.voteStats.down);
  const pctColor    = flechaColor(pct);
  const timeStr     = timeSince(post.createdAt);

  // ── Derived stats-bar dimensions — all scale from ONE constant ──────────
  // Change profilePreviewStatsBarScale in postPreviewLayout.ts to resize
  // icons, numbers, AND internal spacing uniformly. Nothing outside the
  // black card is affected.
  const barScale    = L.profilePreviewStatsBarScale;
  const iconPx      = Math.round(L.profilePreviewStatsIconBaseSize * barScale);
  const countFontSz = Math.round(L.profilePreviewStatsCountBaseFontSize * barScale);
  const colGap      = Math.round(3 * barScale);                           // icon ↔ number (scales with bar)
  const rowGap      = Math.round(L.profilePreviewStatsColSpacing * barScale); // column ↔ column (edit profilePreviewStatsColSpacing)

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onPress(post)}
      style={[styles.card, { width: cardWidth }]}
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
        {/* ── Top: type label + main text ── */}
        <View style={styles.topSection}>

          {/* Type label + time since publication on the same row */}
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

            {/* ── Upvote column: icon on top, count below ── */}
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

            {/* ── Percentage column: flecha icon on top, % text below ── */}
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
  innerContent: {
    // minHeight = card minHeight − 2×padding (142px).
    // Avoids flex:1 inside a minHeight-only parent, which collapses to 0 in Yoga.
    minHeight: 142,
    justifyContent: 'space-between',
  },
  topSection: {
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'nowrap',
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
    // gap is set dynamically: Math.round(10 * barScale)
  },
  statCol: {
    alignItems: 'center',
    // gap is set dynamically: Math.round(3 * barScale)
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
