import React, { useCallback } from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
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
  const { isFollowing, isFollowPending, toggleFollow } = useFollowState();
  const following = isFollowing(userId);
  const pending = isFollowPending(userId);

  const handlePress = useCallback(() => {
    toggleFollow(userId);
  }, [userId, toggleFollow]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.75}
      style={[
        styles.button,
        pending && styles.buttonPending,
        following && styles.buttonFollowing,
      ]}
    >
      {following ? (
        <Text style={styles.followingText}>Siguiendo</Text>
      ) : pending ? (
        <Text style={styles.pendingText}>Solicitud enviada</Text>
      ) : (
        <View style={styles.seguirRow}>
          <FollowPlusMark />
          <Text style={styles.label}>Seguir</Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(0,0,0,0.4)',
    minWidth: 120,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonPending: {
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  buttonFollowing: {
    borderColor: 'rgba(255,255,255,0.12)',
  },
  followingText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#FFFFFF',
  },
  pendingText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
  },
  seguirRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SEGUIR_ROW_GAP,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1.2,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
});
