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

function hasProfilePhoto(avatarUri?: string | null): boolean {
  const u = avatarUri?.trim();
  if (!u) return false;
  return /^https?:\/\//i.test(u) || u.startsWith('file://');
}

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
  /**
   * `search` — foto o silueta de persona (barra de buscar).
   * `clan` — foto o icono de perfil del clan (p. ej. miembros en pantalla de clan).
   */
  avatarVariant?: 'search' | 'clan';
  onPress?: () => void;
  /** Elemento opcional al final de la fila (p. ej. botón de seguir en destacados). */
  trailing?: React.ReactNode;
};

export function UserResultCard({
  username,
  clanId,
  rank,
  followersCount,
  avatarUri,
  clanPct,
  avatarVariant = 'search',
  onPress,
  trailing,
}: UserResultCardProps) {
  const clanColor  = getClanColor(clanId);
  const showPhoto = hasProfilePhoto(avatarUri);

  return (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.7}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.avatarWrap}>
        <UserAvatarFrame
          clanId={clanId}
          avatarUri={showPhoto ? avatarUri : null}
          size={ICON_SIZE}
          iconScale={ICON_SCALE}
          iconOffsetX={ICON_OFFSET_X}
          iconOffsetY={ICON_OFFSET_Y}
          noPhotoFallback={
            avatarVariant === 'search' ? 'person-silhouette' : 'by-clan'
          }
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

      {/* Acción opcional al final (p. ej. botón de seguir) */}
      {trailing != null ? <View style={styles.trailing}>{trailing}</View> : null}
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
  trailing: {
    marginLeft: 10,
    flexShrink: 0,
    alignSelf: 'center',
    justifyContent: 'center',
  },
});
