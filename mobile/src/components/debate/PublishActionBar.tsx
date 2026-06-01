import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { AI_SPECIAL_BLOCK_LAYOUT as SB } from '@evoconn/constants/debateResponseLayout';
import { useEvoPreferences } from '@evoconn/hooks/EvoPreferencesContext';

const BAR = SB.publishActionBar;
const TXT = SB.publishActionBarText;
const ICO = SB.publishActionBarIcon;

type PublishState = 'idle' | 'publishing' | 'published';

export type PublishActionBarHandle = {
  /** Ejecuta la animación PUBLICANDO… y luego `work`. */
  runPublish: (work: () => Promise<void> | void) => Promise<void>;
};

type Props = {
  barColor: string;
  disabled?: boolean;
  onPublish?: () => Promise<void> | void;
  /** Si se define, PUBLICAR abre el picker (u otra UI) sin animar todavía. */
  onPublishIntent?: () => void;
  /** Frases/reapertura: el padre marca publicado sin desmontar el bloque. */
  externallyPublished?: boolean;
  /**
   * Padding horizontal *dentro* del botón gris (▲ PUBLICAR).
   * Reflexiones: omitir o 0. Frases: pasar valor desde `phrasePublishHintLayout`.
   */
  innerPaddingHorizontal?: number;
};

export const PublishActionBar = forwardRef<PublishActionBarHandle, Props>(
  function PublishActionBar(
    {
      barColor,
      disabled,
      onPublish,
      onPublishIntent,
      externallyPublished,
      innerPaddingHorizontal = 0,
    },
    ref,
  ) {
    const [state, setState] = useState<PublishState>(() =>
      externallyPublished ? 'published' : 'idle',
    );
    const [percent, setPercent] = useState(0);
    const stateRef = useRef(state);
    stateRef.current = state;

    const progressAnim = useRef(new Animated.Value(0)).current;
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const { triggerHaptic } = useEvoPreferences();

    const cleanup = useCallback(() => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }, []);

    useEffect(() => cleanup, [cleanup]);

    useEffect(() => {
      if (externallyPublished) {
        setState('published');
        return;
      }
      setState((prev) => (prev === 'publishing' ? prev : 'idle'));
    }, [externallyPublished]);

    const runPublish = useCallback(
      async (work: () => Promise<void> | void) => {
        if (stateRef.current !== 'idle') return;

        setState('publishing');
        setPercent(0);
        progressAnim.setValue(0);

        let current = 0;
        await new Promise<void>((resolve) => {
          timerRef.current = setInterval(() => {
            current += Math.random() * 12 + 4;
            if (current >= 100) {
              current = 100;
              cleanup();
              resolve();
            }
            setPercent(Math.min(Math.round(current), 100));
            Animated.timing(progressAnim, {
              toValue: Math.min(current / 100, 1),
              duration: 120,
              easing: Easing.linear,
              useNativeDriver: false,
            }).start();
          }, 180);
        });

        try {
          await work();
        } catch {
          /* silent */
        }

        setState('published');
        triggerHaptic('success');
      },
      [progressAnim, cleanup, triggerHaptic],
    );

    useImperativeHandle(ref, () => ({ runPublish }), [runPublish]);

    const handlePress = useCallback(() => {
      if (stateRef.current !== 'idle' || disabled) return;
      if (onPublishIntent) {
        onPublishIntent();
        return;
      }
      void runPublish(() => onPublish?.());
    }, [disabled, onPublishIntent, runPublish, onPublish]);

    const iconSize = ICO.size * ICO.scale;
    const isDisabled = state !== 'idle' || !!disabled;

    const renderContent = () => {
      if (state === 'published') {
        return (
          <View style={styles.row}>
            <Text
              style={[
                styles.icon,
                {
                  fontSize: iconSize,
                  marginLeft: ICO.offsetX,
                  marginTop: ICO.offsetY,
                },
              ]}
            >
              ✓
            </Text>
            <Text
              style={[
                styles.label,
                {
                  fontSize: TXT.fontSize,
                  ...(TXT.lineHeight > 0 ? { lineHeight: TXT.lineHeight } : {}),
                  letterSpacing: TXT.letterSpacing,
                  marginLeft: 6 + TXT.offsetX,
                  marginTop: TXT.offsetY,
                },
              ]}
            >
              PUBLICADO
            </Text>
          </View>
        );
      }

      if (state === 'publishing') {
        return (
          <Text
            style={[
              styles.label,
              {
                fontSize: TXT.fontSize,
                ...(TXT.lineHeight > 0 ? { lineHeight: TXT.lineHeight } : {}),
                letterSpacing: TXT.letterSpacing,
                marginLeft: TXT.offsetX,
                marginTop: TXT.offsetY,
              },
            ]}
          >
            PUBLICANDO… {percent}%
          </Text>
        );
      }

      return (
        <View style={styles.row}>
          <Text
            style={[
              styles.icon,
              {
                fontSize: iconSize,
                marginLeft: ICO.offsetX,
                marginTop: ICO.offsetY,
              },
            ]}
          >
            ▲
          </Text>
          <Text
            style={[
              styles.label,
              {
                fontSize: TXT.fontSize,
                ...(TXT.lineHeight > 0 ? { lineHeight: TXT.lineHeight } : {}),
                letterSpacing: TXT.letterSpacing,
                marginLeft: 6 + TXT.offsetX,
                marginTop: TXT.offsetY,
              },
            ]}
          >
            PUBLICAR
          </Text>
        </View>
      );
    };

    const progressWidth = progressAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%'],
    });

    return (
      <TouchableOpacity
        activeOpacity={!isDisabled ? 0.75 : 1}
        onPress={handlePress}
        disabled={isDisabled}
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        style={[
          styles.bar,
          {
            height: BAR.height,
            borderRadius: BAR.borderRadius,
            marginLeft: BAR.offsetX,
            marginTop: BAR.offsetY,
            paddingHorizontal: innerPaddingHorizontal,
            width: BAR.widthScale < 1 ? (`${BAR.widthScale * 100}%` as unknown as number) : '100%',
            backgroundColor: state === 'published' ? barColor : '#2A2A30',
            opacity: disabled && state === 'idle' ? 0.45 : 1,
          },
        ]}
      >
        {state === 'publishing' ? (
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progressWidth,
                backgroundColor: barColor,
                borderRadius: BAR.borderRadius,
              },
            ]}
          />
        ) : null}

        <View style={styles.content}>{renderContent()}</View>
      </TouchableOpacity>
    );
  },
);

const styles = StyleSheet.create({
  bar: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressFill: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  label: {
    color: '#FFFFFF',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
