import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { evoconnColors } from '@evoconn/theme/colors';
import {
  CHAT_BOTTOM_AREA_LAYOUT as AREA,
  CHAT_INPUT_LAYOUT as INP,
  CHAT_SEND_BUTTON_LAYOUT as BTN,
} from '@evoconn/constants/chatInputBarLayout';

type ChatInputBarProps = {
  placeholder?: string;
  onSend: (text: string) => void;
  sendIcon?: React.ReactNode;
};

export function ChatInputBar({ placeholder = 'Escribe aquí...', onSend, sendIcon }: ChatInputBarProps) {
  const [text, setText] = useState('');

  const handleSend = () => {
    const t = text.trim();
    if (t) {
      onSend(t);
      setText('');
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View
        style={[
          styles.bar,
          {
            backgroundColor: AREA.backgroundColor,
            paddingTop: AREA.paddingTop,
            paddingBottom: AREA.paddingBottom,
            paddingHorizontal: AREA.paddingHorizontal,
            borderTopWidth: AREA.borderTopWidth,
            borderTopColor: AREA.borderTopColor,
            transform: [{ translateY: AREA.offsetY }],
            ...(AREA.height != null ? { height: AREA.height } : {}),
          },
        ]}
      >
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor={evoconnColors.muted}
          style={[
            styles.input,
            {
              minHeight: INP.minHeight,
              maxHeight: INP.maxHeight,
              borderRadius: INP.borderRadius,
              backgroundColor: INP.backgroundColor,
              borderWidth: INP.borderWidth,
              borderColor: INP.borderColor,
              fontSize: INP.fontSize,
              paddingHorizontal: INP.paddingHorizontal,
              paddingVertical: INP.paddingVertical,
              transform: [
                { translateX: INP.offsetX },
                { translateY: INP.offsetY },
                { scaleX: INP.widthScale },
              ],
            },
          ]}
          multiline
          maxLength={2000}
        />
        <TouchableOpacity
          onPress={handleSend}
          style={[
            styles.sendBtn,
            {
              width: BTN.size,
              height: BTN.size,
              borderRadius: BTN.borderRadius,
              backgroundColor: BTN.backgroundColor,
              transform: [
                { translateX: BTN.offsetX },
                { translateY: BTN.offsetY },
                { scale: BTN.scale },
              ],
            },
          ]}
        >
          {sendIcon ?? <Text style={[styles.star, { color: BTN.iconColor, fontSize: BTN.iconSize }]}>★</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    color: evoconnColors.text,
    marginRight: 8,
  },
  sendBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  star: {},
});
