import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Platform,
  type KeyboardEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollView,
  type View,
} from 'react-native';
import {
  CHAT_KEYBOARD_LAST_ITEM_TAIL_PADDING,
  CHAT_KEYBOARD_SCROLL_EXTRA_PADDING,
  CHAT_KEYBOARD_SCROLL_RETRY_DELAYS_MS,
  chatCreationScrollBottomInset,
  computeScrollDeltaForFieldInWindow,
  resolveKeyboardHeight,
} from '@evoconn/constants/chatKeyboardScrollLayout';

export type ScrollInputKey = string | number;

type Options = {
  topBarHeight: number;
  /**
   * Reserva inferior por encima del teclado al encuadrar un campo.
   * Por defecto = altura del ChatInputBar (la barra sigue visible aunque
   * el foco esté en un campo del scroll: al subir el teclado, la barra
   * sube con él y tapa la zona “visible” si no la descontamos aquí).
   */
  chatBottomInset?: () => number;
  /**
   * Override opcional para el margen inferior cuando hay foco en un campo
   * del scroll. Por defecto = chatBottomInset() (la barra sigue tapando).
   */
  focusedBottomOverlay?: number;
  /** true si el campo con foco es el último del hilo (sin bloques debajo). */
  isLastFocusedInput?: (key: ScrollInputKey) => boolean;
};

/**
 * Scroll universal para campos dentro de un ScrollView + ChatInputBar fijo.
 *
 * Estrategia única: measureInWindow + delta preciso para TODOS los campos.
 *  - El padding inferior crece con el teclado para que el `scrollTo` por delta
 *    tenga “headroom” suficiente (especialmente cuando el campo es el último
 *    del hilo y no hay contenido debajo que arrastre).
 *  - Mezclar `scrollToEnd` con delta produce saltos (input fuera de pantalla).
 */
export function useScrollInputAboveKeyboard({
  topBarHeight,
  chatBottomInset = chatCreationScrollBottomInset,
  focusedBottomOverlay,
  isLastFocusedInput,
}: Options) {
  const scrollRef = useRef<ScrollView>(null);
  const scrollOffsetYRef = useRef(0);
  const keyboardHeightRef = useRef(0);
  const inputAnchorRefs = useRef<Map<ScrollInputKey, View>>(new Map());
  const focusedInputKeyRef = useRef<ScrollInputKey | null>(null);
  const isLastFocusedInputRef = useRef(isLastFocusedInput);
  const pendingScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [focusedInputKey, setFocusedInputKey] = useState<ScrollInputKey | null>(null);
  const [keyboardInset, setKeyboardInset] = useState(0);

  useEffect(() => {
    focusedInputKeyRef.current = focusedInputKey;
  }, [focusedInputKey]);

  isLastFocusedInputRef.current = isLastFocusedInput;

  const clearPendingScroll = useCallback(() => {
    if (pendingScrollTimerRef.current != null) {
      clearTimeout(pendingScrollTimerRef.current);
      pendingScrollTimerRef.current = null;
    }
  }, []);

  const scrollFocusedInputIntoView = useCallback(
    (key: ScrollInputKey) => {
      const anchor = inputAnchorRefs.current.get(key);
      const scroll = scrollRef.current;
      if (!anchor || !scroll) return;

      const run = () => {
        anchor.measureInWindow((_x, windowY, _w, h) => {
          // El ChatInputBar siempre está visible. Al abrirse el teclado, sube
          // con él, así que el espacio realmente libre por encima del teclado
          // es ventanaH − teclado − chatBottomInset. Cuando hay foco, la única
          // diferencia legítima es si quieres reducirlo con un override.
          const chatOverlay = focusedBottomOverlay ?? chatBottomInset();
          const delta = computeScrollDeltaForFieldInWindow({
            windowY,
            fieldHeight: h,
            topBarHeight,
            keyboardHeight: keyboardHeightRef.current,
            chatBottomOverlay: chatOverlay,
          });
          if (Math.abs(delta) < 2) return;
          scroll.scrollTo({
            y: Math.max(0, scrollOffsetYRef.current + delta),
            animated: true,
          });
        });
      };

      run();
      requestAnimationFrame(run);
      for (const delay of CHAT_KEYBOARD_SCROLL_RETRY_DELAYS_MS) {
        setTimeout(run, delay);
      }
    },
    [topBarHeight, chatBottomInset, focusedBottomOverlay],
  );

  const scheduleFocusedScroll = useCallback(
    (key: ScrollInputKey) => {
      clearPendingScroll();
      pendingScrollTimerRef.current = setTimeout(() => {
        pendingScrollTimerRef.current = null;
        scrollFocusedInputIntoView(key);
      }, 32);
    },
    [clearPendingScroll, scrollFocusedInputIntoView],
  );

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = (e: KeyboardEvent) => {
      const h = resolveKeyboardHeight(e);
      keyboardHeightRef.current = h;
      setKeyboardInset(h);
      const key = focusedInputKeyRef.current;
      if (key != null) scheduleFocusedScroll(key);
    };
    const onHide = () => {
      keyboardHeightRef.current = 0;
      setKeyboardInset(0);
    };
    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [scheduleFocusedScroll]);

  useEffect(() => () => clearPendingScroll(), [clearPendingScroll]);

  const registerInputAnchor = useCallback((key: ScrollInputKey, node: View | null) => {
    if (node) inputAnchorRefs.current.set(key, node);
    else inputAnchorRefs.current.delete(key);
  }, []);

  const handleInputFocusChange = useCallback(
    (key: ScrollInputKey, focused: boolean) => {
      if (focused) {
        setFocusedInputKey(key);
        // Esperar al re-layout (padding) antes de desplazar; evita pelear con scrollToEnd del hilo.
        scheduleFocusedScroll(key);
        return;
      }
      clearPendingScroll();
      setFocusedInputKey((prev) => (prev === key ? null : prev));
    },
    [scheduleFocusedScroll, clearPendingScroll],
  );

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffsetYRef.current = e.nativeEvent.contentOffset.y;
  }, []);

  const getScrollPaddingBottom = useCallback(
    (basePadding: number) => {
      if (focusedInputKey == null) return basePadding;
      // basePadding ya incluye la barra de chat (chatBottomInset). Solo
      // necesitamos añadir el teclado + extra para que el delta-scroll tenga
      // headroom para subir el campo por encima de (teclado + barra).
      const tail =
        isLastFocusedInput?.(focusedInputKey) === true
          ? CHAT_KEYBOARD_LAST_ITEM_TAIL_PADDING
          : 0;
      return (
        basePadding +
        keyboardInset +
        CHAT_KEYBOARD_SCROLL_EXTRA_PADDING +
        tail
      );
    },
    [focusedInputKey, keyboardInset, isLastFocusedInput],
  );

  const onScrollContentSizeChange = useCallback(
    (scrollToEnd: () => void) => {
      const key = focusedInputKeyRef.current;
      if (key != null) {
        scheduleFocusedScroll(key);
        return;
      }
      scrollToEnd();
    },
    [scheduleFocusedScroll],
  );

  return {
    scrollRef,
    scrollOffsetYRef,
    keyboardInset,
    focusedInputKey,
    registerInputAnchor,
    handleInputFocusChange,
    scrollInputIntoView: scrollFocusedInputIntoView,
    onScroll,
    getScrollPaddingBottom,
    onScrollContentSizeChange,
  };
}
