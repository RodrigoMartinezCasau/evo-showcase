/**
 * ThoughtScreen — chat-style reflection screen.
 *
 * Flow:
 * 1. User types a reflection in the input bar.
 * 2. On first send → createThought (POST /debates) + sendMessage (POST /debates/{id}/chat).
 * 3. AI response is rendered with a typewriter reveal.
 * 4. Subsequent messages continue the same thread.
 * 5. The thought is saved automatically in "Pensamientos" via ThoughtsProvider.
 *
 * When reopening an existing thought (via `thoughtId` search param),
 * the screen loads the full thread from the backend.
 */
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppTopBar, ChatInputBar, SidebarDrawer } from '@evoconn/components';
import { evoconnColors } from '@evoconn/theme/colors';
import { useThoughts } from '@evoconn/hooks/useThoughts';
import { useClassification } from '@evoconn/hooks/ClassificationContext';
import * as debateApi from '@evoconn/services/debateApi';
import type { DebateMessage, DebateResponse, SelectedPhrase } from '@evoconn/types/debate';
import { DOMAIN_MAP } from '@evoconn/types/quotes';
import { selectBestQuote } from '@evoconn/data/quotes';
import {
  getChatUserAccentColor,
  CHAT_USER_MESSAGE_LAYOUT,
} from '@evoconn/constants/chatUserMessageLayout';
import { useActiveClan } from '@evoconn/debug/DebugClanContext';
import { mockCurrentUser } from '@evoconn/data/mockUser';
import { incrementProfileStat } from '@evoconn/services/supabaseSocial';
import { recordActivity, recordUsesLog } from '@evoconn/services/streakApi';
import { getClanColor } from '@evoconn/constants/clanColors';
import { getChatSendButtonByHouse } from '@evoconn/utils/getChatSendButtonByHouse';
import {
  CHAT_SEND_BUTTON_LAYOUT,
  CHAT_BOTTOM_AREA_LAYOUT as CHAT_BOTTOM_AREA,
  CHAT_INPUT_LAYOUT as CHAT_INPUT,
  PUBLISH_JUMP_ISLAND_LAYOUT as ISLAND,
  REFLECTION_PUBLISH_MIN_CHARS,
  CHAT_INPUT_ISLAND_LAYOUT,
} from '@evoconn/constants/chatInputBarLayout';
import Svg, { Polyline } from 'react-native-svg';
import {
  ThinkingStar,
  IntroTypewriter,
  computeIntroDurationMs,
} from '@evoconn/components/aiPhase/AiPhaseAnimations';

/**
 * Doble chevron apuntando hacia ARRIBA (estilo « original, pero rotado al cielo).
 * Renderizado como SVG para evitar bugs de fuente/rotación con glifos de texto.
 * Dos polilíneas apiladas: la inferior y la superior, ambas con forma "^".
 * El SVG no puede ser volteado por una fuente, así que la dirección es definitiva.
 */
const UpChevron = React.memo(function UpChevron({
  size,
  color,
  strokeWidth = 2.4,
}: {
  size: number;
  color: string;
  strokeWidth?: number;
}) {
  // viewBox 24×24. Dos chevrons apilados verticalmente:
  //   chevron superior:  vértice en y=4,  brazos a y=11
  //   chevron inferior:  vértice en y=12, brazos a y=19
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Polyline
        points="5,11 12,4 19,11"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Polyline
        points="5,19 12,12 19,19"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
});
import { REFLECTION_EMPTY_WELCOME_LAYOUT as EMPTY_WELCOME } from '@evoconn/constants/reflectionEmptyWelcomeLayout';
import { EMPTY_WELCOME_TRIPLE_STARS_LAYOUT as EMPTY_WELCOME_TRIPLE_STARS } from '@evoconn/constants/reflectionEmptyWelcomeTripleStarsLayout';
import { getReflectionTripleStarsByHouse } from '@evoconn/utils/getReflectionTripleStarsByHouse';
import { DebateResponseDisplay, PublishBlock } from '@evoconn/components/debate';
import { useFeedStore, createReflectionPost } from '@evoconn/hooks/useFeedStore';
import {
  AI_RESPONSE_BORDER_WIDTH as DEBATE_BW,
  getBlockBorderColor,
  getBlockBackgroundColor,
  getPublishTitleOutlineColor,
} from '@evoconn/constants/debateResponseLayout';
import { getPublishStarByClan } from '@evoconn/utils/getDebateStarByClan';
import { useDebugStreak } from '../debug/DebugStreakContext';
import { useDebugStats } from '../debug/DebugStatsContext';
import { useQuotes } from '@evoconn/hooks/QuotesContext';
import { useAISettings } from '@evoconn/hooks/AISettingsContext';
import { COMMUNITY_DRAWER_EDGE_ZONE_WIDTH } from '@evoconn/constants/communityDrawerGesture';
import { useSidebarGesture } from '@evoconn/hooks/useSidebarGesture';

