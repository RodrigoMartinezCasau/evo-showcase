import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  Alert,
} from 'react-native';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppTopBar, ChatInputBar, SidebarDrawer } from '@evoconn/components';
import { getPhraseSendButtonByHouse } from '@evoconn/utils/getPhraseSendButtonByHouse';
import { PublishBlock, PhraseNotesCard, PhraseFolderManagerCard } from '@evoconn/components/debate';
import { useThoughts } from '@evoconn/hooks/useThoughts';
import { useClassification } from '@evoconn/hooks/ClassificationContext';
import { useConversationFolders } from '@evoconn/hooks/ConversationFoldersContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { evoconnColors } from '@evoconn/theme/colors';
import { getAppTopBarLayoutHeight } from '@evoconn/constants/topBarLayout';
import { COMMUNITY_DRAWER_EDGE_ZONE_WIDTH } from '@evoconn/constants/communityDrawerGesture';
import { useSidebarGesture } from '@evoconn/hooks/useSidebarGesture';
import { useActiveClan } from '@evoconn/debug/DebugClanContext';
import { mockCurrentUser } from '@evoconn/data/mockUser';
import { incrementProfileStat } from '@evoconn/services/supabaseSocial';
import { recordActivity, recordUsesLog } from '@evoconn/services/streakApi';
import { useAuth } from '../../mobile/lib/AuthContext';
import { getClanSecondaryColor } from '@evoconn/constants/clanColors';
import { CHAT_SEND_BUTTON_LAYOUT } from '@evoconn/constants/chatInputBarLayout';
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
import { useFeedStore, createPhrasePost } from '@evoconn/hooks/useFeedStore';
import { userForPublish } from '@evoconn/utils/publishAuthor';
import { useDebugStreak } from '../debug/DebugStreakContext';
import { useDebugStats } from '../debug/DebugStatsContext';
import { requestNoUsesAnimation } from '@evoconn/components/animations/AppAnimationLayer';
import { LockedAiButtonIcon } from '@evoconn/components/shared/LockedAiButtonIcon';
import { useDailyUsesGate } from '@evoconn/hooks/useDailyUsesGate';
import { normalizePhraseInnerForPublish } from '@evoconn/utils/phrasePublish';
import type { SidebarFolder } from '@evoconn/types';
import {
  PHRASE_CREATION_STACK_LAYOUT as PHRASE_STACK,
  phraseCreationScrollBottomInset,
} from '@evoconn/constants/phraseCreationStackLayout';
import { useScrollInputAboveKeyboard } from '@evoconn/hooks/useScrollInputAboveKeyboard';
import { PHRASE_PUBLISH_HINT_LAYOUT as PHRASE_PUBLISH_LAYOUT } from '@evoconn/constants/phrasePublishHintLayout';
import {
  PHRASE_MAX_PUBLISH_CHARS,
  PHRASE_TOO_LONG_FOR_PUBLISH_MESSAGE,
} from '@evoconn/constants/phrasePublishLimits';

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

/** Stable key per assistant slot so intro/typewriter state works across multi-phrase threads. */
function phraseIntroSlotKey(threadId: string, messageIndex: number): string {
  return `${threadId}#${messageIndex}`;
}

/** Phrase threads must never render reflection-shaped assistant payloads. */
function normalizePhraseThreadMessage(m: DebateMessage): DebateMessage {
  if (m.role !== 'assistant') return m;
  const perTurnMeta = {
    ...(m.phraseNotes !== undefined ? { phraseNotes: m.phraseNotes } : {}),
    ...(m.folderId !== undefined ? { folderId: m.folderId } : {}),
  };
  if (getPhrasePublishUI(m)) {
    const base = m.phraseIntroLoading ? { ...m, phraseIntroLoading: false } : m;
    return { ...base, ...perTurnMeta };
  }
  const legacy = m as DebateMessage & {
    debateResponse?: { debate_layer?: { conversational_intro?: string } };
    streaming?: boolean;
  };
  if (legacy.debateResponse || legacy.streaming || (m.content ?? '').length > 0) {
    const intro =
      legacy.debateResponse?.debate_layer?.conversational_intro?.trim() ||
      (m.content ?? '').trim() ||
      null;
    return {
      role: 'assistant',
      content: '',
      phrasePublishUI: { status: 'pending' },
      phraseIntro: intro,
      phraseIntroLoading: false,
      ...perTurnMeta,
    };
  }
  return {
    role: 'assistant',
    content: '',
    phrasePublishUI: { status: 'pending' },
    phraseIntro: null,
    phraseIntroLoading: false,
    ...perTurnMeta,
  };
}

