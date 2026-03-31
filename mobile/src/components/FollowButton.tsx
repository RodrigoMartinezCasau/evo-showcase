import React, { useRef, useCallback, useEffect } from 'react';
import { TouchableOpacity, Animated, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { getClanSecondaryColor } from '@evoconn/constants/clanColors';
import { useFollowState } from '@evoconn/hooks/useFollowState';
import {
  COMMUNITY_FOLLOW_BUTTON_LAYOUT,
  DETAIL_FOLLOW_BUTTON_LAYOUT,
  FORYOU_FOLLOW_BUTTON_LAYOUT,
} from '@evoconn/constants/followButtonLayout';

type FollowButtonContext = 'community' | 'detail' | 'foryou';

type FollowButtonProps = {
  authorId: string;
  authorClanId: string | null | undefined;
  context: FollowButtonContext;
};

const LAYOUT_BY_CONTEXT: Record<FollowButtonContext, { offsetX: number; offsetY: number; scale: number }> = {
  community: COMMUNITY_FOLLOW_BUTTON_LAYOUT,
  detail: DETAIL_FOLLOW_BUTTON_LAYOUT,
  foryou: FORYOU_FOLLOW_BUTTON_LAYOUT,
};

const BASE_SIZE = 28;

function FollowPlusSvg({ borderColor, size }: { borderColor: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 600 600">
      <Path
        d="M600 241.8 H358.2 V0 H241.8 V241.8 H0 V358.2 H241.8 V600 H358.2 V358.2 H600 Z"
        fill={borderColor}
      />
      <Path
        d="M584.2 235.5 H348.8 V0 H235.5 V235.5 H0 V348.8 H235.5 V584.2 H348.8 V348.8 H584.2 Z"
        fill="#ffffff"
      />
    </Svg>
  );
}

export const FollowButton = React.memo(function FollowButton({
  authorId,
  authorClanId,
  context,
}: FollowButtonProps) {
  const { isFollowing, toggleFollow } = useFollowState();
  const following = isFollowing(authorId);

  const scaleAnim = useRef(new Animated.Value(following ? 0 : 1)).current;
  const opacityAnim = useRef(new Animated.Value(following ? 0 : 1)).current;
  const prevFollowing = useRef(following);
  const busy = useRef(false);

  useEffect(() => {
    if (prevFollowing.current === following) return;
    prevFollowing.current = following;

    if (following) {
      busy.current = true;
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1.3,
          friction: 4,
          tension: 300,
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 0,
            duration: 180,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 180,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => { busy.current = false; });
    } else {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
      busy.current = true;
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 120,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 240,
          useNativeDriver: true,
        }),
      ]).start(() => { busy.current = false; });
    }
  }, [following, scaleAnim, opacityAnim]);

  const handlePress = useCallback(() => {
    if (following || busy.current) return;
    toggleFollow(authorId);
  }, [following, authorId, toggleFollow]);

  const layout = LAYOUT_BY_CONTEXT[context];
  const sz = BASE_SIZE * layout.scale;
  const borderColor = getClanSecondaryColor(authorClanId);

  return (
    <Animated.View
      pointerEvents={following ? 'none' : 'auto'}
      style={[
        styles.root,
        {
          transform: [
            { translateX: layout.offsetX },
            { translateY: layout.offsetY },
            { scale: scaleAnim },
          ],
          opacity: opacityAnim,
        },
      ]}
    >
      <TouchableOpacity onPress={handlePress} activeOpacity={0.7} hitSlop={6}>
        <FollowPlusSvg borderColor={borderColor} size={sz} />
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  root: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
