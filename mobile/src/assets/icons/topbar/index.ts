export const topBarIcons = {
  evoStar: require('./evostar.png'),
  shield: require('./shield.png'),
  pencil: require('./pencil.png'),
  fire: require('./fire.png'),
  heart: require('./heart.png'),
} as const;

export type TopBarIconKey = keyof typeof topBarIcons;

// Per-asset tuning if the PNG has extra transparent padding.
export const topBarIconFrameScale: Record<TopBarIconKey, number> = {
  evoStar: 2,
  shield: 1.6,
  pencil: 1.9,
  fire: 2,
  heart: 2.3,
};

