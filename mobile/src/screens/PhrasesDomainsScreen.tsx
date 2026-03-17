import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { evoconnColors } from '@evoconn/theme/colors';

export default function PhrasesDomainsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Frases y dominios</Text>
      <Text style={styles.hint}>Próximamente: explorar frases por dominio.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: evoconnColors.background, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { color: evoconnColors.text, fontSize: 20, fontWeight: '700', marginBottom: 8 },
  hint: { color: evoconnColors.muted, fontSize: 14 },
});
