import type { CommunityPost } from '@evoconn/types';
import {
  buildFeedScreenContextText,
  type FeedScreenContext,
  type VisiblePost,
} from '@evoconn/agent';
import { normalizeAppPathname } from '@evoconn/constants/voiceAssistantLayout';
import { ANIM_CLANS, type AnimClanId } from '@evoconn/constants/evoAnimationClans';
import { timeAgo } from '@evoconn/utils/timeAgo';

export type VoiceAssistantScreenSnapshot = {
  kind: string;
  text: string;
  /**
   * Contexto estructurado del feed (v2): las acciones type 'execute' del
   * agente necesitan el post objetivo con su id, no solo el texto del LLM.
   */
  feed?: FeedScreenContext;
};

const MAX_CONTEXT_CHARS = 3500;

function clip(text: string, max = MAX_CONTEXT_CHARS): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function communityPostToScreenSnapshot(
  post: CommunityPost,
  source = 'publicación en Evo',
): VoiceAssistantScreenSnapshot {
  const lines: string[] = [`Pantalla actual: ${source}`];
  lines.push(`Tipo de publicación: ${post.type === 'phrase' ? 'frase' : 'reflexión'}`);
  lines.push(`Publicado por: @${post.author.username}`);

  if (post.title?.trim()) {
    lines.push(`Título: ${post.title.trim()}`);
  }

  if (post.type === 'phrase') {
    lines.push(`Texto de la frase: «${post.body.trim()}»`);
    if (post.quoteAuthor?.trim()) {
      lines.push(`Autor atribuido en la publicación: ${post.quoteAuthor.trim()}`);
    } else {
      lines.push('La publicación no indica autor de la cita.');
    }
  } else {
    lines.push(`Texto de la reflexión: ${post.body.trim()}`);
  }

  return {
    kind: 'publicacion',
    text: clip(lines.join('\n')),
    // Contexto estructurado: el post abierto es el objetivo de acciones de
    // voz ("dale like", "guarda esto") también fuera del feed de tarjetas.
    feed: {
      type: 'feed',
      feedType: 'para-ti',
      visiblePosts: [communityPostToVisiblePost(post)],
      focusedPostIndex: 0,
    },
  };
}

const ROUTE_LABELS: Array<{ match: (path: string) => boolean; label: string }> = [
  { match: (p) => p === '/(tabs)' || p.endsWith('/index') || p === '/', label: 'Comunidad (feed)' },
  { match: (p) => p.includes('/detail-feed'), label: 'Visor de publicaciones' },
  { match: (p) => p.includes('/latest-posts'), label: 'Últimas publicaciones' },
  { match: (p) => p.includes('/reflection'), label: 'Nueva reflexión (chat con IA)' },
  { match: (p) => p.includes('/phrase'), label: 'Nueva frase (chat con IA)' },
  { match: (p) => p.includes('/my-profile'), label: 'Mi perfil' },
  { match: (p) => p.includes('/profile'), label: 'Perfil de usuario' },
  { match: (p) => p.includes('/settings'), label: 'Ajustes' },
  { match: (p) => p.includes('/messages') || p.includes('/conversation'), label: 'Mensajes' },
  { match: (p) => p.includes('/notifications'), label: 'Notificaciones' },
  { match: (p) => p.includes('/philosophy-profile'), label: 'Detalle de pensamiento filosófico' },
  { match: (p) => p.includes('/clan'), label: 'Página de clan filosófico' },
];

export function routeToScreenSnapshot(pathname: string | null | undefined): VoiceAssistantScreenSnapshot {
  const base = normalizeAppPathname(pathname);
  const label = ROUTE_LABELS.find((r) => r.match(base))?.label ?? 'Sección de la app';
  return {
    kind: 'ruta',
    text: clip(
      `Pantalla actual: ${label}.\nNo hay una publicación concreta registrada en esta vista.`,
    ),
  };
}

export function mergeScreenContextText(
  registered: string | null | undefined,
  pathname: string | null | undefined,
): string | null {
  const text = registered?.trim() || routeToScreenSnapshot(pathname).text;
  return text || null;
}

export type PhilosophyPct = { clanId: string; label: string; pct: number };

export type ProfileScreenContextInput = {
  screenLabel: string;
  username: string;
  clanId: string | null;
  rank?: string;
  percentages: PhilosophyPct[];
  reflectionCount?: number;
  phraseCount?: number;
  insigniaPhrase?: string;
  isOwnProfile?: boolean;
  /** En la pantalla de detalle filosófico se envían los 8 clanes. */
  includeAllPercentages?: boolean;
};

