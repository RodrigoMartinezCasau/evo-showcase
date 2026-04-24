import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ImageBackground, Image, useWindowDimensions } from 'react-native';
import { FollowButton } from './FollowButton';
import type { CommunityPost } from '@evoconn/types';
import { evoconnColors } from '@evoconn/theme/colors';
import { getClanBgAsset, getClanColor } from '@evoconn/constants/clanColors';
import { VoteWidget } from './VoteWidget';
import { CARD_LAYOUT_SHARED, cardLayoutBlockForTier } from '@evoconn/constants/cardLayout';
import { ClanBanner } from './ClanBanner';
import { getCardMaxLinesForTier, getReflectionCardTier } from '@evoconn/utils/getCardSizeFromText';
import { formatNumber } from '@evoconn/utils/formatNumber';
import { getSmallClanBannerAsset } from '@evoconn/assets/cards/smallClanBanners';
import { getMediumClanBannerAsset } from '@evoconn/assets/cards/mediumClanBanners';
import { getQuoteClanBannerAsset } from '@evoconn/assets/cards/quoteClanBanners';
import { getSmallClanBackgroundSvg } from '@evoconn/assets/cards/smallClanBackgroundsSvg';
import { getMediumClanBackgroundSvg } from '@evoconn/assets/cards/mediumClanBackgroundsSvg';
import { getQuoteClanBackgroundSvg } from '@evoconn/assets/cards/quoteClanBackgroundsSvg';
import { CARD_ASSET_LAYOUT, SIN_CLAN_BANNER_OFFSET_X, SIN_CLAN_BANNER_OFFSET_Y } from '@evoconn/constants/cardAssetLayout';
import { smallStatsIcons } from '@evoconn/assets/icons/smallStats';
import { useFeedStore } from '@evoconn/hooks/useFeedStore';
import { usePersonalProfile } from '@evoconn/hooks/PersonalProfileContext';
import { formatPhraseBodyForDisplay } from '@evoconn/utils/phrasePublish';

const S = CARD_LAYOUT_SHARED;

type CommunityPostCardProps = {
  post: CommunityPost;
  onPress: () => void;
  onAuthorPress: () => void;
  onClanPress: () => void;
  /**
   * Solo en PARA TI (lista compacta). Siguiendo / Más votadas: false.
   * Vistas ampliadas usan `ReflectionDetailItem`, no esta tarjeta.
   */
  showPhraseAuthor?: boolean;
};

