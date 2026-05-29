import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, LayoutChangeEvent, TouchableOpacity, type View as RNView } from 'react-native';
import type { FC } from 'react';
import type { SvgProps } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { EvoConfirmModal } from '@evoconn/components/shared/EvoActionSheetModal';
import {
  AI_SPECIAL_BLOCK_LAYOUT as SB,
  DEBATE_CARD_LAYOUT as CARD,
} from '@evoconn/constants/debateResponseLayout';
import {
  PHRASE_PUBLISH_FORMAT_HINT,
  PHRASE_PUBLISH_HINT_LAYOUT as PHRASE_HINT,
} from '@evoconn/constants/phrasePublishHintLayout';
import { PublishActionBar } from './PublishActionBar';

const PI = SB.publishInput;
const PUBLISH_TITLE_MAX_LEN = 21;

type Props = {
  borderColor: string;
  borderWidth: number;
  backgroundColor: string;
  starIcon?: FC<SvgProps>;
  titleOutlineColor?: string;
  actionBarColor?: string;
  unifiedHeight?: number;
  onMeasure?: (h: number) => void;
  onTitleChange?: (title: string) => void;
  onPublish?: () => Promise<void> | void;
  /** Por defecto título de reflexión; en frases = autor citado. */
  inputPlaceholder?: string;
  inputMaxLength?: number;
  /** Frase ya publicada: input solo lectura y barra en ✓ PUBLICADO. */
  published?: boolean;
  /** Valor inicial del autor cuando `published` (reapertura de hilo). */
  initialAuthorValue?: string;
  /** Modo controlado (frases multi-turno): el padre posee el borrador del autor. */
  authorValue?: string;
  /**
   * Solo modo frase: muestra aviso gris + icono de información encima del campo.
   * El texto sale de `phrasePublishHintLayout` (no duplicar aquí).
   */
  showPhraseFormatHint?: boolean;
  /**
   * Si se define, sustituye el texto del aviso y puede bloquear publicar (p. ej. frase >120 caracteres).
   */
  phraseHintOverride?: { text: string; blockPublish: boolean } | null;
  /** Llamado cuando el campo autor recibe/pierde foco (para subir el scroll con el teclado). */
  onAuthorFocusChange?: (focused: boolean) => void;
  /** Ref al contenedor del campo autor (para scroll preciso con teclado). */
  authorInputAnchorRef?: React.Ref<RNView>;
  /**
   * Solo frases ya publicadas: elimina la publicación en la comunidad sin borrar el hilo local.
   */
  onDeletePublication?: () => void;
  /**
   * Padding horizontal dentro del botón PUBLICAR. Solo frases suelen pasar un valor > 0;
   * reflexiones omiten y queda 0.
   */
  actionBarInnerPaddingHorizontal?: number;
};

