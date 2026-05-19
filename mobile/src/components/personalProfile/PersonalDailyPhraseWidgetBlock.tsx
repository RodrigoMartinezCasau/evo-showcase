import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { getStarByHouse, SIDEBAR_DEFAULT_STAR } from '@evoconn/utils/getSidebarStar';
import { getClanColor } from '@evoconn/constants/clanColors';
import CientistaStarSvg from '../../assets/topbar/estrellasNuevasSvg/11.svg';
import TrascendentalistaStarSvg from '../../assets/topbar/estrellasNuevasSvg/12.svg';
import { useFeedStore } from '@evoconn/hooks/useFeedStore';
import { computeTopPhraseWidgetPayload } from '@evoconn/widget/topPhraseWidgetPayload';
import { pushTopPhraseWidgetSnapshot } from '@evoconn/widget/iosWidgetBridge';
import {
  BOTTOM_BLOCK_SIZE,
  BOTTOM_BLOCK_BORDER_RADIUS,
  ICON_SWITCH_OFFSET_X,
  ICON_SWITCH_OFFSET_Y,
  ICON_SWITCH_SCALE,
  APP_ICON_STAR_OFFSET_X,
  APP_ICON_STAR_OFFSET_Y,
  APP_ICON_STAR_SCALE,
  APP_ICON_STAR_SVG_EDITOR,
  PERSONAL_BOTTOM_BLOCKS_OPACITY,
} from '@evoconn/constants/personalProfileLayout';

type Props = {
  clanId: string | null;
};

/** Misma base que el antiguo bloque «Icono de app» (solo decorativa). */
const STAR_BASE = 52;
const PNG_STAR_VISIBLE_WIDTH_RATIO = 346 / 800;
const PNG_STAR_VISIBLE_HEIGHT_RATIO = 353 / 800;
const PNG_STAR_VISIBLE_OFFSET_X_RATIO = 17 / 800;
const PNG_STAR_VISIBLE_OFFSET_Y_RATIO = -12.5 / 800;

export const PersonalDailyPhraseWidgetBlock = React.memo(function PersonalDailyPhraseWidgetBlock({
  clanId,
}: Props) {
  const { posts } = useFeedStore();
  const [modalOpen, setModalOpen] = useState(false);
  const titleColor = getClanColor(clanId);
  const normalizedClanId = clanId?.trim().toLowerCase() ?? null;
  const starSource = clanId ? getStarByHouse(clanId) : SIDEBAR_DEFAULT_STAR;
  const SvgStar =
    normalizedClanId === 'cientista'
      ? CientistaStarSvg
      : normalizedClanId === 'trascendentalista'
        ? TrascendentalistaStarSvg
        : null;
  const svgEditor =
    normalizedClanId === 'cientista'
      ? APP_ICON_STAR_SVG_EDITOR.cientista
      : normalizedClanId === 'trascendentalista'
        ? APP_ICON_STAR_SVG_EDITOR.trascendentalista
        : null;
  const starW = STAR_BASE * APP_ICON_STAR_SCALE;
  const starH = STAR_BASE * APP_ICON_STAR_SCALE;
  const svgStarW = starW * PNG_STAR_VISIBLE_WIDTH_RATIO * (svgEditor?.scale ?? 1);
  const svgStarH = starH * PNG_STAR_VISIBLE_HEIGHT_RATIO * (svgEditor?.scale ?? 1);

  useEffect(() => {
    if (!modalOpen) return;
    const payload = computeTopPhraseWidgetPayload(posts);
    void pushTopPhraseWidgetSnapshot(payload);
  }, [modalOpen, posts]);

  const openModal = useCallback(() => setModalOpen(true), []);
  const closeModal = useCallback(() => setModalOpen(false), []);

  const stepsIos = [
    'Mantén pulsada una zona vacía de la pantalla de inicio hasta que los iconos tiemblen.',
    'Pulsa el botón «+» de la galería de widgets (suele estar arriba o en la barra de edición).',
    'Busca «Evo» en la galería de widgets.',
    'Elige el widget de la frase más votada (24 h), el tamaño que prefieras y pulsa «Añadir widget».',
  ];

  const stepsAndroid = [
    'Mantén pulsada la pantalla de inicio.',
    'Elige «Widgets» o el menú de widgets de tu lanzador.',
    'Busca «Evo» y arrastra el widget de frase del día a la pantalla de inicio.',
  ];

  const steps = Platform.OS === 'ios' ? stepsIos : stepsAndroid;

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={openModal}
        accessibilityRole="button"
        accessibilityLabel="Añadir widget de frase del día"
        style={[
          styles.block,
          {
            width: BOTTOM_BLOCK_SIZE,
            height: BOTTOM_BLOCK_SIZE,
            borderRadius: BOTTOM_BLOCK_BORDER_RADIUS,
            transform: [
              { translateX: ICON_SWITCH_OFFSET_X },
              { translateY: ICON_SWITCH_OFFSET_Y },
              { scale: ICON_SWITCH_SCALE },
            ],
          },
        ]}
      >
        <Text style={[styles.label, { color: titleColor }]} numberOfLines={2}>
          Widgets
        </Text>
        {SvgStar ? (
          <View
            style={[
              styles.star,
              styles.svgStarFrame,
              {
                width: starW,
                height: starH,
                transform: [
                  { translateX: APP_ICON_STAR_OFFSET_X + (svgEditor?.offsetX ?? 0) },
                  { translateY: APP_ICON_STAR_OFFSET_Y + (svgEditor?.offsetY ?? 0) },
                ],
              },
            ]}
          >
            <SvgStar
              width={svgStarW}
              height={svgStarH}
              style={{
                transform: [
                  { translateX: starW * PNG_STAR_VISIBLE_OFFSET_X_RATIO },
                  { translateY: starH * PNG_STAR_VISIBLE_OFFSET_Y_RATIO },
                ],
              }}
            />
          </View>
        ) : (
          <Image
            source={starSource}
            resizeMode="contain"
            style={[
              styles.star,
              {
                width: starW,
                height: starH,
                transform: [{ translateX: APP_ICON_STAR_OFFSET_X }, { translateY: APP_ICON_STAR_OFFSET_Y }],
              },
            ]}
          />
        )}
      </TouchableOpacity>

      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={closeModal}>
        <Pressable style={styles.modalBackdrop} onPress={closeModal}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Añadir widget en la pantalla de inicio</Text>
            <Text style={styles.sheetSubtitle}>
              No se puede abrir la galería de widgets desde la app; añádelo manualmente con los pasos de
              abajo. El contenido será la frase más votada en las últimas 24 h cuando el widget nativo esté
              instalado en tu build.
            </Text>
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
  block: {
    backgroundColor: `rgba(0,0,0,${PERSONAL_BOTTOM_BLOCKS_OPACITY})`,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingTop: 8,
  },
  label: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    zIndex: 1,
    position: 'absolute',
    top: 6,
    textAlign: 'center',
    paddingHorizontal: 4,
    lineHeight: 11,
  },
  star: {
    position: 'absolute',
  },
  svgStarFrame: {
    alignItems: 'center',
    justifyContent: 'center',
  },
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
    marginBottom: 10,
  },
  sheetSubtitle: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 14,
    lineHeight: 20,
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
    backgroundColor: '#89D957',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '800',
  },
});