/** Move legacy thread-level apuntes/carpeta onto the first assistant turn only. */
function migratePhraseThreadMessages(
  messages: DebateMessage[],
  thought?: { phraseNotes?: string; folderId?: string | null },
): DebateMessage[] {
  const migrated = messages.map(normalizePhraseThreadMessage);
  if (!thought?.phraseNotes && thought?.folderId == null) return migrated;
  const firstAssistantIdx = migrated.findIndex((m) => m.role === 'assistant');
  if (firstAssistantIdx < 0) return migrated;
  const slot = migrated[firstAssistantIdx];
  if (slot.role !== 'assistant') return migrated;
  if (slot.phraseNotes || slot.folderId != null) return migrated;
  const copy = [...migrated];
  copy[firstAssistantIdx] = {
    ...slot,
    phraseNotes: thought.phraseNotes,
    folderId: thought.folderId ?? null,
  };
  return copy;
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
  const { hasAiUses, blockIfNoUses } = useDailyUsesGate();
  const { profile: authProfile } = useAuth();
  const apiUserId = authProfile?.id ?? mockCurrentUser.id;
  const activeClan = useActiveClan(mockCurrentUser.clanId);
  const clanColor = getChatUserAccentColor(activeClan);
  const phraseCursorColor = getClanSecondaryColor(activeClan);

  const sendBtnSize = CHAT_SEND_BUTTON_LAYOUT.size;
  const sendIconNode = useMemo(() => {
    if (!hasAiUses) {
      return <LockedAiButtonIcon size={sendBtnSize} circleColor={clanColor} />;
    }
    const SendSvg = getPhraseSendButtonByHouse(activeClan);
    return <SendSvg width={sendBtnSize} height={sendBtnSize} />;
  }, [sendBtnSize, activeClan, hasAiUses, clanColor]);
  const PublishStar = useMemo(() => getPublishStarByClan(activeClan), [activeClan]);

  const insets = useSafeAreaInsets();
  const topBarHeight = getAppTopBarLayoutHeight(insets.top);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { drawerOpenProgress, edgeOpenGesture } = useSidebarGesture(sidebarOpen, setSidebarOpen);
  const [messages, setMessages] = useState<DebateMessage[]>([]);
  const [loadingThread, setLoadingThread] = useState(!!phraseId);
  const [sending, setSending] = useState(false);

  const scrollContentRef = useRef<View>(null);
  const authorDraftByIndexRef = useRef<Record<number, string>>({});
  const [authorDraftByIndex, setAuthorDraftByIndex] = useState<Record<number, string>>({});
  const lastPublishAssistantIndexRef = useRef(-1);

  const {
    scrollRef,
    registerInputAnchor,
    handleInputFocusChange,
    onScroll,
    getScrollPaddingBottom,
    onScrollContentSizeChange,
  } = useScrollInputAboveKeyboard({
    topBarHeight,
    isLastFocusedInput: (key) => {
      const last = lastPublishAssistantIndexRef.current;
      if (last < 0) return false;
      return key === `author-${last}` || key === `notes-${last}`;
    },
  });

  const publishAnchorRefs = useRef<Map<number, View>>(new Map());
  const publishedRef = useRef<Set<string>>(new Set());

  const onAuthorDraftChange = useCallback((assistantIndex: number, text: string) => {
    authorDraftByIndexRef.current = {
      ...authorDraftByIndexRef.current,
      [assistantIndex]: text,
    };
    setAuthorDraftByIndex((prev) =>
      prev[assistantIndex] === text ? prev : { ...prev, [assistantIndex]: text },
    );
  }, []);

  const notesDebounceRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
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
  const thoughtsRef = useRef(thoughts);
  thoughtsRef.current = thoughts;

  // Warm up the Railway backend on mount so it's awake before the user sends a phrase.
  useEffect(() => { warmUpBackend(); }, []);

  /** Per-thread flag: once the typewriter finishes for that thread, we flip
   *  this to true so the phrase tools (Apuntes, Folder) appear. */
  const [introTypewriterDone, setIntroTypewriterDone] = useState<Record<string, boolean>>({});

  const scrollToEnd = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, [scrollRef]);

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
          const thoughtMeta = thoughtsRef.current.find((t) => t.id === phraseId);
          const cleaned = migratePhraseThreadMessages(thread.messages, thoughtMeta);
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
          const needsPersistRepair =
            !hasAssistant ||
            hydrated.some((m, idx) => m !== thread.messages[idx]);
          if (needsPersistRepair) {
            updateThought(phraseId, { messages: hydrated });
          }
          // Reparar frases guardadas solo en el turno assistant (sidebar no las veía).
          if (thoughtMeta?.folderId == null) {
            for (let j = hydrated.length - 1; j >= 0; j--) {
              const m = hydrated[j];
              if (m.role === 'assistant' && m.folderId) {
                updateThought(phraseId, { folderId: m.folderId });
                break;
              }
            }
          }
          // For reopened threads we never re-run the typewriter — surface the
          // intro as already-revealed static text so the user sees it instantly.
          const doneBySlot: Record<string, boolean> = { [phraseId]: true };
          hydrated.forEach((m, idx) => {
            if (m.role === 'assistant') {
              doneBySlot[phraseIntroSlotKey(phraseId, idx)] = true;
              introRequestedRef.current.add(phraseIntroSlotKey(phraseId, idx));
            }
          });
          setIntroTypewriterDone((prev) => ({ ...prev, ...doneBySlot }));
        }
      } finally {
        if (!cancelled) setLoadingThread(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [phraseId, loadThread, updateThought]);

  useEffect(() => {
    return () => {
      notesDebounceRef.current.forEach((handle) => clearTimeout(handle));
      notesDebounceRef.current.clear();
    };
  }, []);

  const onPhraseNotesChange = useCallback(
    (assistantIndex: number, text: string) => {
      if (!phraseId) return;
      setMessages((prev) => {
        const next = prev.map((m, idx) =>
          idx === assistantIndex && m.role === 'assistant' ? { ...m, phraseNotes: text } : m,
        );
        messagesRef.current = next;
        return next;
      });
      const existing = notesDebounceRef.current.get(assistantIndex);
      if (existing) clearTimeout(existing);
      notesDebounceRef.current.set(
        assistantIndex,
        setTimeout(() => {
          notesDebounceRef.current.delete(assistantIndex);
          updateThought(phraseId, { messages: messagesRef.current });
        }, 400),
      );
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
    async (threadId: string, rawPhraseFromUser: string, assistantMessageIndex: number) => {
      if (rawPhraseFromUser.length > PHRASE_MAX_PUBLISH_CHARS) return;
      const authorName = (authorDraftByIndexRef.current[assistantMessageIndex] ?? '').trim();
      if (!authorName) return;
      const sourceId = `${threadId}_phrase_pub_${assistantMessageIndex}`;
      if (publishedRef.current.has(sourceId)) return;
      publishedRef.current.add(sourceId);

      const phraseInner = normalizePhraseInnerForPublish(rawPhraseFromUser);
      const post = createPhrasePost(userForPublish(authProfile), phraseInner, authorName);
      (post as { id: string }).id = sourceId;
      publishPost(post);
      router.replace({ pathname: '/latest-posts', params: { postId: sourceId } });

      const liveMessages = messagesRef.current;
      const assistantMsg = liveMessages[assistantMessageIndex];
      const carriedIntro =
        assistantMsg?.role === 'assistant' ? assistantMsg.phraseIntro ?? null : null;
      const nextMessages = liveMessages.map((m, idx) =>
        idx === assistantMessageIndex && m.role === 'assistant'
          ? {
              ...m,
              content: '',
              phrasePublishUI: { status: 'published' as const, author: authorName },
              phraseIntro: carriedIntro,
              phraseIntroLoading: false,
            }
          : m,
      );
      setMessages(nextMessages);
      updateThought(threadId, { messages: nextMessages });
      authorDraftByIndexRef.current = { ...authorDraftByIndexRef.current };
      delete authorDraftByIndexRef.current[assistantMessageIndex];
      setAuthorDraftByIndex((prev) => {
        if (!(assistantMessageIndex in prev)) return prev;
        const next = { ...prev };
        delete next[assistantMessageIndex];
        return next;
      });
      handleInputFocusChange(assistantMessageIndex, false);
      Keyboard.dismiss();
    },
    [publishPost, updateThought, router, handleInputFocusChange, authProfile],
  );

  const handleAssignPhraseToFolder = useCallback(
    (folder: SidebarFolder, assistantIndex: number) => {
      if (!phraseId) return;
      setMessages((prev) => {
        const next = prev.map((m, idx) =>
          idx === assistantIndex && m.role === 'assistant'
            ? { ...m, folderId: folder.id }
            : m,
        );
        messagesRef.current = next;
        updateThought(phraseId, { messages: next, folderId: folder.id });
        return next;
      });
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
    async (
      threadId: string,
      slotKey: string,
      phraseText: string,
      author?: string | null,
    ) => {
      if (introRequestedRef.current.has(slotKey)) return;
      introRequestedRef.current.add(slotKey);
      let intro: string | null = null;
      try {
        intro = await generatePhraseIntro({ phrase: phraseText, author: author ?? null });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[PHRASE] generatePhraseIntro failed, skipping intro:', err);
        intro = null;
      }
      let nextMessages: DebateMessage[] | null = null;
      setMessages((prev) => {
        const copy = [...prev];
        let targetIdx = -1;
        for (let j = copy.length - 1; j >= 0; j--) {
          const m = copy[j];
          if (m.role === 'assistant' && m.phraseIntroLoading) {
            targetIdx = j;
            break;
          }
        }
        if (targetIdx < 0) {
          for (let j = copy.length - 1; j >= 0; j--) {
            if (copy[j].role === 'assistant') {
              targetIdx = j;
              break;
            }
          }
        }
        if (targetIdx >= 0) {
          const slot = copy[targetIdx];
          if (slot.role === 'assistant') {
            copy[targetIdx] = {
              ...slot,
              phraseIntro: intro,
              phraseIntroLoading: false,
              phrasePublishUI: slot.phrasePublishUI ?? { status: 'pending' },
            };
          }
        } else {
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
      if (nextMessages) {
        updateThought(threadId, { messages: nextMessages });
      }
      if (!intro) {
        setIntroTypewriterDone((prev) =>
          prev[slotKey] ? prev : { ...prev, [slotKey]: true },
        );
      }
    },
    [updateThought],
  );

  const handleSend = useCallback(
    async (text: string) => {
      const t = text.trim();
      if (!t || sending) return;
      if (blockIfNoUses()) return;

      const threadId = phraseId;
      const isFirstPhrase = !threadId && messages.length === 0;

      // ── Follow-up phrases in the same thread (always phrase UI, never reflection) ──
      if (!isFirstPhrase) {
        if (!threadId) return;
        setSending(true);
        Keyboard.dismiss();
        const userMsg: DebateMessage = { role: 'user', content: t };
        const assistantPlaceholder: DebateMessage = {
          role: 'assistant',
          content: '',
          phrasePublishUI: { status: 'pending' },
          phraseIntro: null,
          phraseIntroLoading: true,
        };
        const nextSnapshot = [...messagesRef.current, userMsg, assistantPlaceholder];
        messagesRef.current = nextSnapshot;
        setMessages(nextSnapshot);
        scrollToEnd();
        try {
          const justEmptiedDailyUses = remainingUses === 1;
          markStreakActivated();
          decrementUses();
          if (justEmptiedDailyUses) requestNoUsesAnimation();
          void recordActivity(apiUserId, 'frase').catch(console.error);
          void recordUsesLog(apiUserId).catch(console.error);
          void recordClassificationInput(t, 'phrase', `${threadId}_${Date.now()}`);

          const assistantIdx = nextSnapshot.length - 1;
          const slotKey = phraseIntroSlotKey(threadId, assistantIdx);
          updateThought(threadId, { messages: nextSnapshot });
          void requestPhraseIntro(
            threadId,
            slotKey,
            t,
            null,
          );
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('[PHRASE] follow-up send failed:', err);
          setMessages((prev) => {
            const copy = [...prev];
            if (copy.length > 0 && copy[copy.length - 1].role === 'assistant') copy.pop();
            if (copy.length > 0 && copy[copy.length - 1].role === 'user' && copy[copy.length - 1].content === t) {
              copy.pop();
            }
            return copy;
          });
          Alert.alert('Error', 'No se pudo enviar la frase. Inténtalo de nuevo.');
        } finally {
          setSending(false);
        }
        return;
      }

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
        void recordActivity(apiUserId, 'frase').catch(console.error);
        void recordUsesLog(apiUserId).catch(console.error);
        // Increment total_quotes in Supabase profiles.
        void incrementProfileStat(apiUserId, 'total_quotes').catch(console.error);
        // ── Real philosophical-clan classification (same hybrid as reflections) ──
        // Phrases count toward the 30-input reveal gate together with reflections
        // (minimum 10 must be reflections).
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
        void requestPhraseIntro(id, phraseIntroSlotKey(id, 1), t, null);
      } finally {
        setSending(false);
      }
    },
    [
      sending,
      blockIfNoUses,
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
      apiUserId,
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

  const lastPublishAssistantIndex = useMemo(() => {
    for (let i = displayMessages.length - 1; i >= 0; i--) {
      if (displayMessages[i].role !== 'assistant') continue;
      const pubUi = getPhrasePublishUI(displayMessages[i]) ?? { status: 'pending' as const };
      if (pubUi.status !== 'published') return i;
    }
    return -1;
  }, [displayMessages]);

  useEffect(() => {
    lastPublishAssistantIndexRef.current = lastPublishAssistantIndex;
  }, [lastPublishAssistantIndex]);

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
        <View style={styles.scrollLiftWrap}>
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{
            paddingHorizontal: PHRASE_STACK.scrollPaddingHorizontal,
            paddingTop: PHRASE_STACK.scrollPaddingTop,
            paddingBottom: getScrollPaddingBottom(phraseCreationScrollBottomInset()),
          }}
          onContentSizeChange={() => onScrollContentSizeChange(scrollToEnd)}
        >
          <View ref={scrollContentRef} collapsable={false}>
          {displayMessages.map((msg, i) => {
            const prevMsg = i > 0 ? displayMessages[i - 1] : null;
            const turnTopGap =
              i > 0 && prevMsg?.role === 'assistant'
                ? PHRASE_STACK.phraseTurnTopGapPx
                : 0;

            if (msg.role === 'user') {
              return (
                <View
                  key={`u-${i}-${msg.content.slice(0, 8)}`}
                  style={[
                    styles.userBubble,
                    {
                      borderLeftColor: clanColor,
                      borderLeftWidth: CHAT_USER_MESSAGE_LAYOUT.accentWidth,
                      marginTop: turnTopGap,
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
            const pubUi = getPhrasePublishUI(msg);

            if (!effectiveThreadId) return null;
            const pubUiResolved = pubUi ?? { status: 'pending' as const };
            const userPhrase =
              displayMessages[i - 1]?.role === 'user' ? displayMessages[i - 1].content : '';
            const published = pubUiResolved.status === 'published';
            const phraseTooLong = !published && userPhrase.length > PHRASE_MAX_PUBLISH_CHARS;
            const phraseHintOverride = phraseTooLong
              ? { text: PHRASE_TOO_LONG_FOR_PUBLISH_MESSAGE, blockPublish: true as const }
              : null;
            const introText = (msg.phraseIntro ?? '').trim();
            const introSlotKey = phraseIntroSlotKey(effectiveThreadId, i);
            const typewriterDone =
              !!introTypewriterDone[introSlotKey] || !!introTypewriterDone[effectiveThreadId];
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
              <View
                key={`pub-stack-${effectiveThreadId}-${i}`}
                style={turnTopGap > 0 ? { marginTop: turnTopGap } : undefined}
              >
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
                      threadId={introSlotKey}
                      introText={introText}
                      onDone={(slotId) =>
                        setIntroTypewriterDone((prev) =>
                          prev[slotId] ? prev : { ...prev, [slotId]: true },
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
                        value={msg.phraseNotes ?? ''}
                        onChangeText={(text) => onPhraseNotesChange(i, text)}
                        onFocusChange={(focused) =>
                          handleInputFocusChange(`notes-${i}`, focused)
                        }
                        inputAnchorRef={(node) => registerInputAnchor(`notes-${i}`, node)}
                      />
                    </View>
                    <View style={{ marginTop: PHRASE_STACK.sectionGapPx }}>
                      <PhraseFolderManagerCard
                        backgroundColor={getBlockBackgroundColor('quote', activeClan)}
                        innerBorderColor={getBlockBorderColor('quote', activeClan)}
                        folders={folders}
                        selectedFolderId={msg.folderId ?? null}
                        onSelectFolder={(folder) => handleAssignPhraseToFolder(folder, i)}
                      />
                    </View>
                  </>
                )}

                {/* 4. Publicar — at the very bottom, below all phrase tools. */}
                {showTools && (
                  <View
                    ref={(node) => {
                      if (node) publishAnchorRefs.current.set(i, node);
                      else publishAnchorRefs.current.delete(i);
                    }}
                    collapsable={false}
                    style={{ marginTop: PHRASE_STACK.sectionGapPx, marginBottom: PHRASE_STACK.publishBottomGapPx }}
                  >
                    <PublishBlock
                      key={`publish-${effectiveThreadId}-${i}`}
                      borderColor={getBlockBorderColor('publish', activeClan)}
                      borderWidth={BW.publish}
                      backgroundColor={getBlockBackgroundColor('publish', activeClan)}
                      starIcon={PublishStar}
                      titleOutlineColor={getPublishTitleOutlineColor(activeClan)}
                      actionBarColor={getClanSecondaryColor(activeClan)}
                      showPhraseFormatHint
                      phraseHintOverride={phraseHintOverride}
                      onAuthorFocusChange={
                        published
                          ? undefined
                          : (focused) => handleInputFocusChange(`author-${i}`, focused)
                      }
                      authorInputAnchorRef={(node) => registerInputAnchor(`author-${i}`, node)}
                      actionBarInnerPaddingHorizontal={
                        PHRASE_PUBLISH_LAYOUT.publishActionBarInnerPaddingH
                      }
                      inputPlaceholder={PUBLISH_AUTHOR_PLACEHOLDER}
                      inputMaxLength={PUBLISH_AUTHOR_MAX_LEN}
                      published={published}
                      initialAuthorValue={published ? pubUiResolved.author ?? '' : ''}
                      authorValue={published ? undefined : authorDraftByIndex[i] ?? ''}
                      onTitleChange={
                        published ? undefined : (a) => onAuthorDraftChange(i, a)
                      }
                      onPublish={
                        published
                          ? undefined
                          : () => handlePhrasePublish(effectiveThreadId, userPhrase, i)
                      }
                    />
                  </View>
                )}
              </View>
            );
          })}
          </View>
        </ScrollView>
        </View>
      )}

      <ChatInputBar
        placeholder={
          sending
            ? 'Guardando…'
            : phraseId || messages.length > 0
              ? 'Sigue la conversación…'
              : 'Escribe tu frase...'
        }
        onSend={handleSend}
        sendIcon={sendIconNode}
        contentAboveBar={emptyPhraseWelcome}
        clanColor={clanColor}
        inputCursorColor={phraseCursorColor}
        aiUsesAvailable={hasAiUses}
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
  scrollLiftWrap: { flex: 1 },
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
    flexShrink: 1,
    borderBottomRightRadius: 4,
  },
  userText: {
    color: evoconnColors.text,
    fontSize: 15,
    lineHeight: 22,
    flexShrink: 1,
  },
  introStaticText: {
    color: evoconnColors.text,
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.95,
  },
});
