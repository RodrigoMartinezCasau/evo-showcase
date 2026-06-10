/**
 * App Manifest de Evo — cliente cero del agente in-app.
 *
 * Declarativo: SOLO datos, sin lógica. Las rutas son las reales de expo-router
 * (carpeta mobile/mobile/app). Si se añade una pantalla nueva al agente,
 * se añade aquí — nunca hardcodear rutas en el ejecutor ni en el backend.
 */
import type { AppManifest } from './types';

export const EVO_MANIFEST_VERSION = '1.5.0';

export const evoManifest: AppManifest = {
  appId: 'com.evoconn.evo',
  appName: 'Evo',
  appDescription:
    'Red social filosófica en español: reflexiones, frases con autor, clanes filosóficos y porcentajes de pensamiento.',
  version: EVO_MANIFEST_VERSION,

  routes: [
    {
      intent: 'home_feed',
      label: 'Comunidad — Para ti',
      route: '/(tabs)?tab=para-ti',
      examples: [
        'llévame al feed',
        'para ti',
        'inicio',
        'página principal',
        'llévame a la comunidad',
        'abre el feed',
      ],
    },
    {
      intent: 'following_feed',
      label: 'Comunidad — Siguiendo',
      route: '/(tabs)?tab=siguiendo',
      examples: ['siguiendo', 'feed de seguidos', 'gente que sigo', 'publicaciones de mis seguidos'],
    },
    {
      intent: 'search',
      label: 'Buscar',
      route: '/(tabs)?tab=search',
      examples: ['buscar', 'busca usuarios', 'abre el buscador', 'quiero buscar algo'],
    },
    {
      intent: 'my_profile',
      label: 'Mi perfil',
      route: '/my-profile',
      examples: ['mi perfil', 'mi cuenta', 'llévame a mi perfil', 'enséñame mi perfil'],
    },
    {
      intent: 'philosophy_detail',
      label: 'Mi pensamiento filosófico (detalle)',
      route: '/philosophy-profile',
      examples: [
        'mi clan',
        'mis porcentajes',
        'mi pensamiento filosófico',
        'detalle de mi filosofía',
        'mi corriente filosófica',
      ],
    },
    {
      intent: 'create_reflection',
      label: 'Nueva reflexión',
      route: '/reflection',
      examples: [
        'nueva reflexión',
        'crear reflexión',
        'escribir una reflexión',
        'quiero reflexionar',
        'publicar un pensamiento',
      ],
    },
    {
      intent: 'create_phrase',
      label: 'Nueva frase',
      route: '/phrase',
      examples: [
        'nueva frase',
        'crear frase',
        'compartir una cita',
        'añadir una frase filosófica',
        'publicar una frase',
      ],
    },
    {
      intent: 'notifications',
      label: 'Notificaciones',
      route: '/notifications',
      examples: ['notificaciones', 'avisos', 'novedades', 'mis notificaciones'],
    },
    {
      intent: 'messages',
      label: 'Mensajes',
      route: '/messages',
      examples: ['mensajes', 'chats', 'conversaciones', 'abre mis mensajes'],
    },
    {
      intent: 'settings',
      label: 'Ajustes',
      route: '/settings',
      examples: ['ajustes', 'configuración', 'opciones', 'preferencias'],
    },
    {
      intent: 'voice_settings',
      label: 'Voz del asistente',
      route: '/settings-voice-assistant',
      examples: ['cambiar tu voz', 'voz del asistente', 'quiero otra voz', 'ajustes de voz'],
    },
    {
      intent: 'phrases_unlocked',
      label: 'Frases desbloqueadas (base de datos de frases)',
      route: '/phrases-domains',
      examples: [
        'mis frases desbloqueadas',
        'base de datos de frases',
        'frases que he desbloqueado',
        'abre las frases',
        'el lápiz',
      ],
    },
    {
      intent: 'account_email',
      label: 'Ajustes — Correo electrónico',
      route: '/account-email',
      examples: [
        'cambiar mi correo',
        'mi correo electrónico',
        'ajustes de email',
        'cambiar el email de mi cuenta',
      ],
    },
    {
      intent: 'account_password',
      label: 'Ajustes — Contraseña',
      route: '/account-password',
      examples: ['cambiar mi contraseña', 'ajustes de contraseña', 'quiero otra contraseña'],
    },
    {
      intent: 'streak',
      label: 'Racha',
      route: '/racha',
      examples: ['mi racha', 'racha de días', 'cuántos días llevo'],
    },
    {
      intent: 'daily_uses',
      label: 'Usos diarios de IA',
      route: '/daily-uses',
      examples: ['mis usos', 'usos diarios', 'cuántos usos me quedan'],
    },
    {
      intent: 'back',
      label: 'Volver atrás',
      route: 'BACK',
      examples: ['volver', 'atrás', 'pantalla anterior', 'regresa', 'vuelve'],
    },
  ],

  // v2 Sprint 1: interacciones simples sobre el post visible (sin confirmación).
  // Acciones con confirmación (repost, follow, publicar…) llegan en Sprint 4.
  actions: [
    {
      intent: 'like_post',
      label: 'Dar like a publicación',
      category: 'interaction',
      handler: 'likeVisiblePost',
      requireConfirmation: false,
      parameters: {},
      contextRequirements: { requiresVisiblePost: true, requiresAuth: true },
      idempotencyCheck: 'isPostAlreadyLiked',
      examples: [
        'dale like',
        'me gusta esto',
        'reacciona positivamente',
        'me encanta esto',
        'pon un me gusta',
        'corazón a esta publicación',
        'like a este post',
        'vota positivo',
      ],
    },
    {
      intent: 'unlike_post',
      label: 'Quitar like de publicación',
      category: 'interaction',
      handler: 'unlikeVisiblePost',
      requireConfirmation: false,
      parameters: {},
      contextRequirements: { requiresVisiblePost: true, requiresAuth: true },
      idempotencyCheck: 'isPostNotLiked',
      examples: [
        'quita el like',
        'ya no me gusta',
        'retira mi like',
        'quítale el me gusta',
        'deshaz el like',
      ],
    },
    {
      intent: 'save_post',
      label: 'Guardar publicación',
      category: 'interaction',
      handler: 'saveVisiblePost',
      requireConfirmation: false,
      parameters: {},
      contextRequirements: { requiresVisiblePost: true, requiresAuth: true },
      idempotencyCheck: 'isPostAlreadySaved',
      examples: [
        'guarda esto',
        'guárdame esta publicación',
        'añade a guardados',
        'guardar para después',
        'bookmark esto',
      ],
    },
    {
      intent: 'unsave_post',
      label: 'Quitar de guardados',
      category: 'interaction',
      handler: 'unsaveVisiblePost',
      requireConfirmation: false,
      parameters: {},
      contextRequirements: { requiresVisiblePost: true, requiresAuth: true },
      idempotencyCheck: 'isPostNotSaved',
      examples: [
        'quita de guardados',
        'elimina de guardados',
        'ya no la quiero guardar',
        'desguardar',
        'quítala de mis guardados',
      ],
    },

    {
      intent: 'pause_music',
      label: 'Pausar la música de la publicación',
      category: 'interaction',
      handler: 'pauseFeedMusic',
      requireConfirmation: false,
      parameters: {},
      // No exige post en el snapshot: la música es estado vivo del reproductor
      // global; el handler comprueba si hay pista sonando.
      contextRequirements: { requiresAuth: true },
      idempotencyCheck: 'isMusicAlreadyPaused',
      examples: [
        'pausa la música',
        'para la música',
        'quita la canción',
        'silencia la música',
        'detén la música',
      ],
    },
    {
      intent: 'resume_music',
      label: 'Reanudar la música de la publicación',
      category: 'interaction',
      handler: 'resumeFeedMusic',
      requireConfirmation: false,
      parameters: {},
      contextRequirements: { requiresAuth: true },
      idempotencyCheck: 'isMusicAlreadyPlaying',
      examples: [
        'reanuda la música',
        'pon la música otra vez',
        'dale play a la música',
        'que vuelva a sonar la canción',
        'quita la pausa de la música',
      ],
    },

    // ── v2 Sprint 2: configuración (privacidad, voz, notificaciones) ─────────
    {
      intent: 'make_account_public',
      label: 'Hacer cuenta pública',
      category: 'config',
      handler: 'setAccountPrivacy',
      requireConfirmation: true,
      confirmationMessageTemplate:
        '¿Seguro que quieres hacer tu cuenta pública? Cualquier persona podrá ver tus publicaciones y tu perfil.',
      parameters: {
        isPrivate: {
          type: 'boolean',
          required: true,
          description: 'false para hacer la cuenta pública',
        },
      },
      contextRequirements: { requiresAuth: true },
      idempotencyCheck: 'isAccountAlreadyPublic',
      examples: [
        'haz mi cuenta pública',
        'quita la privacidad',
        'que todos vean mi perfil',
        'desactiva la cuenta privada',
        'cuenta pública',
      ],
    },
    {
      intent: 'make_account_private',
      label: 'Hacer cuenta privada',
      category: 'config',
      handler: 'setAccountPrivacy',
      requireConfirmation: true,
      confirmationMessageTemplate:
        '¿Seguro que quieres hacer tu cuenta privada? Solo tus seguidores aprobados podrán ver tus publicaciones.',
      parameters: {
        isPrivate: {
          type: 'boolean',
          required: true,
          description: 'true para hacer la cuenta privada',
        },
      },
      contextRequirements: { requiresAuth: true },
      idempotencyCheck: 'isAccountAlreadyPrivate',
      examples: [
        'haz mi cuenta privada',
        'activa la privacidad',
        'que solo mis seguidores vean mi perfil',
        'pon mi cuenta en privado',
        'cuenta privada',
      ],
    },
    {
      intent: 'change_assistant_voice',
      label: 'Cambiar voz del asistente',
      category: 'config',
      handler: 'changeAssistantVoice',
      requireConfirmation: false,
      parameters: {
        voiceId: {
          type: 'string',
          required: false,
          description:
            'Voz deseada: "jane" (femenina, cálida) o "fyodor" (masculina, grave). Vacío si el usuario no especifica cuál (se alterna a la otra).',
        },
      },
      contextRequirements: { requiresAuth: true },
      // Sin idempotencyCheck: el handler ya lee la voz actual para alternar y
      // resuelve él mismo el caso "esa voz ya está activa".
      examples: [
        'cambia tu voz',
        'usa la voz de Fyodor',
        'cambia a Jane',
        'quiero la otra voz',
        'pon la voz masculina',
        'pon la voz femenina',
      ],
    },
    {
      intent: 'enable_notifications',
      label: 'Activar notificaciones',
      category: 'config',
      handler: 'toggleNotifications',
      requireConfirmation: false,
      parameters: {
        enabled: { type: 'boolean', required: true, description: 'true para activar' },
      },
      contextRequirements: { requiresAuth: true },
      idempotencyCheck: 'areNotificationsAlreadyEnabled',
      examples: [
        'activa las notificaciones',
        'enciende los avisos',
        'quiero recibir notificaciones',
      ],
    },
    {
      intent: 'disable_notifications',
      label: 'Desactivar notificaciones',
      category: 'config',
      handler: 'toggleNotifications',
      requireConfirmation: false,
      parameters: {
        enabled: { type: 'boolean', required: true, description: 'false para desactivar' },
      },
      contextRequirements: { requiresAuth: true },
      idempotencyCheck: 'areNotificationsAlreadyDisabled',
      examples: [
        'desactiva las notificaciones',
        'apaga los avisos',
        'no quiero notificaciones',
        'silencia las notificaciones',
      ],
    },

    // ── v2 Sprint 3: creación con prefill (NUNCA publica; el usuario revisa) ──
    {
      intent: 'create_reflection_prefill',
      label: 'Crear reflexión con contenido',
      category: 'content',
      handler: 'prefillReflection',
      requireConfirmation: false,
      parameters: {
        content: {
          type: 'string',
          required: false,
          description:
            'Texto de partida o tema de la reflexión, extraído de lo que dijo el usuario (nunca generado por ti)',
        },
      },
      contextRequirements: { requiresAuth: true },
      examples: [
        'escribe una reflexión sobre la libertad',
        'nueva reflexión que diga',
        'quiero reflexionar sobre',
        'ayúdame a escribir una reflexión',
      ],
    },
    {
      intent: 'create_phrase_prefill',
      label: 'Crear frase con contenido',
      category: 'content',
      handler: 'prefillPhrase',
      requireConfirmation: false,
      parameters: {
        phraseText: {
          type: 'string',
          required: false,
          description: 'Texto literal de la frase que dijo el usuario',
        },
        author: {
          type: 'string',
          required: false,
          description: 'Autor de la frase si el usuario lo menciona',
        },
      },
      contextRequirements: { requiresAuth: true },
      examples: [
        'comparte la frase el hombre es la medida de todas las cosas de Protágoras',
        'nueva frase de Nietzsche que diga',
        'quiero publicar una frase que dice',
      ],
    },
    {
      intent: 'create_comment_prefill',
      label: 'Comentar publicación con texto',
      category: 'content',
      handler: 'prefillComment',
      requireConfirmation: false,
      parameters: {
        commentText: {
          type: 'string',
          required: true,
          description: 'Texto del comentario que dijo el usuario, literal',
        },
      },
      contextRequirements: { requiresVisiblePost: true, requiresAuth: true },
      examples: [
        'comenta gran reflexión',
        'responde a esto diciendo que estoy de acuerdo',
        'escribe un comentario que diga',
        'coméntale qué interesante',
      ],
    },

    // ── v2 Sprint 4: relaciones, repost y sesión ─────────────────────────────
    {
      intent: 'follow_user',
      label: 'Seguir al usuario del perfil visible',
      category: 'relationship',
      handler: 'followVisibleProfile',
      requireConfirmation: false,
      parameters: {
        targetUsername: {
          type: 'string',
          required: false,
          description:
            'Nombre que dijo el usuario (informativo; la acción opera sobre el perfil visible)',
        },
      },
      contextRequirements: { requiresVisibleProfile: true, requiresAuth: true },
      idempotencyCheck: 'isAlreadyFollowingProfile',
      examples: [
        'sigue a este usuario',
        'síguelo',
        'quiero seguir a esta persona',
        'dale a seguir',
      ],
    },
    {
      intent: 'unfollow_user',
      label: 'Dejar de seguir al usuario del perfil visible',
      category: 'relationship',
      handler: 'unfollowVisibleProfile',
      requireConfirmation: true,
      confirmationMessageTemplate: '¿Seguro que quieres dejar de seguir a este usuario?',
      parameters: {
        targetUsername: {
          type: 'string',
          required: false,
          description:
            'Nombre que dijo el usuario (informativo; la acción opera sobre el perfil visible)',
        },
      },
      contextRequirements: { requiresVisibleProfile: true, requiresAuth: true },
      idempotencyCheck: 'isNotFollowingProfile',
      examples: [
        'deja de seguir a este usuario',
        'deja de seguirlo',
        'unfollow',
        'ya no quiero seguirle',
      ],
    },
    {
      intent: 'block_user',
      label: 'Bloquear al usuario del perfil visible',
      category: 'relationship',
      handler: 'blockVisibleProfile',
      requireConfirmation: true,
      doubleConfirmation: true,
      confirmationMessageTemplate:
        '¿Seguro que quieres bloquear a este usuario? Esto impedirá toda interacción entre vosotros.',
      parameters: {
        targetUsername: {
          type: 'string',
          required: false,
          description:
            'Nombre que dijo el usuario (informativo; la acción opera sobre el perfil visible)',
        },
      },
      contextRequirements: { requiresVisibleProfile: true, requiresAuth: true },
      idempotencyCheck: 'isProfileAlreadyBlocked',
      examples: [
        'bloquea a este usuario',
        'bloquéalo',
        'no quiero ver nada de esta persona',
      ],
    },
    {
      intent: 'report_post',
      label: 'Denunciar la publicación visible',
      category: 'interaction',
      handler: 'reportVisiblePost',
      // El modal de denuncia (elegir motivo) YA es la confirmación.
      requireConfirmation: false,
      parameters: {},
      contextRequirements: { requiresVisiblePost: true, requiresAuth: true },
      examples: [
        'denuncia esto',
        'denuncia esta publicación',
        'reporta este post',
        'esto incumple las normas',
      ],
    },
    {
      intent: 'repost_post',
      label: 'Republicar la publicación visible',
      category: 'interaction',
      handler: 'repostVisiblePost',
      requireConfirmation: true,
      confirmationMessageTemplate: '¿Quieres republicar esta publicación en tu perfil?',
      parameters: {},
      contextRequirements: { requiresVisiblePost: true, requiresAuth: true },
      idempotencyCheck: 'isPostAlreadyReposted',
      examples: [
        'republica esto',
        'comparte esto en mi feed',
        'haz repost',
        'repostea esta publicación',
      ],
    },
    {
      intent: 'logout',
      label: 'Cerrar sesión',
      category: 'config',
      handler: 'logout',
      requireConfirmation: true,
      confirmationMessageTemplate: '¿Seguro que quieres cerrar sesión?',
      parameters: {},
      contextRequirements: { requiresAuth: true },
      examples: ['cierra sesión', 'cerrar sesión', 'salir de mi cuenta', 'log out'],
    },

    // ── v2 Sprint 5: búsqueda y perfiles por nombre ──────────────────────────
    {
      intent: 'find_user_profile',
      label: 'Ir al perfil de un usuario por nombre',
      category: 'navigation',
      handler: 'findUserProfile',
      requireConfirmation: false,
      parameters: {
        searchQuery: {
          type: 'string',
          required: true,
          description: 'Nombre o username que dijo el usuario (sin la arroba)',
        },
      },
      contextRequirements: { requiresAuth: true },
      examples: [
        'llévame al perfil de Marco',
        'abre el perfil de @sofia',
        'busca a Lucía y abre su perfil',
        've al perfil de ese usuario que se llama Andrés',
      ],
    },
    {
      intent: 'search_content',
      label: 'Buscar con texto pre-rellenado',
      category: 'navigation',
      handler: 'openSearchWithQuery',
      requireConfirmation: false,
      parameters: {
        searchQuery: {
          type: 'string',
          required: true,
          description: 'Texto a buscar (en Evo la búsqueda cubre usuarios y clanes)',
        },
      },
      contextRequirements: { requiresAuth: true },
      examples: [
        'busca usuarios que se llamen Pablo',
        'busca estoicos',
        'encuentra gente del clan humanista',
      ],
    },
  ],

  policies: {
    requireConfirmationForDestructive: true,
    // El orbe solo se muestra con sesión iniciada, así que esto es informativo.
    allowedWithoutAuth: [],
    contextRetentionTurns: 3,
  },
};

