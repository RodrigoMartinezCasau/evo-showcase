/**
 * Tests unitarios del núcleo del agente (sin React Native, sin red).
 * Ejecutar:  npx --yes tsx mobile/src/agent/core/__tests__/run_agent_core_tests.ts
 */
import {
  hasConsentedToAssistant,
  grantAssistantConsent,
  revokeAssistantConsent,
  type ConsentStorage,
} from '../consent';
import {
  combineContexts,
  truncateContext,
  MAX_CONTEXT_CHARS,
  TRUNCATION_SUFFIX,
} from '../contextLimits';
import { sanitizeForLLM } from '../sanitization';
import {
  buildFeedScreenContextText,
  clipPostPreview,
  getFocusedPost,
  selectMostCentered,
  MAX_VISIBLE_POSTS,
  MAX_POST_PREVIEW_CHARS,
  type FeedScreenContext,
  type VisiblePost,
} from '../feedContext';
import {
  precheckManifestAction,
  runManifestAction,
  validateActionContext,
  type ActionRegistries,
} from '../actionEngine';
import { parseAgentAction, type AgentScreenContext } from '../types';
import type { ActionIntent } from '../../manifest/types';
import {
  setAgentInteractionBridge,
  type AgentInteractionBridge,
} from '../../handlers/interactionBridge';
import {
  likeVisiblePostHandler,
  saveVisiblePostHandler,
  unlikeVisiblePostHandler,
  unsaveVisiblePostHandler,
} from '../../handlers/interactions/visiblePostActions';
import {
  isPostAlreadyLiked,
  isPostAlreadySaved,
  isPostNotLiked,
  isPostNotSaved,
} from '../../handlers/interactions/idempotency';
import {
  setAgentConfigBridge,
  type AgentConfigBridge,
  type NotificationsPermission,
} from '../../handlers/configBridge';
import { setAccountPrivacyHandler } from '../../handlers/config/setAccountPrivacy';
import {
  changeAssistantVoiceHandler,
  normalizeRequestedVoiceId,
} from '../../handlers/config/changeAssistantVoice';
import { toggleNotificationsHandler } from '../../handlers/config/toggleNotifications';
import {
  areNotificationsAlreadyDisabled,
  areNotificationsAlreadyEnabled,
  isAccountAlreadyPrivate,
  isAccountAlreadyPublic,
} from '../../handlers/config/idempotency';

let passed = 0;

