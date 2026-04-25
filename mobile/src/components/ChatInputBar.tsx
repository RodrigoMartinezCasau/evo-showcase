/**
 * ChatInputBar.tsx
 * ================
 * Barra de input compartida entre ReflectionCreationScreen y PhraseCreationScreen.
 *
 * Features:
 *  - Smooth keyboard animation: the bar follows the keyboard upward frame-by-frame
 *    (no jump/cut) using keyboard event listeners + Animated.timing.
 *  - Dynamic height: the input field grows line by line up to MAX_LINES, then scrolls.
 *  - Gradient island: the bar floats over a fade-gradient that progressively blurs
 *    the scroll content behind it (à la Claude / ChatGPT). No external lib required.
 *
 * Modes:
 *  IDLE         → TextInput normal + icono mic
 *  RECORDING    → Waveform animado + contador de tiempo + botón PARAR
 *  TRANSCRIBING → Indicador de carga mientras se finaliza la transcripción
 */
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
  Keyboard,
  Dimensions,
  type KeyboardEvent,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { evoconnColors } from '@evoconn/theme/colors';
import {
  CHAT_BOTTOM_AREA_LAYOUT as AREA,
  CHAT_INPUT_LAYOUT as INP,
  CHAT_SEND_BUTTON_LAYOUT as BTN,
  CHAT_INPUT_ISLAND_LAYOUT as ISLAND,
} from '@evoconn/constants/chatInputBarLayout';
import { useVoiceInput } from '@evoconn/hooks/useVoiceInput';
import { VoiceWaveform } from './VoiceWaveform';

// ─── Background color (parsed once for gradient strips) ───────────────────────

/** Parse AREA.backgroundColor into an rgb triple (fallback: 11,11,15). */
function parseBgRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return [11, 11, 15];
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}
const [BR, BG, BB] = parseBgRgb(AREA.backgroundColor as string);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

// ─── Keyboard animation hook ─────────────────────────────────────────────────

/**
 * Returns an Animated.Value that tracks the keyboard height smoothly,
 * synced to the keyboard's own animation duration so the bar moves with it.
 */