type IntroPhase = 'thinking' | 'intro' | 'done';
type ChatBubble = DebateMessage & { revealed?: string; introPhase?: IntroPhase };

export default function ReflectionCreationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ thoughtId?: string }>();
  const thoughtId = Array.isArray(params.thoughtId) ? params.thoughtId[0] : params.thoughtId;

  const { thoughts, createThought, updateThought, loadThread } = useThoughts();
  const { recordInput: recordClassificationInput } = useClassification();
  const activeClan = useActiveClan(mockCurrentUser.clanId);
  const clanColor = getChatUserAccentColor(activeClan);
  // Island: each clan uses its primary color; Sin clan uses neon lime with dark text
  const islandBgColor = activeClan ? getClanColor(activeClan) : '#c7ff02';
  const islandFgColor = activeClan ? '#FFFFFF' : '#000000';

  const SendIcon = useMemo(() => getChatSendButtonByHouse(activeClan), [activeClan]);
  const sendButtonSize = CHAT_SEND_BUTTON_LAYOUT.size;
  const sendIconNode = useMemo(
    () => <SendIcon width={sendButtonSize} height={sendButtonSize} />,
    [SendIcon, sendButtonSize],
  );

  const { publishPost } = useFeedStore();
  const publishedRef = useRef<Set<string>>(new Set());
  const { markStreakActivated } = useDebugStreak();
  const { decrementUses } = useDebugStats();
  const { selectAndUnlockQuote } = useQuotes();
  const { includeReflectiveQuestion, includePhilosophicalReferences } = useAISettings();

  const doPublish = useCallback(
    (messageId: string | undefined, userText: string) =>
      async (title: string, body: string) => {
        const sourceId = `${messageId ?? 'msg'}_pub`;
        if (publishedRef.current.has(sourceId)) return;
        publishedRef.current.add(sourceId);
        const post = createReflectionPost(mockCurrentUser, title, body);
        (post as any).id = sourceId;
        publishPost(post);
      },
    [publishPost],
  );

  const insets = useSafeAreaInsets();
  const topBarHeight = 60 + insets.top;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { drawerOpenProgress, edgeOpenGesture } = useSidebarGesture(sidebarOpen, setSidebarOpen);

  useEffect(() => {
    if (!thoughtId) return;
    const target = thoughts.find((t) => t.id === thoughtId);
    if (target?.type === 'phrase') {
      router.replace({ pathname: '/phrase', params: { phraseId: thoughtId } });
    }
  }, [thoughtId, thoughts, router]);
  const [messages, setMessages] = useState<ChatBubble[]>([]);
  const [debateId, setDebateId] = useState<string | null>(thoughtId ?? null);
  const [sending, setSending] = useState(false);
  const [loadingThread, setLoadingThread] = useState(!!thoughtId);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);

  /**
   * Always-current ref of the local `messages` state.
   * Used to persist the full conversation thread back to the per-user thought
   * store after each turn without depending on stale closures.
   */
  const messagesRef = useRef<ChatBubble[]>(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  /**
   * Strip transient/UI-only fields from a ChatBubble before persisting so that
   * stored data round-trips cleanly:
   *   - `revealed`    : redundant copy of `content` used for typewriter UX
   *   - `introPhase`  : transient animation state, never replayed on reopen
   *   - `streaming`   : transient — a persisted message is always finalised
   */
  const toPersistedMessage = useCallback((m: ChatBubble): DebateMessage => {
    const { revealed: _r, introPhase: _i, ...rest } = m as ChatBubble & {
      revealed?: string;
      introPhase?: IntroPhase;
    };
    if (rest.role === 'assistant') {
      // Drop transient streaming flag; persisted assistant messages are always done.
      const { streaming: _s, ...assistantRest } = rest as Extract<
        DebateMessage,
        { role: 'assistant' }
      >;
      return assistantRest as DebateMessage;
    }
    return rest as DebateMessage;
  }, []);

  // ── Publish jump island ──────────────────────────────────────────────────
  // `messageYOffsets` stores the measured Y offset (from scroll top) for each
  // message index so we can scroll directly to the latest user reflection.
  const messageYOffsets = useRef<Record<number, number>>({});
  const scrollOffsetY = useRef(0);
  const scrollViewHeight = useRef(0);
  const islandOpacity = useRef(new Animated.Value(0)).current;
  const [islandVisible, setIslandVisible] = useState(false);

  // All publishable user-reflection indices: user message is long enough AND
  // it has a completed AI structured response immediately after it.
  const publishableReflectionIndices = useMemo(() => {
    const indices: number[] = [];
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      if (m.role !== 'user') continue;
      if ((m.content ?? '').length < REFLECTION_PUBLISH_MIN_CHARS) continue;
      const next = messages[i + 1];
      if (
        next &&
        next.role === 'assistant' &&
        !next.streaming &&
        (next as Extract<ChatBubble, { role: 'assistant' }>).debateResponse
      ) {
        indices.push(i);
      }
    }
    return indices;
  }, [messages]);

  // The "active" target for the jump island: the last publishable reflection
  // whose top Y is above the current viewport (i.e. user has scrolled past it).
  // We store the resolved index in a ref so checkIslandVisibility can read it
  // without a stale closure.
  const activeJumpTargetIndex = useRef(-1);

  const checkIslandVisibility = useCallback(() => {
    if (publishableReflectionIndices.length === 0) {
      activeJumpTargetIndex.current = -1;
      if (islandVisible) {
        setIslandVisible(false);
        Animated.timing(islandOpacity, { toValue: 0, duration: 180, useNativeDriver: true }).start();
      }
      return;
    }
    const viewTop = scrollOffsetY.current;
    // Find the last publishable reflection that has been scrolled above the viewport.
    let targetIdx = -1;
    for (let k = publishableReflectionIndices.length - 1; k >= 0; k--) {
      const idx = publishableReflectionIndices[k];
      const msgY = messageYOffsets.current[idx];
      if (msgY != null && msgY < viewTop) {
        targetIdx = idx;
        break;
      }
    }
    activeJumpTargetIndex.current = targetIdx;
    const shouldShow = targetIdx >= 0;
    if (shouldShow && !islandVisible) {
      setIslandVisible(true);
      Animated.timing(islandOpacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    } else if (!shouldShow && islandVisible) {
      Animated.timing(islandOpacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(
        () => setIslandVisible(false),
      );
    }
  }, [publishableReflectionIndices, islandVisible, islandOpacity]);

  const handleScrollToReflection = useCallback(() => {
    const targetIdx = activeJumpTargetIndex.current;
    if (targetIdx < 0) return;
    const targetY = messageYOffsets.current[targetIdx] ?? 0;
    scrollRef.current?.scrollTo({ y: targetY, animated: true });
  }, []);

  useEffect(() => {
    if (!thoughtId) return;
    let cancelled = false;
    (async () => {
      setLoadingThread(true);
      try {
        const thread = await loadThread(thoughtId);
        if (!cancelled && thread) {
          setMessages(thread.messages.map((m) => ({ ...m, revealed: m.content })));
          setDebateId(thread.id);
        }
      } catch {
        if (!cancelled) setError('No se pudo cargar la conversación.');
      } finally {
        if (!cancelled) setLoadingThread(false);
      }
    })();
    return () => { cancelled = true; };
  }, [thoughtId, loadThread]);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  const handleSend = useCallback(
    async (text: string) => {
      if (sending) return;
      Keyboard.dismiss();
      setError(null);
      setSending(true);

      const userMsg: ChatBubble = { role: 'user', content: text, revealed: text };
      setMessages((prev) => [...prev, userMsg]);
      scrollToEnd();

      try {
        let id = debateId;
        const isFirstSend = !id;
        if (!id) {
          id = await createThought(text);
          setDebateId(id);
        }
        // ── Real philosophical-clan classification ─────────────────────
        // Every reflection sent to the AI counts as a reflection input
        // for the clan classifier. We only record on the first send so
        // continuing the same thread doesn't double-count, and we use
        // `id` so each reflection has a stable inputId across reloads.
        if (isFirstSend) {
          void recordClassificationInput(text, 'reflection', id);
        }

        const placeholder: ChatBubble = {
          role: 'assistant',
          content: '',
          streaming: true,
          revealed: '',
        };
        setMessages((prev) => [...prev, placeholder]);
        scrollToEnd();

        const resp = await debateApi.sendMessage(id, text, undefined, {
          includeReflectiveQuestion,
          includePhilosophicalReferences,
        });
        // Reflection sent → activate streak, consume one daily use, select+unlock a KB phrase.
        // eslint-disable-next-line no-console
        console.log('[STREAK] Reflection created/sent → marking streak activated.');
        markStreakActivated();
        decrementUses();
        // Sync streak + uses to backend (fire-and-forget).
        void recordActivity(mockCurrentUser.id, 'reflexion').catch(console.error);
        void recordUsesLog(mockCurrentUser.id).catch(console.error);
        // Increment total_reflections in Supabase profiles.
        void incrementProfileStat(mockCurrentUser.id, 'total_reflections').catch(console.error);
        const pickedQuote = await selectAndUnlockQuote(text);
        const domainMeta = DOMAIN_MAP[pickedQuote.domain];
        const selectedPhrase: SelectedPhrase = {
          id: pickedQuote.id,
          text: pickedQuote.text,
          author: pickedQuote.author,
          domain: pickedQuote.domain,
          domainColor: domainMeta?.color ?? '#7C3AED',
        };
        const assistantText = resp.assistant_text;

        const introText = resp.debate_response?.debate_layer?.conversational_intro ?? '';
        const introLen = (introText || '').length;
        const introDuration = computeIntroDurationMs(introText);

        const assistantMsg: ChatBubble = {
          role: 'assistant',
          content: assistantText,
          id: resp.message_id,
          debateResponse: resp.debate_response,
          nextQuestion: resp.next_question,
          topic: resp.topic,
          lang: resp.lang,
          selectedPhrase,
          streaming: false,
          revealed: assistantText,
          // Si hay intro, arrancamos en fase 'intro' (typewriter sin estrella),
          // y luego aparece el resto. Si no hay intro, vamos directo a 'done'.
          introPhase: introLen > 0 ? 'intro' : 'done',
        };

        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = assistantMsg;
          return copy;
        });
        scrollToEnd();

        if (introLen > 0) {
          setTimeout(() => {
            setMessages((prev) => {
              if (prev.length === 0) return prev;
              const copy = [...prev];
              const last = copy[copy.length - 1];
              if (last.role === 'assistant' && last.introPhase === 'intro') {
                copy[copy.length - 1] = { ...last, introPhase: 'done' };
              }
              return copy;
            });
          }, introDuration);
        }

        // ── Persist the full conversation thread to the per-user store ──
        // This is what makes the conversation survive profile switches and
        // app reloads.  We rebuild from the just-updated local state via the
        // ref (the ref is updated by useLayoutEffect in the next microtask;
        // here we explicitly compute the post-update array to avoid races).
        const finalisedThread: ChatBubble[] = [
          ...messagesRef.current.slice(0, -1), // everything except the placeholder
          assistantMsg, // replace placeholder with the real assistant message
        ];
        updateThought(id, {
          title: resp.topic || thoughts.find((t) => t.id === id)?.title || 'Reflexión',
          messages: finalisedThread.map(toPersistedMessage),
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        setError(msg);
        setMessages((prev) => {
          if (prev.length > 0 && prev[prev.length - 1].role === 'assistant' && !prev[prev.length - 1].content) {
            return prev.slice(0, -1);
          }
          return prev;
        });
      } finally {
        setSending(false);
      }
    },
    [sending, debateId, createThought, updateThought, scrollToEnd, thoughts, markStreakActivated, decrementUses, selectAndUnlockQuote, includeReflectiveQuestion, includePhilosophicalReferences, toPersistedMessage, recordClassificationInput],
  );

  const conversationItems = useMemo(
    () => thoughts.map((t) => ({
      id: t.id,
      type: t.type,
      title: t.title,
      updatedAt: t.updatedAt,
      isFavorite: t.isFavorite,
      folderId: t.folderId,
    })),
    [thoughts],
  );

  const showEmptyReflectionWelcome = !loadingThread && messages.length === 0;

  const emptyReflectionWelcome = useMemo(() => {
    if (!showEmptyReflectionWelcome) return null;
    const TripleStarsIcon = getReflectionTripleStarsByHouse(activeClan);
    return (
      <View
        style={[
          styles.reflectionWelcomeAboveInput,
          {
            paddingHorizontal: EMPTY_WELCOME.paddingHorizontal,
            paddingTop: EMPTY_WELCOME.paddingTop,
            paddingBottom: EMPTY_WELCOME.paddingBottom,
            transform: [
              { translateX: EMPTY_WELCOME.offsetX },
              { translateY: EMPTY_WELCOME.offsetY },
              { scale: EMPTY_WELCOME.scale },
            ],
          },
        ]}
        pointerEvents="none"
      >
        <View style={styles.reflectionWelcomeTitleWrap}>
          <Text style={styles.reflectionWelcomeTitle}>¡Dime tu reflexión YA!</Text>
          <View
            style={[
              styles.reflectionWelcomeTripleStars,
              {
                top: EMPTY_WELCOME_TRIPLE_STARS.offsetY,
                transform: [{ scale: EMPTY_WELCOME_TRIPLE_STARS.scale }],
              },
            ]}
            pointerEvents="none"
          >
            <TripleStarsIcon
              width={EMPTY_WELCOME_TRIPLE_STARS.width}
              height={EMPTY_WELCOME_TRIPLE_STARS.height}
            />
          </View>
        </View>
        <Text
          style={[
            styles.reflectionWelcomeSub,
            {
              marginTop: EMPTY_WELCOME.subtitleMarginTop,
              maxWidth: EMPTY_WELCOME.subtitleMaxWidth,
            },
          ]}
        >
          Cada reflexión que mandes ayudará a determinar tu pensamiento filosófico.
        </Text>
      </View>
    );
  }, [showEmptyReflectionWelcome, activeClan]);

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
    <View style={styles.container}>
      <AppTopBar onMenuPress={() => setSidebarOpen(true)} showClanIcon={true} />

      {loadingThread ? (
        <View style={styles.center}>
          <ActivityIndicator color={evoconnColors.neonGreen} size="large" />
          <Text style={styles.loadingText}>Cargando reflexión…</Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          scrollEventThrottle={16}
          onScroll={(e) => {
            scrollOffsetY.current = e.nativeEvent.contentOffset.y;
            checkIslandVisibility();
          }}
          onLayout={(e) => {
            scrollViewHeight.current = e.nativeEvent.layout.height;
          }}
        >
          {messages.map((msg, i) => {
            if (msg.role === 'user') {
              // PublishBlock shows only when:
              // 1. The next assistant message has a completed structured response, AND
              // 2. This user message is long enough to be a publishable reflection.
              const nextMsg = messages[i + 1] as (ChatBubble & { debateResponse?: unknown }) | undefined;
              const nextIsStructured =
                !!nextMsg &&
                nextMsg.role === 'assistant' &&
                !nextMsg.streaming &&
                !!(nextMsg as Extract<ChatBubble, { role: 'assistant' }>).debateResponse;
              const isPublishable = (msg.content ?? '').length >= REFLECTION_PUBLISH_MIN_CHARS;
              const publishHandlerBelow = nextIsStructured && isPublishable && nextMsg
                ? doPublish(nextMsg.id, msg.content)
                : undefined;
              return (
                <View
                  key={`${msg.id ?? i}-${msg.role}`}
                  onLayout={(e) => {
                    messageYOffsets.current[i] = e.nativeEvent.layout.y;
                    checkIslandVisibility();
                  }}
                >
                  <MessageBubble
                    message={msg}
                    clanColor={clanColor}
                    clanId={activeClan}
                    publishHandlerBelow={publishHandlerBelow}
                  />
                </View>
              );
            }
            // Assistant message — PublishBlock is now with the preceding user bubble.
            // Retroactively compute selectedPhrase for older messages that predate this feature.
            let msgToRender = msg;
            if (
              msg.role === 'assistant' &&
              !(msg as Extract<ChatBubble, { role: 'assistant' }>).selectedPhrase &&
              (msg as Extract<ChatBubble, { role: 'assistant' }>).debateResponse
            ) {
              const prevUserText = i > 0 ? messages[i - 1].content ?? '' : '';
              const derived = selectBestQuote(prevUserText);
              const meta = DOMAIN_MAP[derived.domain];
              const derivedPhrase: SelectedPhrase = {
                id: derived.id,
                text: derived.text,
                author: derived.author,
                domain: derived.domain,
                domainColor: meta?.color ?? '#7C3AED',
              };
              msgToRender = { ...msg, selectedPhrase: derivedPhrase } as ChatBubble;
            }
            return (
              <MessageBubble
                key={`${msg.id ?? i}-${msg.role}`}
                message={msgToRender}
                clanColor={clanColor}
                clanId={activeClan}
              />
            );
          })}

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
        </ScrollView>
      )}

      {/* ── Publish jump island ──────────────────────────────────────────── */}
      {islandVisible ? (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.islandWrapper,
            {
              opacity: islandOpacity,
              transform: [
                { translateX: ISLAND.publishJumpIslandOffsetX },
                { translateY: ISLAND.publishJumpIslandOffsetY },
                { scale: ISLAND.publishJumpIslandScale },
              ],
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={handleScrollToReflection}
            style={[styles.islandPill, { backgroundColor: islandBgColor }]}
          >
            {/*
              UP chevrons rendered as guaranteed-direction SVG shapes.
              We do NOT use rotated text glyphs (« / »), because text rotation
              is unreliable across font fallbacks/clans/devices and was the
              root cause of the chevrons sometimes appearing sideways/wrong.
              An SVG polyline cannot be flipped by a font.
            */}
            <View
              style={{
                marginRight: ISLAND.publishJumpIslandChevronGap,
                transform: [{ scale: ISLAND.publishJumpIslandChevronScale }],
              }}
            >
              <UpChevron size={ISLAND.chevronSize} color={islandFgColor} />
            </View>
            <Text
              style={[
                styles.islandLabel,
                {
                  color: islandFgColor,
                  transform: [
                    { translateX: ISLAND.publishJumpIslandTextOffsetX },
                    { translateY: ISLAND.publishJumpIslandTextOffsetY },
                  ],
                },
              ]}
            >
              ¡Publica tu reflexión!
            </Text>
            <View
              style={{
                marginLeft: ISLAND.publishJumpIslandChevronGap,
                transform: [{ scale: ISLAND.publishJumpIslandChevronScale }],
              }}
            >
              <UpChevron size={ISLAND.chevronSize} color={islandFgColor} />
            </View>
          </TouchableOpacity>
        </Animated.View>
      ) : null}

      <ChatInputBar
        placeholder={
          sending
            ? 'Esperando respuesta…'
            : messages.length === 0
              ? 'Escribe tu reflexión…'
              : 'Continúa la conversación…'
        }
        onSend={handleSend}
        sendIcon={sendIconNode}
        contentAboveBar={emptyReflectionWelcome}
        clanColor={clanColor}
        inputCursorColor={clanColor}
      />

      {!sidebarOpen ? (
        <GestureDetector gesture={edgeOpenGesture}>
          <View
            style={[
              styles.edgeHitStrip,
              { top: topBarHeight, width: COMMUNITY_DRAWER_EDGE_ZONE_WIDTH },
            ]}
          />
        </GestureDetector>
      ) : null}

      <SidebarDrawer
        visible={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={conversationItems}
        onConversationPress={(id) => {
          setSidebarOpen(false);
          router.replace({ pathname: '/reflection', params: { thoughtId: id } });
        }}
        openProgress={drawerOpenProgress}
      />
    </View>
    </GestureHandlerRootView>
  );
}

/**
 * PublishBlockConnected — self-contained publish block that manages its own
 * title state. Rendered below the user bubble, same width as the user bubble.
 */
const PublishBlockConnected = React.memo(function PublishBlockConnected({
  clanId,
  userReflectionText,
  onPublish,
}: {
  clanId: string | null | undefined;
  userReflectionText: string;
  onPublish: (title: string, body: string) => Promise<void> | void;
}) {
  const PublishStar = useMemo(() => getPublishStarByClan(clanId), [clanId]);
  const publishTitleRef = useRef('');
  const handleTitleChange = useCallback((t: string) => { publishTitleRef.current = t; }, []);
  const handlePublish = useCallback(async () => {
    await onPublish(publishTitleRef.current, userReflectionText);
  }, [onPublish, userReflectionText]);

  return (
    <PublishBlock
      borderColor={getBlockBorderColor('publish', clanId)}
      borderWidth={DEBATE_BW.publish}
      backgroundColor={getBlockBackgroundColor('publish', clanId)}
      starIcon={PublishStar}
      titleOutlineColor={getPublishTitleOutlineColor(clanId)}
      actionBarColor={getPublishTitleOutlineColor(clanId)}
      onTitleChange={handleTitleChange}
      onPublish={handlePublish}
    />
  );
});

/** Renders a single user or assistant message. */
const MessageBubble = React.memo(function MessageBubble({
  message,
  clanColor,
  clanId,
  publishHandlerBelow,
}: {
  message: ChatBubble;
  clanColor: string;
  clanId: string | null | undefined;
  /** When set, a PublishBlock is rendered below the user bubble in the same container. */
  publishHandlerBelow?: (title: string, body: string) => Promise<void> | void;
}) {
  const isUser = message.role === 'user';
  const displayText = message.revealed ?? message.content;

  if (isUser) {
    // Both user bubble and (optional) PublishBlock share a right-aligned maxWidth container
    // so they are always the same width.
    return (
      <View style={styles.userMessageGroup}>
        <View style={[styles.userBubbleInner, { borderColor: clanColor }]}>
          <Text style={styles.userText}>{displayText}</Text>
        </View>
        {publishHandlerBelow ? (
          <View style={styles.publishAttached}>
            <PublishBlockConnected
              clanId={clanId}
              userReflectionText={displayText}
              onPublish={publishHandlerBelow}
            />
          </View>
        ) : null}
      </View>
    );
  }

  const assistantMsg = message as Extract<ChatBubble, { role: 'assistant' }>;

  // ── Phase A: Thinking — pulsing star ONLY while the request is in-flight.
  // Persisted/reopened messages always have `streaming: false` (the storage
  // layer strips the flag on load), so this branch is reserved for the live
  // generation phase and can never get stuck after a reload.
  if (assistantMsg.streaming) {
    if (!assistantMsg.debateResponse && !displayText) {
      return <ThinkingStar />;
    }
    if (!assistantMsg.debateResponse) {
      return (
        <View style={styles.assistantBlock}>
          <Text style={styles.aiText}>{displayText}</Text>
        </View>
      );
    }
  }

  // Reopened message that — for whatever reason (legacy data, partial save) —
  // has no `debateResponse`.  Render whatever raw text we have instead of
  // leaving the screen stuck on a pulsing star forever.
  if (!assistantMsg.debateResponse) {
    return (
      <View style={styles.assistantBlock}>
        <Text style={styles.aiText}>{displayText || ''}</Text>
      </View>
    );
  }

  const phase = assistantMsg.introPhase ?? 'done';

  // ── Phase B: typewriter del intro (SIN estrella encima) ────────────────
  if (phase === 'intro') {
    const introText = assistantMsg.debateResponse?.debate_layer?.conversational_intro ?? '';
    return (
      <View style={styles.assistantBlock}>
        <IntroTypewriter introText={introText} />
      </View>
    );
  }

  // ── Phase C: respuesta completa ────────────────────────────────────────
  return (
    <View style={styles.assistantBlock}>
      <DebateResponseDisplay
        response={assistantMsg.debateResponse!}
        clanId={clanId}
        selectedPhrase={assistantMsg.selectedPhrase}
      />
    </View>
  );
});

// `ThinkingStar` and `IntroTypewriter` now live in the shared AiPhaseAnimations
// module so phrase mode can reuse the EXACT same components/timing.

const styles = StyleSheet.create({
  gestureRoot: { flex: 1 },
  container: { flex: 1, backgroundColor: evoconnColors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  edgeHitStrip: { position: 'absolute', left: 0, bottom: 0, zIndex: 250 },
  loadingText: { color: evoconnColors.muted, marginTop: 12, fontSize: 14 },
  scroll: { flex: 1 },
  scrollContent: {
    padding: 16,
    paddingBottom:
      CHAT_INPUT_ISLAND_LAYOUT.gradientHeight +
      CHAT_BOTTOM_AREA.paddingTop +
      CHAT_INPUT.minHeight +
      CHAT_BOTTOM_AREA.paddingBottom +
      24,
  },

  reflectionWelcomeAboveInput: {
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  reflectionWelcomeTitleWrap: {
    width: '100%',
    position: 'relative',
    alignItems: 'center',
  },
  reflectionWelcomeTripleStars: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  reflectionWelcomeTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  reflectionWelcomeSub: {
    color: evoconnColors.muted,
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 20,
  },

  // ── User message group: user bubble + optional attached PublishBlock ──
  userMessageGroup: {
    alignSelf: 'flex-end' as const,
    maxWidth: '92%' as any,
    marginBottom: 16,
  },
  userBubbleInner: {
    padding: 14,
    borderRadius: 16,
    borderBottomRightRadius: 4,
    backgroundColor: '#262626',
    borderLeftWidth: CHAT_USER_MESSAGE_LAYOUT.accentWidth,
  },
  publishAttached: {
    // Zero top gap — looks like a direct extension of the user bubble
    marginTop: 0,
  },

  // ── AI / generic bubbles (kept for assistant text/streaming states) ──
  bubble: {
    marginBottom: 16,
    padding: 14,
    borderRadius: 16,
    maxWidth: '92%',
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: evoconnColors.card,
    borderBottomLeftRadius: 4,
  },
  assistantBlock: {
    marginBottom: 16,
    width: '100%',
  },
  userText: { color: evoconnColors.text, fontSize: 15, lineHeight: 22 },
  aiText: { color: evoconnColors.text, fontSize: 15, lineHeight: 22 },


  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  errorText: { color: evoconnColors.danger, fontSize: 13 },

  // ── Publish jump island ──────────────────────────────────────────────────
  islandWrapper: {
    position: 'absolute',
    bottom: ISLAND.publishJumpIslandBottom,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 150,
    pointerEvents: 'box-none',
  } as any,
  islandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ISLAND.paddingHorizontal,
    paddingVertical: ISLAND.paddingVertical,
    borderRadius: ISLAND.borderRadius,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 8,
  },
  islandLabel: {
    color: '#FFFFFF',
    fontSize: ISLAND.fontSize,
    fontWeight: ISLAND.fontWeight,
    letterSpacing: 0.2,
  },
});