const RANK_LABELS: Record<string, string> = {
  aprendiz: 'Aprendiz',
  maestro: 'Maestro',
  filosofo: 'Filósofo',
};

function clanLabelFromId(clanId: string | null | undefined): string {
  if (!clanId) return 'Sin clan';
  const entry = ANIM_CLANS[clanId as AnimClanId];
  return entry?.label ?? clanId;
}

export function profileToScreenSnapshot(input: ProfileScreenContextInput): VoiceAssistantScreenSnapshot {
  const lines: string[] = [`Pantalla actual: ${input.screenLabel}`];
  lines.push(
    input.isOwnProfile
      ? 'Es el perfil del usuario que pregunta.'
      : 'Es el perfil de otro usuario de Evo.',
  );
  lines.push(`Usuario: ${input.username}`);

  const clanLabel = clanLabelFromId(input.clanId);
  lines.push(`Clan filosófico visible: ${clanLabel}`);

  if (input.rank) {
    lines.push(`Rango en el clan visible: ${RANK_LABELS[input.rank] ?? input.rank}`);
  }

  const sorted = [...input.percentages].sort((a, b) => b.pct - a.pct);
  const shown = input.includeAllPercentages
    ? sorted
    : sorted.filter((p) => p.pct > 0);

  if (shown.length > 0) {
    lines.push(
      'Distribución filosófica mostrada en el perfil (porcentajes orientativos; suman 100%):',
    );
    for (const p of shown) {
      lines.push(`- ${p.label}: ${p.pct}%`);
    }
  } else if (!input.clanId) {
    lines.push('Sin distribución filosófica revelada todavía (perfil sin clan).');
  }

  if (input.insigniaPhrase?.trim()) {
    lines.push(`Frase insignia del perfil: «${input.insigniaPhrase.trim()}»`);
  }

  if (input.reflectionCount != null || input.phraseCount != null) {
    lines.push(
      `Actividad publicada: ${input.reflectionCount ?? 0} reflexiones, ${input.phraseCount ?? 0} frases.`,
    );
  }

  return { kind: 'perfil', text: clip(lines.join('\n')) };
}

export function clanToScreenSnapshot(clanId: string): VoiceAssistantScreenSnapshot {
  const label = clanLabelFromId(clanId);
  return {
    kind: 'clan',
    text: clip(
      `Pantalla actual: página del clan ${label}.\n` +
        'El usuario explora frases y contenido asociado a este clan filosófico en Evo.',
    ),
  };
}

function communityPostToVisiblePost(post: CommunityPost): VisiblePost {
  return {
    post_id: post.id,
    post_type: post.type,
    author_username: post.author.username,
    author_clan: post.author.clanId ? clanLabelFromId(post.author.clanId) : undefined,
    // El recorte a 200 chars lo aplica buildFeedScreenContextText.
    content_preview: post.type === 'phrase' && post.quoteAuthor?.trim()
      ? `${post.body.trim()} — ${post.quoteAuthor.trim()}`
      : [post.title?.trim(), post.body.trim()].filter(Boolean).join(': '),
    has_image: !!post.imageUrl,
    likes_count: post.voteStats.up,
    created_at_relative: timeAgo(post.createdAt),
  };
}

/**
 * Snapshot del feed con las publicaciones visibles en el viewport (Bloque B).
 * `posts` debe ser un snapshot del momento (no se actualiza durante el turno).
 * Los límites (máx. 5 posts, 200 chars/post) los aplica el módulo del agente.
 */
export function feedPostsToScreenSnapshot(
  feedType: 'para-ti' | 'siguiendo',
  posts: CommunityPost[],
  focusedPostId?: string | null,
): VoiceAssistantScreenSnapshot {
  const visiblePosts = posts.filter((p) => p?.id).map(communityPostToVisiblePost);
  const focusedIdx = focusedPostId
    ? visiblePosts.findIndex((p) => p.post_id === focusedPostId)
    : -1;
  const ctx: FeedScreenContext = {
    type: 'feed',
    feedType,
    visiblePosts,
    focusedPostIndex: focusedIdx >= 0 ? focusedIdx : undefined,
  };
  return { kind: 'feed', text: clip(buildFeedScreenContextText(ctx)), feed: ctx };
}

export function syncVoiceAssistantCommunityPost(
  api: {
    ownerId: symbol;
    setScreenContext: (ownerId: symbol, snapshot: VoiceAssistantScreenSnapshot) => void;
  },
  post: CommunityPost | undefined,
  source: string,
): void {
  if (!post?.id) return;
  api.setScreenContext(api.ownerId, communityPostToScreenSnapshot(post, source));
}
