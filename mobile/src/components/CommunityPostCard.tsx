import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  useWindowDimensions,
} from 'react-native';
import { FollowButton } from './FollowButton';
import type { CommunityPost } from '@evoconn/types';
import { evoconnColors } from '@evoconn/theme/colors';
import { getReflectionCardTier } from '@evoconn/utils/getCardSizeFromText';
import { formatNumber } from '@evoconn/utils/formatNumber';
import { getSmallClanBannerAsset, type BannerAsset } from '@evoconn/assets/cards/smallClanBanners';
import { getMediumClanBannerAsset } from '@evoconn/assets/cards/mediumClanBanners';
import { getQuoteClanBannerAsset } from '@evoconn/assets/cards/quoteClanBanners';
import { getSmallClanBackgroundSvg } from '@evoconn/assets/cards/smallClanBackgroundsSvg';
import { getMediumClanBackgroundSvg } from '@evoconn/assets/cards/mediumClanBackgroundsSvg';
import { getQuoteClanBackgroundSvg } from '@evoconn/assets/cards/quoteClanBackgroundsSvg';
import { smallStatsIcons } from '@evoconn/assets/icons/smallStats';
import { useFeedStore } from '@evoconn/hooks/useFeedStore';
import { usePersonalProfile } from '@evoconn/hooks/PersonalProfileContext';
import { formatPhraseBodyForDisplay } from '@evoconn/utils/phrasePublish';
import {
  computeSvgCardLayout,
  getBodyMaxLines,
  SVG_CARD_VISUAL,
} from '@evoconn/constants/svgCardLayout';

const V = SVG_CARD_VISUAL;

type CommunityPostCardProps = {
  post: CommunityPost;
  onPress: () => void;
  onAuthorPress: () => void;
  onClanPress: () => void;
  /**
   * Solo en PARA TI (lista compacta). Siguiendo: false.
   * Vistas ampliadas usan `ReflectionDetailItem`, no esta tarjeta.
   */
  showPhraseAuthor?: boolean;
};

