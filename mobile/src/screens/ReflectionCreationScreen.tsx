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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
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

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [messages, setMessages] = useState<ChatBubble[]>([]);
  const [debateId, setDebateId] = useState<string | null>(thoughtId ?? null);
  const [sending, setSending] = useState(false);
  const [loadingThread, setLoadingThread] = useState(!!thoughtId);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

        const resp = await debateApi.sendMessage(id, text);
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
    [sending, debateId, createThought, updateThought, messages.length, revealAssistantText, scrollToEnd, thoughts],
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

  return (
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
        >
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.welcomeTitle}>Nueva reflexión</Text>
              <Text style={styles.welcomeSub}>
                Escribe lo que piensas. La IA analizará tu reflexión y te dará una respuesta
                estructurada con hechos, contra-argumentos y preguntas socráticas.
              </Text>
            </View>
          ) : null}

          {messages.map((msg, i) => (
            <MessageBubble key={`${msg.id ?? i}-${msg.role}`} message={msg} clanColor={clanColor} />
          ))}

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
        </ScrollView>
      )}

      <ChatInputBar
        placeholder={
          sending
            ? 'Esperando respuesta…'
            : messages.length === 0
              ? 'Escribe tu reflexión…'
              : 'Continúa la conversación…'
        }
        onSend={handleSend}
      />

      <SidebarDrawer
        visible={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={conversationItems}
        onConversationPress={(id) => {
          setSidebarOpen(false);
          router.replace({ pathname: '/reflection', params: { thoughtId: id } });
        }}
      />
    </View>
  );
}

/** Renders a single user or assistant message bubble. */
const MessageBubble = React.memo(function MessageBubble({
  message,
  clanColor,
}: {
  message: ChatBubble;
  clanColor: string;
}) {
  const isUser = message.role === 'user';
  const displayText = message.revealed ?? message.content;

  if (isUser) {
    return (
      <View style={[styles.bubble, styles.userBubble, { borderColor: clanColor }]}>
        <Text style={styles.userText}>{displayText}</Text>
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

  return (
    <View style={[styles.bubble, styles.aiBubble]}>
      <Text style={styles.aiText}>{displayText}</Text>
      {assistantMsg.streaming ? (
        <Text style={styles.typingIndicator}>▌</Text>
      ) : null}
      {!assistantMsg.streaming && assistantMsg.nextQuestion ? (
        <View style={styles.nextQuestionBox}>
          <Text style={styles.nextQuestionLabel}>Pregunta para reflexionar:</Text>
          <Text style={styles.nextQuestionText}>{assistantMsg.nextQuestion}</Text>
        </View>
      ) : null}
      {!assistantMsg.streaming && assistantMsg.debateResponse ? (
        <DebateResponseSummary response={assistantMsg.debateResponse} />
      ) : null}
    </View>
  );
});

/** Compact summary of the structured debate response. */
const DebateResponseSummary = React.memo(function DebateResponseSummary({
  response,
}: {
  response: DebateResponse;
}) {
  const dl = response.debate_layer;
  const stance = dl.stance_section;
  const counter = dl.counter_section;
  const question = dl.question_section;

  return (
    <View style={styles.debateSection}>
      {stance ? (
        <View style={styles.debateBlock}>
          <Text style={styles.debateBlockTitle}>{stance.section_title}</Text>
          {stance.points.map((p) => (
            <View key={p.index} style={styles.debatePoint}>
              <Text style={styles.debatePointTitle}>★ {p.title}</Text>
              {p.bullets.map((b, bi) => (
                <Text key={bi} style={styles.debateBullet}>• {b.text}</Text>
              ))}
            </View>
          ))}
          {stance.quick_summary ? (
            <Text style={styles.debateSummary}>{stance.quick_summary}</Text>
          ) : null}
        </View>
      ) : dl.steelman_of_user ? (
        <View style={styles.debateBlock}>
          <Text style={styles.debateBlockTitle}>Tu postura</Text>
          <Text style={styles.debateBullet}>{dl.steelman_of_user}</Text>
        </View>
      ) : null}

      {counter ? (
        <View style={styles.debateBlock}>
          <Text style={styles.debateBlockTitle}>{counter.section_title}</Text>
          {counter.points.map((p) => (
            <View key={p.index} style={styles.debatePoint}>
              <Text style={styles.debatePointTitle}>★ {p.title}</Text>
              {p.bullets.map((b, bi) => (
                <Text key={bi} style={styles.debateBullet}>• {b.text}</Text>
              ))}
            </View>
          ))}
          {counter.quick_summary ? (
            <Text style={styles.debateSummary}>{counter.quick_summary}</Text>
          ) : null}
        </View>
      ) : dl.contrarian_position ? (
        <View style={styles.debateBlock}>
          <Text style={styles.debateBlockTitle}>Contrapunto</Text>
          <Text style={styles.debateBullet}>{dl.contrarian_position}</Text>
        </View>
      ) : null}

      {question ? (
        <View style={styles.debateBlock}>
          <Text style={styles.debateBlockTitle}>{question.section_title}</Text>
          <Text style={styles.debateQuestionText}>{question.socratic_question}</Text>
        </View>
      ) : dl.socratic_questions?.length ? (
        <View style={styles.debateBlock}>
          <Text style={styles.debateBlockTitle}>Preguntas socráticas</Text>
          {dl.socratic_questions.map((q, qi) => (
            <Text key={qi} style={styles.debateBullet}>• {q}</Text>
          ))}
        </View>
      ) : null}

      {response.closing?.open_ended_takeaways?.length ? (
        <View style={styles.debateBlock}>
          <Text style={styles.debateBlockTitle}>Para reflexionar</Text>
          {response.closing.open_ended_takeaways.map((t, ti) => (
            <Text key={ti} style={styles.debateBullet}>• {t}</Text>
          ))}
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: evoconnColors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: evoconnColors.muted, marginTop: 12, fontSize: 14 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24 },

  emptyState: { marginTop: 40, alignItems: 'center', paddingHorizontal: 20 },
  welcomeTitle: {
    color: evoconnColors.text,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  welcomeSub: {
    color: evoconnColors.muted,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },

  bubble: {
    marginBottom: 16,
    padding: 14,
    borderRadius: 16,
    maxWidth: '92%',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#262626',
    borderLeftWidth: CHAT_USER_MESSAGE_LAYOUT.accentWidth,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: evoconnColors.card,
    borderBottomLeftRadius: 4,
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

  nextQuestionBox: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: evoconnColors.border,
  },
  nextQuestionLabel: {
    color: evoconnColors.neonGreen,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  nextQuestionText: {
    color: evoconnColors.text,
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
  },

  debateSection: { marginTop: 14 },
  debateBlock: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: evoconnColors.border,
  },
  debateBlockTitle: {
    color: evoconnColors.neonGreen,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  debatePoint: { marginBottom: 8 },
  debatePointTitle: {
    color: evoconnColors.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  debateBullet: {
    color: '#D1D5DB',
    fontSize: 14,
    lineHeight: 20,
    paddingLeft: 8,
    marginBottom: 2,
  },
  debateSummary: {
    color: evoconnColors.muted,
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 6,
  },
  debateQuestionText: {
    color: evoconnColors.text,
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
  },

  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  errorText: { color: evoconnColors.danger, fontSize: 13 },
});