export function CommunityPostCard({
  post,
  onPress,
  onAuthorPress,
  onClanPress,
  showPhraseAuthor = false,
}: CommunityPostCardProps) {
  const { updatePostVote, updatePostSaveToggle, getMyVote } = useFeedStore();
  const { savePost, unsavePost, isSaved } = usePersonalProfile();

  // ── Vote state: derived from the shared voteMap so all feeds stay in sync ──
  const myVote = getMyVote(post.id);

  // ── Save state comes from shared context ──
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

  const handleListUp = useCallback(() => {
    const next: 'up' | null = myVote === 'up' ? null : 'up';
    updatePostVote(post.id, myVote, next);
  }, [post.id, myVote, updatePostVote]);

  const handleListDown = useCallback(() => {
    const next: 'down' | null = myVote === 'down' ? null : 'down';
    updatePostVote(post.id, myVote, next);
  }, [post.id, myVote, updatePostVote]);

  const handleListSave = useCallback(() => {
    const now = !isSaved(post.id);
    updatePostSaveToggle(post.id, !now, now);
    if (now) savePost(post);
    else unsavePost(post.id);
  }, [post, isSaved, updatePostSaveToggle, savePost, unsavePost]);

  const smallUpvoted = myVote === 'up';
  const [measuredBlackBoxContentHeight, setMeasuredBlackBoxContentHeight] = useState<number | null>(null);
  const [measuredColoredHeaderHeight, setMeasuredColoredHeaderHeight] = useState<number | null>(null);
  const isReflection = post.type === 'reflection';
  const outerColor = getClanColor(post.author.clanId);
  const outerAsset = getClanBgAsset(post.author.clanId);
  const authorClanId = post.author.clanId;
  const innerAsset = useMemo(
    () => require('../assets/cards/reflection/inner_black.png'),
    []
  );

  const cardTier = useMemo(
    () => {
      if (!isReflection) return 'quote' as const;
      return getReflectionCardTier(post.author.username, post.title ?? '', post.body ?? '');
    },
    [isReflection, post.author.username, post.title, post.body]
  );

  const L = useMemo(() => cardLayoutBlockForTier(cardTier), [cardTier]);
  const collapsedBodyMaxLines = getCardMaxLinesForTier(cardTier);

  // Sin-clan banner offset editor — overrides L.BANNER_OFFSET_X/Y only for
  // cards with no clan. Other clans keep using their per-tier L values.
  const isSinClan = !authorClanId;
  const bannerOffsetX = isSinClan && SIN_CLAN_BANNER_OFFSET_X !== null
    ? SIN_CLAN_BANNER_OFFSET_X
    : L.BANNER_OFFSET_X;
  const bannerOffsetY = isSinClan && SIN_CLAN_BANNER_OFFSET_Y !== null
    ? SIN_CLAN_BANNER_OFFSET_Y
    : L.BANNER_OFFSET_Y;

  const handleCardPress = () => {
    onPress();
  };

  const isSmallCard = cardTier === 'small';
  const isMediumCard = cardTier === 'medium';
  const isQuoteCard = cardTier === 'quote';
  const isCanvaCard = isSmallCard || isMediumCard || isQuoteCard;

  // SVG background component for canva cards (replaces PNG ImageBackground)
  const CardBgSvg = useMemo(() => {
    if (isSmallCard) return getSmallClanBackgroundSvg(post.author.clanId);
    if (isMediumCard) return getMediumClanBackgroundSvg(post.author.clanId);
    if (isQuoteCard) return getQuoteClanBackgroundSvg(post.author.clanId);
    return null;
  }, [isSmallCard, isMediumCard, isQuoteCard, post.author.clanId]);

  // Non-canva fallback (legacy path — currently unreachable since all cards are canva)
  const resolvedOuterAsset = isCanvaCard ? undefined : outerAsset;
  const Outer = (!isCanvaCard && resolvedOuterAsset) ? ImageBackground : View;
  const outerProps = (!isCanvaCard && resolvedOuterAsset)
    ? { source: resolvedOuterAsset, resizeMode: 'stretch' as const }
    : {};

  const canvaBannerAsset = isSmallCard
    ? getSmallClanBannerAsset(post.author.clanId)
    : isMediumCard
      ? getMediumClanBannerAsset(post.author.clanId)
      : isQuoteCard
        ? getQuoteClanBannerAsset(post.author.clanId)
        : undefined;

  

  const feedUpvoteIcon = smallUpvoted ? smallStatsIcons.upvoteActive : smallStatsIcons.upvoteInactive;
  const feedSaveIcon = isPostSaved ? smallStatsIcons.saveActive : smallStatsIcons.saveInactive;

  const renderFeedStats = () => (
    <>
      <View style={styles.feedStatItem}>
        <TouchableOpacity
          onPress={handleSmallUp}
          style={styles.feedStatPress}
          hitSlop={8}
        >
          <View style={{ transform: [{ translateX: L.UPVOTE_OFFSET_X }, { translateY: L.UPVOTE_OFFSET_Y }] }}>
            <Image source={feedUpvoteIcon} resizeMode="contain" style={{ width: L.UPVOTE_ICON_WIDTH, height: L.UPVOTE_ICON_HEIGHT }} />
          </View>
        </TouchableOpacity>
        <View style={{ transform: [{ translateX: L.UPVOTE_COUNT_OFFSET_X }, { translateY: L.UPVOTE_COUNT_OFFSET_Y }] }}>
          <Text style={styles.feedStatCount}>
            {isQuoteCard ? formatNumber(post.voteStats.up) : post.voteStats.up}
          </Text>
        </View>
      </View>
      <View style={styles.feedStatItem}>
        <TouchableOpacity
          onPress={handleSmallSave}
          style={styles.feedStatPress}
          hitSlop={8}
        >
          <View style={{ transform: [{ translateX: L.SAVE_OFFSET_X }, { translateY: L.SAVE_OFFSET_Y }] }}>
            <Image source={feedSaveIcon} resizeMode="contain" style={{ width: L.SAVE_ICON_WIDTH, height: L.SAVE_ICON_HEIGHT }} />
          </View>
        </TouchableOpacity>
        <View style={{ transform: [{ translateX: L.SAVE_COUNT_OFFSET_X }, { translateY: L.SAVE_COUNT_OFFSET_Y }] }}>
          <Text style={styles.feedStatCount}>
            {isQuoteCard ? formatNumber(post.voteStats.save) : post.voteStats.save}
          </Text>
        </View>
      </View>
    </>
  );

  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = screenWidth - 24;

  const contentHeightForOuterSizing = measuredBlackBoxContentHeight ?? L.INNER_BOX_MIN_HEIGHT;
  const coloredHeaderHeightForOuterSizing = measuredColoredHeaderHeight ?? L.HEADER_HEIGHT;

  const topSpacerHeightBase = Math.max(0, L.OUTER_TOP_EXTRA_SPACE);
  const dynamicGrowthExtra = contentHeightForOuterSizing * L.OUTER_CARD_VERTICAL_GROWTH_FACTOR;
  const baseBottomSpacerHeight =
    L.OUTER_BOTTOM_FRAME +
    L.OUTER_CARD_BOTTOM_EXTRA_SPACE +
    L.OUTER_CARD_EXTRA_HEIGHT +
    dynamicGrowthExtra;

  const bottomSpacerHeight = isCanvaCard
    ? 0
    : Math.max(0, baseBottomSpacerHeight - L.OUTER_CARD_BOTTOM_TRIM);

  const outerMinHeightFromContent =
    coloredHeaderHeightForOuterSizing +
    contentHeightForOuterSizing +
    topSpacerHeightBase +
    bottomSpacerHeight +
    L.OUTER_PADDING_VERTICAL * 2;

  const minHeightGap = Math.max(0, L.OUTER_CARD_MIN_HEIGHT - outerMinHeightFromContent);
  const topSpacerHeight = isCanvaCard ? 0 : topSpacerHeightBase;
  const desiredOuterMinHeight = outerMinHeightFromContent + minHeightGap;

  const QA = CARD_ASSET_LAYOUT.QUOTE;
  const cropTop = isSmallCard
    ? CARD_ASSET_LAYOUT.SMALL.SMALL_CARD_CROP_TOP
    : isMediumCard ? CARD_ASSET_LAYOUT.MEDIUM.MEDIUM_CARD_CROP_TOP
    : isQuoteCard ? QA.QUOTE_CARD_CROP_TOP : 0;
  const cropBottom = isSmallCard
    ? CARD_ASSET_LAYOUT.SMALL.SMALL_CARD_CROP_BOTTOM
    : isMediumCard ? CARD_ASSET_LAYOUT.MEDIUM.MEDIUM_CARD_CROP_BOTTOM
    : isQuoteCard ? QA.QUOTE_CARD_CROP_BOTTOM : 0;
  const feedSpacing = isSmallCard
    ? CARD_ASSET_LAYOUT.SMALL.SMALL_FEED_SPACING_BOTTOM
    : isMediumCard ? CARD_ASSET_LAYOUT.MEDIUM.MEDIUM_FEED_SPACING_BOTTOM
    : isQuoteCard ? QA.QUOTE_FEED_SPACING_BOTTOM : 0;
  const needsCropWrapper = isCanvaCard && (cropTop > 0 || cropBottom > 0 || feedSpacing !== 0);

  const cardContent = (
      <Outer
        {...outerProps}
        style={[
          styles.outerBase,
          {
            backgroundColor: isCanvaCard ? 'transparent' : outerColor,
            paddingHorizontal: L.OUTER_PADDING_HORIZONTAL,
            paddingVertical: L.OUTER_PADDING_VERTICAL,
            transform: [
              { translateX: L.CARD_GROUP_OFFSET_X },
              { translateY: L.CARD_GROUP_OFFSET_Y },
            ],
            height: L.OUTER_COLORED_COLLAPSED_HEIGHT,
            minHeight: undefined,
          },
        ]}
      >
        {isCanvaCard && CardBgSvg ? (
          <CardBgSvg
            width={cardWidth}
            height={L.OUTER_COLORED_COLLAPSED_HEIGHT}
            style={StyleSheet.absoluteFillObject}
            preserveAspectRatio="none"
          />
        ) : null}
        {topSpacerHeight > 0 ? <View style={{ height: topSpacerHeight }} /> : null}

        <View
          style={[
            styles.coloredHeader,
            {
              paddingHorizontal: S.HEADER_PADDING_HORIZONTAL,
              minHeight: L.HEADER_HEIGHT,
            },
          ]}
          onLayout={(e) => {
            const next = e.nativeEvent.layout.height;
            if (measuredColoredHeaderHeight === next) return;
            setMeasuredColoredHeaderHeight(next);
          }}
        >
          <View
            pointerEvents="box-none"
            style={[
              styles.usernameFollowRow,
              {
                transform: [{ translateX: L.USERNAME_OFFSET_X }, { translateY: L.USERNAME_OFFSET_Y }],
              },
            ]}
          >
            <TouchableOpacity onPress={onAuthorPress}>
              <Text style={styles.usernameHeader}>{post.author.username}</Text>
            </TouchableOpacity>
            <FollowButton
              authorId={post.author.id}
              authorClanId={post.author.clanId}
              context="community"
            />
          </View>
          {isCanvaCard && canvaBannerAsset ? (
            <View
              pointerEvents="none"
              style={{
                transform: [{ translateX: bannerOffsetX }, { translateY: bannerOffsetY }],
              }}
            >
              <Image
                source={canvaBannerAsset}
                resizeMode="contain"
                style={[
                  styles.canvaBanner,
                  {
                    width: L.BANNER_WIDTH,
                    height: L.BANNER_HEIGHT,
                    transform: [{ scale: L.BANNER_SCALE }],
                  },
                ]}
              />
            </View>
          ) : null}
          {!isCanvaCard && authorClanId ? (
            <TouchableOpacity onPress={onClanPress}>
              <ClanBanner clanId={authorClanId} shortLabel={authorClanId.toUpperCase()} small />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.cardBody}>
          {!isCanvaCard ? (
            <ImageBackground
              source={innerAsset}
              resizeMode="stretch"
              pointerEvents="none"
              imageStyle={styles.blackBgImage}
              style={[
                styles.blackBg,
                {
                  top: L.INNER_BLACK_INSET_TOP - L.INNER_BLACK_EXPAND_Y / 2,
                  bottom: L.INNER_BLACK_INSET_BOTTOM - L.INNER_BLACK_EXPAND_Y / 2,
                  left: L.INNER_BLACK_INSET_LEFT - L.INNER_BLACK_EXPAND_X / 2,
                  right: L.INNER_BLACK_INSET_RIGHT - L.INNER_BLACK_EXPAND_X / 2,
                  borderRadius: S.INNER_BLACK_BOX_RADIUS,
                  minHeight: contentHeightForOuterSizing,
                  transform: [
                    { translateX: L.INNER_BLACK_NUDGE_X },
                    { translateY: L.INNER_BLACK_NUDGE_Y },
                  ],
                },
              ]}
            />
          ) : null}

          <View
            style={[
              isCanvaCard ? styles.blackBoxContentCanva : styles.blackBoxContent,
              {
                marginTop: L.INNER_BLACK_CONTENT_MARGIN_TOP,
                marginBottom: L.INNER_BLACK_CONTENT_MARGIN_BOTTOM,
                marginLeft: L.INNER_BLACK_CONTENT_MARGIN_LEFT,
                marginRight: L.INNER_BLACK_CONTENT_MARGIN_RIGHT,
                paddingHorizontal: L.INNER_BLACK_PADDING_HORIZONTAL,
                paddingVertical: L.INNER_BLACK_PADDING_VERTICAL,
              },
            ]}
            onLayout={(e) => {
              const next = e.nativeEvent.layout.height;
              if (measuredBlackBoxContentHeight === next) return;
              setMeasuredBlackBoxContentHeight(next);
            }}
          >
            {post.title ? (
              <View
                style={{
                  transform: [{ translateX: L.TITLE_OFFSET_X }, { translateY: L.TITLE_OFFSET_Y }],
                }}
              >
                <Text style={styles.title} numberOfLines={S.CARD_REFLECTION_TITLE_MAX_LINES}>
                  {post.title}
                </Text>
              </View>
            ) : null}

            <View
              style={{
                transform: [{ translateX: L.BODY_OFFSET_X }, { translateY: L.BODY_OFFSET_Y }],
              }}
            >
              <Text
                style={[styles.bodyInner, isQuoteCard && { fontWeight: '700' as const, fontStyle: 'italic' as const }]}
                numberOfLines={collapsedBodyMaxLines}
              >
                {isQuoteCard ? formatPhraseBodyForDisplay(post.body) : post.body}
              </Text>
              {isQuoteCard && showPhraseAuthor && post.quoteAuthor ? (
                <Text style={styles.phraseQuoteAuthorInFeed} numberOfLines={2}>
                  {post.quoteAuthor}
                </Text>
              ) : null}
            </View>

            {isCanvaCard && L.STATS_ABSOLUTE_BOTTOM < 0 ? (
              <View
                style={[
                  styles.feedStatsRow,
                  {
                    gap: L.STATS_GAP,
                    alignSelf: 'flex-end',
                    transform: [
                      { translateX: L.STATS_ROW_OFFSET_X + L.STATS_OFFSET_X },
                      { translateY: L.STATS_ROW_OFFSET_Y + L.STATS_OFFSET_Y },
                      { scale: L.STATS_SCALE },
                    ],
                  },
                ]}
              >
                {renderFeedStats()}
              </View>
            ) : !isCanvaCard ? (
              <View
                style={[
                  styles.footer,
                  {
                    transform: [{ translateX: L.STATS_OFFSET_X }, { translateY: L.STATS_OFFSET_Y }],
                  },
                ]}
              >
                <VoteWidget
                  stats={post.voteStats}
                  voted={myVote}
                  compact
                  onUp={handleListUp}
                  onDown={handleListDown}
                  onSave={handleListSave}
                />
              </View>
            ) : null}
          </View>
        </View>

        {isCanvaCard && L.STATS_ABSOLUTE_BOTTOM >= 0 ? (
          <View
            style={[
              styles.feedStatsRowAbsolute,
              {
                bottom: L.STATS_ABSOLUTE_BOTTOM + L.STATS_OFFSET_Y,
                right: L.STATS_ABSOLUTE_RIGHT - L.STATS_OFFSET_X,
                gap: L.STATS_GAP,
                transform: [{ scale: L.STATS_SCALE }],
              },
            ]}
          >
            {renderFeedStats()}
          </View>
        ) : null}

        <View style={{ height: bottomSpacerHeight }} />
      </Outer>
  );

  return (
    <TouchableOpacity activeOpacity={0.92} onPress={handleCardPress}>
      {needsCropWrapper ? (
        <View
          style={{
            overflow: 'hidden',
            height: L.OUTER_COLORED_COLLAPSED_HEIGHT - cropTop - cropBottom,
            marginBottom: feedSpacing,
          }}
        >
          <View style={{ marginTop: -cropTop }}>
            {cardContent}
          </View>
        </View>
      ) : (
        cardContent
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  phraseCard: {
    backgroundColor: evoconnColors.card,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 12,
    marginVertical: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  username: { color: evoconnColors.text, fontWeight: '600', fontSize: 14 },
  outerBase: {
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: S.CARD_BORDER_RADIUS,
    overflow: 'hidden',
  },
  outerImage: {
    borderRadius: S.CARD_BORDER_RADIUS,
  },
  coloredHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  usernameFollowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  usernameHeader: {
    color: evoconnColors.text,
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  cardBody: {
    position: 'relative',
    width: '100%',
  },
  blackBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  blackBgImage: {
    borderRadius: S.INNER_BLACK_BOX_RADIUS,
  },
  blackBoxContent: { overflow: 'hidden' },
  blackBoxContentCanva: { overflow: 'visible' },
  feedStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  feedStatsRowAbsolute: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
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
    color: evoconnColors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  canvaBanner: {
    width: 120,
    height: 42,
  },
  title: { color: evoconnColors.text, fontWeight: '800', fontSize: 18, marginBottom: 8 },
  body: { color: evoconnColors.muted, fontSize: 14, lineHeight: 20, marginBottom: 10 },
  bodyInner: { color: evoconnColors.text, fontSize: 14, lineHeight: 20, marginBottom: 12 },
  phraseQuoteAuthorInFeed: {
    color: evoconnColors.muted,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: -4,
    marginBottom: 4,
  },
  footer: { marginTop: 4 },
});