export function CommunityPostCard({
  post,
  onPress,
  onAuthorPress,
  onClanPress: _onClanPress,
  showPhraseAuthor = false,
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

  const bannerAsset = useMemo(() => {
    if (cardTier === 'small') return getSmallClanBannerAsset(post.author.clanId);
    if (cardTier === 'medium') return getMediumClanBannerAsset(post.author.clanId);
    return getQuoteClanBannerAsset(post.author.clanId);
  }, [cardTier, post.author.clanId]);

  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = screenWidth - V.CARD_HORIZONTAL_MARGIN * 2;
  const layout = useMemo(
    () => computeSvgCardLayout(cardTier, cardWidth),
    [cardTier, cardWidth]
  );

  const bodyMaxLines = getBodyMaxLines(cardTier);
  const smallUpvoted = myVote === 'up';
  const feedUpvoteIcon = smallUpvoted ? smallStatsIcons.upvoteActive : smallStatsIcons.upvoteInactive;
  const feedSaveIcon = isPostSaved ? smallStatsIcons.saveActive : smallStatsIcons.saveInactive;

  const renderFeedStats = () => (
    <View style={styles.feedStatsRow}>
      <View style={styles.feedStatItem}>
        <TouchableOpacity onPress={handleSmallUp} hitSlop={8} style={styles.feedStatPress}>
          <Image
            source={feedUpvoteIcon}
            resizeMode="contain"
            style={{ width: V.STATS_ICON_SIZE, height: V.STATS_ICON_SIZE }}
          />
        </TouchableOpacity>
        <Text style={styles.feedStatCount}>
          {isQuoteCard ? formatNumber(post.voteStats.up) : post.voteStats.up}
        </Text>
      </View>
      <View style={styles.feedStatItem}>
        <TouchableOpacity onPress={handleSmallSave} hitSlop={8} style={styles.feedStatPress}>
          <Image
            source={feedSaveIcon}
            resizeMode="contain"
            style={{ width: V.STATS_ICON_SIZE, height: V.STATS_ICON_SIZE }}
          />
        </TouchableOpacity>
        <Text style={styles.feedStatCount}>
          {isQuoteCard ? formatNumber(post.voteStats.save) : post.voteStats.save}
        </Text>
      </View>
    </View>
  );

  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onPress}>
      <View
        style={{
          width: cardWidth,
          height: layout.cardHeight,
          marginHorizontal: V.CARD_HORIZONTAL_MARGIN,
          marginVertical: V.CARD_VERTICAL_MARGIN,
        }}
      >
        {/* SVG background — cropped to the colored frame area */}
        <View
          style={[
            styles.svgCrop,
            { width: cardWidth, height: layout.cardHeight, borderRadius: V.CARD_BORDER_RADIUS },
          ]}
          pointerEvents="none"
        >
          <CardBgSvg
            width={layout.svgRenderSize}
            height={layout.svgRenderSize}
            style={{ position: 'absolute', top: -layout.svgCropTop, left: 0 }}
            preserveAspectRatio="xMidYMid meet"
          />
        </View>

        {/* Top colored strip — username + follow button */}
        <View
          style={[
            styles.topStrip,
            {
              height: layout.blackTopPx,
              paddingHorizontal: V.TOP_STRIP_PADDING_X,
            },
          ]}
        >
          <TouchableOpacity onPress={onAuthorPress} hitSlop={6}>
            <Text style={styles.usernameHeader} numberOfLines={1}>
              {post.author.username}
            </Text>
          </TouchableOpacity>
          <FollowButton
            authorId={post.author.id}
            authorClanId={post.author.clanId}
            context="community"
          />
        </View>

        {/* Inner black area — title + body */}
        <View
          style={{
            position: 'absolute',
            top: layout.blackTopPx + V.CONTENT_PADDING_TOP,
            left: layout.blackLeftPx + V.CONTENT_PADDING_X,
            right: layout.blackRightPx + V.CONTENT_PADDING_X,
            bottom: layout.cardHeight - layout.blackBottomPx + V.CONTENT_PADDING_BOTTOM,
            overflow: 'hidden',
          }}
        >
          {post.title ? (
            <Text style={styles.title} numberOfLines={V.TITLE_MAX_LINES}>
              {post.title}
            </Text>
          ) : null}
          <Text
            style={[
              styles.bodyInner,
              isQuoteCard && { fontWeight: '700' as const, fontStyle: 'italic' as const },
            ]}
            numberOfLines={bodyMaxLines}
          >
            {isQuoteCard ? formatPhraseBodyForDisplay(post.body) : post.body}
          </Text>
          {isQuoteCard && showPhraseAuthor && post.quoteAuthor ? (
            <Text style={styles.phraseQuoteAuthorInFeed} numberOfLines={2}>
              {post.quoteAuthor}
            </Text>
          ) : null}
        </View>

        {/* Stats — horizontal, bottom-right of the colored frame (below black box) */}
        <View
          style={{
            position: 'absolute',
            bottom: V.STATS_BOTTOM,
            right: V.STATS_RIGHT,
          }}
        >
          {renderFeedStats()}
        </View>

        {/* Banner (estandarte) — top-right corner.
            PNG clans → <Image source={number}>.
            Sin-clan → SVG component rendered directly. */}
        {bannerAsset ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: V.BANNER_TOP,
              right: V.BANNER_RIGHT,
              width: V.BANNER_SIZE,
              height: V.BANNER_SIZE,
            }}
          >
            {typeof bannerAsset === 'function' ? (() => {
                const BannerSvg = bannerAsset as React.ComponentType<{ width?: number; height?: number }>;
                return <BannerSvg width={V.BANNER_SIZE} height={V.BANNER_SIZE} />;
              })() : (
              <Image
                source={bannerAsset as number}
                resizeMode="contain"
                style={{ width: V.BANNER_SIZE, height: V.BANNER_SIZE }}
              />
            )}
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  svgCrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
  },
  topStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  usernameHeader: {
    color: evoconnColors.text,
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.5,
    textShadowColor: '#000000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  title: {
    color: evoconnColors.text,
    fontWeight: '800',
    fontSize: 18,
    marginBottom: 6,
  },
  bodyInner: {
    color: evoconnColors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  phraseQuoteAuthorInFeed: {
    color: evoconnColors.muted,
    fontSize: 13,
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
    color: evoconnColors.text,
    fontSize: 12,
    fontWeight: '600',
  },
});
