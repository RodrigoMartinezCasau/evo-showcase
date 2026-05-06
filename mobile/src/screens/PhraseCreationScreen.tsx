import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Keyboard, Alert, Animated, useWindowDimensions } from 'react-native';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppTopBar, ChatInputBar, SidebarDrawer } from '@evoconn/components';
import { PublishBlock, PhraseNotesCard, PhraseFolderManagerCard } from '@evoconn/components/debate';
import { useThoughts } from '@evoconn/hooks/useThoughts';
import { useClassification } from '@evoconn/hooks/ClassificationContext';
import { useConversationFolders } from '@evoconn/hooks/ConversationFoldersContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { evoconnColors } from '@evoconn/theme/colors';
import { COMMUNITY_DRAWER_EDGE_ZONE_WIDTH } from '@evoconn/constants/communityDrawerGesture';
import { useSidebarGesture } from '@evoconn/hooks/useSidebarGesture';
import { useActiveClan } from '@evoconn/debug/DebugClanContext';
import { mockCurrentUser } from '@evoconn/data/mockUser';
import { incrementProfileStat } from '@evoconn/services/supabaseSocial';
import { recordActivity, recordUsesLog } from '@evoconn/services/streakApi';
import { getPhraseSendButtonByHouse } from '@evoconn/utils/getPhraseSendButtonByHouse';
import { getClanSecondaryColor } from '@evoconn/constants/clanColors';
import {
  CHAT_SEND_BUTTON_LAYOUT,
  CHAT_BOTTOM_AREA_LAYOUT as CHAT_BOTTOM_AREA,
  CHAT_INPUT_LAYOUT as CHAT_INPUT,
  CHAT_INPUT_ISLAND_LAYOUT,
} from '@evoconn/constants/chatInputBarLayout';
import {
  ThinkingStar,
  IntroTypewriter,
  computeIntroDurationMs,
} from '@evoconn/components/aiPhase/AiPhaseAnimations';
import { generatePhraseIntro } from '@evoconn/services/phraseApi';
import { warmUpBackend } from '@evoconn/services/debateApi';
import {
  getChatUserAccentColor,
  CHAT_USER_MESSAGE_LAYOUT,
} from '@evoconn/constants/chatUserMessageLayout';
import { REFLECTION_EMPTY_WELCOME_LAYOUT as EMPTY_WELCOME } from '@evoconn/constants/reflectionEmptyWelcomeLayout';
import { EMPTY_PHRASE_WELCOME_TRIPLE_STARS_LAYOUT as PHRASE_TRIPLE_STARS } from '@evoconn/constants/phraseEmptyWelcomeTripleStarsLayout';
import { getPhraseTripleStarsByHouse } from '@evoconn/utils/getPhraseTripleStarsByHouse';
import {
  AI_RESPONSE_BORDER_WIDTH as BW,
  getBlockBorderColor,
  getBlockBackgroundColor,
  getPublishTitleOutlineColor,
} from '@evoconn/constants/debateResponseLayout';
import { getPublishStarByClan } from '@evoconn/utils/getDebateStarByClan';
import type { DebateMessage } from '@evoconn/types/debate';
import type { CommunityPost } from '@evoconn/types';
import { useFeedStore, createPhrasePost } from '@evoconn/hooks/useFeedStore';
import { ProfileDetailPanel } from '@evoconn/components/ProfileDetailPanel';
import { useDebugStreak } from '../debug/DebugStreakContext';
import { useDebugStats } from '../debug/DebugStatsContext';
import { requestNoUsesAnimation } from '@evoconn/components/animations/AppAnimationLayer';
import { normalizePhraseInnerForPublish } from '@evoconn/utils/phrasePublish';
import type { SidebarFolder } from '@evoconn/types';
import { PHRASE_CREATION_STACK_LAYOUT as PHRASE_STACK } from '@evoconn/constants/phraseCreationStackLayout';
import { PHRASE_PUBLISH_HINT_LAYOUT as PHRASE_PUBLISH_LAYOUT } from '@evoconn/constants/phrasePublishHintLayout';

