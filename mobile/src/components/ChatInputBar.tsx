import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { evoconnColors } from '@evoconn/theme/colors';

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
      <View style={styles.bar}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor={evoconnColors.muted}
          style={styles.input}
          multiline
          maxLength={2000}
        />
        <TouchableOpacity onPress={handleSend} style={styles.sendBtn}>
          {sendIcon ?? <Text style={styles.star}>★</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: evoconnColors.card,
    borderTopWidth: 1,
    borderTopColor: evoconnColors.border,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: evoconnColors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: evoconnColors.text,
    fontSize: 14,
    marginRight: 8,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: evoconnColors.neonGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  star: { color: evoconnColors.background, fontSize: 20 },
});
