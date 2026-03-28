import React, { useMemo } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { SIDEBAR_CLAN_INSIGNIA_LAYOUT as L } from '@evoconn/constants/sidebarClanInsigniaLayout';
import { getClanInsigniaByHouse } from '@evoconn/utils/getSidebarClanInsigniaByHouse';

/** viewBox aproximado de los SVG (cuadrado); escala uniforme con `SIDEBAR_CLAN_INSIGNIA_SCALE`. */
const INSIGNIA_VIEWBOX_SIZE = 600;

type SidebarClanInsigniaProps = {
  clanId: string | null;
  onPress: () => void;
};

/**
 * Esquina inferior izquierda del drawer: posición absoluta, no afecta al flex del resto del sidebar.
 */
export function SidebarClanInsignia({ clanId, onPress }: SidebarClanInsigniaProps) {
  const Insignia = useMemo(() => getClanInsigniaByHouse(clanId), [clanId]);
  const side = INSIGNIA_VIEWBOX_SIZE * L.SIDEBAR_CLAN_INSIGNIA_SCALE;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: L.SIDEBAR_CLAN_INSIGNIA_OFFSET_X,
        bottom: L.SIDEBAR_CLAN_INSIGNIA_OFFSET_Y,
        zIndex: 17,
      }}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel="Perfil"
        style={{ backgroundColor: 'transparent' }}
      >
        <Insignia
          width={side}
          height={side}
          style={{ backgroundColor: 'transparent' }}
        />
      </TouchableOpacity>
    </View>
  );
}
