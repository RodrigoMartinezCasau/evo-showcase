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
import * as debateApi from '@evoconn/services/debateApi';
import type { DebateMessage, DebateResponse } from '@evoconn/types/debate';
import {
  getChatUserAccentColor,
  CHAT_USER_MESSAGE_LAYOUT,
} from '@evoconn/constants/chatUserMessageLayout';
import { useActiveClan } from '@evoconn/debug/DebugClanContext';
import { mockCurrentUser } from '@evoconn/data/mockUser';
import { getClanColor } from '@evoconn/constants/clanColors';
import { getChatSendButtonByHouse } from '@evoconn/utils/getChatSendButtonByHouse';
import {
  CHAT_SEND_BUTTON_LAYOUT,
  CHAT_BOTTOM_AREA_LAYOUT as CHAT_BOTTOM_AREA,
  PUBLISH_JUMP_ISLAND_LAYOUT as ISLAND,
} from '@evoconn/constants/chatInputBarLayout';
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
import { useAISettings } from '@evoconn/hooks/AISettingsContext';
import { COMMUNITY_DRAWER_EDGE_ZONE_WIDTH } from '@evoconn/constants/communityDrawerGesture';
import { useSidebarGesture } from '@evoconn/hooks/useSidebarGesture';

const TYPEWRITER_CHUNK = 3;
const TYPEWRITER_MS = 15;

type ChatBubble = DebateMessage & { revealed?: string };

