/**
 * AppAnimationLayer
 *
 * Overlay global que se renderiza encima del Stack completo (en _layout.tsx).
 * Responsabilidades:
 *   1. Detecta cuando `streakDays` sube → muestra StreakAnimation.
 *
 * Uso en _layout.tsx:
 *   <AppAnimationLayer />   ← renderizado DESPUÉS del <Stack>
 */

import React, { useEffect, useRef, useState } from 'react';

import { useDebugStats } from '@evoconn/debug/DebugStatsContext';
import { useActiveClan } from '@evoconn/debug/DebugClanContext';
import { mockCurrentUser } from '@evoconn/data/mockUser';

import StreakAnimation from './StreakAnimation';
import type { AnimClanId } from '../../constants/evoAnimationClans';

export default function AppAnimationLayer() {
  const { streakDays, statsLoaded } = useDebugStats();
  const activeClan = useActiveClan(mockCurrentUser.clanId);

  const [showStreak, setShowStreak] = useState(false);
  const [streakForAnim, setStreakForAnim] = useState(1);

  // Persiste el valor previo de streakDays para detectar subidas
  const prevStreakRef = useRef<number | null>(null);

  useEffect(() => {
    // Esperar a que los stats estén cargados antes de comparar
    if (!statsLoaded) return;

    const prev = prevStreakRef.current;

    if (prev === null) {
      // Primera vez que cargamos los stats — guardamos sin disparar
      prevStreakRef.current = streakDays;
      return;
    }

    if (streakDays > prev) {
      // La racha subió → lanzar animación
      setStreakForAnim(streakDays);
      setShowStreak(true);
    }

    prevStreakRef.current = streakDays;
  }, [streakDays, statsLoaded]);

  if (!showStreak) return null;

  return (
    <StreakAnimation
      clanId={(activeClan ?? 'none') as AnimClanId}
      streakCount={streakForAnim}
      onClose={() => setShowStreak(false)}
    />
  );
}
