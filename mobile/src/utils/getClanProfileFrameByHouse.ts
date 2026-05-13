import type { FC } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import type { ClanId } from '@evoconn/constants/clanColors';

// Frame-only variants: inner fill and person icon removed, black border + star
// decorations remain. Used as the top layer when a profile photo is displayed.
import Frame69 from '../assets/profiles/nuevosPerfiles4Svg/frames/69.svg';
import Frame70 from '../assets/profiles/nuevosPerfiles4Svg/frames/70.svg';
import Frame71 from '../assets/profiles/nuevosPerfiles4Svg/frames/71.svg';
import Frame72 from '../assets/profiles/nuevosPerfiles4Svg/frames/72.svg';
import Frame73 from '../assets/profiles/nuevosPerfiles4Svg/frames/73.svg';
import Frame74 from '../assets/profiles/nuevosPerfiles4Svg/frames/74.svg';
import Frame75 from '../assets/profiles/nuevosPerfiles4Svg/frames/75.svg';
import Frame76 from '../assets/profiles/nuevosPerfiles4Svg/frames/76.svg';
import FrameSinClan from '../assets/profiles/nuevosPerfiles4Svg/frames/sin-clan.svg';

export type ClanProfileFrameSvgProps = {
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

const FRAME_BY_CLAN: Record<ClanId, FC<ClanProfileFrameSvgProps>> = {
  racionalista:      Frame69,
  realista:          Frame70,
  humanista:         Frame71,
  existencialista:   Frame72,
  trascendentalista: Frame73,
  cientista:         Frame74,
  nihilista:         Frame75,
  estoico:           Frame76,
};

export const CLAN_FRAME_SIN_CLAN: FC<ClanProfileFrameSvgProps> = FrameSinClan;
export const CLAN_FRAME_DEFAULT: FC<ClanProfileFrameSvgProps> = Frame69;

export function getClanProfileFrameByHouse(
  house?: string | null,
): FC<ClanProfileFrameSvgProps> {
  if (house == null || house === '') return CLAN_FRAME_SIN_CLAN;
  const key = house.trim().toLowerCase() as ClanId;
  return (
    (FRAME_BY_CLAN as Record<string, FC<ClanProfileFrameSvgProps> | undefined>)[key] ??
    CLAN_FRAME_DEFAULT
  );
}
