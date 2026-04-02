import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Pressable,
  Text,
  StyleSheet,
  Keyboard,
} from 'react-native';
import { evoconnColors } from '@evoconn/theme/colors';
import {
  NEW_COMMENT_BOX_LAYOUT as BOX,
  NEW_COMMENT_SEND_BUTTON_LAYOUT as BTN,
} from '@evoconn/constants/newCommentBoxLayout';

type NewCommentBoxProps = {
  onSend: (text: string) => void;
};

export const NewCommentBox = React.memo(function NewCommentBox({
  onSend,
}: NewCommentBoxProps) {
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

  const btnColor = hasText ? BTN.activeColor : BTN.inactiveColor;

  return (
    <Pressable
      onPress={handleBoxPress}
      style={[
        styles.container,
        {
          height: BOX.height,
          borderRadius: BOX.borderRadius,
          backgroundColor: BOX.backgroundColor,
          transform: [
            { translateX: BOX.offsetX },
            { translateY: BOX.offsetY },
            { scaleX: BOX.widthScale },
          ],
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

      <TouchableOpacity
        onPress={handleSend}
        disabled={!hasText}
        activeOpacity={0.7}
        hitSlop={{ top: 14, bottom: 14, left: 10, right: 10 }}
        style={[
          styles.sendBtn,
          {
            width: BTN.width,
            height: BTN.height,
            borderRadius: BTN.borderRadius,
            borderColor: btnColor,
            transform: [
              { translateX: BTN.offsetX },
              { translateY: BTN.offsetY },
              { scale: BTN.scale },
            ],
          },
        ]}
      >
        <Text style={[styles.sendText, { color: btnColor, fontSize: BTN.fontSize }]}>
          Enviar
        </Text>
      </TouchableOpacity>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  input: {
    flex: 1,
    color: evoconnColors.text,
    padding: 0,
  },
  sendBtn: {
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendText: {
    fontWeight: '700',
  },
});
