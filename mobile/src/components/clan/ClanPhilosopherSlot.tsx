import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import type { Philosopher } from '@evoconn/constants/clanConfig';
import { getPhilosopherSvg } from '@evoconn/utils/getPhilosopherSvg';

type Props = {
  philosopher: Philosopher;
  accentColor: string;
};

const PHOTO_SIZE = 68;

export function ClanPhilosopherSlot({ philosopher, accentColor }: Props) {
  const SvgIcon = philosopher.svgKey ? getPhilosopherSvg(philosopher.svgKey) : null;

  return (
    <View style={styles.slot}>
      <View style={styles.photoWrap}>
        {SvgIcon != null ? (
          <SvgIcon width={PHOTO_SIZE} height={PHOTO_SIZE} />
        ) : philosopher.imageUri ? (
          <Image
            source={{ uri: philosopher.imageUri }}
            style={[styles.photo, { borderColor: accentColor }]}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.placeholder, { backgroundColor: `${accentColor}33`, borderColor: accentColor }]}>
            <Text style={[styles.initials, { color: accentColor }]}>
              {philosopher.initials}
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.name} numberOfLines={2}>
        {philosopher.name.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  photoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
  },
  photo: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: PHOTO_SIZE / 2,
    borderWidth: 2,
  },
  placeholder: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: PHOTO_SIZE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  name: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.6,
    textAlign: 'center',
  },
});
