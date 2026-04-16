import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDebugStats, SIMULATED_TOTAL_DAILY_USES } from './DebugStatsContext';

const STREAK_PRESETS = [0, 1, 3, 7, 17, 30, 60, 100];
const USES_PRESETS = [0, 3, 10, 20, 28, 30];

/**
 * Floating FAB + bottom-sheet editor for simulated streak days and remaining uses.
 * Only renders in __DEV__ — callers should guard with `{__DEV__ && <DebugStatsEditor />}`.
 */
export function DebugStatsEditor() {
  const [open, setOpen] = useState(false);
  const {
    simulatedStreakDays,
    setSimulatedStreakDays,
    simulatedRemainingUses,
    setSimulatedRemainingUses,
  } = useDebugStats();
  const insets = useSafeAreaInsets();

  return (
    <>
      {/* Floating button */}
      <TouchableOpacity
        style={[styles.fab, { bottom: 152 + insets.bottom }]}
        activeOpacity={0.8}
        onPress={() => setOpen(true)}
        accessibilityLabel="Debug: editar stats simuladas"
      >
        <Text style={styles.fabText}>STATS</Text>
      </TouchableOpacity>

      {/* Bottom-sheet modal */}
      <Modal visible={open} transparent animationType="slide" statusBarTranslucent>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.handle} />
          <Text style={styles.title}>Debug — Simulated Stats</Text>

          {/* ── Streak days ── */}
          <Text style={styles.sectionLabel}>🔥  STREAK DAYS</Text>
          <View style={styles.stepRow}>
            <TouchableOpacity
              style={styles.stepBtn}
              activeOpacity={0.7}
              onPress={() => setSimulatedStreakDays(simulatedStreakDays - 1)}
            >
              <Text style={styles.stepBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.valueText}>{simulatedStreakDays}</Text>
            <TouchableOpacity
              style={styles.stepBtn}
              activeOpacity={0.7}
              onPress={() => setSimulatedStreakDays(simulatedStreakDays + 1)}
            >
              <Text style={styles.stepBtnText}>+</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.presetScroll}
            contentContainerStyle={styles.presetContent}
          >
            {STREAK_PRESETS.map((v) => (
              <TouchableOpacity
                key={v}
                style={[styles.preset, simulatedStreakDays === v && styles.presetActive]}
                activeOpacity={0.7}
                onPress={() => setSimulatedStreakDays(v)}
              >
                <Text style={[styles.presetText, simulatedStreakDays === v && styles.presetTextActive]}>
                  {v}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* ── Remaining uses ── */}
          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>❤️  REMAINING USES</Text>
          <View style={styles.stepRow}>
            <TouchableOpacity
              style={styles.stepBtn}
              activeOpacity={0.7}
              onPress={() => setSimulatedRemainingUses(simulatedRemainingUses - 1)}
            >
              <Text style={styles.stepBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.valueText}>
              {simulatedRemainingUses}
              <Text style={styles.valueTextSub}> / {SIMULATED_TOTAL_DAILY_USES}</Text>
            </Text>
            <TouchableOpacity
              style={styles.stepBtn}
              activeOpacity={0.7}
              onPress={() => setSimulatedRemainingUses(simulatedRemainingUses + 1)}
            >
              <Text style={styles.stepBtnText}>+</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.presetScroll}
            contentContainerStyle={styles.presetContent}
          >
            {USES_PRESETS.map((v) => (
              <TouchableOpacity
                key={v}
                style={[styles.preset, simulatedRemainingUses === v && styles.presetActive]}
                activeOpacity={0.7}
                onPress={() => setSimulatedRemainingUses(v)}
              >
                <Text style={[styles.presetText, simulatedRemainingUses === v && styles.presetTextActive]}>
                  {v}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={styles.closeBtn}
            activeOpacity={0.7}
            onPress={() => setOpen(false)}
          >
            <Text style={styles.closeBtnText}>Cerrar</Text>
          </TouchableOpacity>
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  fabText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#18181D',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 22,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 18,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 22,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  sectionLabel: {
    color: '#c7ff02',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 12,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  stepBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.09)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  stepBtnText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '400',
    lineHeight: 28,
    includeFontPadding: false,
  },
  valueText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    flex: 1,
    textAlign: 'center',
  },
  valueTextSub: {
    fontSize: 16,
    fontWeight: '400',
    color: '#888',
  },
  presetScroll: {
    flexGrow: 0,
    marginBottom: 4,
  },
  presetContent: {
    gap: 8,
    paddingHorizontal: 2,
  },
  preset: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  presetActive: {
    backgroundColor: 'rgba(199,255,2,0.14)',
    borderColor: '#c7ff02',
  },
  presetText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  presetTextActive: {
    color: '#c7ff02',
  },
  closeBtn: {
    marginTop: 22,
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  closeBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
