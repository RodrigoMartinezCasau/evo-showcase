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
import { useDebugClan, useDebugClanSetter } from './DebugClanContext';

const ALL_CLANS: ClanId[] = [
  'nihilista',
  'cientista',
  'estoico',
  'existencialista',
  'trascendentalista',
  'humanista',
  'realista',
  'racionalista',
];

/**
 * Floating debug button + clan picker modal.
 * Render this anywhere in the tree (inside DebugClanProvider).
 * Only meant for __DEV__ — callers should guard with `if (__DEV__)`.
 */
export function DebugClanSelector() {
  const [open, setOpen] = useState(false);
  const current = useDebugClan();
  const setClan = useDebugClanSetter();
  const insets = useSafeAreaInsets();

  const dotColor = current ? CLAN_TO_COLOR[current] : '#c7ff02';

  return (
    <>
      <TouchableOpacity
        style={[styles.fab, { bottom: 100 + insets.bottom }]}
        activeOpacity={0.75}
        onPress={() => setOpen(true)}
        accessibilityLabel="Debug: cambiar clan"
      >
        <View style={[styles.fabDot, { backgroundColor: dotColor }]} />
        <Text style={styles.fabLabel}>CLAN</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade">
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <Text style={styles.title}>Debug — Cambiar clan</Text>
          <ScrollView style={styles.list}>
            <ClanOption
              label="Sin clan (null)"
              color="#555"
              selected={current === null}
              onPress={() => { setClan(null); setOpen(false); }}
            />
            {ALL_CLANS.map((c) => (
              <ClanOption
                key={c}
                label={c}
                color={CLAN_TO_COLOR[c]}
                selected={current === c}
                onPress={() => { setClan(c); setOpen(false); }}
              />
            ))}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

function ClanOption({
  label,
  color,
  selected,
  onPress,
}: {
  label: string;
  color: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.option, selected && styles.optionSelected]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={[styles.swatch, { backgroundColor: color }]} />
      <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
        {label.toUpperCase()}
      </Text>
      {selected && <Text style={styles.check}>✓</Text>}
    </TouchableOpacity>
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
  fabDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  fabLabel: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
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
    maxHeight: '60%',
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
    textAlign: 'center',
    letterSpacing: 0.5,
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
});
