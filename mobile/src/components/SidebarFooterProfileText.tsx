import React, { useMemo, useState } from 'react';
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
  const clanTextEditor = {
    offsetX: L.SIDEBAR_FOOTER_PROFILE_TEXT_CLAN_LINE_EDITOR_OFFSET_X,
    offsetY: L.SIDEBAR_FOOTER_PROFILE_TEXT_CLAN_LINE_EDITOR_OFFSET_Y,
    scale: L.SIDEBAR_FOOTER_PROFILE_TEXT_CLAN_LINE_EDITOR_SCALE,
  };

  /** Ancho del texto sin `scale`; corrige el anclaje porque RN escala respecto al centro del layout. */
  const [clanTextLayoutW, setClanTextLayoutW] = useState(0);

  const clanLineTransform = useMemo(() => {
    const s = clanTextEditor.scale;
    const w = clanTextLayoutW;
    const fixX = w > 0 ? (w * (s - 1)) / 2 : 0;
    return [
      { translateX: clanTextEditor.offsetX * bs },
      { translateY: clanTextEditor.offsetY * bs },
      { scale: s },
      { translateX: fixX },
    ];
  }, [
    bs,
    clanTextEditor.offsetX,
    clanTextEditor.offsetY,
    clanTextEditor.scale,
    clanTextLayoutW,
  ]);

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

      <View
        style={[
          styles.clanLineRowShell,
          {
            marginLeft: L.SIDEBAR_FOOTER_PROFILE_TEXT_LINE2_OFFSET_X * bs,
            marginTop: L.SIDEBAR_FOOTER_PROFILE_TEXT_LINE2_OFFSET_Y * bs,
          },
        ]}
      >
        <View style={[styles.clanLineTransformWrap, { transform: clanLineTransform }]}>
          <TouchableOpacity
            onPress={onPressClan}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Clan"
            hitSlop={6}
            style={styles.clanLinePressable}
          >
            <Text
              onLayout={(e) => {
                const w = e.nativeEvent.layout.width;
                if (w > 0) setClanTextLayoutW(w);
              }}
              style={[
                styles.lineSerif,
                styles.clanLineText,
                serif,
                {
                  fontSize: L.SIDEBAR_FOOTER_PROFILE_TEXT_LINE2_FONT_SIZE * bs,
                  color: clanColor,
                },
              ]}
            >
              {clanLine}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

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
    backgroundColor: 'transparent',
    alignItems: 'flex-start',
    maxWidth: '100%',
  },
  clanLineRowShell: {
    alignSelf: 'flex-start',
    width: '100%',
  },
  clanLineTransformWrap: {
    alignSelf: 'flex-start',
  },
  clanLinePressable: {
    alignSelf: 'flex-start',
  },
  clanLineText: {
    textAlign: 'left',
    flexShrink: 0,
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
