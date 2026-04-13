import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  INSIGNIA_BOX_MARGIN_HORIZONTAL,
  INSIGNIA_BOX_HEIGHT,
  INSIGNIA_BOX_OFFSET_X,
  INSIGNIA_BOX_OFFSET_Y,
  INSIGNIA_EDIT_ICON_OFFSET_X,
  INSIGNIA_EDIT_ICON_OFFSET_Y,
  INSIGNIA_EDIT_ICON_SCALE,
  INSIGNIA_EDIT_ICON_SAFE_PADDING,
} from '@evoconn/constants/personalProfileLayout';

// ── Pencil reserved-area computation ─────────────────────────────────────
// The pencil button has padding: 4 on each side + fontSize: 16 → ~24px layout box.
// CSS transforms are visual-only, so the layout anchor stays at (top:8, right:8)
// but the VISUAL footprint is scaled by INSIGNIA_EDIT_ICON_SCALE.
// translateX shifts the visual position horizontally (positive = further right).
// We compute the minimum right padding the text must keep to never collide.

const PENCIL_LAYOUT_SIZE = 24; // TouchableOpacity layout box width (padding 4*2 + icon 16)
const PENCIL_LAYOUT_RIGHT = 8;  // right: 8 anchor in the container
const CONTAINER_PADDING_RIGHT = 14; // container's existing paddingRight

// How far from the right edge of the container the pencil's visual left boundary is:
//   pencilLayoutRight  → layout anchor from right
// + PENCIL_LAYOUT_SIZE * SCALE → visual width (scaled outward from center, so adds half each side,
//   but since the anchor is the layout center and scale grows symmetrically, the left edge of the
//   visual area extends further left by (PENCIL_LAYOUT_SIZE * SCALE / 2 + PENCIL_LAYOUT_SIZE / 2))
//   Simplified conservatively: full visual width from the anchor's right-edge offset.
// - INSIGNIA_EDIT_ICON_OFFSET_X → positive moveX shifts right (further from text), negative = more overlap
const pencilVisualExtentFromRight =
  PENCIL_LAYOUT_RIGHT +
  PENCIL_LAYOUT_SIZE * INSIGNIA_EDIT_ICON_SCALE +
  INSIGNIA_EDIT_ICON_SAFE_PADDING -
  INSIGNIA_EDIT_ICON_OFFSET_X; // subtract: positive offsetX moves pencil right, needs less protection

// Extra inset for the text wrapper (on top of container's own paddingRight)
const PENCIL_TEXT_EXTRA_RIGHT = Math.max(
  0,
  pencilVisualExtentFromRight - CONTAINER_PADDING_RIGHT,
);

// ─────────────────────────────────────────────────────────────────────────

type Props = {
  phrase: string;
  /** When provided, a pencil icon appears in the top-right corner and
   *  the text automatically reserves space for it. */
  onEdit?: () => void;
};

export const PersonalInsigniaPhrase = React.memo(function PersonalInsigniaPhrase({
  phrase,
  onEdit,
}: Props) {
  return (
    <View
      style={[
        styles.container,
        {
          marginHorizontal: INSIGNIA_BOX_MARGIN_HORIZONTAL,
          transform: [{ translateX: INSIGNIA_BOX_OFFSET_X }, { translateY: INSIGNIA_BOX_OFFSET_Y }],
        },
        INSIGNIA_BOX_HEIGHT !== undefined && { height: INSIGNIA_BOX_HEIGHT },
      ]}
    >
      {onEdit !== undefined && (
        <TouchableOpacity
          onPress={onEdit}
          hitSlop={10}
          activeOpacity={0.6}
          style={[
            styles.editBtn,
            {
              transform: [
                { translateX: INSIGNIA_EDIT_ICON_OFFSET_X },
                { translateY: INSIGNIA_EDIT_ICON_OFFSET_Y },
                { scale: INSIGNIA_EDIT_ICON_SCALE },
              ],
            },
          ]}
        >
          <Text style={styles.editIcon}>✎</Text>
        </TouchableOpacity>
      )}

      {/*
        Text lives in its own View with a dynamic right inset that grows with
        the pencil's visual footprint. When onEdit is undefined the inset is 0
        (no extra padding, same as before). The container's paddingRight:14
        already accounts for the base clearance.
      */}
      <View style={{ paddingRight: onEdit !== undefined ? PENCIL_TEXT_EXTRA_RIGHT : 0 }}>
        <Text style={styles.text}>{phrase}</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingLeft: 14,
    paddingVertical: 14,
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingRight: 14,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 20,
    letterSpacing: 0.2,
  },
  editBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 2,
    padding: 4,
  },
  editIcon: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
