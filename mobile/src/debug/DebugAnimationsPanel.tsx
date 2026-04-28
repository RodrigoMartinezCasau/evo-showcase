/**
 * DebugAnimationsPanel
 * ====================
 * Botón flotante (solo __DEV__) que permite al moderador previsualizar
 * cada una de las animaciones del usuario usando el clan activo en el display.
 *
 * Animaciones disponibles:
 *   - Bienvenida      → ClanEntryAnimation
 *   - Asignación clan → ClanRevealAnimation (isChange=false)
 *   - Cambio de clan  → ClanRevealAnimation (isChange=true, clan anterior simulado)
 *   - Aumento de racha → StreakAnimation
 *   - Aumento de rango → próximamente
 *
 * No modifica ningún estado real del usuario.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ClanEntryAnimation from '../components/animations/ClanEntryAnimation';
import ClanRevealAnimation from '../components/animations/ClanRevealAnimation';
import StreakAnimation from '../components/animations/StreakAnimation';
import type { AnimClanId } from '../constants/evoAnimationClans';
import { ANIM_CLAN_IDS } from '../constants/evoAnimationClans';
import { useActiveClan } from './DebugClanContext';
import { mockCurrentUser } from '../data/mockUser';

// Clan alternativo para simular "cambio de clan" — siempre distinto al actual
function getPrevClan(current: AnimClanId): Exclude<AnimClanId, 'none'> {
  const options = ANIM_CLAN_IDS.filter(
    (id) => id !== 'none' && id !== current,
  ) as Exclude<AnimClanId, 'none'>[];
  return options[0] ?? 'estoico';
}

type AnimKey = 'entry' | 'assign' | 'change' | 'streak' | 'rank';

interface AnimOption {
  key: AnimKey;
  label: string;
  emoji: string;
  available: boolean;
}

const ANIM_OPTIONS: AnimOption[] = [
  { key: 'entry',  label: 'Bienvenida',       emoji: '✨', available: true },
  { key: 'assign', label: 'Asignación de clan', emoji: '🌟', available: true },
  { key: 'change', label: 'Cambio de clan',    emoji: '🔄', available: true },
  { key: 'streak', label: 'Aumento de racha',  emoji: '🔥', available: true },
  { key: 'rank',   label: 'Aumento de rango',  emoji: '🏆', available: false },
];

export function DebugAnimationsPanel() {
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);
  const [playing, setPlaying] = useState<AnimKey | null>(null);

  // Lee el clan activo del display (debug clan selector / preview mode)
  const activeClan = useActiveClan(mockCurrentUser.clanId);
  const clanId: AnimClanId = (activeClan ?? 'none') as AnimClanId;

  const resolvedClan: Exclude<AnimClanId, 'none'> =
    clanId !== 'none' ? (clanId as Exclude<AnimClanId, 'none'>) : 'estoico';
  const prevClan = getPrevClan(resolvedClan);

  function play(key: AnimKey) {
    setMenuOpen(false);
    setPlaying(key);
  }

  function stop() {
    setPlaying(null);
  }

  return (
    <>
      {/* ── FAB ───────────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={[styles.fab, { bottom: 100 + insets.bottom + 108 }]}
        activeOpacity={0.75}
        onPress={() => setMenuOpen(true)}
        accessibilityLabel="Debug: previsualizar animaciones"
      >
        <Text style={styles.fabIcon}>🎬</Text>
      </TouchableOpacity>

      {/* ── Menú de selección ─────────────────────────────────────────── */}
      <Modal visible={menuOpen} transparent animationType="fade">
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setMenuOpen(false)}
        />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <Text style={styles.sheetTitle}>🎬 Preview Animaciones</Text>
          <Text style={styles.sheetSubtitle}>
            Clan activo:{' '}
            <Text style={styles.clanLabel}>{clanId === 'none' ? 'Sin clan (→ estoico)' : clanId}</Text>
          </Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {ANIM_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.option, !opt.available && styles.optionDisabled]}
                activeOpacity={opt.available ? 0.7 : 1}
                onPress={() => opt.available && play(opt.key)}
                disabled={!opt.available}
              >
                <Text style={styles.optionEmoji}>{opt.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionLabel, !opt.available && styles.optionLabelDisabled]}>
                    {opt.label}
                  </Text>
                  {!opt.available && (
                    <Text style={styles.optionSoon}>Próximamente</Text>
                  )}
                </View>
                {opt.available && <Text style={styles.optionArrow}>▶</Text>}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* ── Animaciones — superposición full-screen ───────────────────── */}
      {playing !== null && (
        <View style={styles.animOverlay}>
          <StatusBar hidden />
          {playing === 'entry' && (
            <ClanEntryAnimation
              clanId={clanId}
              onComplete={stop}
            />
          )}
          {playing === 'assign' && (
            <ClanRevealAnimation
              clanId={resolvedClan}
              isChange={false}
              onComplete={stop}
            />
          )}
          {playing === 'change' && (
            <ClanRevealAnimation
              clanId={resolvedClan}
              previousClanId={prevClan}
              isChange
              onComplete={stop}
            />
          )}
          {playing === 'streak' && (
            <StreakAnimation
              clanId={clanId}
              streakCount={7}
              onClose={stop}
            />
          )}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    zIndex: 9999,
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(20,20,28,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabIcon: {
    fontSize: 20,
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
    backgroundColor: '#111118',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    maxHeight: '70%',
  },
  sheetTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  sheetSubtitle: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    marginBottom: 16,
  },
  clanLabel: {
    color: '#c7ff02',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  optionDisabled: {
    opacity: 0.4,
  },
  optionEmoji: {
    fontSize: 22,
    width: 32,
    textAlign: 'center',
  },
  optionLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  optionLabelDisabled: {
    color: 'rgba(255,255,255,0.5)',
  },
  optionSoon: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    marginTop: 2,
  },
  optionArrow: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 12,
  },
  animOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    elevation: 99999,
    flex: 1,
  },
});
