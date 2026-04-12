import React, { useRef, useCallback, useEffect } from 'react';
import { TouchableOpacity, Animated, Text, StyleSheet, View } from 'react-native';
import { getFollowPlusButtonByHouse } from '@evoconn/utils/getFollowPlusButtonByHouse';
import { useFollowState } from '@evoconn/hooks/useFollowState';
import {
  FOLLOW_BUTTON_PLUS_OFFSET_X,
  FOLLOW_BUTTON_PLUS_OFFSET_Y,
  FOLLOW_BUTTON_PLUS_SCALE,
  FOLLOW_BUTTON_SEGUIR_TEXT_OFFSET_X,
  FOLLOW_BUTTON_SEGUIR_TEXT_OFFSET_Y,
  FOLLOW_BUTTON_SEGUIR_TEXT_SCALE,
} from '@evoconn/constants/personalProfileLayout';

type Props = {
  userId: string;
  clanId: string | null | undefined;
};

const PLUS_SIZE = 38;
const INNER_PLUS_BASE_LEFT = 24;
const INNER_SEGUIR_BASE_LEFT = 62;
const SEGUIR_TEXT_HALF_LINE = 10;

export const PersonalFollowButton = React.memo(function PersonalFollowButton({ userId, clanId }: Props) {
  const { isFollowing, toggleFollow } = useFollowState();
  const following = isFollowing(userId);

  const PlusSvg = getFollowPlusButtonByHouse(clanId);

  const fadeAnim = useRef(new Animated.Value(following ? 1 : 0)).current;
  const prevFollowing = useRef(following);

  useEffect(() => {
    if (prevFollowing.current === following) return;
    prevFollowing.current = following;
    Animated.timing(fadeAnim, {
      toValue: following ? 1 : 0,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [following, fadeAnim]);

  const handlePress = useCallback(() => {
    toggleFollow(userId);
  }, [userId, toggleFollow]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.75}
      style={styles.button}
    >
      <View style={styles.inner} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.plusWrap,
            {
              opacity: Animated.subtract(1, fadeAnim),
              left: INNER_PLUS_BASE_LEFT + FOLLOW_BUTTON_PLUS_OFFSET_X,
              marginTop: -PLUS_SIZE / 2 + FOLLOW_BUTTON_PLUS_OFFSET_Y,
              transform: [{ scale: FOLLOW_BUTTON_PLUS_SCALE }],
            },
          ]}
        >
          <PlusSvg width={PLUS_SIZE} height={PLUS_SIZE} />
        </Animated.View>

        <Animated.View style={[styles.textWrap, { opacity: fadeAnim }]}>
          <Text style={styles.followingText}>Siguiendo</Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.seguirWrap,
            {
              opacity: Animated.subtract(1, fadeAnim),
              left: INNER_SEGUIR_BASE_LEFT + FOLLOW_BUTTON_SEGUIR_TEXT_OFFSET_X,
              marginTop: -SEGUIR_TEXT_HALF_LINE + FOLLOW_BUTTON_SEGUIR_TEXT_OFFSET_Y,
              transform: [{ scale: FOLLOW_BUTTON_SEGUIR_TEXT_SCALE }],
            },
          ]}
        >
          <Text style={styles.label}>Seguir</Text>
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  button: {
    position: 'relative',
    overflow: 'visible',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(0,0,0,0.4)',
    minWidth: 120,
    minHeight: 52,
  },
  inner: {
    ...StyleSheet.absoluteFillObject,
  },
  plusWrap: {
    position: 'absolute',
    top: '50%',
    zIndex: 1,
  },
  textWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  followingText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#FFFFFF',
  },
  seguirWrap: {
    position: 'absolute',
    top: '50%',
    zIndex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1.2,
    color: '#FFFFFF',
  },
});
