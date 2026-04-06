import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { AppTopBar, PublishCard, ChatInputBar, SidebarDrawer } from '@evoconn/components';
import { useThoughts } from '@evoconn/hooks/useThoughts';
import { useRouter } from 'expo-router';
import { evoconnColors } from '@evoconn/theme/colors';
import { useActiveClan } from '@evoconn/debug/DebugClanContext';
import { mockCurrentUser } from '@evoconn/data/mockUser';
import { getChatSendButtonByHouse } from '@evoconn/utils/getChatSendButtonByHouse';
import { CHAT_SEND_BUTTON_LAYOUT } from '@evoconn/constants/chatInputBarLayout';

export default function PhraseCreationScreen() {
  const router = useRouter();
  const { thoughts } = useThoughts();
  const activeClan = useActiveClan(mockCurrentUser.clanId);
  const SendIcon = useMemo(() => getChatSendButtonByHouse(activeClan), [activeClan]);
  const sendBtnSize = CHAT_SEND_BUTTON_LAYOUT.size;
  const sendIconNode = useMemo(
    () => <SendIcon width={sendBtnSize} height={sendBtnSize} />,
    [SendIcon, sendBtnSize],
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [phrases, setPhrases] = useState<string[]>([]);

  const handleSend = (text: string) => {
    setPhrases((p) => [...p, text]);
  };

  const handlePublish = () => {
    // TODO: submit phrase post
  };

  return (
    <View style={styles.container}>
      <AppTopBar onMenuPress={() => setSidebarOpen(true)} showClanIcon={true} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.welcome}>Nueva frase</Text>
        <Text style={styles.sub}>Añade una o más frases y publica.</Text>
        {phrases.map((p: string, i: number) => (
          <View key={i} style={styles.phraseBlock}>
            <Text style={styles.phraseText}>{p}</Text>
          </View>
        ))}
        {phrases.length > 0 && <PublishCard onPublish={handlePublish} />}
      </ScrollView>
      <ChatInputBar placeholder="Escribe tu frase..." onSend={handleSend} sendIcon={sendIconNode} />
      <SidebarDrawer
        visible={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={thoughts}
        onConversationPress={(id) => {
          setSidebarOpen(false);
          router.push({ pathname: '/reflection', params: { thoughtId: id } });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: evoconnColors.background },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },
  welcome: { color: evoconnColors.text, fontSize: 22, fontWeight: '700', marginBottom: 4 },
  sub: { color: evoconnColors.muted, fontSize: 14, marginBottom: 20 },
  phraseBlock: {
    backgroundColor: evoconnColors.card,
    padding: 14,
    borderRadius: 8,
    marginVertical: 6,
    borderLeftWidth: 4,
    borderLeftColor: evoconnColors.purple,
  },
  phraseText: { color: evoconnColors.text, fontSize: 14, lineHeight: 20 },
});
