import React, { useMemo, useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Platform,
  useWindowDimensions,
  LayoutChangeEvent,
} from 'react-native';
import { FollowButton } from './FollowButton';
import { FirstUsersTesterBadge } from './shared/FirstUsersTesterBadge';
import type { CommunityPost } from '@evoconn/types';
import { evoconnColors } from '@evoconn/theme/colors';
import { getReflectionCardTier } from '@evoconn/utils/getCardSizeFromText';
import { formatNumber } from '@evoconn/utils/formatNumber';
import { getSmallClanBackgroundSvg } from '@evoconn/assets/cards/smallClanBackgroundsSvg';
import { getMediumClanBackgroundSvg } from '@evoconn/assets/cards/mediumClanBackgroundsSvg';
import { getQuoteClanBackgroundSvg } from '@evoconn/assets/cards/quoteClanBackgroundsSvg';
import { smallStatsIcons } from '@evoconn/assets/icons/smallStats';
import UpvoteInactiveSvg from '../assets/detailActions/31.svg';
import UpvoteActiveSvg from '../assets/detailActions/32.svg';
import { useFeedStore } from '@evoconn/hooks/useFeedStore';
import { usePersonalProfile } from '@evoconn/hooks/PersonalProfileContext';
import { formatPhraseBodyForDisplay } from '@evoconn/utils/phrasePublish';
import {
  computeCommunityFeedCardContentLayout,
  computeFeedCardTextContentBottomY,
  computeSvgCardLayout,
  COMMUNITY_FEED_CARD_MAX_INNER_WIDTH,
  getBodyMaxLines,
  maxCardWidthForInnerCardHeightPx,
  SVG_CARD_VISUAL,
} from '@evoconn/constants/svgCardLayout';
import { ClanCardFeedRimOverlay } from './ClanCardFeedRimOverlay';
import { getClanColor } from '@evoconn/constants/clanColors';
import { COMMUNITY_FOLLOW_BUTTON_LAYOUT } from '@evoconn/constants/followButtonLayout';
import { mockCurrentUser } from '@evoconn/data/mockUser';
import { PanelStarField, PANEL_STAR_SURFACE_DEFAULT } from '@evoconn/components/animations/StarFieldBackground';

const V = SVG_CARD_VISUAL;

type CommunityPostCardProps = {
  post: CommunityPost;
  onPress: (post: CommunityPost) => void;
  onAuthorPress: (authorId: string) => void;
  onClanPress?: (clanId: string | null) => void;
  /**
   * Solo en PARA TI (lista compacta). Siguiendo: false.
   * Vistas ampliadas usan `ReflectionDetailItem`, no esta tarjeta.
   */
  showPhraseAuthor?: boolean;
  /**
   * Alto exterior máximo del bloque tarjeta+márgenes en el feed (hueco lista − paddingTop).
   * Si la tarjeta “natural” lo supera, se reduce el ancho para acortar la altura y mantener bordes redondeados visibles.
   */
  slotOuterHeight?: number;
  /**
   * Siguiendo: fondo de tarjeta al color de app + rebordes brillantes en las 4 esquinas (color clan).
   */
  followingFeedStyle?: boolean;
};

