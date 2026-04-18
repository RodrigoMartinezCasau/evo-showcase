import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Keyboard, Alert } from 'react-native';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppTopBar, ChatInputBar, SidebarDrawer } from '@evoconn/components';
import { PublishBlock, PhraseNotesCard, PhraseFolderManagerCard } from '@evoconn/components/debate';
import { useThoughts } from '@evoconn/hooks/useThoughts';
import { useConversationFolders } from '@evoconn/hooks/ConversationFoldersContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { evoconnColors } from '@evoconn/theme/colors';
import { COMMUNITY_DRAWER_EDGE_ZONE_WIDTH } from '@evoconn/constants/communityDrawerGesture';
import { useSidebarGesture } from '@evoconn/hooks/useSidebarGesture';
import { useActiveClan } from '@evoconn/debug/DebugClanContext';
import { mockCurrentUser } from '@evoconn/data/mockUser';
import { getChatSendButtonByHouse } from '@evoconn/utils/getChatSendButtonByHouse';
import {
  CHAT_SEND_BUTTON_LAYOUT,
  CHAT_BOTTOM_AREA_LAYOUT as CHAT_BOTTOM_AREA,
} from '@evoconn/constants/chatInputBarLayout';
import {
  ThinkingStar,
  IntroTypewriter,
  computeIntroDurationMs,
} from '@evoconn/components/aiPhase/AiPhaseAnimations';
import { generatePhraseIntro } from '@evoconn/services/phraseApi';
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
import { useFeedStore, createPhrasePost } from '@evoconn/hooks/useFeedStore';
import { useDebugStreak } from '../debug/DebugStreakContext';
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
  const phraseId = params.phraseId;

  const {
    thoughts,
    createPhraseThought,
    loadThread,
    updateThought,
  } = useThoughts();
  const { folders } = useConversationFolders();
  const { publishPost } = useFeedStore();
  const { markStreakActivated } = useDebugStreak();
  const activeClan = useActiveClan(mockCurrentUser.clanId);
  const clanColor = getChatUserAccentColor(activeClan);

  const SendIcon = useMemo(() => getChatSendButtonByHouse(activeClan), [activeClan]);
  const sendBtnSize = CHAT_SEND_BUTTON_LAYOUT.size;
  const sendIconNode = useMemo(
    () => <SendIcon width={sendBtnSize} height={sendBtnSize} />,
    [SendIcon, sendBtnSize],
  );
  const PublishStar = useMemo(() => getPublishStarByClan(activeClan), [activeClan]);

  const insets = useSafeAreaInsets();
  const topBarHeight = 60 + insets.top;

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
  /** Per-thread flag: once the typewriter finishes for that thread, we flip
   *  this to true so the phrase tools (Apuntes, Folder) appear. */
  const [introTypewriterDone, setIntroTypewriterDone] = useState<Record<string, boolean>>({});

  const [phraseNotesLocal, setPhraseNotesLocal] = useState('');

  const scrollToEnd = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  useEffect(() => {
    if (!phraseId) {
      setMessages([]);
      setLoadingThread(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingThread(true);
      try {
        const thread = await loadThread(phraseId);
        if (!cancelled && thread) {
          // Defensive: if a previous session crashed mid-fetch, never resume
          // a stale "loading intro" spinner — the request is no longer alive.
          const hydrated = thread.messages.map((m) =>
            m.role === 'assistant' && m.phraseIntroLoading
              ? { ...m, phraseIntroLoading: false }
              : m,
          );
          setMessages(hydrated);
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
  }, [phraseId, loadThread]);

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

      // Preserve the AI intro (if it was generated for this thread) so the
      // published view doesn't lose context on reopen. We grab the latest
      // assistant message rather than constructing it blind.
      const prevAssistant = messages.find((m) => m.role === 'assistant');
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
    [publishPost, updateThought, messages],
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
      const intro = await generatePhraseIntro({ phrase: phraseText, author: author ?? null });
      let nextMessages: DebateMessage[] | null = null;
      setMessages((prev) => {
        if (prev.length === 0) return prev;
        const copy = [...prev];
        const lastIdx = copy.length - 1;
        const last = copy[lastIdx];
        if (last && last.role === 'assistant') {
          copy[lastIdx] = {
            ...last,
            phraseIntro: intro,
            phraseIntroLoading: false,
          };
          nextMessages = copy;
        }
        return copy;
      });
      // Persist the intro on the phrase thread so reopening it later still
      // shows the AI intro without re-hitting the backend.
      if (nextMessages) {
        updateThought(threadId, { messages: nextMessages });
      }
      // No intro returned → skip the typewriter wait entirely.
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
        // Phrase created/sent successfully → activate streak (first send of the day only).
        // eslint-disable-next-line no-console
        console.log('[STREAK] Phrase created/sent → marking streak activated.');
        markStreakActivated();
        setMessages([
          { role: 'user', content: t },
          {
            role: 'assistant',
            content: '',
            phrasePublishUI: { status: 'pending' },
            // Mark intro as loading so the screen shows the pulsing thinking
            // star until the /phrase/intro response (or its failure) arrives.
            phraseIntroLoading: true,
          },
        ]);
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
      router,
      scrollToEnd,
      markStreakActivated,
      requestPhraseIntro,
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
                right: 0,
                transform: [
                  { translateX: PHRASE_TRIPLE_STARS.offsetX },
                  { scale: PHRASE_TRIPLE_STARS.scale },
                ],
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
            paddingBottom: PHRASE_STACK.scrollPaddingBottom,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((msg, i) => {
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
            const pubUi = getPhrasePublishUI(msg);
            if (!pubUi || !effectiveThreadId) return null;
            const userPhrase =
              messages[i - 1]?.role === 'user' ? messages[i - 1].content : '';
            const published = pubUi.status === 'published';
            const introText = (msg.phraseIntro ?? '').trim();
            const introLoading = !!msg.phraseIntroLoading;
            const typewriterDone = !!introTypewriterDone[effectiveThreadId];
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
    backgroundColor: CHAT_BOTTOM_AREA.backgroundColor,
  },
  phraseWelcomeTitleWrap: {
    width: '100%',
    position: 'relative',
    alignItems: 'center',
  },
  phraseWelcomeTripleStars: {
    position: 'absolute',
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
