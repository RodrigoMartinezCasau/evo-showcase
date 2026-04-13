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

// ─── Pencil layout (NO transforms on the TouchableOpacity) ───────────────
//
// REASON: React Native's touch system uses the pre-transform layout frame.
// If we put translateX/Y/scale on the TouchableOpacity, the icon moves visually
// but the tap target stays at the original layout position — creating a dead zone.
//
// Fix: convert all offset/scale values to real layout properties so the
// touch frame and visual frame are always identical.

const PENCIL_BASE_TOP       = 8;   // default top inside container
const PENCIL_BASE_RIGHT     = 8;   // default right inside container
const PENCIL_BASE_FONT_SIZE = 16;  // base icon glyph size
const PENCIL_BASE_SIZE      = 24;  // base TouchableOpacity box (padding 4×2 + font 16)
const CONTAINER_PADDING_RIGHT = 14;

// Derived layout values — these update automatically when editors change
const PENCIL_TOP       = PENCIL_BASE_TOP + INSIGNIA_EDIT_ICON_OFFSET_Y;
const PENCIL_RIGHT     = PENCIL_BASE_RIGHT - INSIGNIA_EDIT_ICON_OFFSET_X;
const PENCIL_BOX_SIZE  = Math.max(24, PENCIL_BASE_SIZE  * INSIGNIA_EDIT_ICON_SCALE);
const PENCIL_FONT_SIZE = PENCIL_BASE_FONT_SIZE * INSIGNIA_EDIT_ICON_SCALE;

// ─── Text reserved-area computation ─────────────────────────────────────
// How far the pencil's right edge is from the container's right edge:
//   PENCIL_RIGHT                    → right anchor (layout)
//   PENCIL_BOX_SIZE                 → icon width (layout, already scaled)
//   INSIGNIA_EDIT_ICON_SAFE_PADDING → extra clearance
// Minus CONTAINER_PADDING_RIGHT which the container already provides.

const PENCIL_TEXT_EXTRA_RIGHT = Math.max(
  0,
  PENCIL_RIGHT + PENCIL_BOX_SIZE + INSIGNIA_EDIT_ICON_SAFE_PADDING - CONTAINER_PADDING_RIGHT,
);

// ─────────────────────────────────────────────────────────────────────────

type Props = {
  phrase: string;
  /** When provided, a pencil icon appears in the top-right corner of the box
   *  and the text automatically reserves space around it. */
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
          activeOpacity={0.6}
          hitSlop={8}
          style={[
            styles.editBtn,
            {
              top: PENCIL_TOP,
              right: PENCIL_RIGHT,
              width: PENCIL_BOX_SIZE,
              height: PENCIL_BOX_SIZE,
            },
          ]}
        >
          <Text style={[styles.editIcon, { fontSize: PENCIL_FONT_SIZE }]}>✎</Text>
        </TouchableOpacity>
      )}

      {/* Text wrapper reserves space where the pencil sits */}
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
    zIndex: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIcon: {
    color: '#FFFFFF',
    textAlign: 'center',
    includeFontPadding: false,
  },
});
