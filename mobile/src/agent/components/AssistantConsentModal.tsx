/**
 * Modal de consentimiento del asistente de voz (Apple 5.1.2(i) + GDPR).
 * Se muestra la primera vez que el usuario pulsa el orbe; hasta que acepte,
 * no se inicia el reconocimiento de voz ni se envía nada a proveedores de IA.
 */
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
};

export function AssistantConsentModal({ visible, onAccept, onDecline }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDecline}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Asistente de voz</Text>
          <Text style={styles.body}>
            Al usar el asistente de voz, se enviará a proveedores externos de inteligencia
            artificial (OpenAI) la siguiente información: la transcripción de lo que usted
            diga, el contenido visible de la pantalla en la que se encuentre y datos básicos
            de su perfil (clan, porcentajes filosóficos y estadísticas de uso) necesarios
            para contextualizar la respuesta.
          </Text>
          <Text style={styles.body}>
            El audio de su voz no sale del dispositivo: la transcripción se realiza
            localmente. Puede revocar este consentimiento en cualquier momento desde
            Ajustes, en la sección del asistente de voz.
          </Text>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.acceptButton, pressed && styles.pressed]}
            onPress={onAccept}
          >
            <Text style={styles.acceptLabel}>Aceptar y usar el asistente</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.declineButton, pressed && styles.pressed]}
            onPress={onDecline}
          >
            <Text style={styles.declineLabel}>Cancelar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    backgroundColor: '#16181d',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
    padding: 22,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  body: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  acceptButton: {
    marginTop: 6,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  acceptLabel: {
    color: '#000',
    fontSize: 15,
    fontWeight: '700',
  },
  declineButton: {
    marginTop: 10,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  declineLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
  },
});
