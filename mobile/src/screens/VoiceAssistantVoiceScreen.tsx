import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { evoconnColors } from '@evoconn/theme/colors';
import {
  VOICE_ASSISTANT_VOICES,
  type VoiceAssistantVoiceId,
} from '@evoconn/constants/voiceAssistantVoices';
import { useVoiceAssistantPreferences } from '@evoconn/hooks/VoiceAssistantPreferencesContext';
import { previewVoiceAssistantTts } from '@evoconn/services/voiceAssistantApi';
import { stopVoiceAssistantPlayback } from '@evoconn/utils/voiceAssistantAudio';

const CARD_BG = '#0b0b0f';
const DIVIDER = 'rgba(255,255,255,0.06)';

export default function VoiceAssistantVoiceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { voiceId, setVoiceId } = useVoiceAssistantPreferences();
  const [previewingId, setPreviewingId] = useState<VoiceAssistantVoiceId | null>(null);
  const previewGenRef = useRef(0);

  const playPreview = useCallback(async (id: VoiceAssistantVoiceId) => {
    const gen = ++previewGenRef.current;
    stopVoiceAssistantPlayback();
    setPreviewingId(id);
    try {
      await previewVoiceAssistantTts(id);
    } catch (e) {
      if (gen !== previewGenRef.current) return;
      const msg = e instanceof Error ? e.message : 'No se pudo reproducir la muestra';
      Alert.alert('Voz del asistente', msg);
    } finally {
      if (gen === previewGenRef.current) setPreviewingId(null);
    }
  }, []);

  useEffect(() => () => {
    previewGenRef.current += 1;
    stopVoiceAssistantPlayback();
  }, []);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Voz del asistente</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
      >
        {VOICE_ASSISTANT_VOICES.map((voice, idx) => {
          const selected = voice.id === voiceId;
          const loading = previewingId === voice.id;
          return (
            <View
              key={voice.id}
              style={[styles.row, idx === 0 && styles.rowFirst, selected && styles.rowSelected]}
            >
              <TouchableOpacity
                style={styles.rowMain}
                activeOpacity={0.75}
                onPress={() => setVoiceId(voice.id)}
              >
                <Text style={styles.rowLabel}>{voice.label}</Text>
                {selected ? (
                  <Ionicons name="checkmark-circle" size={22} color={evoconnColors.neonGreen} />
                ) : (
                  <View style={styles.radioEmpty} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.previewBtn}
                onPress={() => void playPreview(voice.id)}
                disabled={loading || previewingId !== null}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.previewBtnText}>Escuchar</Text>
                )}
              </TouchableOpacity>
              {idx < VOICE_ASSISTANT_VOICES.length - 1 ? <View style={styles.divider} /> : null}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: evoconnColors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', color: '#fff', fontSize: 17, fontWeight: '600' },
  scroll: { flex: 1, paddingHorizontal: 16 },
  row: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 0,
  },
  rowFirst: { borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  rowSelected: { borderWidth: 1, borderColor: 'rgba(199,255,2,0.35)' },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  rowLabel: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '600' },
  radioEmpty: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  previewBtn: {
    alignSelf: 'flex-start',
    marginLeft: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    minWidth: 88,
    alignItems: 'center',
  },
  previewBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: DIVIDER, marginLeft: 16 },
});