function useKeyboardAnim() {
  const anim = useRef(new Animated.Value(0)).current;
  const keyboardHeightRef = useRef(0);

  useEffect(() => {
    const animateToKeyboardFrame = (e: KeyboardEvent) => {
      const keyboardTop = e.endCoordinates.screenY;
      const windowHeight = Dimensions.get('window').height;
      const keyboardHeight =
        Platform.OS === 'ios'
          ? Math.max(0, windowHeight - keyboardTop)
          : e.endCoordinates.height;
      const isOpening = keyboardHeight > keyboardHeightRef.current;
      const speed = isOpening ? ISLAND.keyboardOpenSpeed : ISLAND.keyboardCloseSpeed;
      const baseDuration = e.duration ?? 250;
      const duration = Math.max(ISLAND.keyboardMinDurationMs, baseDuration / speed);

      anim.stopAnimation();
      keyboardHeightRef.current = keyboardHeight;
      Animated.timing(anim, {
        toValue: keyboardHeight,
        duration,
        // The bar only moves with transform, so this can run on the native thread.
        // That keeps it locked to the keyboard instead of trailing behind JS work.
        useNativeDriver: true,
      }).start();
    };

    if (Platform.OS === 'ios') {
      const onFrameChange = Keyboard.addListener('keyboardWillChangeFrame', animateToKeyboardFrame);
      return () => onFrameChange.remove();
    }

    const onShow = Keyboard.addListener('keyboardDidShow', animateToKeyboardFrame);
    const onHide = Keyboard.addListener('keyboardDidHide', (e: KeyboardEvent) => {
      const baseDuration = e.duration ?? 250;
      const duration = Math.max(
        ISLAND.keyboardMinDurationMs,
        baseDuration / ISLAND.keyboardCloseSpeed,
      );

      anim.stopAnimation();
      keyboardHeightRef.current = 0;
      Animated.timing(anim, {
        toValue: 0,
        duration,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, [anim]);

  return anim;
}

// ─── Gradient strips ─────────────────────────────────────────────────────────

/**
 * Pure-RN gradient fade: an array of thin strips going from transparent (top)
 * to AREA.backgroundColor (bottom), positioned absolutely above the bar.
 */
function GradientFade({ height }: { height: number }) {
  const strips = useMemo(() => {
    const steps = ISLAND.gradientSteps;
    return Array.from({ length: steps }, (_, i) => {
      // Use an ease-in curve so the fade feels more natural
      const t = (i + 1) / steps;
      const opacity = t * t; // quadratic
      return (
        <View
          key={i}
          style={{
            flex: 1,
            backgroundColor: `rgba(${BR},${BG},${BB},${opacity.toFixed(3)})`,
          }}
        />
      );
    });
  }, []);

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: -height,
        left: 0,
        right: 0,
        height,
      }}
    >
      {strips}
    </View>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

type ChatInputBarProps = {
  placeholder?: string;
  onSend: (text: string) => void;
  sendIcon?: React.ReactNode;
  contentAboveBar?: React.ReactNode;
  clanColor?: string;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ChatInputBar({
  placeholder = 'Escribe aquí...',
  onSend,
  sendIcon,
  contentAboveBar,
  clanColor = '#c7ff02',
}: ChatInputBarProps) {
  const [text, setText] = useState('');

  // The TextInput auto-grows from minHeight to maxInputHeight thanks to
  // multiline + maxHeight. After that it becomes scrollable (default RN behaviour).
  // We deliberately DO NOT keep height in state nor use onContentSizeChange:
  // doing so creates a measurement feedback loop (state → re-render → re-measure → state…).
  const maxInputHeight = ISLAND.lineHeight * ISLAND.maxInputLines;

  const handleTranscriptReady = useCallback((transcript: string) => {
    setText((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed} ${transcript}` : transcript;
    });
  }, []);

  const {
    voiceState,
    interimText,
    elapsedSeconds,
    volumeLevel,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useVoiceInput({ onTranscriptReady: handleTranscriptReady });

  const isRecording    = voiceState === 'recording';
  const isTranscribing = voiceState === 'transcribing';

  const handleSend = () => {
    const t = text.trim();
    if (t) {
      onSend(t);
      setText('');
    }
  };

  const keyboardAnim = useKeyboardAnim();

  // ── Action button ──────────────────────────────────────────────────────────

  const actionButtonBg      = isRecording ? clanColor : BTN.backgroundColor;
  const handleActionButton  = isRecording ? stopRecording : handleSend;

  const actionButtonContent = isRecording ? (
    <View style={styles.stopSquare} />
  ) : isTranscribing ? (
    <ActivityIndicator size="small" color="#0b0b0f" />
  ) : (
    sendIcon ?? <Text style={{ color: '#0b0b0f', fontSize: 20 }}>★</Text>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    /* Move over the keyboard without changing the ScrollView layout every frame. */
    <Animated.View
      style={[
        styles.outerWrapper,
        { transform: [{ translateY: Animated.multiply(keyboardAnim, -1) }] },
      ]}
    >

      {/* ── Gradient fade that overlays scroll content above the bar ── */}
      <GradientFade height={ISLAND.gradientHeight} />

      {/* ── Content above bar (welcome screen, etc.) ── */}
      {contentAboveBar}

      {/* ── The actual bar row ── */}
      <View
        style={[
          styles.bar,
          {
            paddingTop: AREA.paddingTop,
            paddingBottom: AREA.paddingBottom + ISLAND.extraHeight,
            paddingHorizontal: AREA.paddingHorizontal,
            borderTopWidth: AREA.borderTopWidth,
            borderTopColor: AREA.borderTopColor,
            transform: [{ translateY: AREA.offsetY + ISLAND.relativeOffsetY }],
          },
        ]}
      >
        {/* Input area */}
        <View
          style={[
            styles.inputWrap,
            {
              minHeight: INP.minHeight,
              maxHeight: maxInputHeight,
              borderRadius: INP.borderRadius,
              backgroundColor: INP.backgroundColor,
              borderWidth: INP.borderWidth,
              borderColor: isRecording ? `${clanColor}55` : INP.borderColor,
              transform: [
                { translateX: INP.offsetX },
                { translateY: INP.offsetY },
                { scaleX: INP.widthScale },
              ],
            },
          ]}
        >
          {isRecording || isTranscribing ? (
            <View style={styles.recordingInner}>
              <TouchableOpacity
                onPress={cancelRecording}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>

              {isTranscribing ? (
                <View style={styles.transcribingWrap}>
                  <ActivityIndicator size="small" color={clanColor} />
                  <Text style={[styles.transcribingText, { color: clanColor }]}>
                    Procesando…
                  </Text>
                </View>
              ) : (
                <VoiceWaveform volume={volumeLevel} color={clanColor} height={28} />
              )}

              <Text style={styles.timer}>{formatTime(elapsedSeconds)}</Text>
            </View>
          ) : (
            <>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder={interimText ? '…' : placeholder}
                placeholderTextColor={evoconnColors.muted}
                style={[
                  styles.input,
                  {
                    fontSize: INP.fontSize,
                    paddingHorizontal: INP.paddingHorizontal,
                    paddingVertical: INP.paddingVertical,
                    paddingRight: INP.paddingHorizontal + 34,
                    minHeight: INP.minHeight,
                    maxHeight: maxInputHeight,
                  },
                ]}
                multiline
                scrollEnabled
                maxLength={2000}
              />
              <TouchableOpacity
                onPress={startRecording}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.micBtn}
              >
                <Ionicons name="mic" size={17} color="#949ba6" />
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Send / Stop button */}
        <TouchableOpacity
          onPress={handleActionButton}
          disabled={isTranscribing}
          style={[
            styles.sendBtn,
            {
              width: BTN.size,
              height: BTN.size,
              borderRadius: BTN.borderRadius,
              backgroundColor: actionButtonBg,
              transform: [
                { translateX: BTN.offsetX },
                { translateY: BTN.offsetY },
                { scale: BTN.scale },
              ],
            },
          ]}
        >
          {actionButtonContent}
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  outerWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
    width: '100%',
    // Transparent background — the gradient provides the visual backdrop
    backgroundColor: 'transparent',
    // Needed so the absolutely-positioned gradient (negative bottom) shows above scroll content
    overflow: 'visible',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    // No background — fully transparent so the gradient shows through
    backgroundColor: 'transparent',
  },
  inputWrap: {
    flex: 1,
    marginRight: 8,
    overflow: 'hidden',
  },
  input: {
    color: evoconnColors.text,
  },
  micBtn: {
    position: 'absolute',
    bottom: 9,
    right: 10,
  },
  recordingInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flex: 1,
  },
  cancelBtn: {
    paddingRight: 8,
  },
  cancelText: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '500',
  },
  timer: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    paddingLeft: 8,
    minWidth: 32,
    textAlign: 'right',
  },
  transcribingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  transcribingText: {
    fontSize: 12,
    fontWeight: '500',
  },
  stopSquare: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: '#0b0b0f',
  },
  sendBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