export const PublishBlock = React.memo(function PublishBlock({
  borderColor,
  borderWidth,
  backgroundColor,
  starIcon: StarIcon,
  titleOutlineColor,
  actionBarColor,
  unifiedHeight,
  onMeasure,
  onTitleChange,
  onPublish,
  inputPlaceholder = 'AÑADE UN TITULO INTERESANTE...',
  inputMaxLength = PUBLISH_TITLE_MAX_LEN,
  published = false,
  initialAuthorValue = '',
  authorValue,
  showPhraseFormatHint = false,
  phraseHintOverride = null,
  onAuthorFocusChange,
  authorInputAnchorRef,
  onDeletePublication,
  actionBarInnerPaddingHorizontal = 0,
}: Props) {
  const isAuthorControlled = authorValue !== undefined;
  const [internalTitle, setInternalTitle] = useState(() =>
    published && initialAuthorValue ? initialAuthorValue : '',
  );
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const title = isAuthorControlled ? authorValue : internalTitle;

  const handleChange = (t: string) => {
    if (published) return;
    const next = t.slice(0, inputMaxLength);
    if (!isAuthorControlled) setInternalTitle(next);
    onTitleChange?.(next);
  };

  const handleLayout = onMeasure
    ? (e: LayoutChangeEvent) => onMeasure(e.nativeEvent.layout.height)
    : undefined;

  return (
    <View
      onLayout={handleLayout}
      style={[
        styles.card,
        {
          borderLeftColor: borderColor,
          borderLeftWidth: borderWidth,
          backgroundColor,
          paddingHorizontal: SB.outerPaddingH,
          paddingVertical: SB.outerPaddingV,
        },
      ]}
    >
      {showPhraseFormatHint ? (
        <View
          style={[
            styles.phraseHintRow,
            {
              marginBottom: PHRASE_HINT.hintMarginBottom,
            },
          ]}
        >
          <Ionicons
            name="information-circle-outline"
            size={PHRASE_HINT.hintIconSize}
            color={PHRASE_HINT.hintIconColor}
            style={{ marginRight: PHRASE_HINT.hintIconMarginRight, marginTop: 1 }}
          />
          <Text
            style={[
              styles.phraseHintText,
              {
                fontSize: PHRASE_HINT.hintFontSize,
                lineHeight: PHRASE_HINT.hintLineHeight,
                color: PHRASE_HINT.hintTextColor,
              },
            ]}
          >
            {phraseHintOverride?.text ?? PHRASE_PUBLISH_FORMAT_HINT}
          </Text>
        </View>
      ) : null}

      <View ref={authorInputAnchorRef} collapsable={false} style={styles.inputAnchor}>
      <TextInput
        style={[
          styles.input,
          {
            fontSize: PI.fontSize,
            color: PI.color,
            ...(PI.lineHeight > 0 ? { lineHeight: PI.lineHeight } : {}),
            backgroundColor: SB.publishInputBackground,
            borderRadius: SB.publishInputBorderRadius,
            paddingHorizontal: SB.publishInputPaddingH,
            paddingVertical: SB.publishInputPaddingV,
            marginLeft: PI.offsetX,
            marginTop: showPhraseFormatHint ? 0 : PI.offsetY,
          },
        ]}
        value={title}
        onChangeText={handleChange}
        placeholder={inputPlaceholder}
        placeholderTextColor={SB.publishInputPlaceholderColor}
        maxLength={inputMaxLength}
        editable={!published}
        onFocus={() => onAuthorFocusChange?.(true)}
        onBlur={() => onAuthorFocusChange?.(false)}
      />
      </View>

      <PublishActionBar
        barColor={actionBarColor ?? borderColor}
        disabled={
          published ||
          !onPublish ||
          title.trim().length === 0 ||
          !!phraseHintOverride?.blockPublish
        }
        onPublish={published ? undefined : onPublish}
        externallyPublished={published}
        innerPaddingHorizontal={actionBarInnerPaddingHorizontal}
      />

      {published && onDeletePublication ? (
        <>
          <TouchableOpacity
            style={styles.deletePublicationBtn}
            onPress={() => setDeleteConfirmOpen(true)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Eliminar publicación"
          >
            <Text style={styles.deletePublicationText}>Eliminar publicación</Text>
          </TouchableOpacity>
          <EvoConfirmModal
            visible={deleteConfirmOpen}
            onClose={() => setDeleteConfirmOpen(false)}
            title="Eliminar post"
            message="¿Seguro que quieres eliminar esta publicación? Esta acción no se puede deshacer."
            confirmLabel="Eliminar"
            destructive
            onConfirm={() => {
              setDeleteConfirmOpen(false);
              onDeletePublication();
            }}
          />
        </>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: CARD.borderRadius,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    width: '100%',
  },
  inputAnchor: {
    width: '100%',
  },
  phraseHintRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  phraseHintText: {
    flex: 1,
    fontWeight: '400',
  },
  deletePublicationBtn: {
    width: '100%',
    marginTop: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  deletePublicationText: {
    color: 'rgba(255,100,100,0.92)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
