import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { evoconnColors } from '@evoconn/theme/colors';

type AppTopBarProps = {
  onMenuPress: () => void;
  onClanPress?: () => void;
  showClanIcon?: boolean;
};

export function AppTopBar({ onMenuPress, onClanPress, showClanIcon = true }: AppTopBarProps) {
  const router = useRouter();
  const handleClanPress = () => (onClanPress ? onClanPress() : router.push('/profile'));

  return (
    <View style={styles.bar}>
      <TouchableOpacity onPress={onMenuPress} style={styles.iconBtn} hitSlop={12}>
        <Text style={styles.star}>★</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onMenuPress} style={styles.iconBtn} hitSlop={12}>
        <Text style={styles.hamburger}>≡</Text>
      </TouchableOpacity>
      <View style={styles.spacer} />
      {showClanIcon && (
        <TouchableOpacity onPress={handleClanPress} style={styles.iconBtn} hitSlop={12}>
          <View style={styles.clanDot} />
        </TouchableOpacity>
      )}
      <TouchableOpacity onPress={() => router.push('/daily-uses')} style={styles.iconBtn} hitSlop={12}>
        <Text style={styles.heart}>♥</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push('/streak')} style={styles.iconBtn} hitSlop={12}>
        <Text style={styles.fire}>🔥</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push('/phrases-domains')} style={styles.iconBtn} hitSlop={12}>
        <Text style={styles.pencil}>✎</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: evoconnColors.background,
    borderBottomWidth: 1,
    borderBottomColor: evoconnColors.border,
  },
  iconBtn: {
    padding: 4,
    marginRight: 4,
  },
  star: { color: evoconnColors.neonGreen, fontSize: 20 },
  hamburger: { color: evoconnColors.text, fontSize: 22 },
  spacer: { flex: 1 },
  clanDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: evoconnColors.accent,
  },
  heart: { color: evoconnColors.danger, fontSize: 18 },
  fire: { color: evoconnColors.purple, fontSize: 18 },
  pencil: { color: evoconnColors.muted, fontSize: 18 },
});
