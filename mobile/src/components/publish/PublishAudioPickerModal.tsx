import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Animated,
  Image,
  PanResponder,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  createAudioPlayer,
  setAudioModeAsync,
  setIsAudioActiveAsync,
} from 'expo-audio';
import { fetchAudioTracks, type AudioTrack } from '@evoconn/services/audioTracks';
import {
  pickPostImage,
  uploadAndModeratePostImage,
} from '@evoconn/services/postImages';
import { getClanColor } from '@evoconn/constants/clanColors';
import type { PublishAudioChoice } from '@evoconn/types/publishAudio';
import { DEFAULT_PUBLISH_AUDIO } from '@evoconn/types/publishAudio';
import type { CommunityPost } from '@evoconn/types';
import { useAuth } from '../../../mobile/lib/AuthContext';
import { PostPreviewModal } from './PostPreviewModal';
import {
  PostImageFrameEditorModal,
  DEFAULT_POST_IMAGE_FOCUS_Y,
} from './PostImageFrameEditorModal';
import { clampPostImageFocusY } from '@evoconn/utils/postImageCoverLayout';

const SIN_AUDIO_ID = '__sin_audio__';

type Props = {
  visible: boolean;
  clanId?: string | null;
  onClose: () => void;
  onConfirm: (choice: PublishAudioChoice) => void;
  /**
   * Construye el post que se vería en "Para ti" con la selección actual de
   * audio + foto. Si se define, se muestra el botón "Previsualización".
   */
  buildPreviewPost?: (choice: PublishAudioChoice) => CommunityPost | null;
};

function normalizeSearch(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

function matchesQuery(track: AudioTrack, q: string): boolean {
  if (!q) return true;
  const hay = normalizeSearch(`${track.title} ${track.artist ?? ''}`);
  return hay.includes(q);
}

function waitForLoaded(
  player: ReturnType<typeof createAudioPlayer>,
  timeoutMs = 15000,
): Promise<void> {
  if (player.isLoaded) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      sub.remove();
      reject(new Error('audio load timeout'));
    }, timeoutMs);
    const sub = player.addListener('playbackStatusUpdate', (status: { isLoaded: boolean }) => {
      if (!status.isLoaded) return;
      clearTimeout(timer);
      sub.remove();
      resolve();
    });
  });
}

const THUMB_SIZE = 16;

/**
 * Slider de volumen sin re-render durante el arrastre: la posición del thumb y
 * el relleno se mueven con `Animated.Value` (driver JS pero solo layout), y el
 * volumen vivo se entrega por callback (`onLiveChange`) que actualiza el player
 * por ref. `onCommit` se llama al soltar para fijar el estado en el padre.
 */
function VolumeSlider({
  initialValue,
  accentColor,
  onLiveChange,
  onCommit,
}: {
  initialValue: number;
  accentColor: string;
  onLiveChange: (next: number) => void;
  onCommit: (next: number) => void;
}) {
  const trackWidthRef = useRef(0);
  const valueRef = useRef(initialValue);
  const fillAnim = useRef(new Animated.Value(0)).current;

  const applyVisual = useCallback(
    (ratio: number) => {
      const width = trackWidthRef.current;
      if (width <= 0) return;
      fillAnim.setValue(ratio * width);
    },
    [fillAnim],
  );

  const onTrackLayout = useCallback(
    (e: LayoutChangeEvent) => {
      trackWidthRef.current = e.nativeEvent.layout.width;
      applyVisual(valueRef.current);
    },
    [applyVisual],
  );

  const handleAt = useCallback(
    (locationX: number, commit: boolean) => {
      const width = trackWidthRef.current;
      if (width <= 0) return;
      const ratio = Math.min(1, Math.max(0, locationX / width));
      valueRef.current = ratio;
      fillAnim.setValue(ratio * width);
      onLiveChange(ratio);
      if (commit) onCommit(ratio);
    },
    [fillAnim, onLiveChange, onCommit],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => handleAt(e.nativeEvent.locationX, false),
        onPanResponderMove: (e) => handleAt(e.nativeEvent.locationX, false),
        onPanResponderRelease: (e) => handleAt(e.nativeEvent.locationX, true),
        onPanResponderTerminate: () => onCommit(valueRef.current),
      }),
    [handleAt, onCommit],
  );

  const thumbLeft = Animated.subtract(fillAnim, THUMB_SIZE / 2);

  return (
    <View style={styles.volumeTrack} onLayout={onTrackLayout} {...panResponder.panHandlers}>
      <View style={styles.volumeTrackBg} />
      <Animated.View
        style={[styles.volumeTrackFill, { width: fillAnim, backgroundColor: accentColor }]}
      />
      <Animated.View
        style={[
          styles.volumeThumb,
          { transform: [{ translateX: thumbLeft }], backgroundColor: accentColor },
        ]}
      />
    </View>
  );
}

