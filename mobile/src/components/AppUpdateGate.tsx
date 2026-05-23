import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { evoconnColors } from '@evoconn/theme/colors';
import {
  resolveAppLaunchGate,
  type AppLaunchGate,
} from '@evoconn/services/appConfigRemote';

type Props = {
  children: React.ReactNode;
};

/**
 * Blocks the app on cold start when Supabase app_config requires an update or maintenance.
 * Shown before auth routing; user must open the store (no dismiss on forced update).
 */
export function AppUpdateGate({ children }: Props) {
  const insets = useSafeAreaInsets();
  const [gate, setGate] = useState<AppLaunchGate | 'loading'>('loading');

  useEffect(() => {
    let cancelled = false;
    void resolveAppLaunchGate().then((result) => {
      if (!cancelled) setGate(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (gate === 'loading') {
    return (
      <View style={styles.bootScreen}>
        <ActivityIndicator size="large" color={evoconnColors.neonGreen} />
      </View>
    );
  }

  if (gate.status === 'ok') {
    return <>{children}</>;
  }

  const isMaintenance = gate.status === 'maintenance';
  const title = isMaintenance ? 'Mantenimiento' : 'Actualización necesaria';
  const body = isMaintenance
    ? gate.message
    : 'Hay una nueva versión de EVO. Actualiza la app para seguir usándola.';
  const buttonLabel = isMaintenance ? 'Reintentar' : 'Ir a la tienda';

  const onPrimaryPress = () => {
    if (isMaintenance) {
      setGate('loading');
      void resolveAppLaunchGate().then(setGate);
      return;
    }
    void Linking.openURL(gate.storeUrl);
  };

  return (
    <View style={styles.bootScreen}>
      <Modal visible transparent animationType="fade" onRequestClose={() => {}}>
        <View style={[styles.backdrop, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.card}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.body}>{body}</Text>
            <Pressable
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
              onPress={onPrimaryPress}
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>{buttonLabel}</Text>
            </Pressable>
            {!isMaintenance ? (
              <Text style={styles.hint}>
                {Platform.OS === 'ios' ? 'App Store' : 'Google Play'}
              </Text>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  bootScreen: {
    flex: 1,
    backgroundColor: evoconnColors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    backgroundColor: '#15151A',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 22,
    paddingVertical: 24,
    gap: 14,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  button: {
    marginTop: 6,
    backgroundColor: evoconnColors.neonGreen,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  buttonPressed: { opacity: 0.88 },
  buttonText: {
    color: evoconnColors.background,
    fontSize: 16,
    fontWeight: '700',
  },
  hint: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    textAlign: 'center',
  },
});
