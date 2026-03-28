/**
 * Todos los `fill` fijos del asset pasan a `currentColor` para tintar el icono con
 * `color` / `style.color` desde `AppTopBar` según `getTopBarStarColor`.
 */
const STAR_FILLS_TO_CURRENT = {
  '#232323': 'currentColor',
  '#395df2': 'currentColor',
  '#46b8f9': 'currentColor',
  '#54d5cf': 'currentColor',
  '#696969': 'currentColor',
  '#7000ff': 'currentColor',
  '#818a41': 'currentColor',
  '#a2a3a8': 'currentColor',
  '#bdb29d': 'currentColor',
  '#c7ff02': 'currentColor',
  '#c93a39': 'currentColor',
  '#cb6ce6': 'currentColor',
  '#d08733': 'currentColor',
  '#e4db5d': 'currentColor',
  '#efb318': 'currentColor',
  '#f9bc4b': 'currentColor',
  '#fdfef0': 'currentColor',
};

module.exports = {
  native: true,
  dimensions: false,
  svgProps: {
    preserveAspectRatio: 'xMidYMid meet',
  },
  replaceAttrValues: STAR_FILLS_TO_CURRENT,
};