export function PublishAudioPickerModal({ visible, clanId, onClose, onConfirm, buildPreviewPost }: Props) {
  const insets = useSafeAreaInsets();
  const clanAccent = getClanColor(clanId ?? null);
  const { session } = useAuth();
  const [previewPost, setPreviewPost] = useState<CommunityPost | null>(null);

  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [volume, setVolume] = useState(1);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);

  // ── Foto adjunta ──────────────────────────────────────────────────────────
  // photoPreviewUri: la imagen local que se enseña mientras se sube/modera.
  // photoUrl: URL pública DEFINITIVA (solo se rellena si AWS aprueba la foto).
  const [photoPreviewUri, setPhotoPreviewUri] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoDims, setPhotoDims] = useState<{ w: number; h: number } | null>(null);
  const [photoCropFocusY, setPhotoCropFocusY] = useState<number>(DEFAULT_POST_IMAGE_FOCUS_Y);
  const [photoCropFocusYFollowing, setPhotoCropFocusYFollowing] =
    useState<number>(DEFAULT_POST_IMAGE_FOCUS_Y);
  const photoCropFocusYRef = useRef<number>(DEFAULT_POST_IMAGE_FOCUS_Y);
  const photoCropFocusYFollowingRef = useRef<number>(DEFAULT_POST_IMAGE_FOCUS_Y);
  const [imageShowParaTi, setImageShowParaTi] = useState(true);
  const [imageShowSiguiendo, setImageShowSiguiendo] = useState(true);
  const imageShowParaTiRef = useRef(true);
  const imageShowSiguiendoRef = useRef(true);
  const [frameEditorVisible, setFrameEditorVisible] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const resetPhoto = useCallback(() => {
    setPhotoPreviewUri(null);
    setPhotoUrl(null);
    setPhotoDims(null);
    photoCropFocusYRef.current = DEFAULT_POST_IMAGE_FOCUS_Y;
    photoCropFocusYFollowingRef.current = DEFAULT_POST_IMAGE_FOCUS_Y;
    imageShowParaTiRef.current = true;
    imageShowSiguiendoRef.current = true;
    setPhotoCropFocusY(DEFAULT_POST_IMAGE_FOCUS_Y);
    setPhotoCropFocusYFollowing(DEFAULT_POST_IMAGE_FOCUS_Y);
    setImageShowParaTi(true);
    setImageShowSiguiendo(true);
    setFrameEditorVisible(false);
    setPhotoBusy(false);
    setPhotoError(null);
  }, []);

  const applyCropFocus = useCallback((paraTi: number, siguiendo: number) => {
    const pt = clampPostImageFocusY(paraTi);
    const sg = clampPostImageFocusY(siguiendo);
    photoCropFocusYRef.current = pt;
    photoCropFocusYFollowingRef.current = sg;
    setPhotoCropFocusY(pt);
    setPhotoCropFocusYFollowing(sg);
  }, []);

  const applyImageDisplay = useCallback((showParaTi: boolean, showSiguiendo: boolean) => {
    imageShowParaTiRef.current = showParaTi;
    imageShowSiguiendoRef.current = showSiguiendo;
    setImageShowParaTi(showParaTi);
    setImageShowSiguiendo(showSiguiendo);
  }, []);

  const clearAttachedPhoto = useCallback(() => {
    setPhotoPreviewUri(null);
    setPhotoUrl(null);
    setPhotoDims(null);
    photoCropFocusYRef.current = DEFAULT_POST_IMAGE_FOCUS_Y;
    photoCropFocusYFollowingRef.current = DEFAULT_POST_IMAGE_FOCUS_Y;
    imageShowParaTiRef.current = true;
    imageShowSiguiendoRef.current = true;
    setPhotoCropFocusY(DEFAULT_POST_IMAGE_FOCUS_Y);
    setPhotoCropFocusYFollowing(DEFAULT_POST_IMAGE_FOCUS_Y);
    setImageShowParaTi(true);
    setImageShowSiguiendo(true);
    setFrameEditorVisible(false);
  }, []);

  const handlePickPhoto = useCallback(async () => {
    if (photoBusy) return;
    setPhotoError(null);
    const userId = session?.user?.id;
    if (!userId) {
      setPhotoError('Inicia sesión para añadir fotos.');
      return;
    }
    try {
      const picked = await pickPostImage();
      if (!picked) return;
      setPhotoPreviewUri(picked.uri);
      setPhotoBusy(true);
      const res = await uploadAndModeratePostImage(userId, picked);
      if (res.approved) {
        setPhotoUrl(res.imageUrl);
        setPhotoDims({ w: res.width, h: res.height });
        applyCropFocus(DEFAULT_POST_IMAGE_FOCUS_Y, DEFAULT_POST_IMAGE_FOCUS_Y);
        applyImageDisplay(true, true);
      } else {
        setPhotoPreviewUri(null);
        setPhotoUrl(null);
        setPhotoDims(null);
        setPhotoError(res.message);
      }
    } catch (e) {
      setPhotoPreviewUri(null);
      setPhotoUrl(null);
      setPhotoDims(null);
      setPhotoError(
        e instanceof Error && e.message === 'PERMISSION_DENIED'
          ? 'Permite el acceso a tus fotos para adjuntar una.'
          : 'No se pudo añadir la foto. Inténtalo de nuevo.',
      );
    } finally {
      setPhotoBusy(false);
    }
  }, [photoBusy, session, applyCropFocus, applyImageDisplay]);

  const previewRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);
  const previewRequestRef = useRef(0);
  const volumeRef = useRef(1);

  const disposePreviewPlayer = useCallback(() => {
    previewRequestRef.current += 1;
    const p = previewRef.current;
    previewRef.current = null;
    if (!p) return;
    try {
      p.pause();
      p.remove();
    } catch {
      /* noop */
    }
  }, []);

  const playPreview = useCallback(
    async (track: AudioTrack, vol: number) => {
      const requestId = ++previewRequestRef.current;

      let player = previewRef.current;
      if (!player) {
        player = createAudioPlayer(null, { keepAudioSessionActive: true });
        previewRef.current = player;
      } else {
        player.pause();
      }

      setPreviewLoadingId(track.id);

      player.loop = true;
      player.volume = vol;
      player.replace(track.url);

      try {
        await waitForLoaded(player);
        if (requestId !== previewRequestRef.current) return;

        if (track.previewStartMs > 0) {
          await player.seekTo(track.previewStartMs / 1000);
        }
        if (requestId !== previewRequestRef.current) return;

        player.play();
      } catch (e) {
        if (__DEV__) console.warn('[PublishAudioPicker] preview:', e);
      } finally {
        if (requestId === previewRequestRef.current) {
          setPreviewLoadingId(null);
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        await setIsAudioActiveAsync(true);
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: false,
          interruptionMode: 'mixWithOthers',
        });
      } catch {
        /* noop */
      }
    })();
    void fetchAudioTracks().then((list) => {
      if (cancelled) return;
      setTracks(list);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      disposePreviewPlayer();
      setQuery('');
      setSelectedId(null);
      setVolume(1);
      volumeRef.current = 1;
      setPreviewLoadingId(null);
      resetPhoto();
      setPreviewPost(null);
    }
  }, [visible, disposePreviewPlayer, resetPhoto]);

  useEffect(() => () => disposePreviewPlayer(), [disposePreviewPlayer]);

  const filtered = useMemo(() => {
    const q = normalizeSearch(query);
    return tracks.filter((t) => matchesQuery(t, q));
  }, [tracks, query]);

  const listData = useMemo(
    () => [{ id: SIN_AUDIO_ID, sinAudio: true as const }, ...filtered.map((t) => ({ ...t, sinAudio: false as const }))],
    [filtered],
  );

  const selectTrack = useCallback(
    (id: string, track?: AudioTrack) => {
      setSelectedId(id);
      if (id === SIN_AUDIO_ID) {
        disposePreviewPlayer();
        return;
      }
      if (track) void playPreview(track, volumeRef.current);
    },
    [disposePreviewPlayer, playPreview],
  );

  // Live: solo ajusta el volumen del player (barato, sin re-render).
  const handleVolumeLive = useCallback((value: number) => {
    volumeRef.current = value;
    const p = previewRef.current;
    if (p) p.volume = value;
  }, []);

  // Commit (al soltar): fija el estado para que `handleConfirm` lo use.
  const handleVolumeCommit = useCallback((value: number) => {
    volumeRef.current = value;
    setVolume(value);
  }, []);

  // Selección actual (audio + foto) en forma de PublishAudioChoice.
  const buildChoice = useCallback((): PublishAudioChoice => {
    const imageFields = {
      imageUrl: photoUrl,
      imageWidth: photoUrl ? photoDims?.w ?? null : null,
      imageHeight: photoUrl ? photoDims?.h ?? null : null,
      imageCropFocusY: photoUrl ? photoCropFocusYRef.current : null,
      imageCropFocusYFollowing: photoUrl ? photoCropFocusYFollowingRef.current : null,
      imageShowParaTi: photoUrl ? imageShowParaTiRef.current : null,
      imageShowSiguiendo: photoUrl ? imageShowSiguiendoRef.current : null,
    };
    if (selectedId == null || selectedId === SIN_AUDIO_ID) {
      return { ...DEFAULT_PUBLISH_AUDIO, ...imageFields };
    }
    return { audioTrackId: selectedId, audioVolume: volumeRef.current, ...imageFields };
  }, [selectedId, photoUrl, photoDims]);

  const handleConfirm = useCallback(() => {
    if (selectedId == null) return;
    if (photoBusy) return; // no publicar mientras se modera la foto
    disposePreviewPlayer();
    onConfirm(buildChoice());
  }, [onConfirm, selectedId, disposePreviewPlayer, photoBusy, buildChoice]);

  const handleOpenPreview = useCallback(() => {
    if (photoBusy || !buildPreviewPost) return;
    disposePreviewPlayer(); // corta el preview de pista del picker
    const post = buildPreviewPost(buildChoice());
    if (post) setPreviewPost(post);
  }, [photoBusy, buildPreviewPost, disposePreviewPlayer, buildChoice]);

  const renderItem = useCallback(
    ({ item }: { item: (typeof listData)[number] }) => {
      const isSin = item.sinAudio;
      const id = isSin ? SIN_AUDIO_ID : item.id;
      const selected = selectedId === id;
      const title = isSin ? 'Sin audio' : item.title;
      const subtitle = isSin ? 'Continuar sin música' : item.artist ?? '';
      const isLoadingPreview = !isSin && previewLoadingId === id;

      return (
        <TouchableOpacity
          style={[styles.row, selected && { borderColor: clanAccent }]}
          activeOpacity={0.72}
          onPress={() => selectTrack(id, isSin ? undefined : item)}
        >
          <View style={styles.rowText}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={styles.rowSubtitle} numberOfLines={2}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {isLoadingPreview ? (
            <ActivityIndicator color={clanAccent} style={styles.continuePlaceholder} />
          ) : selected ? (
            <TouchableOpacity
              style={[styles.continueBtn, { backgroundColor: clanAccent }]}
              activeOpacity={0.85}
              onPress={(e) => {
                e.stopPropagation?.();
                handleConfirm();
              }}
              accessibilityRole="button"
              accessibilityLabel="Continuar y publicar"
            >
              <Ionicons name="arrow-forward" size={20} color="#000000" />
            </TouchableOpacity>
          ) : (
            <View style={styles.continuePlaceholder} />
          )}
        </TouchableOpacity>
      );
    },
    [clanAccent, handleConfirm, previewLoadingId, selectTrack, selectedId],
  );

  if (!visible) return null;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: Math.max(16, insets.bottom + 12) }]} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.sheetTitle}>Tu publicación</Text>

          {/* ── Añadir foto (encima de las canciones) ── */}
          {photoPreviewUri ? (
            <View style={styles.photoPreviewRow}>
              <Image source={{ uri: photoPreviewUri }} style={styles.photoThumb} resizeMode="cover" />
              <View style={styles.photoInfo}>
                <Text style={styles.photoTitle} numberOfLines={1}>
                  {photoBusy ? 'Verificando foto…' : 'Foto añadida'}
                </Text>
                <Text style={styles.photoSubtitle} numberOfLines={2}>
                  {photoBusy
                    ? 'Comprobando que cumple las normas de la comunidad.'
                    : 'Se mostrará en tu publicación.'}
                </Text>
              </View>
              {photoBusy ? (
                <ActivityIndicator color={clanAccent} style={styles.photoAction} />
              ) : (
                <View style={styles.photoActions}>
                  <TouchableOpacity
                    style={styles.photoAction}
                    onPress={() => setFrameEditorVisible(true)}
                    disabled={!photoUrl}
                    accessibilityRole="button"
                    accessibilityLabel="Encuadrar foto"
                  >
                    <Ionicons
                      name="crop-outline"
                      size={24}
                      color={photoUrl ? clanAccent : 'rgba(255,255,255,0.25)'}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.photoAction}
                    onPress={resetPhoto}
                    accessibilityRole="button"
                    accessibilityLabel="Quitar foto"
                  >
                    <Ionicons name="close-circle" size={26} color="rgba(255,255,255,0.6)" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.addPhotoRow, { borderColor: clanAccent }]}
              activeOpacity={0.8}
              onPress={handlePickPhoto}
            >
              <Ionicons name="image-outline" size={20} color={clanAccent} />
              <Text style={[styles.addPhotoText, { color: clanAccent }]}>Añadir foto</Text>
            </TouchableOpacity>
          )}
          {photoError ? <Text style={styles.photoError}>{photoError}</Text> : null}

          <Text style={styles.sectionLabel}>Audio para tu publicación</Text>

          <TextInput
            style={styles.search}
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar audio…"
            placeholderTextColor="rgba(255,255,255,0.35)"
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />

          {loading ? (
            <ActivityIndicator color={clanAccent} style={styles.loader} />
          ) : (
            <FlatList
              data={listData}
              keyExtractor={(item) => (item.sinAudio ? SIN_AUDIO_ID : item.id)}
              renderItem={renderItem}
              keyboardShouldPersistTaps="handled"
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}

          {selectedId != null && selectedId !== SIN_AUDIO_ID ? (
            <View style={styles.volumeRow}>
              <Ionicons name="volume-medium" size={18} color="rgba(255,255,255,0.45)" />
              <VolumeSlider
                initialValue={volume}
                accentColor={clanAccent}
                onLiveChange={handleVolumeLive}
                onCommit={handleVolumeCommit}
              />
            </View>
          ) : null}

          <View style={styles.bottomRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.75}>
              <Text style={styles.cancelTxt}>Cancelar</Text>
            </TouchableOpacity>
            {buildPreviewPost ? (
              <TouchableOpacity
                style={styles.previewBtn}
                onPress={handleOpenPreview}
                activeOpacity={0.7}
                disabled={photoBusy}
                hitSlop={8}
              >
                <Ionicons name="eye-outline" size={18} color={clanAccent} />
                <Text style={[styles.previewBtnTxt, { color: clanAccent }]}>Previsualización</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </Pressable>
      </Pressable>

      <PostPreviewModal
        visible={previewPost != null}
        post={previewPost}
        onClose={() => setPreviewPost(null)}
      />

      {frameEditorVisible && buildPreviewPost ? (() => {
        const editorPost = buildPreviewPost(buildChoice());
        if (!editorPost?.imageUrl) return null;
        return (
          <PostImageFrameEditorModal
            visible={frameEditorVisible}
            post={editorPost}
            focusYParaTi={photoCropFocusY}
            focusYSiguiendo={photoCropFocusYFollowing}
            imageShowParaTi={imageShowParaTi}
            imageShowSiguiendo={imageShowSiguiendo}
            clanAccent={clanAccent}
            onCancel={() => setFrameEditorVisible(false)}
            onPhotoFullyRemoved={clearAttachedPhoto}
            onConfirm={(paraTi, siguiendo, showParaTi, showSiguiendo) => {
              applyCropFocus(paraTi, siguiendo);
              applyImageDisplay(showParaTi, showSiguiendo);
              setFrameEditorVisible(false);
            }}
          />
        );
      })() : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#12121a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 16,
    maxHeight: '88%',
  },
  sheetTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  sectionLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  addPhotoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginBottom: 16,
  },
  addPhotoText: {
    fontSize: 15,
    fontWeight: '700',
  },
  photoPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginBottom: 16,
  },
  photoThumb: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  photoInfo: {
    flex: 1,
    minWidth: 0,
  },
  photoTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  photoSubtitle: {
    color: 'rgba(255,255,255,0.42)',
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },
  photoAction: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  photoError: {
    color: '#ff6b6b',
    fontSize: 13,
    marginTop: -6,
    marginBottom: 12,
  },
  search: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    color: '#FFFFFF',
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    marginBottom: 12,
  },
  loader: {
    marginVertical: 32,
  },
  list: {
    maxHeight: 340,
  },
  listContent: {
    gap: 8,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    paddingRight: 10,
  },
  rowTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  rowSubtitle: {
    color: 'rgba(255,255,255,0.42)',
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },
  continueBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continuePlaceholder: {
    width: 40,
    height: 40,
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  volumeTrack: {
    flex: 1,
    height: 32,
    justifyContent: 'center',
  },
  volumeTrackBg: {
    ...StyleSheet.absoluteFillObject,
    height: 4,
    top: 14,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  volumeTrackFill: {
    position: 'absolute',
    left: 0,
    top: 14,
    height: 4,
    borderRadius: 2,
  },
  volumeThumb: {
    position: 'absolute',
    top: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  bottomRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cancelBtn: {
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  cancelTxt: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
    fontWeight: '600',
  },
  previewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 14,
    paddingHorizontal: 6,
  },
  previewBtnTxt: {
    fontSize: 14,
    fontWeight: '700',
  },
});
