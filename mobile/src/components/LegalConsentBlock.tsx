import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
};

export function LegalConsentBlock({ checked, onCheckedChange }: Props) {
  const router = useRouter();

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={styles.checkHit}
        activeOpacity={0.85}
        onPress={() => onCheckedChange(!checked)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel="Marcar aceptación de términos y privacidad"
      >
        <View style={[styles.box, checked && styles.boxChecked]}>
          {checked ? <Ionicons name="checkmark" size={14} color="#0f0f12" /> : null}
        </View>
      </TouchableOpacity>
      <Text style={styles.text}>
        Acepto los{' '}
        <Text style={styles.link} onPress={() => router.push('/settings-terms')}>
          Términos de servicio
        </Text>
        {' '}y la{' '}
        <Text style={styles.link} onPress={() => router.push('/settings-privacy-policy')}>
          Política de privacidad
        </Text>
        .
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 14,
  },
  checkHit: {
    paddingTop: 1,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: {
    backgroundColor: '#c7ff02',
    borderColor: '#c7ff02',
  },
  text: {
    flex: 1,
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    lineHeight: 20,
  },
  link: {
    color: '#c7ff02',
    textDecorationLine: 'underline',
  },
});