function CommunityPostCardBase({
  post,
  onPress,
  onAuthorPress,
  onClanPress: _onClanPress,
  showPhraseAuthor = false,
  slotOuterHeight,
  followingFeedStyle = false,
}: CommunityPostCardProps) {
  const { updatePostVote, updatePostSaveToggle, getMyVote } = useFeedStore();
  const { savePost, unsavePost, isSaved } = usePersonalProfile();

  const myVote = getMyVote(post.id);
  const isPostSaved = isSaved(post.id);

  const handleSmallUp = useCallback(() => {
    const next: 'up' | null = myVote === 'up' ? null : 'up';
    updatePostVote(post.id, myVote, next);
  }, [post.id, myVote, updatePostVote]);

  const handleSmallSave = useCallback(() => {
    const now = !isSaved(post.id);
    updatePostSaveToggle(post.id, !now, now);
    if (now) savePost(post);
    else unsavePost(post.id);
  }, [post, isSaved, updatePostSaveToggle, savePost, unsavePost]);

  const isReflection = post.type === 'reflection';

  const cardTier = useMemo(() => {
    if (!isReflection) return 'quote' as const;
    return getReflectionCardTier(post.author.username, post.title ?? '', post.body ?? '');
  }, [isReflection, post.author.username, post.title, post.body]);

  const isQuoteCard = cardTier === 'quote';

  const CardBgSvg = useMemo(() => {
    if (cardTier === 'small') return getSmallClanBackgroundSvg(post.author.clanId);
    if (cardTier === 'medium') return getMediumClanBackgroundSvg(post.author.clanId);
    return getQuoteClanBackgroundSvg(post.author.clanId);
  }, [cardTier, post.author.clanId]);

  const { width: screenWidth } = useWindowDimensions();
  const maxUsableWidth = screenWidth - V.CARD_HORIZONTAL_MARGIN * 2;
  const baseCardWidth = Math.min(maxUsableWidth, COMMUNITY_FEED_CARD_MAX_INNER_WIDTH);
  const cardWidth = useMemo(() => {
    if (slotOuterHeight == null || !(slotOuterHeight > 0)) return baseCardWidth;
    const innerMax = Math.max(0, slotOuterHeight - V.CARD_VERTICAL_MARGIN * 2);
    if (!(innerMax > 0)) return baseCardWidth;
    const maxW = maxCardWidthForInnerCardHeightPx(cardTier, innerMax);
    return Math.max(120, Math.floor(Math.min(baseCardWidth, maxW)));
  }, [baseCardWidth, cardTier, slotOuterHeight]);
  const cardMarginH = (screenWidth - cardWidth) / 2;
  const layout = useMemo(
    () => computeSvgCardLayout(cardTier, cardWidth),
    [cardTier, cardWidth]
  );

  const feedContent = useMemo(
    () => computeCommunityFeedCardContentLayout(cardWidth, cardTier),
    [cardWidth, cardTier],
  );

  const bodyMaxLines = getBodyMaxLines(cardTier);
  const smallUpvoted = myVote === 'up';
  const feedSaveIcon = isPostSaved ? smallStatsIcons.saveActive : smallStatsIcons.saveInactive;

  const statsIcon = Math.max(20, Math.round(V.STATS_ICON_SIZE * Math.max(0.92, feedContent.textScale)));

  const statsRowHeight = useMemo(
    () => Math.max(statsIcon, feedContent.statsCountFontSize + 3) + 2,
    [statsIcon, feedContent.statsCountFontSize],
  );

  /**
   * Vertical inset from the card rim — same px as the lateral gutter (`blackLeftPx` / `blackRightPx`)
   * so the star panel keeps the same margin on all four sides.
   */
  const starPanelVInset = layout.blackLeftPx;
  const usernameLineHeight = Math.round(feedContent.usernameFontSize * 1.12);
  const showCommunityFollow = post.author.id !== mockCurrentUser.id;
  const followIconHeight = Math.ceil(28 * COMMUNITY_FOLLOW_BUTTON_LAYOUT.scale);
  const feedUsernameRowHeight = Math.max(
    usernameLineHeight,
    showCommunityFollow ? followIconHeight : 0,
  );
  /** Top Y of title/body stack — same vertical rhythm as paddingTop + gap after username row. */
  const feedStackMinTopPx =
    starPanelVInset +
    feedContent.paddingTop +
    feedUsernameRowHeight +
    feedContent.titleMarginBottom;

  const clanRimColor = useMemo(() => getClanColor(post.author.clanId), [post.author.clanId]);
  const [cardDims, setCardDims] = useState<{ width: number; height: number } | null>(null);
  const onCardLayout = useCallback(
    (e: LayoutChangeEvent) => {
      if (!followingFeedStyle) return;
      const { width, height } = e.nativeEvent.layout;
      setCardDims((prev) =>
        prev?.width === width && prev?.height === height ? prev : { width, height },
      );
    },
    [followingFeedStyle],
  );

  const textContentBottomY = useMemo(
    () =>
      computeFeedCardTextContentBottomY({
        cardHeight: layout.cardHeight,
        blackBottomPx: layout.blackBottomPx,
        paddingBottom: feedContent.paddingBottom,
        statsBottom: V.STATS_BOTTOM,
        statsRowHeight,
        clearanceAboveStats: V.STATS_TEXT_CLEARANCE_ABOVE_CHIP,
        feedStackMinTopPx,
      }),
    [
      layout.cardHeight,
      layout.blackBottomPx,
      feedContent.paddingBottom,
      statsRowHeight,
      feedStackMinTopPx,
    ],
  );

  /** Inner black rounded rect in card SVGs — rx ≈ 15.77 in 600 viewBox; clip stars to same silhouette. */
  const innerGrayPanelBorderRadius = useMemo(
    () => Math.max(8, Math.round((15.77 / 600) * cardWidth)),
    [cardWidth],
  );

  const renderFeedStats = () => (
    <View style={styles.feedStatsRow}>
      <View style={styles.feedStatItem}>
        <TouchableOpacity onPress={handleSmallUp} hitSlop={8} style={styles.feedStatPress}>
          <View style={{ width: statsIcon, height: statsIcon }}>
            {smallUpvoted ? (
              <UpvoteActiveSvg width={statsIcon} height={statsIcon} />
            ) : (
              <UpvoteInactiveSvg width={statsIcon} height={statsIcon} />
            )}
          </View>
        </TouchableOpacity>
        <Text style={[styles.feedStatCount, { fontSize: feedContent.statsCountFontSize }]}>
          {isQuoteCard ? formatNumber(post.voteStats.up) : post.voteStats.up}
        </Text>
      </View>
      <View style={styles.feedStatItem}>
        <TouchableOpacity onPress={handleSmallSave} hitSlop={8} style={styles.feedStatPress}>
          <Image
            source={feedSaveIcon}
            resizeMode="contain"
            style={{ width: statsIcon, height: statsIcon }}
          />
        </TouchableOpacity>
        <Text style={[styles.feedStatCount, { fontSize: feedContent.statsCountFontSize }]}>
          {isQuoteCard ? formatNumber(post.voteStats.save) : post.voteStats.save}
        </Text>
      </View>
    </View>
  );

  return (
    <TouchableOpacity activeOpacity={0.92} onPress={() => onPress(post)}>
      <View
        onLayout={onCardLayout}
        style={{
          width: cardWidth,
          height: layout.cardHeight,
          marginHorizontal: cardMarginH,
          marginVertical: V.CARD_VERTICAL_MARGIN,
          borderRadius: V.CARD_BORDER_RADIUS,
          overflow: 'hidden',
        }}
      >
        {/* SVG background — cropped to the colored frame area */}
        <View
          style={[
            styles.svgCrop,
            { width: cardWidth, height: layout.cardHeight, borderRadius: V.CARD_BORDER_RADIUS },
          ]}
          pointerEvents="none"
          renderToHardwareTextureAndroid
          shouldRasterizeIOS
        >
          <CardBgSvg
            width={layout.svgRenderSize}
            height={layout.svgRenderSize}
            style={{ position: 'absolute', top: -layout.svgCropTop, left: 0 }}
            preserveAspectRatio="xMidYMid meet"
          />
        </View>

        {/* Star field — same rim margin on all sides as horizontal gutter (blackLeft/blackRight). */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: starPanelVInset,
            bottom: starPanelVInset,
            left: layout.blackLeftPx,
            right: layout.blackRightPx,
            overflow: 'hidden',
            borderRadius: innerGrayPanelBorderRadius,
          }}
        >
          <PanelStarField
            surfaceColor={
              followingFeedStyle ? PANEL_STAR_SURFACE_DEFAULT : evoconnColors.background
            }
          />
        </View>

        {/* Username + follow over stars — paddingTop from star top matches body paddingBottom band. */}
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            top: starPanelVInset + feedContent.paddingTop,
            left: layout.blackLeftPx + feedContent.paddingLeft,
            right: layout.blackRightPx + feedContent.paddingRight,
            zIndex: 2,
          }}
        >
          <View style={styles.feedUsernameRow}>
            <TouchableOpacity onPress={() => onAuthorPress(post.author.id)} hitSlop={6} style={styles.usernameHit}>
              <Text
                style={[
                  styles.usernameHeader,
                  {
                    fontSize: feedContent.usernameFontSize,
                    lineHeight: usernameLineHeight,
                    ...(Platform.OS === 'android'
                      ? { includeFontPadding: false, textAlignVertical: 'center' as const }
                      : {}),
                  },
                ]}
                numberOfLines={1}
              >
                {post.author.username}
              </Text>
            </TouchableOpacity>
            <FirstUsersTesterBadge
              userId={post.author.id}
              iconSize={Math.max(11, Math.round(feedContent.usernameFontSize * 0.72))}
            />
            {showCommunityFollow ? (
              <FollowButton
                authorId={post.author.id}
                authorClanId={post.author.clanId}
                context="community"
              />
            ) : null}
          </View>
        </View>

        {/* Title + body — starts after username row with same gap as under title. */}
        <View
          style={{
            position: 'absolute',
            top: feedStackMinTopPx,
            left: layout.blackLeftPx + feedContent.paddingLeft,
            // Siguiendo reflection: right margin matches left so text reaches the full width.
            // Para ti and quote cards keep the wider right gutter (banner corridor / stats horizontal guard).
            // Vertical overlap with stats is prevented by textContentBottomY regardless of device size.
            right: layout.blackRightPx + (
              followingFeedStyle && !isQuoteCard
                ? feedContent.paddingLeft
                : feedContent.paddingRight
            ),
            bottom: layout.cardHeight - textContentBottomY,
            overflow: 'hidden',
            zIndex: 1,
          }}
        >
          {post.title ? (
            <Text
              style={[
                styles.title,
                {
                  fontSize: feedContent.titleFontSize,
                  marginBottom: feedContent.titleMarginBottom,
                  lineHeight: Math.round(feedContent.titleFontSize * 1.2),
                },
              ]}
              numberOfLines={V.TITLE_MAX_LINES}
            >
              {post.title}
            </Text>
          ) : null}
          <Text
            style={[
              styles.bodyInner,
              {
                fontSize: feedContent.bodyFontSize,
                lineHeight: feedContent.bodyLineHeight,
              },
              isQuoteCard && { fontWeight: '700' as const, fontStyle: 'italic' as const },
            ]}
            numberOfLines={bodyMaxLines}
          >
            {isQuoteCard ? formatPhraseBodyForDisplay(post.body) : post.body}
          </Text>
          {isQuoteCard && showPhraseAuthor && post.quoteAuthor ? (
            <Text
              style={[
                styles.phraseQuoteAuthorInFeed,
                {
                  fontSize: feedContent.phraseAuthorFontSize,
                  lineHeight: Math.round(feedContent.phraseAuthorFontSize * 1.25),
                },
              ]}
              numberOfLines={2}
            >
              {post.quoteAuthor}
            </Text>
          ) : null}
        </View>

        {/* Rim: under stats so the stroke does not paint over icons. */}
        {followingFeedStyle && cardDims ? (
          <ClanCardFeedRimOverlay
            width={cardDims.width}
            height={cardDims.height}
            borderRadius={V.CARD_BORDER_RADIUS}
            clanColor={clanRimColor}
          />
        ) : null}

        {/* Stats — symmetric with the username block (same inset from frame edge on all sides). */}
        <View
          style={{
            position: 'absolute',
            bottom: followingFeedStyle
              ? starPanelVInset + feedContent.paddingBottom
              : V.STATS_BOTTOM,
            right: followingFeedStyle
              ? layout.blackRightPx + feedContent.paddingLeft
              : V.STATS_RIGHT,
            zIndex: 2,
            elevation: 4,
          }}
        >
          {renderFeedStats()}
        </View>
      </View>
    </TouchableOpacity>
  );
}

/**
 * Memoized: with stable `post` references (see useFeedStore) and stable
 * callbacks, an unrelated feed mutation no longer repaints every card —
 * only the card whose post actually changed re-renders.
 */
export const CommunityPostCard = React.memo(CommunityPostCardBase);

const styles = StyleSheet.create({
  svgCrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
  },
  feedUsernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: '100%',
  },
  usernameHit: {
    // Solo ocupa el ancho del nombre (se encoge con elipsis si es largo) para
    // que la insignia y el botón "+" queden pegados al username, no al borde.
    flexShrink: 1,
    minWidth: 0,
  },
  usernameHeader: {
    color: evoconnColors.text,
    fontWeight: '800',
    letterSpacing: 0.5,
    textShadowColor: '#000000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  title: {
    color: evoconnColors.text,
    fontWeight: '800',
  },
  bodyInner: {
    color: evoconnColors.text,
  },
  phraseQuoteAuthorInFeed: {
    color: evoconnColors.muted,
    fontWeight: '600',
    marginTop: 6,
  },
  feedStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: V.STATS_GAP,
  },
  feedStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  feedStatPress: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedStatCount: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
