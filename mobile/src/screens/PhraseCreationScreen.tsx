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
  getChatUserAccentColor,
  CHAT_USER_MESSAGE_LAYOUT,
} from '@evoconn/constants/chatUserMessageLayout';
import { REFLECTION_EMPTY_WELCOME_LAYOUT as EMPTY_WELCOME } from '@evoconn/constants/reflectionEmptyWelcomeLayout';
import { EMPTY_PHRASE_WELCOME_TRIPLE_STARS_LAYOUT as PHRASE_TRIPLE_STARS } from '@evoconn/constants/phraseEmptyWelcomeTripleStarsLayout';
import { getPhraseTripleStarsByHouse } from '@evoconn/utils/getPhraseTripleStarsByHouse';
import {
  AI_RESPONSE_BLOCK_GAPS as GAPS,
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

const PUBLISH_AUTHOR_PLACEHOLDER = 'AÑADE EL AUTOR...';
const PUBLISH_AUTHOR_MAX_LEN = 40;

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
          setMessages(thread.messages);
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

      const nextMessages: DebateMessage[] = [
        { role: 'user', content: rawPhraseFromUser.trim() },
        {
          role: 'assistant',
          content: '',
          phrasePublishUI: { status: 'published', author: authorName },
        },
      ];
      setMessages(nextMessages);
      updateThought(threadId, { messages: nextMessages });
      publishAuthorRef.current = '';
      Keyboard.dismiss();
    },
    [publishPost, updateThought],
  );

  const handleAssignPhraseToFolder = useCallback(
    (folder: SidebarFolder) => {
      if (!phraseId) return;
      updateThought(phraseId, { folderId: folder.id });
      Alert.alert('Carpeta', `La frase se ha guardado en «${folder.name}».`);
    },
    [phraseId, updateThought],
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
          { role: 'assistant', content: '', phrasePublishUI: { status: 'pending' } },
        ]);
        router.setParams({ phraseId: id });
        scrollToEnd();
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
          contentContainerStyle={styles.scrollContent}
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
                    },
                  ]}
                >
                  <Text style={styles.userText}>{msg.content}</Text>
                </View>
              );
            }
            const pubUi = getPhrasePublishUI(msg);
            if (pubUi && effectiveThreadId) {
              const userPhrase =
                messages[i - 1]?.role === 'user' ? messages[i - 1].content : '';
              const published = pubUi.status === 'published';
              return (
                <View key={`pub-stack-${effectiveThreadId}`} style={{ marginTop: GAPS.quoteToPublish }}>
                  <PhraseNotesCard
                    borderColor={getBlockBorderColor('question', activeClan)}
                    borderWidth={BW.question}
                    backgroundColor={getBlockBackgroundColor('question', activeClan)}
                    value={phraseNotesLocal}
                    onChangeText={onPhraseNotesChange}
                  />
                  <View style={{ marginTop: GAPS.questionToQuote }}>
                    <PhraseFolderManagerCard
                      borderColor={getBlockBorderColor('quote', activeClan)}
                      borderWidth={BW.quote}
                      backgroundColor={getBlockBackgroundColor('quote', activeClan)}
                      innerBorderColor={getBlockBorderColor('quote', activeClan)}
                      folders={folders}
                      selectedFolderId={phraseThought?.folderId ?? null}
                      onSelectFolder={handleAssignPhraseToFolder}
                    />
                  </View>
                  <View style={{ marginTop: GAPS.questionToQuote }}>
                    <PublishBlock
                      borderColor={getBlockBorderColor('publish', activeClan)}
                      borderWidth={BW.publish}
                      backgroundColor={getBlockBackgroundColor('publish', activeClan)}
                      starIcon={PublishStar}
                      titleOutlineColor={getPublishTitleOutlineColor(activeClan)}
                      actionBarColor={getPublishTitleOutlineColor(activeClan)}
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
                </View>
              );
            }
            return null;
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
  scrollContent: { padding: 16, paddingBottom: 24 },
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
    marginBottom: 16,
    padding: 14,
    borderRadius: 16,
    maxWidth: '92%',
    borderBottomRightRadius: 4,
  },
  userText: { color: evoconnColors.text, fontSize: 15, lineHeight: 22 },
});
