import type { FC } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import type { ClanId } from '@evoconn/constants/clanColors';

// ── nuevos perfiles4 SVGs — 8 clans, same order as all other SVG sets ──────────
// racionalista=69, realista=70, humanista=71, existencialista=72,
// trascendentalista=73, cientista=74, nihilista=75, estoico=76
import Svg69 from '../assets/profiles/nuevosPerfiles4Svg/69.svg';
import Svg70 from '../assets/profiles/nuevosPerfiles4Svg/70.svg';
import Svg71 from '../assets/profiles/nuevosPerfiles4Svg/71.svg';
import Svg72 from '../assets/profiles/nuevosPerfiles4Svg/72.svg';
import Svg73 from '../assets/profiles/nuevosPerfiles4Svg/73.svg';
import Svg74 from '../assets/profiles/nuevosPerfiles4Svg/74.svg';
import Svg75 from '../assets/profiles/nuevosPerfiles4Svg/75.svg';
import Svg76 from '../assets/profiles/nuevosPerfiles4Svg/76.svg';
// ── Sin clan profile icon ─────────────────────────────────────────────────────
import SvgSinClan from '../assets/profiles/nuevosPerfiles4Svg/sin-clan.svg';

export type ClanProfileSvgProps = {
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

const PROFILE_BY_CLAN: Record<ClanId, FC<ClanProfileSvgProps>> = {
  racionalista:      Svg69,
  realista:          Svg70,
  humanista:         Svg71,
  existencialista:   Svg72,
  trascendentalista: Svg73,
  cientista:         Svg74,
  nihilista:         Svg75,
  estoico:           Svg76,
};

/** Icon shown for users with no clan assigned — "Icono perfil sin clan.svg". */
export const CLAN_PROFILE_SIN_CLAN: FC<ClanProfileSvgProps> = SvgSinClan;

/** Fallback for an unknown clan key (should not normally occur). */
export const CLAN_PROFILE_DEFAULT: FC<ClanProfileSvgProps> = Svg69;

export function getClanProfileByHouse(
  house?: string | null,
): FC<ClanProfileSvgProps> {
  // No clan → use the dedicated sin-clan icon.
  if (house == null || house === '') return CLAN_PROFILE_SIN_CLAN;
  const key = house.trim().toLowerCase() as ClanId;
  return (
    (PROFILE_BY_CLAN as Record<string, FC<ClanProfileSvgProps> | undefined>)[key] ??
    CLAN_PROFILE_DEFAULT
  );
}