function check(name: string, cond: boolean, detail?: string) {
  if (!cond) throw new Error(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  passed += 1;
  console.log(`  ok: ${name}`);
}

function memoryStorage(): ConsentStorage {
  const map = new Map<string, string>();
  return {
    getItem: async (k) => map.get(k) ?? null,
    setItem: async (k, v) => void map.set(k, v),
    removeItem: async (k) => void map.delete(k),
  };
}

async function main() {
  // ── U1: consentimiento ──────────────────────────────────────────────────────
  const storage = memoryStorage();
  check('consent: false al inicio', (await hasConsentedToAssistant(storage)) === false);
  await grantAssistantConsent(storage);
  check('consent: true tras aceptar', (await hasConsentedToAssistant(storage)) === true);
  await revokeAssistantConsent(storage);
  check('consent: false tras revocar', (await hasConsentedToAssistant(storage)) === false);

  const broken: ConsentStorage = {
    getItem: async () => {
      throw new Error('storage roto');
    },
    setItem: async () => {},
    removeItem: async () => {},
  };
  check('consent: fail-closed si el storage falla', (await hasConsentedToAssistant(broken)) === false);

  // ── U2: tope de contexto ────────────────────────────────────────────────────
  check('truncate: texto corto intacto', truncateContext('hola', 100) === 'hola');
  const long = 'x'.repeat(2000);
  const truncated = truncateContext(long);
  check('truncate: respeta MAX_CONTEXT_CHARS', truncated.length === MAX_CONTEXT_CHARS);
  check('truncate: añade sufijo', truncated.endsWith(TRUNCATION_SUFFIX));

  const user = 'Datos del usuario: clan Humanista 24%';
  const bigScreen = 'Publicación: ' + 'y'.repeat(3000);
  const combined = combineContexts(user, bigScreen);
  check('combine: no nulo', combined !== null);
  check('combine: respeta límite total', (combined as string).length <= MAX_CONTEXT_CHARS);
  check('combine: usuario íntegro al principio', (combined as string).startsWith(user));
  check('combine: pantalla recortada con sufijo', (combined as string).endsWith(TRUNCATION_SUFFIX));
  check('combine: null si no hay nada', combineContexts(null, null) === null);
  check('combine: solo usuario', combineContexts(user, null) === user);
  check('combine: solo pantalla', combineContexts(null, 'abc') === 'abc');

  // ── U3: saneado ─────────────────────────────────────────────────────────────
  const email = sanitizeForLLM('Contacta a juan@example.com');
  check('sanitize: email', email.sanitized === 'Contacta a [REDACTADO_EMAIL]', email.sanitized);
  check('sanitize: email registrado', email.redactions.includes('email'));

  const phone = sanitizeForLLM('Mi número es +34 612 345 678');
  check(
    'sanitize: teléfono español',
    phone.sanitized === 'Mi número es [REDACTADO_TELÉFONO]',
    phone.sanitized,
  );

  const likes = sanitizeForLLM('He recibido 100 likes');
  check('sanitize: dígitos normales intactos', likes.sanitized === 'He recibido 100 likes');
  check('sanitize: sin redacciones en texto limpio', likes.redactions.length === 0);

  const card = sanitizeForLLM('Tarjeta: 4111 1111 1111 1111');
  check('sanitize: tarjeta', card.sanitized === 'Tarjeta: [REDACTADO_TARJETA]', card.sanitized);

  const iban = sanitizeForLLM('Cuenta ES91 2100 0418 4502 0005 1332 ok');
  check('sanitize: IBAN', iban.sanitized === 'Cuenta [REDACTADO_IBAN] ok', iban.sanitized);

  const dni = sanitizeForLLM('DNI 12345678Z del usuario');
  check('sanitize: DNI', dni.sanitized === 'DNI [REDACTADO_DNI] del usuario', dni.sanitized);

  const combo = sanitizeForLLM('Email a@b.es, tel +34 600 111 222, DNI 12345678Z');
  check(
    'sanitize: combinada (3 tipos)',
    combo.redactions.includes('email') &&
      combo.redactions.includes('phone') &&
      combo.redactions.includes('dni'),
    JSON.stringify(combo),
  );
  check('sanitize: combinada sin restos', !/a@b\.es|600 111 222|12345678Z/.test(combo.sanitized));

  // ── Bloque B: publicaciones visibles en el feed ─────────────────────────────
  const makePost = (n: number, overrides: Partial<VisiblePost> = {}): VisiblePost => ({
    post_id: `post-${n}`,
    post_type: n % 2 === 0 ? 'phrase' : 'reflection',
    author_username: `usuario${n}`,
    author_clan: 'Humanista',
    content_preview: `Contenido del post número ${n}`,
    has_image: false,
    likes_count: n,
    created_at_relative: 'hace 2 h',
    ...overrides,
  });

  check(
    'feed: selectMostCentered no recorta si caben',
    selectMostCentered([1, 2, 3]).length === 3,
  );
  const nine = Array.from({ length: 9 }, (_, i) => i);
  const centered = selectMostCentered(nine);
  check('feed: limita a MAX_VISIBLE_POSTS', centered.length === MAX_VISIBLE_POSTS);
  check('feed: centra la ventana', centered[0] === 2 && centered[4] === 6, String(centered));
  const focusedSel = selectMostCentered(nine, 8);
  check('feed: ventana alrededor del foco', focusedSel.includes(8), String(focusedSel));

  const longContent = 'palabra '.repeat(60);
  const clipped = clipPostPreview(longContent);
  check('feed: preview limitada a 200 chars', clipped.length <= MAX_POST_PREVIEW_CHARS);
  check('feed: preview corta intacta', clipPostPreview('hola mundo') === 'hola mundo');

  const emptyText = buildFeedScreenContextText({
    type: 'feed',
    feedType: 'para-ti',
    visiblePosts: [],
  });
  check('feed: vacío explícito', emptyText.includes('Todavía no hay publicaciones cargadas'));

  const sevenPosts = Array.from({ length: 7 }, (_, i) => makePost(i));
  const feedText = buildFeedScreenContextText({
    type: 'feed',
    feedType: 'siguiendo',
    visiblePosts: sevenPosts,
    focusedPostIndex: 3,
  });
  check(
    'feed: texto incluye solo 5 posts',
    (feedText.match(/\[post_id:/g) ?? []).length === MAX_VISIBLE_POSTS,
    feedText,
  );
  check('feed: marca el post enfocado', feedText.includes('[POST EN PANTALLA AHORA]'));
  check('feed: incluye autor y métricas', /@usuario3 \(.*votos positivos/.test(feedText));
  check('feed: nombra el feed', feedText.includes('«Siguiendo»'));

  const withImage = buildFeedScreenContextText({
    type: 'feed',
    feedType: 'para-ti',
    visiblePosts: [makePost(1, { has_image: true, content_preview: longContent })],
  });
  check('feed: metadato de imagen', withImage.includes('con imagen adjunta'));
  check(
    'feed: preview recortada dentro del texto',
    !withImage.includes(longContent.trim().replace(/\s+/g, ' ')),
  );

  // ── Sprint 1 (v2): motor de acciones ────────────────────────────────────────
  const feedCtx = (posts: VisiblePost[], focusedPostIndex?: number): AgentScreenContext => ({
    feed: { type: 'feed', feedType: 'para-ti', visiblePosts: posts, focusedPostIndex },
  });

  check('focused: null sin feed', getFocusedPost(undefined) === null);
  check('focused: null con feed vacío', getFocusedPost(feedCtx([]).feed as FeedScreenContext) === null);
  check(
    'focused: usa focusedPostIndex',
    getFocusedPost(feedCtx([makePost(0), makePost(1)], 1).feed)?.post_id === 'post-1',
  );
  check(
    'focused: primero visible sin índice',
    getFocusedPost(feedCtx([makePost(0), makePost(1)]).feed)?.post_id === 'post-0',
  );
  check(
    'focused: índice fuera de rango cae al primero',
    getFocusedPost(feedCtx([makePost(0)], 7).feed)?.post_id === 'post-0',
  );

  const testAction: ActionIntent = {
    intent: 'like_post',
    label: 'Dar like',
    category: 'interaction',
    handler: 'likeVisiblePost',
    requireConfirmation: false,
    parameters: {},
    contextRequirements: { requiresVisiblePost: true, requiresAuth: true },
    idempotencyCheck: 'isPostAlreadyLiked',
    examples: ['dale like'],
  };

  const ctxOk = validateActionContext(testAction, feedCtx([makePost(0)]));
  check('engine: contexto válido con post visible', ctxOk.ok === true);
  const ctxKo = validateActionContext(testAction, {});
  check('engine: contexto inválido sin post', ctxKo.ok === false);
  check(
    'engine: userMessage para el usuario',
    !ctxKo.ok && ctxKo.userMessage.includes('publicación'),
  );

  let handlerCalls = 0;
  const makeRegistries = (alreadyApplied: boolean): ActionRegistries => ({
    handlers: {
      likeVisiblePost: async () => {
        handlerCalls += 1;
        return { success: true, message: 'Listo, le he dado like.' };
      },
    },
    idempotencyCheckers: {
      isPostAlreadyLiked: async () => ({
        alreadyApplied,
        message: alreadyApplied ? 'Ya le habías dado like a esta publicación.' : undefined,
      }),
    },
  });

  const execAction = { type: 'execute' as const, intent: 'like_post' };
  const okRun = await runManifestAction(execAction, [testAction], feedCtx([makePost(0)]), makeRegistries(false));
  check('engine: ejecuta el handler', okRun.success === true && handlerCalls === 1);

  const idemRun = await runManifestAction(execAction, [testAction], feedCtx([makePost(0)]), makeRegistries(true));
  check('engine: idempotencia evita el handler', idemRun.idempotent === true && handlerCalls === 1);
  check('engine: mensaje de idempotencia', idemRun.message === 'Ya le habías dado like a esta publicación.');

  const unknownRun = await runManifestAction(
    { type: 'execute', intent: 'inventado' },
    [testAction],
    feedCtx([makePost(0)]),
    makeRegistries(false),
  );
  check('engine: intent desconocido → error sin crashear', unknownRun.success === false);

  const noCtxRun = await runManifestAction(execAction, [testAction], {}, makeRegistries(false));
  check('engine: contexto incumplido → error con mensaje', noCtxRun.success === false && !!noCtxRun.message);
  check('engine: contexto incumplido NO llama al handler', handlerCalls === 1);

  const throwingRegistries: ActionRegistries = {
    handlers: {
      likeVisiblePost: async () => {
        throw new Error('boom');
      },
    },
    idempotencyCheckers: {},
  };
  const throwRun = await runManifestAction(execAction, [testAction], feedCtx([makePost(0)]), throwingRegistries);
  check('engine: handler que lanza → degrada a error', throwRun.success === false && !!throwRun.message);

  // ── Sprint 1 (v2): handlers reales con puente falso ─────────────────────────
  const makeBridge = () => {
    const votes = new Map<string, 'up' | 'down' | null>();
    const saved = new Set<string>();
    const known = new Set(['post-0', 'post-1']);
    const bridge: AgentInteractionBridge = {
      getMyVote: (id) => votes.get(id) ?? null,
      setVote: (id, to) => void votes.set(id, to),
      isSaved: (id) => saved.has(id),
      savePost: (id) => {
        if (!known.has(id)) return false;
        saved.add(id);
        return true;
      },
      unsavePost: (id) => void saved.delete(id),
    };
    return { bridge, votes, saved };
  };

  const fake = makeBridge();
  setAgentInteractionBridge(fake.bridge);
  const ctx0 = feedCtx([makePost(0), makePost(1)], 0);

  const like = await likeVisiblePostHandler({}, ctx0);
  check('like: success + voto up', like.success === true && fake.votes.get('post-0') === 'up');
  check('like: data.post_id', like.data?.post_id === 'post-0');
  check('like: idempotencia detecta like', (await isPostAlreadyLiked(ctx0)).alreadyApplied === true);
  check('unlike: idempotencia ve like presente', (await isPostNotLiked(ctx0)).alreadyApplied === false);

  const unlike = await unlikeVisiblePostHandler({}, ctx0);
  check('unlike: success + voto null', unlike.success === true && fake.votes.get('post-0') === null);
  check('unlike: idempotencia sin like', (await isPostNotLiked(ctx0)).alreadyApplied === true);

  const save = await saveVisiblePostHandler({}, ctx0);
  check('save: success + guardado', save.success === true && fake.saved.has('post-0'));
  check('save: idempotencia detecta guardado', (await isPostAlreadySaved(ctx0)).alreadyApplied === true);

  const unsave = await unsaveVisiblePostHandler({}, ctx0);
  check('unsave: success + quitado', unsave.success === true && !fake.saved.has('post-0'));
  check('unsave: idempotencia sin guardado', (await isPostNotSaved(ctx0)).alreadyApplied === true);

  const ghostCtx = feedCtx([makePost(99)], 0);
  const saveGhost = await saveVisiblePostHandler({}, ghostCtx);
  check('save: post inexistente → error con mensaje', saveGhost.success === false && !!saveGhost.message);

  setAgentInteractionBridge(null);
  const noBridge = await likeVisiblePostHandler({}, ctx0);
  check('handlers: sin puente → error con mensaje', noBridge.success === false && !!noBridge.message);
  const noBridgeIdem = await isPostAlreadyLiked(ctx0);
  check('idempotencia: sin puente → no bloquea', noBridgeIdem.alreadyApplied === false);

  const noPost = await likeVisiblePostHandler({}, {});
  check('handlers: sin post visible → error con mensaje', noPost.success === false && !!noPost.message);

  // ── Sprint 2 (v2): parse de confirmación ────────────────────────────────────
  const confirmedAction = parseAgentAction({
    type: 'execute',
    intent: 'make_account_private',
    parameters: { isPrivate: true },
    requireConfirmation: true,
    confirmationMessage: '¿Seguro que quieres hacer tu cuenta privada?',
  });
  check('parse: preserva requireConfirmation', confirmedAction?.requireConfirmation === true);
  check(
    'parse: preserva confirmationMessage',
    confirmedAction?.confirmationMessage === '¿Seguro que quieres hacer tu cuenta privada?',
  );
  const noConfirmAction = parseAgentAction({ type: 'execute', intent: 'like_post' });
  check('parse: sin confirmación → undefined', noConfirmAction?.requireConfirmation === undefined);
  const junkConfirm = parseAgentAction({
    type: 'execute',
    intent: 'like_post',
    requireConfirmation: 'yes',
    confirmationMessage: '   ',
  });
  check(
    'parse: confirmación con tipos basura → undefined',
    junkConfirm?.requireConfirmation === undefined && junkConfirm?.confirmationMessage === undefined,
  );

  // ── Sprint 2 (v2): precheck (contexto + idempotencia, sin ejecutar) ─────────
  handlerCalls = 0;
  const preReady = await precheckManifestAction(
    execAction,
    [testAction],
    feedCtx([makePost(0)]),
    makeRegistries(false),
  );
  check('precheck: ready si todo cumple', preReady.kind === 'ready' && handlerCalls === 0);
  const preIdem = await precheckManifestAction(
    execAction,
    [testAction],
    feedCtx([makePost(0)]),
    makeRegistries(true),
  );
  check(
    'precheck: done idempotente sin llamar handler',
    preIdem.kind === 'done' && preIdem.result.idempotent === true && handlerCalls === 0,
  );
  const preNoCtx = await precheckManifestAction(execAction, [testAction], {}, makeRegistries(false));
  check(
    'precheck: done con error si falta contexto',
    preNoCtx.kind === 'done' && preNoCtx.result.success === false && !!preNoCtx.result.message,
  );

  // ── Sprint 2 (v2): engine pasa el intent al handler ─────────────────────────
  let intentSeen: string | undefined;
  const intentRegistries: ActionRegistries = {
    handlers: {
      likeVisiblePost: async (_p, _c, intent) => {
        intentSeen = intent;
        return { success: true };
      },
    },
    idempotencyCheckers: {},
  };
  await runManifestAction(execAction, [testAction], feedCtx([makePost(0)]), intentRegistries);
  check('engine: handler recibe el intent del manifest', intentSeen === 'like_post');

  // ── Sprint 2 (v2): handlers de configuración con puente falso ───────────────
  const makeConfigBridge = (init: {
    isPrivate: boolean | null;
    voice: string;
    notifs: boolean;
    permission: NotificationsPermission;
    failPrivacyWrite?: boolean;
  }) => {
    const state = { ...init };
    const bridge: AgentConfigBridge = {
      getIsPrivate: () => state.isPrivate,
      setAccountPrivacy: async (v) => {
        if (state.failPrivacyWrite) return false;
        state.isPrivate = v;
        return true;
      },
      getAssistantVoice: () => state.voice,
      setAssistantVoice: (id) => void (state.voice = id),
      getNotificationsEnabled: async () => state.notifs,
      setNotificationsEnabled: async (v) => void (state.notifs = v),
      ensureNotificationsSystemPermission: async () => state.permission,
    };
    return { bridge, state };
  };

  // Privacidad: el intent manda sobre el parámetro del LLM.
  const cfg1 = makeConfigBridge({ isPrivate: false, voice: 'nova', notifs: true, permission: 'granted' });
  setAgentConfigBridge(cfg1.bridge);
  const toPrivate = await setAccountPrivacyHandler(
    { isPrivate: false }, // parámetro contradictorio a propósito
    {},
    'make_account_private',
  );
  check('privacy: intent gana al parámetro', toPrivate.success === true && cfg1.state.isPrivate === true);
  check('privacy: mensaje de privada', toPrivate.message === 'Hecho, tu cuenta ahora es privada.');
  check('privacy: ya privada (idempotencia)', (await isAccountAlreadyPrivate({})).alreadyApplied === true);
  check('privacy: no es pública', (await isAccountAlreadyPublic({})).alreadyApplied === false);

  const toPublic = await setAccountPrivacyHandler({}, {}, 'make_account_public');
  check('privacy: a pública por intent', toPublic.success === true && cfg1.state.isPrivate === false);
  check('privacy: ya pública (idempotencia)', (await isAccountAlreadyPublic({})).alreadyApplied === true);

  const cfgFail = makeConfigBridge({
    isPrivate: false,
    voice: 'nova',
    notifs: true,
    permission: 'granted',
    failPrivacyWrite: true,
  });
  setAgentConfigBridge(cfgFail.bridge);
  const privFail = await setAccountPrivacyHandler({}, {}, 'make_account_private');
  check('privacy: escritura fallida → error con mensaje', privFail.success === false && !!privFail.message);

  // Voz: especificada, alternar, ya activa, desconocida.
  check('voice: normaliza fyodor', normalizeRequestedVoiceId('Fyodor') === 'onyx');
  check('voice: normaliza masculina', normalizeRequestedVoiceId('masculina') === 'onyx');
  check('voice: normaliza jane con acento raro', normalizeRequestedVoiceId(' JANE ') === 'nova');
  check('voice: desconocida → null', normalizeRequestedVoiceId('siri') === null);

  const cfgVoice = makeConfigBridge({ isPrivate: false, voice: 'nova', notifs: true, permission: 'granted' });
  setAgentConfigBridge(cfgVoice.bridge);
  const toFyodor = await changeAssistantVoiceHandler({ voiceId: 'fyodor' }, {});
  check('voice: cambia a la especificada', toFyodor.success === true && cfgVoice.state.voice === 'onyx');
  check('voice: feedback con voz nueva', toFyodor.data?.useNewVoiceForFeedback === true);
  check('voice: mensaje con nombre', toFyodor.message === 'Listo, ahora hablo con la voz de Fyodor.');

  const sameVoice = await changeAssistantVoiceHandler({ voiceId: 'fyodor' }, {});
  check(
    'voice: ya activa → noChange sin feedback nuevo',
    sameVoice.success === true &&
      sameVoice.idempotent === true &&
      sameVoice.data?.noChange === true &&
      sameVoice.message === 'Ya estoy usando la voz de Fyodor.',
  );

  const toggled = await changeAssistantVoiceHandler({}, {});
  check('voice: genérico alterna a la otra', toggled.success === true && cfgVoice.state.voice === 'nova');

  const unknownVoice = await changeAssistantVoiceHandler({ voiceId: 'siri' }, {});
  check(
    'voice: voz desconocida → error con mensaje',
    unknownVoice.success === false && unknownVoice.message === 'Solo tengo las voces de Jane y Fyodor.',
  );

  // Notificaciones: permiso del sistema y derivación por intent.
  const cfgNotif = makeConfigBridge({ isPrivate: false, voice: 'nova', notifs: false, permission: 'granted' });
  setAgentConfigBridge(cfgNotif.bridge);
  check('notifs: aún desactivadas', (await areNotificationsAlreadyDisabled({})).alreadyApplied === true);
  const enable = await toggleNotificationsHandler({ enabled: false }, {}, 'enable_notifications');
  check('notifs: intent gana al parámetro', enable.success === true && cfgNotif.state.notifs === true);
  check('notifs: ya activadas (idempotencia)', (await areNotificationsAlreadyEnabled({})).alreadyApplied === true);

  const disable = await toggleNotificationsHandler({}, {}, 'disable_notifications');
  check('notifs: desactivar', disable.success === true && cfgNotif.state.notifs === false);

  cfgNotif.state.permission = 'denied';
  const enableDenied = await toggleNotificationsHandler({}, {}, 'enable_notifications');
  check(
    'notifs: sin permiso del sistema → mensaje de ajustes',
    enableDenied.success === false &&
      enableDenied.message === 'Necesitas permitir notificaciones en los ajustes de tu teléfono primero.' &&
      cfgNotif.state.notifs === false,
  );
  const disableDenied = await toggleNotificationsHandler({}, {}, 'disable_notifications');
  check('notifs: desactivar no exige permiso', disableDenied.success === true);

  cfgNotif.state.permission = 'unavailable';
  cfgNotif.state.notifs = false;
  const enableExpoGo = await toggleNotificationsHandler({}, {}, 'enable_notifications');
  check(
    'notifs: entorno sin módulo (Expo Go) → preferencia local igualmente',
    enableExpoGo.success === true && cfgNotif.state.notifs === true,
  );

  // Sin puente registrado: error con mensaje, idempotencia no bloquea.
  setAgentConfigBridge(null);
  const noCfgBridge = await setAccountPrivacyHandler({}, {}, 'make_account_private');
  check('config: sin puente → error con mensaje', noCfgBridge.success === false && !!noCfgBridge.message);
  check('config: idempotencia sin puente no bloquea', (await isAccountAlreadyPublic({})).alreadyApplied === false);

  console.log(`\n${passed} tests OK`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
