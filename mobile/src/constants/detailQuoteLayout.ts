/** Layout editors for the phrase/quote display in detail / Para ti screens. */
import { Platform } from 'react-native';

const AND = Platform.OS === 'android';

export const DETAIL_QUOTE_LAYOUT = {
  offsetX: 0,
  offsetY: 0,
  fontSize: AND ? 20 : 30,
  lineHeight: AND ? 32 : 48,
  /** Reduce available width from the left (px) — keeps the centering symmetric. */
  maxWidthReductionLeft: 20,
  /** Reduce available width from the right (px) to keep text away from action column. */
  maxWidthReductionRight: AND ? 60 : 40,
};

export const DETAIL_QUOTE_AUTHOR_LAYOUT = {
  offsetX: 0,
  offsetY: 8,
  fontSize: AND ? 16 : 24,
};
