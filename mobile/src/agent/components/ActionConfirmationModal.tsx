/**
 * Modal de confirmación ligera para acciones sensibles del agente (v2 Sprint 2).
 * Confirmación por toque: el flujo de confirmación por voz llega en Sprint 4.
 * Cerrar tocando fuera o con el botón atrás = cancelar.
 */
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  visible: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ActionConfirmationModal({ visible, message, onConfirm, onCancel }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        {/* Pressable vacío: evita que el toque dentro de la tarjeta cancele. */}
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>Confirmar acción</Text>
          <Text style={styles.body}>{message}</Text>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.confirmButton, pressed && styles.pressed]}
            onPress={onConfirm}
          >
            <Text style={styles.confirmLabel}>Confirmar</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
            onPress={onCancel}
          >
            <Text style={styles.cancelLabel}>Cancelar</Text>
          </Pressable>
        </Pressable>
      </Pressable>
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
  confirmButton: {
    marginTop: 6,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  confirmLabel: {
    color: '#000',
    fontSize: 15,
    fontWeight: '700',
  },
  cancelButton: {
    marginTop: 10,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  cancelLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
  },
});
