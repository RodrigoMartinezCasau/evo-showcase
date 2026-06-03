import React, { useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFeedAudioPlayback } from '@evoconn/hooks/useFeedAudio';
import {
  DETAIL_ACTION_COLUMN_LAYOUT as COL,
  DETAIL_CLAN_BUTTON_LAYOUT as CLAN_L,
  DETAIL_UPVOTE_BUTTON_LAYOUT as UP_L,
  DETAIL_DOWNVOTE_BUTTON_LAYOUT as DOWN_L,
  DETAIL_SAVE_BUTTON_LAYOUT as SAVE_L,
  DETAIL_MORE_BUTTON_LAYOUT as MORE_L,
} from '@evoconn/constants/detailActionColumnLayout';
import {
  UserAvatarFrame,
  CLAN_PROFILE_BADGE_BOTTOM_TIP_Y_RATIO,
} from './shared/UserAvatarFrame';
import { FollowButton } from './FollowButton';
import { mockCurrentUser } from '@evoconn/data/mockUser';
import { AVATAR_OVERLAY_FOLLOW_BUTTON_LAYOUT } from '@evoconn/constants/followButtonLayout';

const FOLLOW_BUTTON_BASE_SIZE = 28;
import { CLAN_PROFILE_SIN_CLAN } from '@evoconn/utils/getClanProfileByHouse';
import type { ClanId } from '@evoconn/constants/clanColors';
import { CLAN_TO_COLOR } from '@evoconn/constants/clanColors';
import type { Rank } from '@evoconn/types';

import UpvoteInactive from '../assets/detailActions/31.svg';
import UpvoteActive from '../assets/detailActions/32.svg';
import DownvoteInactive from '../assets/detailActions/29.svg';
import DownvoteActive from '../assets/detailActions/30.svg';
import SaveInactive from '../assets/detailActions/33.svg';
import SaveActive from '../assets/detailActions/34.svg';

