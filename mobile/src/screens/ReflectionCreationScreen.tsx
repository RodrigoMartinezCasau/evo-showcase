import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { AppTopBar, ReflectionBlock, QuoteCard, PublishCard, ChatInputBar, SidebarDrawer } from '@evoconn/components';
import { mockConversations } from '@evoconn/data/mockConversations';
import { evoconnColors } from '@evoconn/theme/colors';

const STEPS = [
  { key: 'postura', label: 'TU POSTURA' },
  { key: 'contrapostura', label: 'CONTRAPOSTURA' },
  { key: 'pregunta', label: 'PREGUNTA REFLEXIVA' },
  { key: 'cita', label: 'CITA TEXTUAL' },
] as const;

export default function ReflectionCreationScreen() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [postura, setPostura] = useState('');
  const [contrapostura, setContrapostura] = useState('');
  const [pregunta, setPregunta] = useState('');
  const [cita, setCita] = useState('');
  const [currentStep, setCurrentStep] = useState(0);

  const handleSend = (text: string) => {
    if (currentStep === 0) setPostura(text);
    else if (currentStep === 1) setContrapostura(text);
    else if (currentStep === 2) setPregunta(text);
    else if (currentStep === 3) setCita(text);
    setCurrentStep((s: number) => Math.min(s + 1, 3));
  };

  const handlePublish = () => {
    // TODO: submit reflection
  };

  return (
    <View style={styles.container}>
      <AppTopBar onMenuPress={() => setSidebarOpen(true)} showClanIcon={true} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.welcome}>Nueva reflexión</Text>
        <Text style={styles.sub}>Completa los bloques en orden.</Text>
        {postura ? <ReflectionBlock label="TU POSTURA" content={postura} /> : null}
        {contrapostura ? <ReflectionBlock label="CONTRAPOSTURA" content={contrapostura} /> : null}
        {pregunta ? <ReflectionBlock label="PREGUNTA REFLEXIVA" content={pregunta} /> : null}
        {cita ? <QuoteCard quote={cita} /> : null}
        {(postura && contrapostura && pregunta && cita) && (
          <PublishCard onPublish={handlePublish} />
        )}
      </ScrollView>
      <ChatInputBar
        placeholder={currentStep < STEPS.length ? `Escribe ${STEPS[currentStep].label.toLowerCase()}...` : 'Listo para publicar'}
        onSend={handleSend}
      />
      <SidebarDrawer
        visible={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={mockConversations}
        onConversationPress={() => setSidebarOpen(false)}
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
});
