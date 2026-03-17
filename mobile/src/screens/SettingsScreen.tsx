import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { evoconnColors } from '@evoconn/theme/colors';

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ajustes</Text>
      <Text style={styles.hint}>Notificaciones, privacidad, cuenta...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: evoconnColors.background, padding: 24, paddingTop: 48 },
  title: { color: evoconnColors.text, fontSize: 20, fontWeight: '700', marginBottom: 8 },
  hint: { color: evoconnColors.muted, fontSize: 14 },
});