export default function ReflectionCreationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ thoughtId?: string }>();
  const thoughtId = params.thoughtId;

  const { thoughts, createThought, updateThought, loadThread } = useThoughts();
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
  const [messages, setMessages] = useState<ChatBubble[]>([]);
  const [debateId, setDebateId] = useState<string | null>(thoughtId ?? null);
  const [sending, setSending] = useState(false);
  const [loadingThread, setLoadingThread] = useState(!!thoughtId);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Publish jump island ──────────────────────────────────────────────────
  // `messageYOffsets` stores the measured Y offset (from scroll top) for each
  // message index so we can scroll directly to the latest user reflection.
  const messageYOffsets = useRef<Record<number, number>>({});
  const scrollOffsetY = useRef(0);
  const scrollViewHeight = useRef(0);
  const islandOpacity = useRef(new Animated.Value(0)).current;
  const [islandVisible, setIslandVisible] = useState(false);

  // Index of the latest user message that has a published-block attached
  // (i.e. it has a completed AI response right after it).
  const latestUserReflectionIndex = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        const next = messages[i + 1];
        if (next && next.role === 'assistant' && !next.streaming && (next as Extract<ChatBubble, {role:'assistant'}>).debateResponse) {
          return i;
        }
      }
    }
    return -1;
  }, [messages]);

  const checkIslandVisibility = useCallback(() => {
    if (latestUserReflectionIndex < 0) {
      if (islandVisible) {
        setIslandVisible(false);
        Animated.timing(islandOpacity, { toValue: 0, duration: 180, useNativeDriver: true }).start();
      }
      return;
    }
    const msgY = messageYOffsets.current[latestUserReflectionIndex];
    if (msgY == null) return;
    // Only show the island when the reflection has scrolled ABOVE the viewport
    // (user scrolled down past it). Never show it when the reflection is below.
    const viewTop = scrollOffsetY.current;
    const shouldShow = msgY < viewTop;
    if (shouldShow && !islandVisible) {
      setIslandVisible(true);
      Animated.timing(islandOpacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    } else if (!shouldShow && islandVisible) {
      Animated.timing(islandOpacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(
        () => setIslandVisible(false),
      );
    }
  }, [latestUserReflectionIndex, islandVisible, islandOpacity]);

  const handleScrollToReflection = useCallback(() => {
    if (latestUserReflectionIndex < 0) return;
    const targetY = messageYOffsets.current[latestUserReflectionIndex] ?? 0;
    scrollRef.current?.scrollTo({ y: targetY, animated: true });
  }, [latestUserReflectionIndex]);

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

  useEffect(() => {
    return () => {
      if (typewriterRef.current) clearInterval(typewriterRef.current);
    };
  }, []);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  const revealAssistantText = useCallback(
    (fullText: string, index: number) => {
      let pos = 0;
      typewriterRef.current = setInterval(() => {
        pos += TYPEWRITER_CHUNK;
        const revealed = fullText.slice(0, pos);
        setMessages((prev) =>
          prev.map((m, i) =>
            i === index ? { ...m, revealed, streaming: pos < fullText.length } : m,
          ),
        );
        scrollToEnd();
        if (pos >= fullText.length) {
          if (typewriterRef.current) clearInterval(typewriterRef.current);
          typewriterRef.current = null;
        }
      }, TYPEWRITER_MS);
    },
    [scrollToEnd],
  );

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
        if (!id) {
          id = await createThought(text);
          setDebateId(id);
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
        // Reflection sent successfully → activate streak (first send of the day only).
        // eslint-disable-next-line no-console
        console.log('[STREAK] Reflection created/sent → marking streak activated.');
        markStreakActivated();
        const assistantText = resp.assistant_text;

        const assistantMsg: ChatBubble = {
          role: 'assistant',
          content: assistantText,
          id: resp.message_id,
          debateResponse: resp.debate_response,
          nextQuestion: resp.next_question,
          topic: resp.topic,
          lang: resp.lang,
          streaming: true,
          revealed: '',
        };

        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = assistantMsg;
          return copy;
        });

        revealAssistantText(assistantText, messages.length + 1);

        updateThought(id, {
          title: resp.topic || thoughts.find((t) => t.id === id)?.title || 'Reflexión',
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
    [sending, debateId, createThought, updateThought, messages.length, revealAssistantText, scrollToEnd, thoughts, markStreakActivated, includeReflectiveQuestion, includePhilosophicalReferences],
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
                right: 0,
                transform: [
                  { translateX: EMPTY_WELCOME_TRIPLE_STARS.offsetX },
                  { scale: EMPTY_WELCOME_TRIPLE_STARS.scale },
                ],
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
          Escribe abajo para empezar un debate con hechos, citas y preguntas abiertas.
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
              // Check if the next assistant message has a completed structured response.
              // If so, PublishBlock renders below this user bubble (same width container).
              const nextMsg = messages[i + 1] as (ChatBubble & { debateResponse?: unknown }) | undefined;
              const nextIsStructured =
                !!nextMsg &&
                nextMsg.role === 'assistant' &&
                !nextMsg.streaming &&
                !!(nextMsg as Extract<ChatBubble, { role: 'assistant' }>).debateResponse;
              const publishHandlerBelow = nextIsStructured && nextMsg
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
            // Assistant message — PublishBlock is now with the preceding user bubble
            return (
              <MessageBubble
                key={`${msg.id ?? i}-${msg.role}`}
                message={msg}
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
            {/* «» rotated 90° CW → both point upward */}
            <Text
              style={[
                styles.islandChevron,
                {
                  color: islandFgColor,
                  transform: [
                    { rotate: '90deg' },
                    { scale: ISLAND.publishJumpIslandChevronScale },
                  ],
                  marginRight: ISLAND.publishJumpIslandChevronGap,
                },
              ]}
            >
              {'«'}
            </Text>
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
            <Text
              style={[
                styles.islandChevron,
                {
                  color: islandFgColor,
                  transform: [
                    { rotate: '90deg' },
                    { scale: ISLAND.publishJumpIslandChevronScale },
                  ],
                  marginLeft: ISLAND.publishJumpIslandChevronGap,
                },
              ]}
            >
              {'«'}
            </Text>
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

  if (assistantMsg.streaming && !displayText) {
    return (
      <View style={[styles.bubble, styles.aiBubble]}>
        <ActivityIndicator color={evoconnColors.neonGreen} size="small" />
        <Text style={styles.thinkingText}>Pensando…</Text>
      </View>
    );
  }

  const isStreaming = !!assistantMsg.streaming;
  const hasStructured = !isStreaming && !!assistantMsg.debateResponse;

  return (
    <View style={styles.assistantBlock}>
      {/* Typewriter text while streaming */}
      {isStreaming ? (
        <View style={[styles.bubble, styles.aiBubble]}>
          <Text style={styles.aiText}>{displayText}</Text>
          <Text style={styles.typingIndicator}>▌</Text>
        </View>
      ) : null}

      {/* Structured card layout once streaming completes */}
      {hasStructured ? (
        <DebateResponseDisplay
          response={assistantMsg.debateResponse!}
          clanId={clanId}
        />
      ) : !isStreaming ? (
        <View style={[styles.bubble, styles.aiBubble]}>
          <Text style={styles.aiText}>{displayText}</Text>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  gestureRoot: { flex: 1 },
  container: { flex: 1, backgroundColor: evoconnColors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  edgeHitStrip: { position: 'absolute', left: 0, bottom: 0, zIndex: 250 },
  loadingText: { color: evoconnColors.muted, marginTop: 12, fontSize: 14 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24 },

  reflectionWelcomeAboveInput: {
    alignItems: 'center',
    backgroundColor: CHAT_BOTTOM_AREA.backgroundColor,
  },
  reflectionWelcomeTitleWrap: {
    width: '100%',
    position: 'relative',
    alignItems: 'center',
  },
  reflectionWelcomeTripleStars: {
    position: 'absolute',
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
  thinkingText: {
    color: evoconnColors.muted,
    fontSize: 13,
    marginLeft: 8,
    fontStyle: 'italic',
  },
  typingIndicator: {
    color: evoconnColors.neonGreen,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },

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
  islandChevron: {
    color: '#FFFFFF',
    fontSize: ISLAND.chevronSize,
    fontWeight: '700',
    lineHeight: ISLAND.chevronSize + 2,
  },
});
