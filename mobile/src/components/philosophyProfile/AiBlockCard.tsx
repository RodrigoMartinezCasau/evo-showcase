/**
 * Reusable shell for every AI-generated block.
 * Handles loading / error / insufficient-uses / success states
 * and renders a reload button in the top-right corner.
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { showOutOfUsesAlert } from '@evoconn/utils/dailyUsesGate';

export type AiBlockState = 'idle' | 'loading' | 'success' | 'error' | 'no_uses';

type Props = {
  title: string;
  state: AiBlockState;
  errorMessage?: string;
  onReload: () => void;
  /** false = candado en lugar de ↻ y aviso al pulsar. */
  usesAvailable?: boolean;
  children?: React.ReactNode;
};

export const AiBlockCard = React.memo(function AiBlockCard({
  title,
  state,
  errorMessage,
  onReload,
  usesAvailable = true,
  children,
}: Props) {
  const handleReloadPress = () => {
    if (!usesAvailable) {
      showOutOfUsesAlert();
      return;
    }
    onReload();
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <TouchableOpacity
          style={[
            styles.reloadBtn,
            (state === 'loading' || !usesAvailable) && styles.reloadBtnDisabled,
          ]}
          onPress={handleReloadPress}
          disabled={state === 'loading'}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={usesAvailable ? 'Recargar' : 'Sin usos disponibles'}
        >
          {usesAvailable ? (
            <Text style={styles.reloadIcon}>↻</Text>
          ) : (
            <Ionicons name="lock-closed" size={15} color="rgba(255,255,255,0.85)" />
          )}
        </TouchableOpacity>
      </View>

      {state === 'loading' && (
        <View style={styles.stateWrap}>
          <ActivityIndicator color="#FFFFFF" size="small" />
          <Text style={styles.stateText}>Generando…</Text>
        </View>
      )}

      {state === 'error' && (
        <View style={styles.stateWrap}>
          <Text style={styles.errorText}>{errorMessage ?? 'Error al generar. Inténtalo de nuevo.'}</Text>
        </View>
      )}

      {state === 'no_uses' && (
        <View style={styles.stateWrap}>
          <Text style={styles.noUsesText}>Sin usos disponibles.</Text>
          <Text style={styles.noUsesSubText}>Vuelve mañana para generar este bloque.</Text>
        </View>
      )}

      {(state === 'success' || state === 'idle') && children}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#000000',
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    opacity: 0.7,
    flex: 1,
  },
  reloadBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reloadBtnDisabled: {
    opacity: 0.35,
  },
  reloadIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 18,
  },
  stateWrap: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  stateText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 13,
    textAlign: 'center',
  },
  noUsesText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '600',
  },
  noUsesSubText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },
});
