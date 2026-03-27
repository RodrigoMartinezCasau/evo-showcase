import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { SIDEBAR_CLAN_INSIGNIA_LAYOUT as INS } from '@evoconn/constants/sidebarClanInsigniaLayout';
import { SIDEBAR_FOOTER_PROFILE_TEXT_LAYOUT as L } from '@evoconn/constants/sidebarFooterProfileTextLayout';
import { getSidebarFooterClanLineColor } from '@evoconn/constants/clanColors';
import { INRIA_SERIF_FONT_FAMILY } from '@evoconn/constants/inriaSerifFontFamily';
import type { Rank } from '@evoconn/types';

const INSIGNIA_VIEWBOX = 600;

const RANK_LABEL: Record<Rank, string> = {
  aprendiz: 'APRENDIZ',
  maestro: 'MAESTRO',
  filosofo: 'FILOSOFO',
};

type SidebarFooterProfileTextProps = {
  username: string;
  clanId: string | null;
  rank: Rank;
  onPressProfile: () => void;
  onPressClan: () => void;
};

function formatClanLine(clanId: string | null): string {
  if (clanId == null || clanId.trim() === '') {
    return 'CLAN POR DEFINIR';
  }
  return `CLAN ${clanId.trim().toUpperCase()}`;
}

/**
 * Capa absoluta: anclada a la derecha de la insignia inferior; no afecta al flex del drawer.
 */
export function SidebarFooterProfileText({
  username,
  clanId,
  rank,
  onPressProfile,
  onPressClan,
}: SidebarFooterProfileTextProps) {
  const bs = L.SIDEBAR_FOOTER_PROFILE_TEXT_BLOCK_SCALE;
  const insW = INSIGNIA_VIEWBOX * INS.SIDEBAR_CLAN_INSIGNIA_SCALE;

  const mode = L.SIDEBAR_FOOTER_PROFILE_TEXT_BLOCK_POSITION_MODE;
  const posX = L.SIDEBAR_FOOTER_PROFILE_TEXT_BLOCK_POS_X;
  const posY = L.SIDEBAR_FOOTER_PROFILE_TEXT_BLOCK_POS_Y;

  const left =
    mode === 'drawer_edges'
      ? posX
      : INS.SIDEBAR_CLAN_INSIGNIA_OFFSET_X +
        insW +
        L.SIDEBAR_FOOTER_PROFILE_TEXT_GAP_AFTER_INSIGNIA +
        posX;

  const bottom =
    mode === 'drawer_edges'
      ? posY
      : INS.SIDEBAR_CLAN_INSIGNIA_OFFSET_Y + posY;

  const clanLine = useMemo(() => formatClanLine(clanId), [clanId]);
  const clanColor = useMemo(() => getSidebarFooterClanLineColor(clanId), [clanId]);
  const rankLine = RANK_LABEL[rank] ?? rank.toUpperCase();

  const serif = { fontFamily: INRIA_SERIF_FONT_FAMILY };

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        {
          left,
          bottom,
        },
      ]}
    >
      <TouchableOpacity
        onPress={onPressProfile}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Perfil"
        hitSlop={6}
        style={{
          marginLeft: L.SIDEBAR_FOOTER_PROFILE_TEXT_LINE1_OFFSET_X * bs,
          marginTop: L.SIDEBAR_FOOTER_PROFILE_TEXT_LINE1_OFFSET_Y * bs,
        }}
      >
        <Text
          style={[
            styles.line1,
            {
              fontSize: L.SIDEBAR_FOOTER_PROFILE_TEXT_LINE1_FONT_SIZE * bs,
              color: L.SIDEBAR_FOOTER_PROFILE_TEXT_LINE1_COLOR,
            },
          ]}
          numberOfLines={1}
        >
          {username.toUpperCase()}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onPressClan}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Clan"
        hitSlop={6}
        style={{
          marginLeft: L.SIDEBAR_FOOTER_PROFILE_TEXT_LINE2_OFFSET_X * bs,
          marginTop: L.SIDEBAR_FOOTER_PROFILE_TEXT_LINE2_OFFSET_Y * bs,
        }}
      >
        <Text
          style={[
            styles.lineSerif,
            serif,
            {
              fontSize: L.SIDEBAR_FOOTER_PROFILE_TEXT_LINE2_FONT_SIZE * bs,
              color: clanColor,
            },
          ]}
          numberOfLines={1}
        >
          {clanLine}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onPressProfile}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Perfil, rango"
        hitSlop={6}
        style={{
          marginLeft: L.SIDEBAR_FOOTER_PROFILE_TEXT_LINE3_OFFSET_X * bs,
          marginTop: L.SIDEBAR_FOOTER_PROFILE_TEXT_LINE3_OFFSET_Y * bs,
        }}
      >
        <Text
          style={[
            styles.lineSerif,
            serif,
            {
              fontSize: L.SIDEBAR_FOOTER_PROFILE_TEXT_LINE3_FONT_SIZE * bs,
              color: L.SIDEBAR_FOOTER_PROFILE_TEXT_LINE3_COLOR,
            },
          ]}
          numberOfLines={1}
        >
          {rankLine}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    zIndex: 17,
    maxWidth: 200,
    backgroundColor: 'transparent',
  },
  line1: {
    fontWeight: '700',
    letterSpacing: 0.3,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
  lineSerif: {
    letterSpacing: 0.4,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
});
