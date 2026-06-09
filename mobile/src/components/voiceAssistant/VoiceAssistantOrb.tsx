import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';

import { VoiceWaveform } from '@evoconn/components/VoiceWaveform';
import { getClanColor } from '@evoconn/constants/clanColors';
import { VOICE_ASSISTANT_LAYOUT } from '@evoconn/constants/voiceAssistantLayout';
import { useEffectiveClanId } from '@evoconn/hooks/useEffectiveClanId';
import { useVoiceAssistant, type VoiceAssistantPhase } from '@evoconn/hooks/useVoiceAssistant';
import { getReflectionTripleStarsByHouse } from '@evoconn/utils/getReflectionTripleStarsByHouse';

type Props = {
  enabled?: boolean;
};

function phaseShowsSpinner(phase: VoiceAssistantPhase, showThinking: boolean): boolean {
  return showThinking || phase === 'thinking';
}

export function VoiceAssistantOrb({ enabled = true }: Props) {
  const clanId = useEffectiveClanId();
  const clanColor = getClanColor(clanId);
  const TripleStarsIcon = useMemo(() => getReflectionTripleStarsByHouse(clanId), [clanId]);

  const {
    phase,
    isListening,
    showWaveform,
    showThinking,
    volumeLevel,
    toggleListening,
    isBusy,
  } = useVoiceAssistant({ enabled });

  const handlePress = () => {
    if (showThinking) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    void toggleListening();
  };

  const { ORB_SIZE, TRIPLE_STARS_WIDTH, TRIPLE_STARS_HEIGHT, WAVEFORM_HEIGHT, ORB_BORDER_WIDTH, ORB_BACKGROUND } =
    VOICE_ASSISTANT_LAYOUT;

  return (
    <Pressable
      onPress={handlePress}
      disabled={!enabled || showThinking}
      accessibilityRole="button"
      accessibilityLabel="Asistente de voz Evo"
      accessibilityHint={
        isListening ? 'Pulsa para dejar de escuchar' : 'Pulsa para hablar con el asistente'
      }
      accessibilityState={{ selected: isListening }}
      style={({ pressed }) => [
        styles.pressable,
        {
          width: ORB_SIZE,
          height: ORB_SIZE,
          borderRadius: ORB_SIZE / 2,
          borderColor: clanColor,
          borderWidth: ORB_BORDER_WIDTH,
          backgroundColor: ORB_BACKGROUND,
          opacity: pressed && !isBusy ? 0.92 : 1,
        },
      ]}
    >
      <View style={styles.inner}>
        {phaseShowsSpinner(phase, showThinking) ? (
          <ActivityIndicator size="small" color={clanColor} />
        ) : showWaveform ? (
          <VoiceWaveform volume={volumeLevel} color={clanColor} height={WAVEFORM_HEIGHT} />
        ) : (
          <TripleStarsIcon width={TRIPLE_STARS_WIDTH} height={TRIPLE_STARS_HEIGHT} />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
});
