import React, { useState, useCallback, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { evoconnColors } from '@evoconn/theme/colors';
import { useSinglePress } from '@evoconn/hooks/useSinglePress';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Devuelve true si se creó (nombre no vacío). */
  onCreate: (name: string) => void;
};

export function PhraseFolderCreateModal({ visible, onClose, onCreate }: Props) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (!visible) setName('');
  }, [visible]);

  const rawSubmit = useCallback(() => {
    const t = name.trim();
    if (!t) return;
    onCreate(t);
    setName('');
    onClose();
  }, [name, onCreate, onClose]);

  // Guard against rapid multi-tap on "Crear" (Android Fabric crash, see useSinglePress).
  const submit = useSinglePress(rawSubmit);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={styles.card} onStartShouldSetResponder={() => true}>
          <Text style={styles.title}>Nueva carpeta</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Nombre de la carpeta"
            placeholderTextColor={evoconnColors.muted}
            style={styles.input}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={submit}
          />
          <View style={styles.actions}>
            <TouchableOpacity onPress={onClose} style={[styles.btn, styles.btnGhost]}>
              <Text style={styles.btnGhostText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={submit} style={[styles.btn, styles.btnPrimary]}>
              <Text style={styles.btnPrimaryText}>Crear</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: evoconnColors.text,
    fontSize: 16,
    marginBottom: 18,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  btnGhost: {
    backgroundColor: 'transparent',
  },
  btnGhostText: {
    color: evoconnColors.muted,
    fontWeight: '600',
  },
  btnPrimary: {
    backgroundColor: '#C7FF02',
  },
  btnPrimaryText: {
    color: '#111',
    fontWeight: '800',
  },
});