/** Payload compacto del manifest que viaja al backend en cada turno. */
export function manifestRoutesForBackend(): Array<{
  intent: string;
  label: string;
  examples: string[];
}> {
  return evoManifest.routes.map((r) => ({
    intent: r.intent,
    label: r.label,
    examples: r.examples,
  }));
}

/**
 * Payload compacto de las acciones del manifest para el backend.
 * - `requires_visible_post` permite al LLM avisar si el contexto no cumple
 *   ("para dar like, abre primero una publicación") sin ejecutar.
 * - `requires_confirmation` + `confirmation_message` instruyen al LLM para
 *   incluir la confirmación en su respuesta (el cliente la exige igualmente
 *   desde el manifest, pase lo que pase con el LLM).
 * - `parameters` (nombre → descripción) para que el LLM sepa qué rellenar.
 */
export function manifestActionsForBackend(): Array<{
  intent: string;
  label: string;
  examples: string[];
  requires_visible_post: boolean;
  requires_visible_profile?: boolean;
  requires_confirmation: boolean;
  confirmation_message?: string;
  parameters?: Record<string, string>;
}> {
  return evoManifest.actions.map((a) => {
    const paramEntries = Object.entries(a.parameters);
    return {
      intent: a.intent,
      label: a.label,
      examples: a.examples,
      requires_visible_post: a.contextRequirements?.requiresVisiblePost === true,
      ...(a.contextRequirements?.requiresVisibleProfile === true
        ? { requires_visible_profile: true }
        : {}),
      requires_confirmation: a.requireConfirmation,
      ...(a.confirmationMessageTemplate
        ? { confirmation_message: a.confirmationMessageTemplate }
        : {}),
      ...(paramEntries.length > 0
        ? {
            parameters: Object.fromEntries(
              paramEntries.map(([name, spec]) => [
                name,
                `${spec.type}${spec.required ? '' : ' (opcional)'} — ${spec.description}`,
              ]),
            ),
          }
        : {}),
    };
  });
}
