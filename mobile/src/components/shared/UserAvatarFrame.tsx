/**
 * UserAvatarFrame
 *
 * Renders a profile photo clipped to the exact inner shape of the clan badge SVG,
 * keeping the black border ring and top star decorations visible on top.
 * Sin foto: silueta de persona (`person-silhouette`) o icono de clan del usuario (`by-clan`).
 *
 * Usage:
 *   <UserAvatarFrame clanId={user.clanId} avatarUri={user.avatarUri} size={60} />
 */
import React, { useEffect, useId, useMemo, useState } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, InteractionManager } from 'react-native';
import Svg, { ClipPath, Path, Defs, Image as SvgImage } from 'react-native-svg';
import { Image as ExpoImage } from 'expo-image';
import {
  getClanProfileByHouse,
  PROFILE_PERSON_SILHOUETTE,
} from '@evoconn/utils/getClanProfileByHouse';
import { getClanProfileFrameByHouse } from '@evoconn/utils/getClanProfileFrameByHouse';

// ─── Badge shape paths ────────────────────────────────────────────────────────
// Extracted from clan profile SVGs (600×600 viewBox). The badge outline is
// identical across all clans — only the fill colour and star tint differ.

// Inner filled area of the badge (the clan-colour region + person icon region).
// Used as ClipPath to constrain the photo to the badge's interior shape.
const BADGE_INNER_PATH =
  'M 303.476562 93.917969 C 354.980469 93.417969 407.757812 96.53125 470.261719 134.644531 ' +
  'C 471.722656 300.046875 478.4375 389.296875 447.054688 466.402344 ' +
  'C 436.945312 491.238281 409.910156 513.921875 382.714844 533.707031 ' +
  'C 352.363281 555.785156 320.40625 573.429688 301.296875 583.292969 ' +
  'C 281.875 573.566406 249.246094 556.042969 218.269531 533.9375 ' +
  'C 190.640625 514.21875 163.175781 491.546875 152.9375 466.402344 ' +
  'C 121.554688 389.296875 128.269531 300.046875 129.730469 134.644531 ' +
  'C 193.421875 95.808594 247.03125 93.308594 299.476562 93.949219 ' +
  'L 299.96875 93.957031 Z';

/** ViewBox del escudo de perfil (todos los clanes). */
export const CLAN_PROFILE_BADGE_VIEWBOX = 600;
/** Punta inferior del escudo (centro), en coordenadas del viewBox. */
export const CLAN_PROFILE_BADGE_BOTTOM_TIP_Y = 583.292969;
export const CLAN_PROFILE_BADGE_BOTTOM_TIP_Y_RATIO =
  CLAN_PROFILE_BADGE_BOTTOM_TIP_Y / CLAN_PROFILE_BADGE_VIEWBOX;

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {
  clanId?: string | null;
  avatarUri?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
  /** Extra scale/offset applied to the fallback SVG icon (matches SettingsScreen constants). */
  iconScale?: number;
  iconOffsetX?: number;
  iconOffsetY?: number;
  /**
   * Sin foto de perfil: `person-silhouette` = escudo + personita (búsqueda, listas).
   * `by-clan` = icono de perfil del clan del usuario.
   */
  noPhotoFallback?: 'person-silhouette' | 'by-clan';
  /**
   * Listas largas: pinta un círculo placeholder barato y monta los SVG del
   * escudo SOLO tras terminar la transición/interacciones. Evita bloquear el
   * hilo JS al entrar (botones que no responden, "atrás" lento en Android
   * gama baja). Por defecto `false` (montaje inmediato, como antes).
   */
  deferRender?: boolean;
};

const DEFAULT_SIZE = 60;

/**
 * Descarga el avatar una vez con `expo-image` (caché en disco) y devuelve su
 * ruta local `file://`, que se pasa al SVG en lugar de la URL remota. Evita que
 * `react-native-svg` re-descargue el mismo avatar en cada lista/montaje (en iOS
 * no cachea remotos), reduciendo tráfico y parpadeos.
 */
