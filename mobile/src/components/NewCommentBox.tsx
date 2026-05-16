import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Keyboard,
} from 'react-native';
import { evoconnColors } from '@evoconn/theme/colors';
import {
  NEW_COMMENT_BOX_LAYOUT as BOX,
  NEW_COMMENT_SEND_BUTTON_LAYOUT as BTN,
} from '@evoconn/constants/newCommentBoxLayout';
import { getChatSendButtonByHouse } from '@evoconn/utils/getChatSendButtonByHouse';

type NewCommentBoxProps = {
  onSend: (text: string) => void;
  /** Clan id of the post author — selects the correct enviar-1 SVG. */
  clanId?: string | null;
};

export const NewCommentBox = React.memo(function NewCommentBox({
  onSend,
  clanId,
}: NewCommentBoxProps) {
  const SendSvg = getChatSendButtonByHouse(clanId);
  const [value, setValue] = useState('');
  const inputRef = useRef<TextInput>(null);

  const hasText = value.trim().length > 0;

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue('');
    Keyboard.dismiss();
  }, [value, onSend]);

  const handleBoxPress = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  return (
    // Row wrapper: input pill (flex:1) + gap + send button (fixed size).
    // Using flexbox means the gap is always identical regardless of device width.
    <View
      style={[
        styles.row,
        {
          transform: [
            { translateX: BOX.offsetX },
            { translateY: BOX.offsetY },
          ],
        },
      ]}
    >
      {/* Input pill — grows to fill all remaining space */}
      <Pressable
        onPress={handleBoxPress}
        style={[
          styles.inputPill,
          {
            height: BOX.height,
            borderRadius: BOX.borderRadius,
            backgroundColor: BOX.backgroundColor,
          },
        ]}
      >
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={setValue}
          placeholder="Añadir comentario..."
          placeholderTextColor={BOX.placeholderColor}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit
          style={[styles.input, { fontSize: BOX.fontSize }]}
        />
      </Pressable>

      {/* Send button — fixed size, separated from pill by BOX.gap */}
      <TouchableOpacity
        onPress={handleSend}
        disabled={!hasText}
        activeOpacity={0.7}
        hitSlop={{ top: 14, bottom: 14, left: 10, right: 10 }}
        style={[
          styles.sendBtn,
          {
            width: BTN.size,
            height: BTN.size,
            opacity: hasText ? 1 : 0.35,
            transform: [{ scale: BTN.scale }],
          },
        ]}
      >
        <SendSvg width={BTN.size} height={BTN.size} />
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BOX.gap,
  },
  inputPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: BOX.paddingHorizontal,
  },
  input: {
    flex: 1,
    color: evoconnColors.text,
    padding: 0,
  },
  sendBtn: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
