/**
 * ChatInputBar.tsx
 * ================
 * Barra de input compartida entre ReflectionCreationScreen y PhraseCreationScreen.
 *
 * Modos:
 *  IDLE         → TextInput normal + icono mic (bottom-right, color #949ba6)
 *  RECORDING    → Waveform animado + contador de tiempo + botón PARAR (color clan)
 *  TRANSCRIBING → Breve indicador de carga mientras se finaliza la transcripción
 *
 * Librería de voz: expo-speech-recognition (instalada con npm install)
 * Plugin configurado en app.json con permisos de micrófono.
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { evoconnColors } from '@evoconn/theme/colors';
import {
  CHAT_BOTTOM_AREA_LAYOUT as AREA,
  CHAT_INPUT_LAYOUT as INP,
  CHAT_SEND_BUTTON_LAYOUT as BTN,
} from '@evoconn/constants/chatInputBarLayout';
import { useVoiceInput } from '@evoconn/hooks/useVoiceInput';
import { VoiceWaveform } from './VoiceWaveform';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

// ─── Props ────────────────────────────────────────────────────────────────────

type ChatInputBarProps = {
  placeholder?: string;
  onSend: (text: string) => void;
  /** Clan-specific SVG rendered inside the send button. Falls back to a star if omitted. */
  sendIcon?: React.ReactNode;
  /** Rendered above the input row, inside the same keyboard-avoiding wrapper. */
  contentAboveBar?: React.ReactNode;
  /**
   * Color principal del clan activo — usado para la waveform y el botón PARAR.
   * Default: #c7ff02 (sin clan).
   */
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

  // Cuando la transcripción finaliza, añade el texto al campo (o lo reemplaza si estaba vacío)
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

  const isRecording     = voiceState === 'recording';
  const isTranscribing  = voiceState === 'transcribing';

  const handleSend = () => {
    const t = text.trim();
    if (t) { onSend(t); setText(''); }
  };

  // ── Send / Stop button ─────────────────────────────────────────────────────

  const actionButtonBg = isRecording ? clanColor : BTN.backgroundColor;

  const actionButtonContent = isRecording ? (
    // Cuadrado de stop
    <View style={styles.stopSquare} />
  ) : isTranscribing ? (
    <ActivityIndicator size="small" color="#0b0b0f" />
  ) : (
    sendIcon ?? <Text style={{ color: '#0b0b0f', fontSize: 20 }}>★</Text>
  );

  const handleActionButton = isRecording ? stopRecording : handleSend;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardWrap}
    >
      {contentAboveBar}
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
        {/* ── Input area (normal o grabación) ─────────────────────── */}
        <View
          style={[
            styles.inputWrap,
            {
              minHeight: INP.minHeight,
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
            // ── RECORDING / TRANSCRIBING mode ─────────────────────────────
            <View style={styles.recordingInner}>
              {/* Botón cancelar (esquina izquierda) */}
              <TouchableOpacity
                onPress={cancelRecording}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>

              {/* Waveform centrada */}
              {isTranscribing ? (
                <View style={styles.transcribingWrap}>
                  <ActivityIndicator size="small" color={clanColor} />
                  <Text style={[styles.transcribingText, { color: clanColor }]}>
                    Procesando…
                  </Text>
                </View>
              ) : (
                <VoiceWaveform
                  volume={volumeLevel}
                  color={clanColor}
                  height={28}
                />
              )}

              {/* Contador de tiempo (esquina derecha) */}
              <Text style={styles.timer}>{formatTime(elapsedSeconds)}</Text>
            </View>
          ) : (
            // ── IDLE mode — TextInput + mic icon ──────────────────────────
            <>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder={
                  interimText
                    ? '…'      // brief flash after transcription
                    : placeholder
                }
                placeholderTextColor={evoconnColors.muted}
                style={[
                  styles.input,
                  {
                    fontSize: INP.fontSize,
                    paddingHorizontal: INP.paddingHorizontal,
                    paddingVertical: INP.paddingVertical,
                    // Extra right padding so text doesn't go under the mic icon
                    paddingRight: INP.paddingHorizontal + 34,
                  },
                ]}
                multiline
                maxLength={2000}
              />
              {/* Icono micrófono — esquina inferior derecha del input */}
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

        {/* ── Send / Stop button ──────────────────────────────────── */}
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
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  keyboardWrap: {
    width: '100%',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  // Wrapper relativo para el area del input (reemplaza el TextInput directo)
  inputWrap: {
    flex: 1,
    marginRight: 8,
    overflow: 'visible',
  },
  // TextInput sin height fija — hereda del wrapper
  input: {
    flex: 1,
    color: evoconnColors.text,
    maxHeight: INP.maxHeight,
    minHeight: INP.minHeight,
  },
  // Icono mic — absoluto en esquina inferior derecha del input
  micBtn: {
    position: 'absolute',
    bottom: 9,
    right: 10,
  },
  // Layout interno del modo grabación
  recordingInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: INP.minHeight,
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
  // Cuadrado de stop (dentro del botón de acción cuando graba)
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