function useCachedAvatarUri(remoteUri: string | null): string | null {
  const [cachedUri, setCachedUri] = useState<string | null>(null);

  useEffect(() => {
    setCachedUri(null);
    if (!remoteUri || !/^https?:\/\//i.test(remoteUri)) return;

    let active = true;
    const toFileUri = (p: string) => (p.startsWith('file://') ? p : `file://${p}`);

    void (async () => {
      try {
        let path = await ExpoImage.getCachePathAsync(remoteUri);
        if (!path) {
          await ExpoImage.prefetch(remoteUri, { cachePolicy: 'disk' });
          path = await ExpoImage.getCachePathAsync(remoteUri);
        }
        if (active && path) setCachedUri(toFileUri(path));
      } catch {
        /* sin caché → se usa la URL remota como fallback */
      }
    })();

    return () => {
      active = false;
    };
  }, [remoteUri]);

  return cachedUri;
}

function UserAvatarFrameBase({
  clanId,
  avatarUri,
  size = DEFAULT_SIZE,
  style,
  iconScale = 1,
  iconOffsetX = 0,
  iconOffsetY = 0,
  noPhotoFallback = 'by-clan',
  deferRender = false,
}: Props) {
  // Difiere el montaje de los SVG hasta que la transición de navegación acabe.
  const [svgReady, setSvgReady] = useState(!deferRender);
  useEffect(() => {
    if (!deferRender || svgReady) return;
    const handle = InteractionManager.runAfterInteractions(() => setSvgReady(true));
    return () => handle.cancel();
  }, [deferRender, svgReady]);

  const ClanSvg = useMemo(() => {
    if (noPhotoFallback === 'person-silhouette') return PROFILE_PERSON_SILHOUETTE;
    return getClanProfileByHouse(clanId);
  }, [clanId, noPhotoFallback]);
  const FrameSvg  = useMemo(() => getClanProfileFrameByHouse(clanId), [clanId]);
  const photoClipId = useId().replace(/:/g, '_');
  const trimmed = avatarUri?.trim() ?? '';
  const resolvedAvatar =
    trimmed && (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('file://'))
      ? trimmed
      : null;

  // Sirve desde caché en disco cuando esté disponible; si no, usa la remota.
  const cachedAvatar = useCachedAvatarUri(resolvedAvatar);
  const displayAvatar = cachedAvatar ?? resolvedAvatar;

  // Placeholder barato mientras se difiere el montaje del SVG (listas largas).
  if (!svgReady) {
    return (
      <View
        style={[
          { width: size, height: size, borderRadius: size / 2, backgroundColor: 'rgba(255,255,255,0.07)' },
          style,
        ]}
      />
    );
  }

  if (!resolvedAvatar) {
    return (
      <View
        style={[{ width: size, height: size }, style]}
        renderToHardwareTextureAndroid
        shouldRasterizeIOS
      >
        <View
          style={{
            transform: [
              { translateX: iconOffsetX },
              { translateY: iconOffsetY },
              { scale: iconScale },
            ],
          }}
        >
          <ClanSvg width={size} height={size} />
        </View>
      </View>
    );
  }

  return (
    <View
      style={[{ width: size, height: size }, style]}
      renderToHardwareTextureAndroid
      shouldRasterizeIOS
    >
      {/* Layer 1: full clan SVG — preserves top star decorations and base shape */}
      <ClanSvg width={size} height={size} />

      {/* Layer 2: photo clipped to the inner badge shape (replaces clan colour + person icon) */}
      <Svg
        width={size}
        height={size}
        viewBox="0 0 600 600"
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          <ClipPath id={photoClipId}>
            <Path d={BADGE_INNER_PATH} />
          </ClipPath>
        </Defs>
        <SvgImage
          href={{ uri: displayAvatar }}
          x={100}
          y={75}
          width={400}
          height={525}
          clipPath={`url(#${photoClipId})`}
          preserveAspectRatio="xMidYMid slice"
        />
      </Svg>

      {/* Layer 3: frame SVG — black border + star decorations, transparent interior.
          This ensures stars always appear in front of the photo. */}
      <FrameSvg
        width={size}
        height={size}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

/**
 * Memoized + rasterized: the badge is a 2–3 layer SVG that never animates, so
 * we cache it as a GPU texture and skip re-renders when props are unchanged.
 * Big win in avatar-heavy lists (seguidores/seguidos/amigos, buscador, detalle).
 */
export const UserAvatarFrame = React.memo(UserAvatarFrameBase);
