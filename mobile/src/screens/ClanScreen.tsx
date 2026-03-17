import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { evoconnColors } from '@evoconn/theme/colors';
import { getClanCardColor } from '@evoconn/theme/theme';

export default function ClanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const clanId = id ?? 'nihilista';
  const color = getClanCardColor(clanId);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={[styles.banner, { backgroundColor: color }]}>
          <Text style={styles.clanName}>{clanId.toUpperCase()}</Text>
        </View>
        <Text style={styles.section}>Identidad</Text>
        <Text style={styles.body}>Descripción del clan y su filosofía.</Text>
        <Text style={styles.section}>Rankings</Text>
        <View style={styles.ranking}>
          <Text style={styles.rankItem}>1. Usuario A</Text>
          <Text style={styles.rankItem}>2. Usuario B</Text>
          <Text style={styles.rankItem}>3. Usuario C</Text>
        </View>
        <Text style={styles.section}>Estadísticas</Text>
        <View style={styles.stats}>
          <Text style={styles.statText}>Miembros: 42</Text>
          <Text style={styles.statText}>Reflexiones: 1.2k</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: evoconnColors.background },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 48 },
  banner: { padding: 24, borderRadius: 12, marginBottom: 20, alignItems: 'center' },
  clanName: { color: evoconnColors.background, fontSize: 22, fontWeight: '700' },
  section: { color: evoconnColors.neonGreen, fontSize: 14, fontWeight: '700', marginBottom: 8 },
  body: { color: evoconnColors.muted, fontSize: 14, marginBottom: 20 },
  ranking: { marginBottom: 20 },
  rankItem: { color: evoconnColors.text, fontSize: 14, marginBottom: 4 },
  stats: { gap: 4 },
  statText: { color: evoconnColors.muted, fontSize: 14 },
});
