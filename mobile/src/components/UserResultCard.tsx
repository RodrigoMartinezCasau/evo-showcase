/**
 * UserResultCard
 * ==============
 * Tarjeta de usuario reutilizable extraída de SearchScreen.
 * Usada en: SearchScreen, ClanDisplay (miembros destacados).
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { evoconnColors } from '@evoconn/theme/colors';
import { getClanColor } from '@evoconn/constants/clanColors';
import { UserAvatarFrame } from '@evoconn/components/shared/UserAvatarFrame';

const ICON_SIZE    = 40;
const ICON_SCALE   = 1.2;
const ICON_OFFSET_X = 0;
const ICON_OFFSET_Y = 0;

const RANK_LABELS: Record<string, string> = {
  aprendiz: 'Aprendiz',
  maestro:  'Maestro',
  filosofo: 'Filósofo',
};

export type UserResultCardProps = {
  id: string;
  username: string;
  clanId: string | null;
  rank: string;
  followersCount?: number;
  avatarUri?: string | null;
  /** Porcentaje de afinidad con el clan (opcional, mostrado en display de clan) */
  clanPct?: string;
  onPress?: () => void;
};

export function UserResultCard({
  username,
  clanId,
  rank,
  followersCount,
  avatarUri,
  clanPct,
  onPress,
}: UserResultCardProps) {
  const clanColor  = getClanColor(clanId);

  return (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.7}
      onPress={onPress}
      disabled={!onPress}
    >
      {/* Avatar con foto de perfil o icono de clan */}
      <View style={styles.avatarWrap}>
        <UserAvatarFrame
          clanId={clanId}
          avatarUri={avatarUri}
          size={ICON_SIZE}
          iconScale={ICON_SCALE}
          iconOffsetX={ICON_OFFSET_X}
          iconOffsetY={ICON_OFFSET_Y}
        />
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.username} numberOfLines={1}>
          {username}
        </Text>
        <Text style={styles.meta}>
          {RANK_LABELS[rank] ?? rank}
          {followersCount !== undefined ? ` · ${followersCount} seguidores` : ''}
        </Text>
      </View>

      {/* Porcentaje de clan (solo en modo clan display) */}
      {clanPct !== undefined && (
        <Text style={[styles.pct, { color: clanColor }]}>{clanPct}%</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    paddingHorizontal: 4,
  },
  avatarWrap: {
    width: ICON_SIZE * ICON_SCALE,
    height: ICON_SIZE * ICON_SCALE,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'visible',
  },
  info: {
    flex: 1,
  },
  username: {
    color: evoconnColors.text,
    fontWeight: '700',
    fontSize: 15,
  },
  meta: {
    color: evoconnColors.muted,
    fontSize: 13,
    marginTop: 2,
  },
  pct: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
});
