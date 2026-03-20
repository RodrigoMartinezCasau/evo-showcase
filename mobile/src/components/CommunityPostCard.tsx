import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ImageBackground } from 'react-native';
import type { CommunityPost } from '@evoconn/types';
import { evoconnColors } from '@evoconn/theme/colors';
import { getClanBgAsset, getClanColor } from '@evoconn/constants/clanColors';
import { VoteWidget } from './VoteWidget';
import { CARD_LAYOUT_SHARED, cardLayoutBlockForTier } from '@evoconn/constants/cardLayout';
import { ClanBanner } from './ClanBanner';
import { getCardMaxLinesForTier, getReflectionCardTier } from '@evoconn/utils/getCardSizeFromText';

const S = CARD_LAYOUT_SHARED;

type CommunityPostCardProps = {
  post: CommunityPost;
  onPress: () => void;
  onAuthorPress: () => void;
  onClanPress: () => void;
};

export function CommunityPostCard({ post, onPress, onAuthorPress, onClanPress }: CommunityPostCardProps) {
  const [expanded, setExpanded] = useState(false);
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
    () => getReflectionCardTier(post.author.username, post.title ?? '', post.body ?? ''),
    [post.author.username, post.title, post.body]
  );

  const L = useMemo(() => cardLayoutBlockForTier(cardTier), [cardTier]);
  const collapsedBodyMaxLines = getCardMaxLinesForTier(cardTier);

  const handleCardPress = () => {
    if (isReflection && !expanded) {
      setExpanded(true);
      return;
    }
    onPress();
  };

  if (!isReflection) {
    return (
      <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={[styles.phraseCard]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onAuthorPress}>
            <Text style={styles.username}>{post.author.username}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.body} numberOfLines={4}>
          {post.body}
        </Text>
        <View style={styles.footer}>
          <VoteWidget stats={post.voteStats} compact />
        </View>
      </TouchableOpacity>
    );
  }

  const Outer = outerAsset ? ImageBackground : View;
  const outerProps = outerAsset
    ? { source: outerAsset, resizeMode: 'stretch' as const }
    : {};

  const contentHeightForOuterSizing = measuredBlackBoxContentHeight ?? L.INNER_BOX_MIN_HEIGHT;
  const coloredHeaderHeightForOuterSizing = measuredColoredHeaderHeight ?? L.HEADER_HEIGHT;

  const topSpacerHeightBase = Math.max(0, L.OUTER_TOP_EXTRA_SPACE);
  const dynamicGrowthExtra = contentHeightForOuterSizing * L.OUTER_CARD_VERTICAL_GROWTH_FACTOR;
  const baseBottomSpacerHeight =
    L.OUTER_BOTTOM_FRAME +
    L.OUTER_CARD_BOTTOM_EXTRA_SPACE +
    L.OUTER_CARD_EXTRA_HEIGHT +
    dynamicGrowthExtra;

  const bottomSpacerHeight = Math.max(0, baseBottomSpacerHeight - L.OUTER_CARD_BOTTOM_TRIM);

  const outerMinHeightFromContent =
    coloredHeaderHeightForOuterSizing +
    contentHeightForOuterSizing +
    topSpacerHeightBase +
    bottomSpacerHeight +
    L.OUTER_PADDING_VERTICAL * 2;

  const minHeightGap = Math.max(0, L.OUTER_CARD_MIN_HEIGHT - outerMinHeightFromContent);
  // Collapsed: fixed clan-color outer height per tier (SMALL/MEDIUM/LARGE).
  // Expanded: grow with full content; minHeight gap still redistributes to top spacer.
  const topSpacerHeight = expanded ? topSpacerHeightBase + minHeightGap : topSpacerHeightBase;
  const desiredOuterMinHeight = outerMinHeightFromContent + minHeightGap;

  return (
    <TouchableOpacity activeOpacity={0.92} onPress={handleCardPress}>
      <Outer
        {...outerProps}
        style={[
          styles.outerBase,
          {
            backgroundColor: outerColor,
            paddingHorizontal: L.OUTER_PADDING_HORIZONTAL,
            paddingVertical: L.OUTER_PADDING_VERTICAL,
            ...(expanded
              ? { minHeight: desiredOuterMinHeight, height: undefined }
              : { height: L.OUTER_COLORED_COLLAPSED_HEIGHT, minHeight: undefined }),
          },
        ]}
        imageStyle={styles.outerImage}
      >
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
            style={{
              transform: [{ translateX: L.USERNAME_OFFSET_X }, { translateY: L.USERNAME_OFFSET_Y }],
            }}
          >
            <TouchableOpacity onPress={onAuthorPress}>
              <Text style={styles.usernameHeader}>{post.author.username}</Text>
            </TouchableOpacity>
          </View>
          {authorClanId ? (
            <TouchableOpacity onPress={onClanPress}>
              <ClanBanner clanId={authorClanId} shortLabel={authorClanId.toUpperCase()} small />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.cardBody}>
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

          <View
            style={[
              styles.blackBoxContent,
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
              <Text style={styles.title} numberOfLines={S.CARD_REFLECTION_TITLE_MAX_LINES}>
                {post.title}
              </Text>
            ) : null}

            <Text
              style={styles.bodyInner}
              numberOfLines={expanded ? undefined : collapsedBodyMaxLines}
            >
              {post.body}
            </Text>

            <View style={styles.footer}>
              <VoteWidget stats={post.voteStats} compact />
            </View>
          </View>
        </View>

        <View style={{ height: bottomSpacerHeight }} />
      </Outer>
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
  blackBoxContent: {},
  title: { color: evoconnColors.text, fontWeight: '800', fontSize: 18, marginBottom: 8 },
  body: { color: evoconnColors.muted, fontSize: 14, lineHeight: 20, marginBottom: 10 },
  bodyInner: { color: evoconnColors.text, fontSize: 14, lineHeight: 20, marginBottom: 12 },
  footer: { marginTop: 4 },
});
