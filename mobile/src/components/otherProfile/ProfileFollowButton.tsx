import React, { useRef, useCallback, useEffect } from 'react';
import { TouchableOpacity, Animated, Text, StyleSheet, View } from 'react-native';
import { useFollowState } from '@evoconn/hooks/useFollowState';

type Props = {
  userId: string;
  /** Conservado por compatibilidad con el layout; el icono es neutro (blanco). */
  clanId: string | null | undefined;
};

/** + dibujado con vistas: grosor real, no depende del trazo de la fuente del sistema. */
function FollowPlusMark({ color = '#FFFFFF' }: { color?: string }) {
  const arm = 13;
  const thick = 2.5;
  const cap = thick / 2;
  return (
    <View style={followPlusStyles.box}>
      <View
        style={[
          followPlusStyles.bar,
          {
            width: arm,
            height: thick,
            borderRadius: cap,
            backgroundColor: color,
          },
        ]}
      />
      <View
        style={[
          followPlusStyles.bar,
          {
            width: thick,
            height: arm,
            borderRadius: cap,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
}

const followPlusStyles = StyleSheet.create({
  box: {
    width: 13,
    height: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bar: {
    position: 'absolute',
  },
});
/** Espacio entre el + y «Seguir» (fila centrada en el botón). */
const SEGUIR_ROW_GAP = 8;

export const ProfileFollowButton = React.memo(function ProfileFollowButton({ userId }: Props) {
  const { isFollowing, toggleFollow } = useFollowState();
  const following = isFollowing(userId);

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
        <Animated.View style={[styles.textWrap, { opacity: fadeAnim }]}>
          <Text style={styles.followingText}>Siguiendo</Text>
        </Animated.View>

        <Animated.View
          style={[styles.seguirRow, { opacity: Animated.subtract(1, fadeAnim) }]}
        >
          <FollowPlusMark />
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
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(0,0,0,0.4)',
    minWidth: 120,
    minHeight: 44,
  },
  inner: {
    ...StyleSheet.absoluteFillObject,
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
  /** Icono + texto como un bloque centrado: mismo eje Y y poco espacio entre ambos. */
  seguirRow: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SEGUIR_ROW_GAP,
    zIndex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1.2,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
});
