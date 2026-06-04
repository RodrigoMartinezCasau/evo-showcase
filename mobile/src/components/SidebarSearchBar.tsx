import React, { forwardRef, useCallback, useRef } from 'react';
import { View, Image, TextInput, Pressable, StyleSheet } from 'react-native';
import { SIDEBAR_SEARCH_BAR_LAYOUT as L } from '@evoconn/constants/sidebarSearchBarLayout';
import { SIDEBAR_PNG_MENU_BLOCK_OFFSET_X } from '@evoconn/constants/sidebarPngMenuAlignment';

const SEARCH_BAR_SOURCE = require('../assets/sidebar/searchBar/sidebar_search_bar.png');

type SidebarSearchBarProps = {
  value: string;
  onChangeText: (t: string) => void;
};

export const SidebarSearchBar = forwardRef<TextInput, SidebarSearchBarProps>(function SidebarSearchBar({ value, onChangeText }, ref) {
  const inputRef = useRef<TextInput>(null);
  const setInputRef = useCallback(
    (node: TextInput | null) => {
      inputRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as React.MutableRefObject<TextInput | null>).current = node;
    },
    [ref],
  );

  const imgW = L.SEARCH_BAR_IMAGE_WIDTH;
  const imgH = L.SEARCH_BAR_IMAGE_HEIGHT;
  const cropL = L.SEARCH_BAR_CROP_LEFT;
  const cropR = L.SEARCH_BAR_CROP_RIGHT;
  const cropT = L.SEARCH_BAR_CROP_TOP;
  const cropB = L.SEARCH_BAR_CROP_BOTTOM;
  const visibleW = Math.max(1, imgW - cropL - cropR);
  const visibleH = Math.max(1, imgH - cropT - cropB);
  const stretchH = L.SEARCH_BAR_HORIZONTAL_STRETCH;
  const layoutW = Math.max(1, visibleW * stretchH);
  const textLeft =
    (layoutW - L.SEARCH_BAR_TEXT_BOX_WIDTH) / 2 + L.SEARCH_BAR_TEXT_CONTAINER_OFFSET_X;
  const textTop =
    (visibleH - L.SEARCH_BAR_TEXT_BOX_HEIGHT) / 2 + L.SEARCH_BAR_TEXT_CONTAINER_OFFSET_Y;

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: L.SEARCH_BAR_BLOCK_OFFSET_Y,
        alignItems: 'center',
      }}
    >
      <View
        style={{
          transform: [
            { translateX: SIDEBAR_PNG_MENU_BLOCK_OFFSET_X },
            ...(L.SEARCH_BAR_BLOCK_SCALE !== 1
              ? [{ scale: L.SEARCH_BAR_BLOCK_SCALE }]
              : []),
          ],
        }}
      >
        <View
          style={{
            transform: [
              { translateX: L.SEARCH_BAR_OFFSET_X },
              { translateY: L.SEARCH_BAR_OFFSET_Y },
            ],
          }}
        >
          <View style={{ position: 'relative', width: layoutW, height: visibleH, alignSelf: 'center' }}>
            <Pressable
              style={{ position: 'relative', width: layoutW, height: visibleH }}
              onPress={() => inputRef.current?.focus()}
            >
              <View
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: layoutW,
                  height: visibleH,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    width: visibleW,
                    height: visibleH,
                    transform: [{ scaleX: stretchH }],
                  }}
                >
                  <View
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      width: visibleW,
                      height: visibleH,
                      overflow: 'hidden',
                    }}
                  >
                    <View
                      style={{
                        position: 'absolute',
                        left: -cropL,
                        top: -cropT,
                        width: imgW,
                        height: imgH,
                      }}
                    >
                      <Image
                        source={SEARCH_BAR_SOURCE}
                        style={{ width: imgW, height: imgH }}
                        resizeMode="stretch"
                      />
                    </View>
                  </View>
                </View>
              </View>
              <View
                style={{
                  position: 'absolute',
                  left: textLeft,
                  top: textTop,
                  width: L.SEARCH_BAR_TEXT_BOX_WIDTH,
                  height: L.SEARCH_BAR_TEXT_BOX_HEIGHT,
                  justifyContent: 'center',
                }}
              >
                <TextInput
                  ref={setInputRef}
                  value={value}
                  onChangeText={(t) => {
                    if (t.length <= L.SEARCH_BAR_TEXT_MAX_CHARS) onChangeText(t);
                  }}
                  placeholder="Buscar reflexiones/frases..."
                  placeholderTextColor={L.SEARCH_BAR_PLACEHOLDER_COLOR}
                  maxLength={L.SEARCH_BAR_TEXT_MAX_CHARS}
                  style={[
                    styles.input,
                    {
                      color: L.SEARCH_BAR_TEXT_COLOR,
                      fontSize: L.SEARCH_BAR_TEXT_FONT_SIZE,
                      letterSpacing: L.SEARCH_BAR_TEXT_LETTER_SPACING,
                      transform: [
                        { translateX: L.SEARCH_BAR_TEXT_OFFSET_X },
                        { translateY: L.SEARCH_BAR_TEXT_OFFSET_Y },
                      ],
                    },
                  ]}
                  returnKeyType="search"
                  autoCorrect={false}
                  autoCapitalize="none"
                />
              </View>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  input: {
    padding: 0,
    margin: 0,
    width: '100%',
    fontWeight: '500',
  },
});
