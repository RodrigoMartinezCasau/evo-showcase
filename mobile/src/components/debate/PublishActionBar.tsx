import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { AI_SPECIAL_BLOCK_LAYOUT as SB } from '@evoconn/constants/debateResponseLayout';

const BAR = SB.publishActionBar;
const TXT = SB.publishActionBarText;
const ICO = SB.publishActionBarIcon;

type PublishState = 'idle' | 'publishing' | 'published';

type Props = {
  barColor: string;
  onPublish?: () => Promise<void> | void;
};

export const PublishActionBar = React.memo(function PublishActionBar({
  barColor,
  onPublish,
}: Props) {
  const [state, setState] = useState<PublishState>('idle');
  const [percent, setPercent] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const handlePress = useCallback(async () => {
    if (state !== 'idle') return;

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
      await onPublish?.();
    } catch {
      /* silent */
    }

    setState('published');
  }, [state, onPublish, progressAnim, cleanup]);

  const iconSize = ICO.size * ICO.scale;

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
      activeOpacity={state === 'idle' ? 0.75 : 1}
      onPress={handlePress}
      disabled={state !== 'idle'}
      style={[
        styles.bar,
        {
          height: BAR.height,
          borderRadius: BAR.borderRadius,
          marginLeft: BAR.offsetX,
          marginTop: BAR.offsetY,
          width: BAR.widthScale < 1 ? `${BAR.widthScale * 100}%` as unknown as number : '100%',
          backgroundColor: state === 'published' ? barColor : '#2A2A30',
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
});

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
