/**
 * DebugPreviewSelector
 * ====================
 * Botón flotante independiente del "CLAN" existente.
 * Abre un modal con los 9 estados visuales (SIN CLAN + 8 clanes)
 * para previsualizar el tema de diseño sin tocar ningún dato real.
 *
 * Solo se monta bajo __DEV__ (el guard está en _layout.tsx).
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CLAN_TO_COLOR, type ClanId } from '@evoconn/constants/clanColors';
import { usePreviewMode } from './PreviewModeContext';

const CLAN_OPTIONS: { id: ClanId | null; label: string }[] = [
  { id: null,              label: 'SIN CLAN'         },
  { id: 'nihilista',       label: 'NIHILISTA'        },
  { id: 'cientista',       label: 'CIENTISTA'        },
  { id: 'estoico',         label: 'ESTOICO'          },
  { id: 'existencialista', label: 'EXISTENCIALISTA'  },
  { id: 'trascendentalista', label: 'TRASCENDENTALISTA' },
  { id: 'humanista',       label: 'HUMANISTA'        },
  { id: 'realista',        label: 'REALISTA'         },
  { id: 'racionalista',    label: 'RACIONALISTA'     },
];

export function DebugPreviewSelector() {
  const [open, setOpen] = useState(false);
  const { isPreviewActive, previewClanId, setPreviewClan, exitPreview } = usePreviewMode();
  const insets = useSafeAreaInsets();

  const dotColor = previewClanId ? (CLAN_TO_COLOR[previewClanId] ?? '#c7ff02') : '#c7ff02';

  return (
    <>
      {/* FAB — posicionado 52px por encima del botón CLAN existente */}
      <TouchableOpacity
        style={[styles.fab, { bottom: 100 + insets.bottom + 52 }]}
        activeOpacity={0.75}
        onPress={() => setOpen(true)}
        accessibilityLabel="Preview: cambiar tema de clan"
      >
        {isPreviewActive && (
          <View style={[styles.fabDot, { backgroundColor: dotColor }]} />
        )}
        <Text style={styles.fabLabel}>🎨</Text>
      </TouchableOpacity>

      {/* Modal de selección */}
      <Modal visible={open} transparent animationType="fade">
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>

          {/* Header */}
          <Text style={styles.title}>🎨 Preview Clan Theme</Text>
          <Text style={styles.subtitle}>Solo visual — no afecta datos reales</Text>

          {/* Lista de clanes */}
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {CLAN_OPTIONS.map(({ id, label }) => {
              const color = id ? (CLAN_TO_COLOR[id] ?? '#c7ff02') : '#c7ff02';
              const isSelected = isPreviewActive && previewClanId === id;
              return (
                <TouchableOpacity
                  key={label}
                  style={[styles.option, isSelected && styles.optionSelected]}
                  activeOpacity={0.7}
                  onPress={() => { setPreviewClan(id); setOpen(false); }}
                >
                  <View style={[styles.swatch, { backgroundColor: color }]} />
                  <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                    {label}
                  </Text>
                  {isSelected && <Text style={styles.check}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Botón de salir */}
          {isPreviewActive && (
            <TouchableOpacity
              style={styles.exitBtn}
              activeOpacity={0.8}
              onPress={() => { exitPreview(); setOpen(false); }}
            >
              <Text style={styles.exitBtnLabel}>Salir Preview</Text>
            </TouchableOpacity>
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20,20,25,0.92)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    gap: 4,
  },
  fabDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  fabLabel: {
    fontSize: 14,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#18181D',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
    maxHeight: '65%',
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 14,
    letterSpacing: 0.3,
  },
  list: {
    flexGrow: 0,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 6,
  },
  optionSelected: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  swatch: {
    width: 18,
    height: 18,
    borderRadius: 4,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  optionLabel: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    letterSpacing: 0.8,
  },
  optionLabelSelected: {
    color: '#fff',
  },
  check: {
    color: '#c7ff02',
    fontSize: 16,
    fontWeight: '700',
  },
  exitBtn: {
    marginTop: 10,
    backgroundColor: 'rgba(255,60,60,0.12)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,60,60,0.25)',
    paddingVertical: 13,
    alignItems: 'center',
  },
  exitBtnLabel: {
    color: '#ff6b6b',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
