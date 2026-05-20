import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Alert } from 'react-native';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import ViewShot from 'react-native-view-shot';
import {
  ProfileShareCaptureCard,
  type ProfileShareCaptureData,
} from './ProfileShareCaptureCard';
import { captureAndShareProfileCard } from '@evoconn/services/sharePersonalProfile';
import {
  isExpoGoClient,
  PROFILE_SHARE_EXPO_GO_MESSAGE,
} from '@evoconn/utils/profileShareNative';

export type ProfileShareCaptureHandle = {
  share: (data: ProfileShareCaptureData) => Promise<void>;
};

type PendingShare = {
  username: string;
  userId: string;
  resolve: () => void;
  reject: (e: unknown) => void;
};

type Props = Record<string, never>;

/**
 * Host fuera de pantalla: monta la tarjeta solo durante la captura PNG.
 * Espera al layout antes de capturar (evita ref null en el primer frame).
 */
export const ProfileShareCaptureHost = forwardRef<ProfileShareCaptureHandle, Props>(
  function ProfileShareCaptureHost(_props, ref) {
    const { width: screenW } = useWindowDimensions();
    const shotRef = useRef<ViewShot>(null);
    const [payload, setPayload] = useState<ProfileShareCaptureData | null>(null);
    const pendingRef = useRef<PendingShare | null>(null);
    const layoutDoneRef = useRef(false);

    const finishCapture = useCallback(async () => {
      const pending = pendingRef.current;
      if (!pending || !layoutDoneRef.current) return;

      pendingRef.current = null;
      layoutDoneRef.current = false;

      try {
        await new Promise<void>((r) => {
          requestAnimationFrame(() => requestAnimationFrame(() => r()));
        });
        await new Promise((r) => setTimeout(r, 350));

        await captureAndShareProfileCard(shotRef, {
          username: pending.username,
          userId: pending.userId,
        });
        pending.resolve();
      } catch (e) {
        pending.reject(e);
      } finally {
        setPayload(null);
      }
    }, []);

    const runShare = useCallback(
      (data: ProfileShareCaptureData) =>
        new Promise<void>((resolve, reject) => {
          if (isExpoGoClient()) {
            Alert.alert('No disponible en Expo Go', PROFILE_SHARE_EXPO_GO_MESSAGE);
            resolve();
            return;
          }

          pendingRef.current = {
            username: data.username,
            userId: data.userId,
            resolve,
            reject,
          };
          layoutDoneRef.current = false;
          setPayload({ ...data, width: screenW });
        }),
      [screenW],
    );

    const handleCardLayout = useCallback(
      (height: number) => {
        if (height <= 0 || !pendingRef.current) return;
        layoutDoneRef.current = true;
        void finishCapture();
      },
      [finishCapture],
    );

    useImperativeHandle(ref, () => ({ share: runShare }), [runShare]);

    if (!payload) return null;

    return (
      <View style={styles.offscreen} pointerEvents="none" collapsable={false}>
        <ViewShot
          ref={shotRef}
          options={{ format: 'png', quality: 1, result: 'tmpfile' }}
          style={{ width: screenW }}
          collapsable={false}
        >
          <ProfileShareCaptureCard data={payload} onLayout={handleCardLayout} />
        </ViewShot>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  offscreen: {
    position: 'absolute',
    left: 0,
    top: 0,
    opacity: 0.01,
    zIndex: -1,
    overflow: 'hidden',
  },
});
