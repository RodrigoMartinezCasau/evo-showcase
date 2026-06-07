/**
 * Hojas de acciones y confirmaciones con estilo EVO (oscuro), sustituyen Alert.alert nativo.
 *
 * Todos los modales de este archivo gatean los handlers con `useSinglePressGate`
 * para evitar el crash de Android Fabric `IllegalStateException: addViewAt ...
 * already has a parent` causado por multi-tap rápido (ver useSinglePress.ts).
 */
import React, { useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSinglePressGate } from '@evoconn/hooks/useSinglePress';

const OVERLAY = 'rgba(0,0,0,0.78)';
const SHEET_BG = '#12121a';
const ROW_BORDER = 'rgba(255,255,255,0.08)';
const TEXT = '#F4F4F5';
const DESTRUCTIVE = '#F87171';
const ACCENT = '#c7ff02';

function accentBorderColor(hex: string): string {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 6) return `#${clean}59`;
  if (clean.length === 3) {
    const [r, g, b] = clean.split('');
    return `#${r}${r}${g}${g}${b}${b}59`;
  }
  return 'rgba(199,255,2,0.35)';
}

export type EvoActionOption = {
  key: string;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  /** Icono blanco a la izquierda del texto (Ionicons). */
  icon?: React.ComponentProps<typeof Ionicons>['name'];
};

type ActionSheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  options: EvoActionOption[];
  /** Color del botón Cancelar (p. ej. color del clan). Por defecto verde lima. */
  accentColor?: string;
};

export function EvoActionSheetModal({
  visible,
  onClose,
  title,
  options,
  accentColor,
}: ActionSheetProps) {
  const cancelAccent = accentColor?.trim() || ACCENT;
  const cancelBorder = accentBorderColor(cancelAccent);
  const insets = useSafeAreaInsets();
  const { runGuarded, reset } = useSinglePressGate();

  useEffect(() => {
    if (!visible) reset();
  }, [visible, reset]);

  const runOption = (fn: () => void) =>
    runGuarded(() => {
      onClose();
      requestAnimationFrame(fn);
    });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable
            style={[styles.sheet, { paddingBottom: Math.max(16, insets.bottom + 12) }]}
            onPress={(e) => e.stopPropagation()}
          >
            {title ? (
              <Text style={styles.sheetTitle} numberOfLines={2}>
                {title}
              </Text>
            ) : null}
            <View style={styles.optionsList}>
              {options.map((o) => (
                <TouchableOpacity
                  key={o.key}
                  style={styles.optionRow}
                  onPress={() => runOption(o.onPress)}
                  activeOpacity={0.65}
                >
                  {o.icon ? (
                    <Ionicons
                      name={o.icon}
                      size={22}
                      color={o.destructive ? DESTRUCTIVE : '#FFFFFF'}
                      style={styles.optionIcon}
                    />
                  ) : null}
                  <Text style={[styles.optionLabel, o.destructive && styles.optionDestructive]}>
                    {o.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.cancelOuter, { borderColor: cancelBorder }]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={[styles.cancelLabel, { color: cancelAccent }]}>Cancelar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

type ConfirmProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
};

export function EvoConfirmModal({
  visible,
  onClose,
  title,
  message,
  confirmLabel,
  destructive,
  onConfirm,
}: ConfirmProps) {
  const { runGuarded, reset } = useSinglePressGate();

  useEffect(() => {
    if (!visible) reset();
  }, [visible, reset]);

  const handleConfirm = () =>
    runGuarded(() => {
      onClose();
      requestAnimationFrame(onConfirm);
    });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlayCenter} onPress={onClose}>
        <Pressable style={styles.dialog} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.dialogTitle}>{title}</Text>
          {message ? <Text style={styles.dialogMsg}>{message}</Text> : null}
          <View style={styles.dialogActions}>
            <TouchableOpacity style={styles.dialogBtnGhost} onPress={onClose} activeOpacity={0.75}>
              <Text style={styles.dialogBtnGhostText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dialogBtnPrimary, destructive && styles.dialogBtnDest]}
              onPress={handleConfirm}
              activeOpacity={0.8}
            >
              <Text style={[styles.dialogBtnPrimaryText, destructive && styles.dialogBtnDestText]}>
                {confirmLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

type PickerProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  items: { key: string; label: string; onPress: () => void }[];
};

export function EvoPickerModal({ visible, onClose, title, items }: PickerProps) {
  const insets = useSafeAreaInsets();
  const { runGuarded, reset } = useSinglePressGate();

  useEffect(() => {
    if (!visible) reset();
  }, [visible, reset]);

  const runItem = (fn: () => void) =>
    runGuarded(() => {
      onClose();
      requestAnimationFrame(fn);
    });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: Math.max(16, insets.bottom + 12) }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={styles.sheetTitle}>{title}</Text>
          <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled" bounces={false}>
            {items.map((it) => (
              <TouchableOpacity
                key={it.key}
                style={styles.optionRow}
                onPress={() => runItem(it.onPress)}
                activeOpacity={0.65}
              >
                <Text style={styles.optionLabel}>{it.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.cancelOuter} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.cancelLabel}>Cancelar</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: OVERLAY,
    justifyContent: 'flex-end',
  },
  overlayCenter: {
    flex: 1,
    backgroundColor: OVERLAY,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  sheet: {
    backgroundColor: SHEET_BG,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: ROW_BORDER,
  },
  sheetTitle: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 10,
  },
  optionsList: {
    paddingTop: 4,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: ROW_BORDER,
  },
  optionIcon: {
    marginRight: 14,
    width: 24,
    textAlign: 'center',
  },
  optionLabel: {
    color: TEXT,
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
  },
  optionDestructive: { color: DESTRUCTIVE },
  cancelOuter: {
    marginTop: 6,
    marginHorizontal: 16,
    marginBottom: 4,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(199,255,2,0.35)',
    alignItems: 'center',
  },
  cancelLabel: {
    color: ACCENT,
    fontSize: 16,
    fontWeight: '700',
  },
  dialog: {
    backgroundColor: SHEET_BG,
    borderRadius: 18,
    padding: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ROW_BORDER,
  },
  dialogTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  dialogMsg: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  dialogBtnGhost: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dialogBtnGhostText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 16,
    fontWeight: '600',
  },
  dialogBtnPrimary: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: ACCENT,
  },
  dialogBtnPrimaryText: {
    color: '#0b0b0f',
    fontSize: 16,
    fontWeight: '700',
  },
  dialogBtnDest: {
    backgroundColor: 'rgba(248,113,113,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.45)',
  },
  dialogBtnDestText: {
    color: DESTRUCTIVE,
  },
});

type InfoProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  message?: string;
};

export function EvoInfoModal({ visible, onClose, title, message }: InfoProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlayCenter} onPress={onClose}>
        <Pressable style={styles.dialog} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.dialogTitle}>{title}</Text>
          {message ? <Text style={styles.dialogMsg}>{message}</Text> : null}
          <TouchableOpacity style={styles.dialogBtnPrimary} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.dialogBtnPrimaryText}>OK</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
