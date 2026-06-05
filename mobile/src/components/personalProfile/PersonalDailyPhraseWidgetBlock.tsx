import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useFeedStore } from '@evoconn/hooks/useFeedStore';
import { resolveTopPhraseWidgetPayload } from '@evoconn/widget/widgetPhraseLock';
import { pushTopPhraseWidgetSnapshot } from '@evoconn/widget/iosWidgetBridge';
import { PersonalBottomChipButton } from './PersonalBottomChipButton';

type Props = {
  clanId: string | null;
};

export const PersonalDailyPhraseWidgetBlock = React.memo(function PersonalDailyPhraseWidgetBlock({
  clanId,
}: Props) {
  const { posts } = useFeedStore();
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!modalOpen) return;
    void (async () => {
      const payload = await resolveTopPhraseWidgetPayload(posts);
      void pushTopPhraseWidgetSnapshot(payload);
    })();
  }, [modalOpen, posts]);

  const openModal = useCallback(() => setModalOpen(true), []);
  const closeModal = useCallback(() => setModalOpen(false), []);

  const stepsIos = [
    'Mantén pulsada una zona vacía de la pantalla de inicio hasta que los iconos tiemblen.',
    'Pulsa el botón «+» de la galería de widgets (suele estar arriba o en la barra de edición).',
    'Busca «Evo» en la galería de widgets.',
    'Elige el widget de la frase más votada del día anterior (fija todo el día) y pulsa «Añadir widget».',
  ];

  const stepsAndroid = [
    'Mantén pulsada la pantalla de inicio.',
    'Elige «Widgets» o el menú de widgets de tu lanzador.',
    'Busca «Evo» y arrastra el widget de frase del día a la pantalla de inicio.',
  ];

  const steps = Platform.OS === 'ios' ? stepsIos : stepsAndroid;

  return (
    <>
      <PersonalBottomChipButton
        label="Widgets"
        clanId={clanId}
        onPress={openModal}
        accessibilityLabel="Añadir widget de frase del día"
      />

      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={closeModal}>
        <Pressable style={styles.modalBackdrop} onPress={closeModal}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Añadir widget en la pantalla de inicio</Text>
            <ScrollView style={styles.stepsScroll} showsVerticalScrollIndicator={false}>
              {steps.map((line, i) => (
                <View key={i} style={styles.stepRow}>
                  <Text style={styles.stepNum}>{i + 1}.</Text>
                  <Text style={styles.stepText}>{line}</Text>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.primaryBtn} onPress={closeModal} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Entendido</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
});

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  sheet: {
    backgroundColor: '#141418',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 20,
    maxHeight: '78%',
  },
  sheetTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
  },
  stepsScroll: {
    maxHeight: 280,
    marginBottom: 16,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  stepNum: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 14,
    fontWeight: '700',
    width: 22,
  },
  stepText: {
    flex: 1,
    color: '#F3F4F6',
    fontSize: 15,
    lineHeight: 22,
  },
  primaryBtn: {
    backgroundColor: '#6B7280',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
