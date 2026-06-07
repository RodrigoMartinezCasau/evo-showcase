import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Keyboard,
  Platform,
} from 'react-native';
import { evoconnColors } from '@evoconn/theme/colors';
import {
  NEW_COMMENT_BOX_LAYOUT as BOX,
  NEW_COMMENT_SEND_BUTTON_LAYOUT as BTN,
} from '@evoconn/constants/newCommentBoxLayout';
import { getChatSendButtonByHouse } from '@evoconn/utils/getChatSendButtonByHouse';
import { clampMessageInput, MESSAGE_MAX_CHARS } from '@evoconn/utils/messageWordLimit';

type NewCommentBoxProps = {
  onSend: (text: string) => void;
  /** Clan id of the post author — selects the correct enviar-1 SVG. */
  clanId?: string | null;
  /** Tope del pill en espacios bajos (preview del panel de comentarios). */
  maxPillHeight?: number;
  onFocus?: () => void;
  onBlur?: () => void;
  autoFocus?: boolean;
};

export const NewCommentBox = React.memo(function NewCommentBox({
  onSend,
  clanId,
  maxPillHeight,
  onFocus,
  onBlur,
  autoFocus = false,
}: NewCommentBoxProps) {
  const SendSvg = getChatSendButtonByHouse(clanId);
  const [value, setValue] = useState('');
  const inputRef = useRef<TextInput>(null);

  const textMaxHeight = useMemo(
    () => BOX.lineHeight * BOX.maxInputLines,
    [],
  );

  const defaultPillMaxHeight = useMemo(
    () => textMaxHeight + BOX.paddingVertical * 2 + BOX.textBottomInset,
    [textMaxHeight],
  );

  const pillMaxHeight = useMemo(() => {
    if (maxPillHeight == null) return defaultPillMaxHeight;
    return Math.max(BOX.minHeight, Math.min(defaultPillMaxHeight, maxPillHeight));
  }, [defaultPillMaxHeight, maxPillHeight]);

  // Altura máxima del área de texto (deja el pill crecer hasta aquí; luego scroll nativo).
  const effectiveTextMaxHeight = useMemo(
    () =>
      Math.max(
        BOX.lineHeight,
        pillMaxHeight - BOX.paddingVertical * 2 - BOX.textBottomInset,
      ),
    [pillMaxHeight],
  );

  const hasText = value.trim().length > 0;

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue('');
    Keyboard.dismiss();
  }, [value, onSend]);

  const handleChangeText = useCallback((next: string) => {
    setValue(clampMessageInput(next));
  }, []);

  const handleFocus = useCallback(() => {
    onFocus?.();
  }, [onFocus]);

  const handleBlur = useCallback(() => {
    onBlur?.();
  }, [onBlur]);

  useEffect(() => {
    if (!autoFocus) return;
    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [autoFocus]);

  return (
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
      <View
        style={[
          styles.inputPill,
          {
            minHeight: BOX.minHeight,
            maxHeight: pillMaxHeight,
            paddingHorizontal: BOX.paddingHorizontal,
            paddingTop: BOX.paddingVertical,
            paddingBottom: BOX.paddingVertical + BOX.textBottomInset,
            borderRadius: BOX.borderRadius,
            backgroundColor: BOX.backgroundColor,
          },
        ]}
      >
        {/* TextInput multiline con scroll NATIVO: crece hasta maxHeight, luego
            arrastras dentro del propio campo (igual que la barra de reflexión). */}
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="Añadir comentario..."
          placeholderTextColor={BOX.placeholderColor}
          multiline
          scrollEnabled
          blurOnSubmit={false}
          maxLength={MESSAGE_MAX_CHARS}
          textAlignVertical="top"
          style={[
            styles.input,
            {
              fontSize: BOX.fontSize,
              lineHeight: BOX.lineHeight,
              minHeight: BOX.lineHeight,
              maxHeight: effectiveTextMaxHeight,
            },
          ]}
        />
      </View>

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

/** Tap target en el feed: abre el overlay de comentarios (misma apariencia que el pill). */
export function CommentComposerTrigger({
  onPress,
  clanId,
}: {
  onPress: () => void;
  clanId?: string | null;
}) {
  const SendSvg = getChatSendButtonByHouse(clanId);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Añadir comentario"
    >
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
        <View
          style={[
            styles.inputPill,
            {
              minHeight: BOX.minHeight,
              paddingHorizontal: BOX.paddingHorizontal,
              paddingTop: BOX.paddingVertical,
              paddingBottom: BOX.paddingVertical + BOX.textBottomInset,
              borderRadius: BOX.borderRadius,
              backgroundColor: BOX.backgroundColor,
              justifyContent: 'center',
            },
          ]}
        >
          <Text style={styles.placeholder}>Añadir comentario...</Text>
        </View>
        <View
          style={[
            styles.sendBtn,
            {
              width: BTN.size,
              height: BTN.size,
              opacity: 0.35,
              transform: [{ scale: BTN.scale }],
            },
          ]}
        >
          <SendSvg width={BTN.size} height={BTN.size} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: BOX.gap,
  },
  inputPill: {
    flex: 1,
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },
  input: {
    width: '100%',
    margin: 0,
    padding: 0,
    color: evoconnColors.text,
    textAlignVertical: 'top',
    ...Platform.select({
      android: { includeFontPadding: false },
      ios: { paddingBottom: 1 },
    }),
  },
  sendBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  placeholder: {
    color: BOX.placeholderColor,
    fontSize: BOX.fontSize,
    lineHeight: BOX.lineHeight,
  },
});
