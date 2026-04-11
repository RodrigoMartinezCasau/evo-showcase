/**
 * Reusable sidebar edge-swipe gesture — extracted from CommunityScreen.
 *
 * Returns everything a screen needs to drive the same smooth open/close
 * interaction that CommunityScreen uses. The caller must:
 *  1. Wrap its root JSX in <GestureHandlerRootView>.
 *  2. Place <GestureDetector gesture={edgeOpenGesture}><View .../></GestureDetector>
 *     for the left-edge hit strip (when sidebar is closed).
 *  3. Pass `drawerOpenProgress` to <SidebarDrawer openProgress={…} />.
 */
import { useRef, useCallback, useEffect, useMemo } from 'react';
import { Animated, Easing } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { COMMUNITY_DRAWER_GESTURE_RANGE_X } from '@evoconn/constants/communityDrawerGesture';

export function useSidebarGesture(
  sidebarOpen: boolean,
  setSidebarOpen: (open: boolean) => void,
) {
  const drawerOpenProgress = useRef(new Animated.Value(0)).current;
  const gestureCommittingRef = useRef(false);

  useEffect(() => {
    if (sidebarOpen) {
      if (gestureCommittingRef.current) {
        gestureCommittingRef.current = false;
        Animated.spring(drawerOpenProgress, {
          toValue: 1,
          useNativeDriver: true,
          friction: 9,
          tension: 68,
        }).start();
      } else {
        Animated.timing(drawerOpenProgress, {
          toValue: 1,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      }
    } else {
      Animated.timing(drawerOpenProgress, {
        toValue: 0,
        duration: 260,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [sidebarOpen, drawerOpenProgress]);

  const setProgressJS = useCallback(
    (p: number) => { drawerOpenProgress.setValue(p); },
    [drawerOpenProgress],
  );

  const commitGestureOpenJS = useCallback(() => {
    gestureCommittingRef.current = true;
    setSidebarOpen(true);
  }, [setSidebarOpen]);

  const cancelGestureJS = useCallback(() => {
    Animated.timing(drawerOpenProgress, {
      toValue: 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [drawerOpenProgress]);

  const edgeOpenGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!sidebarOpen)
        .activeOffsetX(12)
        .failOffsetY([-32, 32])
        .onUpdate((e: { translationX: number }) => {
          const p = Math.min(1, Math.max(0, e.translationX / COMMUNITY_DRAWER_GESTURE_RANGE_X));
          runOnJS(setProgressJS)(p);
        })
        .onEnd((e: { translationX: number; velocityX: number }) => {
          const p = Math.min(1, Math.max(0, e.translationX / COMMUNITY_DRAWER_GESTURE_RANGE_X));
          const shouldOpen = p > 0.32 || e.velocityX > 520;
          if (shouldOpen) {
            runOnJS(commitGestureOpenJS)();
          } else {
            runOnJS(cancelGestureJS)();
          }
        }),
    [sidebarOpen, setProgressJS, commitGestureOpenJS, cancelGestureJS],
  );

  return { drawerOpenProgress, edgeOpenGesture };
}