const PUBLISH_AUTHOR_PLACEHOLDER = 'AÑADE EL AUTOR...';
const PUBLISH_AUTHOR_MAX_LEN = 40;

/**
 * Tiny effect-only helper rendered next to `IntroTypewriter` to schedule a
 * one-shot `onDone(threadId)` callback after the typewriter finishes revealing
 * the intro. We use this instead of duplicating the duration math at the
 * parent level — the duration formula stays inside the shared module.
 */
const PhraseIntroDoneTrigger = React.memo(function PhraseIntroDoneTrigger({
  threadId,
  introText,
  onDone,
}: {
  threadId: string;
  introText: string;
  onDone: (threadId: string) => void;
}) {
  useEffect(() => {
    const ms = computeIntroDurationMs(introText);
    const handle = setTimeout(() => onDone(threadId), ms);
    return () => clearTimeout(handle);
    // We intentionally only re-run when threadId or introText changes; onDone
    // is stable from useState's setter pattern in the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, introText]);
  return null;
});

/** Compat: hilos viejos con `phrasePublishPending` / `phrasePublishPublished`. */
function getPhrasePublishUI(
  m: DebateMessage,
): { status: 'pending' | 'published'; author?: string } | null {
  if (m.role !== 'assistant') return null;
  const x = m as DebateMessage & {
    phrasePublishUI?: { status: 'pending' | 'published'; author?: string };
    phrasePublishPending?: boolean;
    phrasePublishPublished?: boolean;
    phrasePublishAuthor?: string;
  };
  if (x.phrasePublishUI) return x.phrasePublishUI;
  if (x.phrasePublishPending) return { status: 'pending' };
  if (x.phrasePublishPublished) {
    return { status: 'published', author: x.phrasePublishAuthor };
  }
  return null;
}

export default function PhraseCreationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ phraseId?: string }>();
  const phraseId = Array.isArray(params.phraseId) ? params.phraseId[0] : params.phraseId;

  const {
    thoughts,
    createPhraseThought,
    loadThread,
    updateThought,
  } = useThoughts();
  const { recordInput: recordClassificationInput } = useClassification();
  const { folders } = useConversationFolders();
  const { publishPost } = useFeedStore();
  const { markStreakActivated } = useDebugStreak();
  const { decrementUses, remainingUses } = useDebugStats();
  const activeClan = useActiveClan(mockCurrentUser.clanId);
  const clanColor = getChatUserAccentColor(activeClan);
  const phraseCursorColor = getClanSecondaryColor(activeClan);

  const SendIcon = useMemo(() => getPhraseSendButtonByHouse(activeClan), [activeClan]);
  const sendBtnSize = CHAT_SEND_BUTTON_LAYOUT.size;
  const sendIconNode = useMemo(
    () => <SendIcon width={sendBtnSize} height={sendBtnSize} />,
    [SendIcon, sendBtnSize],
  );
  const PublishStar = useMemo(() => getPublishStarByClan(activeClan), [activeClan]);

  const insets = useSafeAreaInsets();
  const topBarHeight = 60 + insets.top;
  const { width: screenW, height: screenH } = useWindowDimensions();

  // ── Post-publish preview overlay ────────────────────────────────────────────
  const [previewPost, setPreviewPost] = useState<CommunityPost | null>(null);
  const previewSlideAnim = useRef(new Animated.Value(0)).current;

  const openPreview = useCallback((post: CommunityPost) => {
    setPreviewPost(post);
    previewSlideAnim.setValue(0);
    requestAnimationFrame(() => {
      Animated.timing(previewSlideAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start();
    });
  }, [previewSlideAnim]);

  const closePreview = useCallback(() => {
    Animated.timing(previewSlideAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(({ finished }) => { if (finished) setPreviewPost(null); });
  }, [previewSlideAnim]);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { drawerOpenProgress, edgeOpenGesture } = useSidebarGesture(sidebarOpen, setSidebarOpen);
  const [messages, setMessages] = useState<DebateMessage[]>([]);
  const [loadingThread, setLoadingThread] = useState(!!phraseId);
  const [sending, setSending] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const publishAuthorRef = useRef('');
  const publishedRef = useRef<Set<string>>(new Set());
  const notesDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Tracks which threads have already had the intro fetch fired (prevents
   *  duplicate calls when the screen re-renders or remounts). */
  const introRequestedRef = useRef<Set<string>>(new Set());
  /** Threads that were JUST created in this screen instance — we already have
   *  their full live message state in memory, so the load effect must NOT
   *  rehydrate over it (which would wipe `phraseIntroLoading`, the in-flight
   *  intro fetch progress, and any other live UI state). */
  const justCreatedRef = useRef<Set<string>>(new Set());
  /** Always-current snapshot of the messages state, so callbacks fired across
   *  the lifecycle (intro fetch resolving after a remount, etc.) can read the
   *  latest values without depending on stale closures. */
  const messagesRef = useRef<DebateMessage[]>([]);

  // Warm up the Railway backend on mount so it's awake before the user sends a phrase.
  useEffect(() => { warmUpBackend(); }, []);

  /** Per-thread flag: once the typewriter finishes for that thread, we flip
   *  this to true so the phrase tools (Apuntes, Folder) appear. */
  const [introTypewriterDone, setIntroTypewriterDone] = useState<Record<string, boolean>>({});

  const [phraseNotesLocal, setPhraseNotesLocal] = useState('');

  const scrollToEnd = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  // Keep messagesRef in sync with the live state on every render so async
  // callbacks (intro fetch, publish handler) can read the latest snapshot.
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (!phraseId) {
      setMessages([]);
      setLoadingThread(false);
      return;
    }
    // Skip rehydration for a thread we just created in this same screen
    // instance — the live state in memory is already authoritative and
    // contains in-flight UI flags (e.g. phraseIntroLoading) that the
    // persisted disk copy intentionally does not.
    if (justCreatedRef.current.has(phraseId)) {
      setLoadingThread(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingThread(true);
      try {
        const thread = await loadThread(phraseId);
        // eslint-disable-next-line no-console
        console.log(
          `[PHRASE-LOAD] phraseId=${phraseId} → thread=`,
          thread ? `${thread.messages.length} messages, roles=[${thread.messages.map((m) => m.role).join(',')}]` : 'null',
        );
        if (!cancelled && thread) {
          // Defensive hydration:
          //  1. Strip any stale phraseIntroLoading flag (a previous session
          //     could have crashed mid-fetch — that request is gone).
          //  2. Guarantee an assistant slot exists. Phrase threads created in
          //     older versions (or threads whose assistant slot got lost via
          //     sanitisation / persistence corruption) would otherwise render
          //     as just the user bubble on a black screen, with no intro,
          //     notes card, folder manager or publish button visible.
          const cleaned = thread.messages.map((m) =>
            m.role === 'assistant' && m.phraseIntroLoading
              ? { ...m, phraseIntroLoading: false }
              : m,
          );
          const hasAssistant = cleaned.some((m) => m.role === 'assistant');
          const hydrated: DebateMessage[] = hasAssistant
            ? cleaned
            : [
                ...cleaned,
                {
                  role: 'assistant',
                  content: '',
                  phrasePublishUI: { status: 'pending' },
                  phraseIntro: null,
                  phraseIntroLoading: false,
                },
              ];
          setMessages(hydrated);
          // Persist the recovered assistant slot back to disk so this repair
          // is one-shot — next reopen reads it cleanly without the patch path.
          if (!hasAssistant) {
            updateThought(phraseId, { messages: hydrated });
          }
          // For reopened threads we never re-run the typewriter — surface the
          // intro as already-revealed static text so the user sees it instantly.
          setIntroTypewriterDone((prev) => ({ ...prev, [phraseId]: true }));
          // Mark as already requested to prevent any background re-fetch.
          introRequestedRef.current.add(phraseId);
        }
      } finally {
        if (!cancelled) setLoadingThread(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [phraseId, loadThread, updateThought]);

  const phraseThought = useMemo(
    () => (phraseId ? thoughts.find((t) => t.id === phraseId) : undefined),
    [thoughts, phraseId],
  );

  useEffect(() => {
    setPhraseNotesLocal(phraseThought?.phraseNotes ?? '');
  }, [phraseId, phraseThought?.phraseNotes]);

  useEffect(() => {
    return () => {
      if (notesDebounceRef.current) clearTimeout(notesDebounceRef.current);
    };
  }, []);

  const onPhraseNotesChange = useCallback(
    (text: string) => {
      setPhraseNotesLocal(text);
      if (!phraseId) return;
      if (notesDebounceRef.current) clearTimeout(notesDebounceRef.current);
      notesDebounceRef.current = setTimeout(() => {
        updateThought(phraseId, { phraseNotes: text });
      }, 400);
    },
    [phraseId, updateThought],
  );

  const publishPending = useMemo(
    () => messages.some((m) => getPhrasePublishUI(m)?.status === 'pending'),
    [messages],
  );

  const conversationItems = useMemo(
    () =>
      thoughts.map((t) => ({
        id: t.id,
        type: t.type,
        title: t.title,
        updatedAt: t.updatedAt,
        isFavorite: t.isFavorite,
        folderId: t.folderId,
      })),
    [thoughts],
  );

  const handlePhrasePublish = useCallback(
    async (threadId: string, rawPhraseFromUser: string) => {
      const authorName = publishAuthorRef.current.trim();
      if (!authorName) return;
      const sourceId = `${threadId}_phrase_pub`;
      if (publishedRef.current.has(sourceId)) return;
      publishedRef.current.add(sourceId);

      const phraseInner = normalizePhraseInnerForPublish(rawPhraseFromUser);
      const post = createPhrasePost(mockCurrentUser, phraseInner, authorName);
      (post as { id: string }).id = sourceId;
      publishPost(post);
      openPreview(post as CommunityPost);

      // Preserve the AI intro (if it was generated for this thread) so the
      // published view doesn't lose context on reopen. Read from the live ref
      // (not the closure-captured `messages`) so a publish that happens right
      // after intro arrival doesn't lose the intro it just received.
      const liveMessages = messagesRef.current;
      const prevAssistant = liveMessages.find((m) => m.role === 'assistant');
      const carriedIntro =
        prevAssistant && prevAssistant.role === 'assistant' ? prevAssistant.phraseIntro ?? null : null;
      const nextMessages: DebateMessage[] = [
        { role: 'user', content: rawPhraseFromUser.trim() },
        {
          role: 'assistant',
          content: '',
          phrasePublishUI: { status: 'published', author: authorName },
          phraseIntro: carriedIntro,
          phraseIntroLoading: false,
        },
      ];
      setMessages(nextMessages);
      updateThought(threadId, { messages: nextMessages });
      publishAuthorRef.current = '';
      Keyboard.dismiss();
    },
    [publishPost, updateThought, openPreview],
  );

  const handleAssignPhraseToFolder = useCallback(
    (folder: SidebarFolder) => {
      if (!phraseId) return;
      updateThought(phraseId, { folderId: folder.id });
      Alert.alert('Carpeta', `La frase se ha guardado en «${folder.name}».`);
    },
    [phraseId, updateThought],
  );

  /**
   * Fires the /phrase/intro request, persists the result on the assistant
   * message, and (when no intro is returned) immediately marks the typewriter
   * as "done" so the phrase tools appear without waiting.
   *
   * Safe to call multiple times: deduped via `introRequestedRef`.
   */
  const requestPhraseIntro = useCallback(
    async (threadId: string, phraseText: string, author?: string | null) => {
      if (introRequestedRef.current.has(threadId)) return;
      introRequestedRef.current.add(threadId);
      let intro: string | null = null;
      try {
        intro = await generatePhraseIntro({ phrase: phraseText, author: author ?? null });
      } catch (err) {
        // Network/backend failure — log it and continue.  We MUST still flip
        // `phraseIntroLoading` off so the screen doesn't stay stuck on the
        // pulsing star forever waiting for an intro that never arrives.
        // eslint-disable-next-line no-console
        console.warn('[PHRASE] generatePhraseIntro failed, skipping intro:', err);
        intro = null;
      }
      // Apply the intro to the assistant slot. If — for any reason — the live
      // state has no assistant slot (race with a load effect, hot reload,
      // legacy thread shape), we INJECT one rather than silently dropping the
      // result. This is what previously caused some phrase threads to lose
      // their assistant message after reopening.
      let nextMessages: DebateMessage[] | null = null;
      setMessages((prev) => {
        const copy = [...prev];
        const lastIdx = copy.length - 1;
        const last = copy[lastIdx];
        if (last && last.role === 'assistant') {
          copy[lastIdx] = {
            ...last,
            phraseIntro: intro,
            phraseIntroLoading: false,
          };
        } else {
          // No assistant slot present — append a fresh one in pending state
          // carrying the intro we just fetched.
          copy.push({
            role: 'assistant',
            content: '',
            phrasePublishUI: { status: 'pending' },
            phraseIntro: intro,
            phraseIntroLoading: false,
          });
        }
        nextMessages = copy;
        return copy;
      });
      // Persist the intro on the phrase thread so reopening it later still
      // shows the AI intro without re-hitting the backend.
      if (nextMessages) {
        updateThought(threadId, { messages: nextMessages });
      }
      // No intro returned (either backend gave us null or the request failed)
      // → skip the typewriter wait entirely so phrase tools appear right away.
      if (!intro) {
        setIntroTypewriterDone((prev) =>
          prev[threadId] ? prev : { ...prev, [threadId]: true },
        );
      }
    },
    [updateThought],
  );

  const handleSend = useCallback(
    async (text: string) => {
      const t = text.trim();
      if (!t || sending) return;
      if (publishPending) return;
      if (phraseId || messages.length > 0) return;

      setSending(true);
      Keyboard.dismiss();
      try {
        const id = await createPhraseThought(t);
        // Phrase created/sent → activate streak and consume one daily use.
        // eslint-disable-next-line no-console
        console.log('[STREAK] Phrase created/sent → marking streak activated.');
        const justEmptiedDailyUses = remainingUses === 1;
        markStreakActivated();
        decrementUses();
        if (justEmptiedDailyUses) {
          requestNoUsesAnimation();
        }
        // Sync streak + uses to backend (fire-and-forget).
        void recordActivity(mockCurrentUser.id, 'frase').catch(console.error);
        void recordUsesLog(mockCurrentUser.id).catch(console.error);
        // Increment total_quotes in Supabase profiles.
        void incrementProfileStat(mockCurrentUser.id, 'total_quotes').catch(console.error);
        // ── Real philosophical-clan classification ─────────────────────
        // Phrases contribute to the user's clan score totals (but NOT
        // to the 30-reflection reveal threshold — that is reflection-only).
        void recordClassificationInput(t, 'phrase', id);
        // Build the initial thread snapshot. We persist this to disk
        // IMMEDIATELY (alongside setting it in memory) so that even if the
        // user hard-reloads before /phrase/intro returns, the thread on disk
        // already has both messages and renders correctly on reopen.
        const initialMessages: DebateMessage[] = [
          { role: 'user', content: t },
          {
            role: 'assistant',
            content: '',
            phrasePublishUI: { status: 'pending' },
            phraseIntro: null,
            // Mark intro as loading so the screen shows the pulsing thinking
            // star until the /phrase/intro response (or its failure) arrives.
            phraseIntroLoading: true,
          },
        ];
        setMessages(initialMessages);
        // Persist the initial snapshot. Note: phraseIntroLoading is stripped
        // by sanitiseMessage on next load (which is correct — a stuck spinner
        // must never survive a reload), but the assistant slot itself does
        // survive, guaranteeing the screen always has something to render.
        updateThought(id, { messages: initialMessages });
        // Mark this thread as just-created so the load effect that fires
        // when phraseId changes does NOT overwrite our live state.
        justCreatedRef.current.add(id);
        router.setParams({ phraseId: id });
        scrollToEnd();
        // Kick off the AI intro in the background. Author is unknown at this
        // point (the user hasn't typed it yet), so we let the model assess the
        // phrase content alone.
        void requestPhraseIntro(id, t, null);
      } finally {
        setSending(false);
      }
    },
    [
      sending,
      publishPending,
      phraseId,
      messages.length,
      createPhraseThought,
      updateThought,
      router,
      scrollToEnd,
      markStreakActivated,
      decrementUses,
      remainingUses,
      requestPhraseIntro,
      recordClassificationInput,
    ],
  );

  const showEmptyPhraseWelcome = !loadingThread && messages.length === 0;

  const emptyPhraseWelcome = useMemo(() => {
    if (!showEmptyPhraseWelcome) return null;
    const TripleStarsIcon = getPhraseTripleStarsByHouse(activeClan);
    return (
      <View
        style={[
          styles.phraseWelcomeAboveInput,
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
        <View style={styles.phraseWelcomeTitleWrap}>
          <Text style={styles.phraseWelcomeTitle}>¡Dime tu frase YA!</Text>
          <View
            style={[
              styles.phraseWelcomeTripleStars,
              {
                top: PHRASE_TRIPLE_STARS.offsetY,
                transform: [{ scale: PHRASE_TRIPLE_STARS.scale }],
              },
            ]}
            pointerEvents="none"
          >
            <TripleStarsIcon
              width={PHRASE_TRIPLE_STARS.width}
              height={PHRASE_TRIPLE_STARS.height}
            />
          </View>
        </View>
        <Text
          style={[
            styles.phraseWelcomeSub,
            {
              marginTop: EMPTY_WELCOME.subtitleMarginTop,
              maxWidth: EMPTY_WELCOME.subtitleMaxWidth,
            },
          ]}
        >
          Envía tu frase diaria con la posibilidad de ganar diferentes reconocimientos
        </Text>
      </View>
    );
  }, [showEmptyPhraseWelcome, activeClan]);

  const effectiveThreadId = phraseId;

  /**
   * Render-time guarantee: when we have a phrase thread loaded but the messages
   * array doesn't include an assistant slot (legacy persisted threads, race
   * conditions, sanitisation edge cases, hot-reload state mismatches, etc.),
   * synthesise one in pending state for THIS RENDER ONLY.
   *
   * This is the bulletproof layer — it doesn't depend on any effect having
   * run, any persistence having succeeded, or Metro having cleared its cache.
   * If there's a user message and a phraseId, the assistant block (intro slot,
   * notes card, folder manager, publish button) WILL render.
   */
  const displayMessages = useMemo<DebateMessage[]>(() => {
    if (!effectiveThreadId) return messages;
    if (messages.length === 0) return messages;
    const hasAssistant = messages.some((m) => m.role === 'assistant');
    if (hasAssistant) return messages;
    // eslint-disable-next-line no-console
    console.log(
      `[PHRASE-RENDER] Synthesising missing assistant slot for thread ${effectiveThreadId}. Original messages:`,
      messages.length,
    );
    return [
      ...messages,
      {
        role: 'assistant',
        content: '',
        phrasePublishUI: { status: 'pending' },
        phraseIntro: null,
        phraseIntroLoading: false,
      } as DebateMessage,
    ];
  }, [messages, effectiveThreadId]);

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
    <View style={styles.container}>
      <AppTopBar onMenuPress={() => setSidebarOpen(true)} showClanIcon={true} />

      {loadingThread ? (
        <View style={styles.center}>
          <ActivityIndicator color={evoconnColors.neonGreen} size="large" />
          <Text style={styles.loadingText}>Cargando frase…</Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={{
            paddingHorizontal: PHRASE_STACK.scrollPaddingHorizontal,
            paddingTop: PHRASE_STACK.scrollPaddingTop,
            paddingBottom:
              PHRASE_STACK.scrollPaddingBottom +
              CHAT_INPUT_ISLAND_LAYOUT.gradientHeight +
              CHAT_BOTTOM_AREA.paddingTop +
              CHAT_INPUT.minHeight +
              CHAT_BOTTOM_AREA.paddingBottom,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {displayMessages.map((msg, i) => {
            if (msg.role === 'user') {
              return (
                <View
                  key={`u-${i}-${msg.content.slice(0, 8)}`}
                  style={[
                    styles.userBubble,
                    {
                      borderLeftColor: clanColor,
                      borderLeftWidth: CHAT_USER_MESSAGE_LAYOUT.accentWidth,
                      marginBottom: PHRASE_STACK.userBubbleBottomGapPx,
                    },
                  ]}
                >
                  <Text style={styles.userText}>{msg.content}</Text>
                </View>
              );
            }
            // Defensive: legacy assistant messages persisted before the
            // `phrasePublishUI` field existed (or with the field stripped by
            // sanitisation) would otherwise render as a blank screen on reopen.
            // Default them to a pending publish state so intro, notes, folder
            // manager and publish button all become visible again.
            const pubUi = getPhrasePublishUI(msg) ?? { status: 'pending' as const };
            if (!effectiveThreadId) return null;
            const userPhrase =
              displayMessages[i - 1]?.role === 'user' ? displayMessages[i - 1].content : '';
            const published = pubUi.status === 'published';
            const introText = (msg.phraseIntro ?? '').trim();
            const typewriterDone = !!introTypewriterDone[effectiveThreadId];
            // `introLoading` reflects an active /phrase/intro request.  On
            // reopen we ALWAYS mark `typewriterDone` to true (see the load
            // useEffect), which forces `introLoading` off — so a previously
            // crashed/stuck loading state can never leave the screen frozen
            // on the pulsing star after reload.
            const introLoading = !!msg.phraseIntroLoading && !typewriterDone;
            // Section gate: don't show Apuntes / Carpetas until either the
            // typewriter has finished revealing the intro OR there is no
            // intro to show at all (e.g. backend returned null).
            const showTools = published || typewriterDone || (!introLoading && !introText);
            return (
              <View key={`pub-stack-${effectiveThreadId}`}>
                {/* 1. AI intro slot — same animation logic as reflections.
                       While loading: pulsing white thinking star (no text).
                       When intro arrives: typewriter reveals it once.
                       When typewriter ends or there's no intro: nothing here. */}
                {!published && introLoading && (
                  <View style={{ marginTop: PHRASE_STACK.sectionGapPx }}>
                    <ThinkingStar />
                  </View>
                )}
                {!published && !introLoading && introText.length > 0 && !typewriterDone && (
                  <View style={{ marginTop: PHRASE_STACK.sectionGapPx, paddingHorizontal: PHRASE_STACK.introHorizontalPaddingPx }}>
                    <IntroTypewriter introText={introText} />
                    <PhraseIntroDoneTrigger
                      threadId={effectiveThreadId}
                      introText={introText}
                      onDone={(tid) =>
                        setIntroTypewriterDone((prev) =>
                          prev[tid] ? prev : { ...prev, [tid]: true },
                        )
                      }
                    />
                  </View>
                )}
                {/* Once typewriter finished (or intro skipped), keep the intro text
                    visible as a static block. */}
                {!published && typewriterDone && introText.length > 0 && (
                  <View style={{ marginTop: PHRASE_STACK.sectionGapPx, paddingHorizontal: PHRASE_STACK.introHorizontalPaddingPx }}>
                    <Text style={styles.introStaticText}>{introText}</Text>
                  </View>
                )}

                {/* 2 & 3. Phrase tools — appear ONLY after the intro phase ends. */}
                {showTools && (
                  <>
                    <View style={{ marginTop: PHRASE_STACK.sectionGapPx }}>
                      <PhraseNotesCard
                        backgroundColor={getBlockBackgroundColor('question', activeClan)}
                        value={phraseNotesLocal}
                        onChangeText={onPhraseNotesChange}
                      />
                    </View>
                    <View style={{ marginTop: PHRASE_STACK.sectionGapPx }}>
                      <PhraseFolderManagerCard
                        backgroundColor={getBlockBackgroundColor('quote', activeClan)}
                        innerBorderColor={getBlockBorderColor('quote', activeClan)}
                        folders={folders}
                        selectedFolderId={phraseThought?.folderId ?? null}
                        onSelectFolder={handleAssignPhraseToFolder}
                      />
                    </View>
                  </>
                )}

                {/* 4. Publicar — at the very bottom, below all phrase tools. */}
                {showTools && (
                  <View style={{ marginTop: PHRASE_STACK.publishTopGapPx, marginBottom: PHRASE_STACK.publishBottomGapPx }}>
                    <PublishBlock
                      borderColor={getBlockBorderColor('publish', activeClan)}
                      borderWidth={BW.publish}
                      backgroundColor={getBlockBackgroundColor('publish', activeClan)}
                      starIcon={PublishStar}
                      titleOutlineColor={getPublishTitleOutlineColor(activeClan)}
                      actionBarColor={getPublishTitleOutlineColor(activeClan)}
                      showPhraseFormatHint
                      actionBarInnerPaddingHorizontal={
                        PHRASE_PUBLISH_LAYOUT.publishActionBarInnerPaddingH
                      }
                      inputPlaceholder={PUBLISH_AUTHOR_PLACEHOLDER}
                      inputMaxLength={PUBLISH_AUTHOR_MAX_LEN}
                      published={published}
                      initialAuthorValue={published ? pubUi.author ?? '' : ''}
                      onTitleChange={
                        published
                          ? undefined
                          : (a) => {
                              publishAuthorRef.current = a;
                            }
                      }
                      onPublish={
                        published
                          ? undefined
                          : () => handlePhrasePublish(effectiveThreadId, userPhrase)
                      }
                    />
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      <ChatInputBar
        placeholder={
          sending
            ? 'Guardando…'
            : publishPending
              ? 'Publica o revisa la frase arriba…'
              : 'Escribe tu frase...'
        }
        onSend={handleSend}
        sendIcon={sendIconNode}
        contentAboveBar={emptyPhraseWelcome}
        clanColor={clanColor}
        inputCursorColor={phraseCursorColor}
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
          const t = thoughts.find((x) => x.id === id);
          if (t?.type === 'phrase') {
            router.replace({ pathname: '/phrase', params: { phraseId: id } });
          } else {
            router.replace({ pathname: '/reflection', params: { thoughtId: id } });
          }
        }}
        openProgress={drawerOpenProgress}
      />

      {/* Post-publish preview — slides in from the right, swipe right to close */}
      {previewPost !== null && (
        <ProfileDetailPanel
          data={[previewPost]}
          initialIndex={0}
          itemHeight={screenH - topBarHeight}
          slideAnim={previewSlideAnim}
          screenW={screenW}
          onClose={closePreview}
          onAuthorPress={() => { closePreview(); router.push('/my-profile'); }}
          onClanPress={(clanId) => { closePreview(); router.push({ pathname: '/clan/[id]', params: { id: clanId } }); }}
        />
      )}
    </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  gestureRoot: { flex: 1 },
  container: { flex: 1, backgroundColor: evoconnColors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  edgeHitStrip: { position: 'absolute', left: 0, bottom: 0, zIndex: 250 },
  loadingText: { color: evoconnColors.muted, marginTop: 12, fontSize: 14 },
  scroll: { flex: 1 },
  phraseWelcomeAboveInput: {
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  phraseWelcomeTitleWrap: {
    width: '100%',
    position: 'relative',
    alignItems: 'center',
  },
  phraseWelcomeTripleStars: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  phraseWelcomeTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  phraseWelcomeSub: {
    color: evoconnColors.muted,
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 20,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#262626',
    padding: 14,
    borderRadius: 16,
    maxWidth: '92%',
    borderBottomRightRadius: 4,
  },
  userText: { color: evoconnColors.text, fontSize: 15, lineHeight: 22 },
  introStaticText: {
    color: evoconnColors.text,
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.95,
  },
});
