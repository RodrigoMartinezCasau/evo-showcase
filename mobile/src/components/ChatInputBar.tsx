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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { evoconnColors } from '@evoconn/theme/colors';
import {
  CHAT_BOTTOM_AREA_LAYOUT as AREA,
  CHAT_INPUT_LAYOUT as INP,
  CHAT_SEND_BUTTON_LAYOUT as BTN,
  CHAT_INPUT_ISLAND_LAYOUT as ISLAND,
} from '@evoconn/constants/chatInputBarLayout';
import { useVoiceInput } from '@evoconn/hooks/useVoiceInput';
import { VoiceWaveform } from './VoiceWaveform';
import { LockedAiButtonIcon } from '@evoconn/components/shared/LockedAiButtonIcon';
import { showOutOfUsesAlert } from '@evoconn/utils/dailyUsesGate';

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

function AppleKeyboardMicIcon({ color = '#8E8E93' }: { color?: string }) {
  return (
    <Svg width={18} height={22} viewBox="0 0 18 22" fill="none">
      <Path
        d="M9 12.25c2.05 0 3.42-1.48 3.42-3.63V4.28C12.42 2.05 11.05.6 9 .6S5.58 2.05 5.58 4.28v4.34c0 2.15 1.37 3.63 3.42 3.63Z"
        fill={color}
      />
      <Path
        d="M3.2 8.2c0 3.28 2.34 5.62 5.8 5.62s5.8-2.34 5.8-5.62"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
      />
      <Path
        d="M9 13.7v4.2M5.55 18.05h6.9"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// ─── Clan send button ────────────────────────────────────────────────────────

/** Parse a #RRGGBB hex color into [r, g, b] 0–255. */
function parseHexColor(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  if (h.length !== 6) return [0, 0, 0];
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/**
 * Circular send button with a 5-pointed star.
 * Star color auto-switches: white on dark clan backgrounds, near-black on light.
 */
export function ClanSendButton({ size, clanColor }: { size: number; clanColor: string }) {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.265;
  const innerR = outerR * 0.40;
  const NUM_POINTS = 5;
  const step = Math.PI / NUM_POINTS;

  const pts: string[] = [];
  for (let i = 0; i < 2 * NUM_POINTS; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const theta = i * step - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(theta)).toFixed(2)},${(cy + r * Math.sin(theta)).toFixed(2)}`);
  }
  const starPath = `M ${pts.join(' L ')} Z`;

  const starColor = '#0b0b0f';

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={cx} cy={cy} r={size / 2} fill={clanColor} />
      <Path d={starPath} fill={starColor} />
    </Svg>
  );
}

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
export function useKeyboardAnim() {
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

// ─── Island backdrop ─────────────────────────────────────────────────────────

/**
 * Pure-RN backdrop: the top edge fades in progressively, then continues as a
 * translucent rectangle behind the whole input island down to the screen edge.
 */
function IslandBackdrop({ fadeHeight }: { fadeHeight: number }) {
  const strips = useMemo(() => {
    const steps = ISLAND.gradientSteps;
    return Array.from({ length: steps }, (_, i) => {
      // Use an ease-in curve so the fade feels more natural
      const t = (i + 1) / steps;
      const opacity = t * t * ISLAND.islandBackdropOpacity; // quadratic
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
        top: -fadeHeight + ISLAND.gradientStartOffsetY,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      <View style={{ height: fadeHeight }}>{strips}</View>
      <View
        style={{
          flex: 1,
          backgroundColor: `rgba(${BR},${BG},${BB},${ISLAND.islandBackdropOpacity})`,
        }}
      />
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
  inputCursorColor?: string;
  /** false = no enviar (reflexión/frase); botón con candado y aviso. */
  aiUsesAvailable?: boolean;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ChatInputBar({
  placeholder = 'Escribe aquí...',
  onSend,
  sendIcon,
  contentAboveBar,
  clanColor = '#c7ff02',
  inputCursorColor = clanColor,
  aiUsesAvailable = true,
}: ChatInputBarProps) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const welcomeOpacity = useRef(new Animated.Value(1)).current;

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
    if (!aiUsesAvailable) {
      showOutOfUsesAlert();
      return;
    }
    const t = text.trim();
    if (t) {
      onSend(t);
      setText('');
    }
  };

  const handleStartRecording = () => {
    if (!aiUsesAvailable) {
      showOutOfUsesAlert();
      return;
    }
    void startRecording();
  };

  const keyboardAnim = useKeyboardAnim();
  const keyboardGapOffset = keyboardAnim.interpolate({
    inputRange: [0, ISLAND.keyboardBubbleGapBlendPx],
    outputRange: [0, ISLAND.keyboardBubbleGapOffsetY],
    extrapolate: 'clamp',
  });
  const windowHeight = Dimensions.get('window').height;
  const welcomeBottom =
    windowHeight * ISLAND.welcomeCenterBottomRatio + ISLAND.welcomeCenterOffsetY;

  useEffect(() => {
    const hasTypedText = text.length > 0;
    Animated.timing(welcomeOpacity, {
      toValue: hasTypedText ? 0 : 1,
      duration: hasTypedText ? ISLAND.welcomeHideDurationMs : ISLAND.welcomeShowDurationMs,
      useNativeDriver: true,
    }).start();
  }, [text, welcomeOpacity]);

  // ── Action button ──────────────────────────────────────────────────────────

  const outOfUses = !aiUsesAvailable;
  const actionButtonBg = isRecording ? clanColor : BTN.backgroundColor;
  const handleActionButton = isRecording ? stopRecording : handleSend;

  const actionButtonContent = isRecording ? (
    <View style={styles.stopSquare} />
  ) : isTranscribing ? (
    <ActivityIndicator size="small" color="#0b0b0f" />
  ) : outOfUses ? (
    <LockedAiButtonIcon size={BTN.size} circleColor={clanColor} />
  ) : (
    sendIcon ?? <Text style={{ color: '#0b0b0f', fontSize: 20 }}>★</Text>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    /* Move over the keyboard without changing the ScrollView layout every frame. */
    <Animated.View
      style={[
        styles.outerWrapper,
        Platform.OS === 'android' && { bottom: insets.bottom },
        {
          transform: [
            {
              translateY: Animated.add(
                Animated.multiply(keyboardAnim, -1),
                keyboardGapOffset,
              ),
            },
          ],
        },
      ]}
    >

      {/* ── Translucent island backdrop with a progressive top edge ── */}
      <IslandBackdrop fadeHeight={ISLAND.gradientHeight} />

      {/* ── Empty-state welcome centered in the screen ── */}
      {contentAboveBar ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.welcomeOverlay,
            {
              bottom: welcomeBottom,
              opacity: welcomeOpacity,
              transform: [
                {
                  translateY: Animated.multiply(
                    keyboardAnim,
                    1 - ISLAND.welcomeKeyboardLiftRatio,
                  ),
                },
                {
                  translateY: Animated.multiply(keyboardGapOffset, -1),
                },
              ],
            },
          ]}
        >
          {contentAboveBar}
        </Animated.View>
      ) : null}

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
                selectionColor={inputCursorColor}
                cursorColor={inputCursorColor}
                style={[
                  styles.input,
                  {
                    fontSize: INP.textFontSize,
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
                onPress={handleStartRecording}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.micBtn}
              >
                <AppleKeyboardMicIcon />
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
  welcomeOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
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
