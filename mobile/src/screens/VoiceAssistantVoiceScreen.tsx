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

import {
  AssistantConsentModal,
  grantAssistantConsent,
  hasConsentedToAssistant,
  logAgentEvent,
  revokeAssistantConsent,
} from '@evoconn/agent';
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
  const [consented, setConsented] = useState<boolean | null>(null);
  const [consentModalVisible, setConsentModalVisible] = useState(false);

  useEffect(() => {
    void hasConsentedToAssistant().then(setConsented);
  }, []);

  const handleRevokeConsent = useCallback(() => {
    Alert.alert(
      'Revocar consentimiento',
      'El asistente de voz dejará de funcionar hasta que vuelva a aceptar el envío de datos a proveedores externos. ¿Desea revocarlo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Revocar',
          style: 'destructive',
          onPress: () => {
            void revokeAssistantConsent()
              .then(() => {
                setConsented(false);
                Alert.alert(
                  'Consentimiento revocado',
                  'El asistente volverá a pedir su consentimiento la próxima vez que lo use.',
                );
              })
              .catch(() => {
                Alert.alert('Error', 'No se pudo revocar el consentimiento. Inténtelo de nuevo.');
              });
          },
        },
      ],
    );
  }, []);

  const handleGrantConsent = useCallback(() => {
    setConsentModalVisible(false);
    void grantAssistantConsent()
      .then(() => {
        setConsented(true);
        void logAgentEvent({ eventType: 'agent_consent_granted', currentRoute: '/settings-voice-assistant' });
      })
      .catch(() => {
        Alert.alert('Error', 'No se pudo guardar el consentimiento. Inténtelo de nuevo.');
      });
  }, []);

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

        <Text style={styles.sectionTitle}>Privacidad</Text>
        <View style={styles.consentCard}>
          <View style={styles.consentRow}>
            <Text style={styles.rowLabel}>Asistente de voz activado</Text>
            <Text style={[styles.consentState, consented ? styles.consentOn : styles.consentOff]}>
              {consented === null ? '…' : consented ? 'Sí' : 'No'}
            </Text>
          </View>
          <Text style={styles.consentHint}>
            Al usar el asistente se envía a proveedores externos de IA (OpenAI) la transcripción
            de su voz, el contenido visible de la pantalla y datos básicos de su perfil. El audio
            no sale del dispositivo.
          </Text>
          {consented ? (
            <TouchableOpacity style={styles.consentBtn} onPress={handleRevokeConsent}>
              <Text style={styles.consentBtnDanger}>Revocar consentimiento</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.consentBtn} onPress={() => setConsentModalVisible(true)}>
              <Text style={styles.consentBtnText}>Activar asistente</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <AssistantConsentModal
        visible={consentModalVisible}
        onAccept={handleGrantConsent}
        onDecline={() => setConsentModalVisible(false)}
      />
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
  sectionTitle: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 28,
    marginBottom: 8,
    marginLeft: 4,
  },
  consentCard: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 16,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  consentState: { fontSize: 15, fontWeight: '700' },
  consentOn: { color: evoconnColors.neonGreen },
  consentOff: { color: 'rgba(255,255,255,0.45)' },
  consentHint: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  consentBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  consentBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  consentBtnDanger: { color: '#ff6b6b', fontSize: 14, fontWeight: '600' },
});