function useBounce() {
  const scale = useRef(new Animated.Value(1)).current;
  const trigger = useCallback(() => {
    scale.setValue(0.7);
    Animated.spring(scale, {
      toValue: 1,
      friction: 4,
      tension: 300,
      useNativeDriver: true,
    }).start();
  }, [scale]);
  return { scale, trigger };
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(0)}K`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/**
 * Botón circular de pausa/play del audio del feed. Muestra el icono de pausa
 * (dos barras) cuando el audio suena y el de play cuando está pausado. Solo se
 * re-renderiza al cambiar el estado de reproducción (suscripción puntual).
 */
function AudioToggleButton({ diameter }: { diameter: number }) {
  const { paused, toggle } = useFeedAudioPlayback();
  const iconSz = Math.round(diameter * 0.52);
  return (
    <TouchableOpacity
      onPress={toggle}
      activeOpacity={0.7}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={paused ? 'Reanudar audio' : 'Pausar audio'}
      style={[
        styles.audioBtn,
        { width: diameter, height: diameter, borderRadius: diameter / 2 },
      ]}
    >
      <Ionicons
        name={paused ? 'play' : 'pause'}
        size={iconSz}
        color="#FFFFFF"
        style={paused ? { marginLeft: iconSz * 0.12 } : undefined}
      />
    </TouchableOpacity>
  );
}

/** Same vertical gap: up (count→icon) and down (icon→count). */
const VOTE_STAT_ICON_GAP = 2;

const VALID_CLAN_IDS = new Set<string>(Object.keys(CLAN_TO_COLOR));

function isValidClanId(id: string | null | undefined): id is ClanId {
  return !!id && VALID_CLAN_IDS.has(id);
}

/** True solo si hay URL de foto asignada (no usar el fallback con silueta del marco). */
function hasProfilePhoto(avatarUri?: string | null): boolean {
  const u = avatarUri?.trim();
  if (!u) return false;
  return /^https?:\/\//i.test(u) || u.startsWith('file://');
}

type DetailActionColumnProps = {
  // ── Top icon (Para ti) ─────────────────────────────────────────────────────
  clanId: string | null | undefined;
  avatarUri?: string | null;
  upCount: number;
  downCount: number;
  saved: boolean;
  voted: 'up' | 'down' | null;
  onUpvote: () => void;
  onDownvote: () => void;
  onSave: () => void;
  onClanPress: () => void;
  onMorePress: () => void;
  /**
   * When provided the column fills exactly this height using
   * `justifyContent: 'space-between'`, anchoring clan icon top to the
   * reflection panel top and three-dots bottom to the panel bottom.
   */
  containerHeight?: number;
  /**
   * Para Ti: con foto → marco + foto; sin foto → badge de clan (animal o sin clan).
   */
  showClanBadge?: boolean;
  /** Author rank — required when showClanBadge is true to pick the correct badge tier. */
  authorRank?: Rank;
  /** El post tiene audio adjunto → mostrar el botón circular de pausa/play. */
  hasAudio?: boolean;
  /** Autor del post — si no es el usuario actual, el + va bajo el avatar. */
  authorId?: string;
};

export type DetailActionColumnHandle = {
  triggerUpvoteBounce: () => void;
};

export const DetailActionColumn = React.memo(forwardRef<DetailActionColumnHandle, DetailActionColumnProps>(
  function DetailActionColumn(
    {
      clanId,
      avatarUri,
      upCount,
      downCount,
      saved,
      voted,
      onUpvote,
      onDownvote,
      onSave,
      onClanPress,
      onMorePress,
      containerHeight,
      showClanBadge = false,
      hasAudio = false,
      authorId,
    },
    ref,
  ) {
  const sz = COL.iconSize;

  const upBounce = useBounce();
  const downBounce = useBounce();
  const saveBounce = useBounce();

  useImperativeHandle(ref, () => ({ triggerUpvoteBounce: upBounce.trigger }), [upBounce]);

  const handleUp = useCallback(() => { upBounce.trigger(); onUpvote(); }, [upBounce, onUpvote]);
  const handleDown = useCallback(() => { downBounce.trigger(); onDownvote(); }, [downBounce, onDownvote]);
  const handleSave = useCallback(() => { saveBounce.trigger(); onSave(); }, [saveBounce, onSave]);

  const total = upCount + downCount;
  const approvalPct = total > 0 ? Math.round((upCount / total) * 100) : 100;

  // ── Dynamic icon sizing ────────────────────────────────────────────────────
  // Solve: ICON_RATIO_SUM * effectiveSz + FIXED_H = containerHeight
  // Clan = 2.2 × other (120% bigger).  Icons fill the panel; gaps from space-between.
  // Fixed: 3 text lines (~18px) + 2× VOTE_STAT_ICON_GAP (up count↔icon, down icon↔count).
  // COL.sizeScale shrinks all icons uniformly without affecting column position or spacing.
  const ICON_RATIO_SUM = 2.2 + 1 + 1 + 0.92 + 0.6; // clan + up + down + save + dots
  const FIXED_H = 3 * 18 + 2 * VOTE_STAT_ICON_GAP;
  const SCALE = COL.sizeScale;

  let clanSz: number;
  let otherSz: number;
  let saveSz: number;
  let dotsFontSz: number;

  if (containerHeight && containerHeight > 0) {
    const derivedSz = Math.max(1, (containerHeight - FIXED_H) / ICON_RATIO_SUM);
    const rawClanH = derivedSz * 2.2;
    clanSz = Math.min(rawClanH, COL.maxClanW) * SCALE;
    const effSz = clanSz / 2.2;
    otherSz = effSz;
    saveSz = effSz * 0.92;
    dotsFontSz = Math.max(10, effSz * 0.6);
  } else {
    clanSz = sz * CLAN_L.scale * SCALE;
    otherSz = sz * UP_L.scale * SCALE;
    saveSz = sz * SAVE_L.scale * SCALE;
    dotsFontSz = Math.max(10, 22 * MORE_L.scale * SCALE);
  }
  // ── Top icon (Para ti) ─────────────────────────────────────────────────────
  // Con foto → UserAvatarFrame (marco de clan + imagen).
  // Sin foto → badge de filosofía (animal del clan, o medalla sin clan si no tiene clan).
  let TopIcon: React.ReactNode;
  if (showClanBadge) {
    if (hasProfilePhoto(avatarUri)) {
      TopIcon = (
        <UserAvatarFrame clanId={clanId} avatarUri={avatarUri!.trim()} size={clanSz} />
      );
    } else if (isValidClanId(clanId)) {
      // Antes: PhilosophyClanBadge (SVG ~737 KB con base64 + filtros) por CADA
      // tarjeta sin foto del feed → coste de decodificación enorme al escrollar.
      // Ahora: personita del clan (`by-clan` → getClanProfileByHouse, SVG
      // vectorial ~59 KB con el color de cada clan). El badge del animal de clan
      // se mantiene intacto en la pantalla de perfil, donde se pinta una vez.
      TopIcon = (
        <UserAvatarFrame
          clanId={clanId}
          avatarUri={null}
          size={clanSz}
          noPhotoFallback="by-clan"
        />
      );
    } else {
      const SinClanSvg = CLAN_PROFILE_SIN_CLAN;
      TopIcon = <SinClanSvg width={clanSz} height={clanSz} />;
    }
  } else {
    TopIcon = <UserAvatarFrame clanId={clanId} avatarUri={avatarUri} size={clanSz} />;
  }
  // ──────────────────────────────────────────────────────────────────────────

  const showFollowOnAvatar =
    !!authorId && authorId !== mockCurrentUser.id;
  const followBtnSize =
    FOLLOW_BUTTON_BASE_SIZE * AVATAR_OVERLAY_FOLLOW_BUTTON_LAYOUT.scale;
  /** Centro del + = punta inferior del escudo (misma Y que el SVG del avatar). */
  const avatarBottomTipY = clanSz * CLAN_PROFILE_BADGE_BOTTOM_TIP_Y_RATIO;
  const followOverlayTop = avatarBottomTipY - followBtnSize / 2;
  const followOverlayLeft = (clanSz - followBtnSize) / 2;

  const columnStyle = containerHeight != null
    ? [styles.column, { height: containerHeight, justifyContent: 'space-between' as const }]
    : [styles.column];

  return (
    <View style={styles.root}>
      {/* ── 6-item column: clan / up block / approval% / down block / save / dots (same count↔icon gap up & down) ── */}
      <View style={columnStyle}>

        {/* 1. Perfil (+ seguir en la base del avatar, estilo TikTok) */}
        <View style={[styles.profileBlock, { width: clanSz, height: clanSz }]}>
          <TouchableOpacity onPress={onClanPress} activeOpacity={0.7}>
            {TopIcon}
          </TouchableOpacity>
          {showFollowOnAvatar ? (
            <View
              pointerEvents="box-none"
              style={[
                styles.followOnAvatar,
                {
                  top: followOverlayTop,
                  left: followOverlayLeft,
                  width: followBtnSize,
                  height: followBtnSize,
                },
              ]}
            >
              <FollowButton
                authorId={authorId!}
                authorClanId={clanId}
                context="avatarOverlay"
              />
            </View>
          ) : null}
        </View>

        {/* 2. Upvote: count then icon — gap matches down block */}
        <TouchableOpacity onPress={handleUp} activeOpacity={0.7}>
          <View style={styles.voteStack}>
            <Text style={styles.statText}>{formatCount(upCount)}</Text>
            <Animated.View
              style={{
                marginTop: VOTE_STAT_ICON_GAP,
                width: otherSz,
                height: otherSz,
                transform: [{ scale: upBounce.scale }],
              }}
            >
              {voted === 'up' ? (
                <UpvoteActive key="up-a" width={otherSz} height={otherSz} />
              ) : (
                <UpvoteInactive key="up-i" width={otherSz} height={otherSz} />
              )}
            </Animated.View>
          </View>
        </TouchableOpacity>

        {/* 3. Approval % */}
        <Text style={styles.approvalText}>
          {approvalPct}%
        </Text>

        {/* 4. Downvote: icon then count — same gap as up block */}
        <TouchableOpacity onPress={handleDown} activeOpacity={0.7}>
          <View style={styles.voteStack}>
            <Animated.View style={{ width: otherSz, height: otherSz, transform: [{ scale: downBounce.scale }] }}>
              {voted === 'down' ? (
                <DownvoteActive key="down-a" width={otherSz} height={otherSz} />
              ) : (
                <DownvoteInactive key="down-i" width={otherSz} height={otherSz} />
              )}
            </Animated.View>
            <Text style={[styles.statText, styles.statBelowIcon]}>{formatCount(downCount)}</Text>
          </View>
        </TouchableOpacity>

        {/* 5. Save */}
        <TouchableOpacity onPress={handleSave} activeOpacity={0.7}>
          <Animated.View style={{ width: saveSz, height: saveSz, transform: [{ scale: saveBounce.scale }] }}>
            {saved ? (
              <SaveActive key="save-a" width={saveSz} height={saveSz} />
            ) : (
              <SaveInactive key="save-i" width={saveSz} height={saveSz} />
            )}
          </Animated.View>
        </TouchableOpacity>

        {/* 6. More (three dots) + audio pausa/play debajo (mismo slot para no
            alterar el reparto vertical de los 6 elementos). */}
        <View style={styles.moreGroup}>
          <TouchableOpacity onPress={onMorePress} activeOpacity={0.7} hitSlop={8}>
            <Text style={[styles.moreDots, { fontSize: dotsFontSz }]}>···</Text>
          </TouchableOpacity>
          {hasAudio ? (
            <View style={styles.audioBtnWrap}>
              <AudioToggleButton diameter={Math.max(28, saveSz * 0.78)} />
            </View>
          ) : null}
        </View>

      </View>
    </View>
  );
}));

// Column width = maxClanW always (clan badge fills the full column width).
const COL_FIXED_WIDTH = COL.maxClanW;

const styles = StyleSheet.create({
  root: {
    width: COL_FIXED_WIDTH,
  },
  column: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: COL_FIXED_WIDTH,
  },
  profileBlock: {
    alignItems: 'center',
    position: 'relative',
  },
  followOnAvatar: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  voteStack: {
    alignItems: 'center',
  },
  statText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    color: '#FFFFFF',
  },
  statBelowIcon: {
    marginTop: VOTE_STAT_ICON_GAP,
  },
  approvalText: {
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    color: '#FFFFFF',
  },
  moreDots: {
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 2,
  },
  moreGroup: {
    alignItems: 'center',
  },
  audioBtnWrap: {
    marginTop: 8,
    alignItems: 'center',
  },
  audioBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b0b0f',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
});
