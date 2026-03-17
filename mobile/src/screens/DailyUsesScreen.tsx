import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { evoconnColors } from '@evoconn/theme/colors';
import { mockUserStats } from '@evoconn/data/mockUser';

export default function DailyUsesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Usos diarios</Text>
      <Text style={styles.value}>{mockUserStats.dailyUsesLeft}</Text>
      <Text style={styles.hint}>Usos restantes hoy</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: evoconnColors.background, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { color: evoconnColors.muted, fontSize: 16, marginBottom: 8 },
  value: { color: evoconnColors.neonGreen, fontSize: 48, fontWeight: '700' },
  hint: { color: evoconnColors.muted, fontSize: 14, marginTop: 8 },
});
