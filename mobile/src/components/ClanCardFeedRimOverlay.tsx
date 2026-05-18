import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Path } from 'react-native-svg';

const RIM_WIDTH = 1.8;
/** Length of the straight arm from each corner (pt) — matches reflection ClanRimOverlay. */
const RIM_ARM = 52;

function lightenHex(hex: string): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return '#ffffff';
  const blend = (c: number) => Math.min(255, Math.round(c + (255 - c) * 0.55));
  const x = (c: number) => blend(parseInt(h.slice(c, c + 2), 16)).toString(16).padStart(2, '0');
  return `#${x(0)}${x(2)}${x(4)}`;
}

type ClanCardFeedRimOverlayProps = {
  width: number;
  height: number;
  /** Matches `SVG_CARD_VISUAL.CARD_BORDER_RADIUS` on the feed cards. */
  borderRadius: number;
  clanColor: string;
  /** Straight segment length from each corner (pt). Default feed cards. */
  rimArm?: number;
  /** Horizontal arm length; defaults to `rimArm`. */
  rimArmX?: number;
  /** Vertical arm length; defaults to `rimArm`. */
  rimArmY?: number;
};

/**
 * Apple-style glowing rim on all four corners (Siguiendo feed cards).
 * Para Ti reflection uses only TL + BR via `ReflectionBackground`.
 */
export function ClanCardFeedRimOverlay({
  width,
  height,
  borderRadius,
  clanColor,
  rimArm = RIM_ARM,
  rimArmX,
  rimArmY,
}: ClanCardFeedRimOverlayProps) {
  const r = borderRadius;
  const ax = rimArmX ?? rimArm;
  const ay = rimArmY ?? rimArm;
  const w = width;
  const h = height;
  const hl = lightenHex(clanColor);
  const slug = clanColor.replace('#', '');
  const idTL = `cardRimTL_${slug}`;
  const idTR = `cardRimTR_${slug}`;
  const idBL = `cardRimBL_${slug}`;
  const idBR = `cardRimBR_${slug}`;

  const tlD = `M 0 ${r + ay} L 0 ${r} A ${r} ${r} 0 0 1 ${r} 0 L ${r + ax} 0`;
  // sweep=1 (not 0): same quarter as a clockwise rounded-rect outline; sweep 0 draws the concave arc (“socabón”).
  const trD = `M ${w - r - ax} 0 L ${w - r} 0 A ${r} ${r} 0 0 1 ${w} ${r} L ${w} ${r + ay}`;
  const blD = `M 0 ${h - r - ay} L 0 ${h - r} A ${r} ${r} 0 0 0 ${r} ${h} L ${r + ax} ${h}`;
  const brD = `M ${w} ${h - r - ay} L ${w} ${h - r} A ${r} ${r} 0 0 1 ${w - r} ${h} L ${w - r - ax} ${h}`;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={w} height={h}>
        <Defs>
          <LinearGradient id={idTL} x1={0} y1={r + ay} x2={r + ax} y2={0} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={clanColor} stopOpacity={0} />
            <Stop offset="0.3" stopColor={clanColor} stopOpacity={0.85} />
            <Stop offset="0.5" stopColor={hl} stopOpacity={1} />
            <Stop offset="0.7" stopColor={clanColor} stopOpacity={0.85} />
            <Stop offset="1" stopColor={clanColor} stopOpacity={0} />
          </LinearGradient>
          <LinearGradient id={idTR} x1={w - r - ax} y1={0} x2={w} y2={r + ay} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={clanColor} stopOpacity={0} />
            <Stop offset="0.3" stopColor={clanColor} stopOpacity={0.85} />
            <Stop offset="0.5" stopColor={hl} stopOpacity={1} />
            <Stop offset="0.7" stopColor={clanColor} stopOpacity={0.85} />
            <Stop offset="1" stopColor={clanColor} stopOpacity={0} />
          </LinearGradient>
          <LinearGradient id={idBL} x1={0} y1={h - r - ay} x2={r + ax} y2={h} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={clanColor} stopOpacity={0} />
            <Stop offset="0.3" stopColor={clanColor} stopOpacity={0.85} />
            <Stop offset="0.5" stopColor={hl} stopOpacity={1} />
            <Stop offset="0.7" stopColor={clanColor} stopOpacity={0.85} />
            <Stop offset="1" stopColor={clanColor} stopOpacity={0} />
          </LinearGradient>
          <LinearGradient id={idBR} x1={w} y1={h - r - ay} x2={w - r - ax} y2={h} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={clanColor} stopOpacity={0} />
            <Stop offset="0.3" stopColor={clanColor} stopOpacity={0.85} />
            <Stop offset="0.5" stopColor={hl} stopOpacity={1} />
            <Stop offset="0.7" stopColor={clanColor} stopOpacity={0.85} />
            <Stop offset="1" stopColor={clanColor} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d={tlD} fill="none" stroke={`url(#${idTL})`} strokeWidth={RIM_WIDTH} strokeLinecap="round" strokeLinejoin="round" />
        <Path d={trD} fill="none" stroke={`url(#${idTR})`} strokeWidth={RIM_WIDTH} strokeLinecap="round" strokeLinejoin="round" />
        <Path d={blD} fill="none" stroke={`url(#${idBL})`} strokeWidth={RIM_WIDTH} strokeLinecap="round" strokeLinejoin="round" />
        <Path d={brD} fill="none" stroke={`url(#${idBR})`} strokeWidth={RIM_WIDTH} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}
