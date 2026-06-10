# Módulo del agente in-app de Evo

Agente de voz que responde preguntas con contexto de pantalla y **ejecuta acciones de
navegación** dentro de la app ("llévame a mi perfil" → navega a `/my-profile`).
Evo es el cliente cero: este módulo está diseñado para convertirse en el SDK B2B
que cualquier app pueda integrar declarando su propio manifest.

## Arquitectura

```
Usuario habla → STT nativo (expo-speech-recognition)
  → useVoiceAssistant (hook orquestador, fuera de este módulo)
  → POST /assistant/chat  { message, screen_context, current_route, manifest_routes }
      backend (FastAPI): system prompt = conocimiento app + rutas del manifest
      LLM devuelve JSON { reply, action } → backend valida intents → TTS del reply
  → cliente: parseAgentAction() revalida → ActionExecutor.execute()
  → expo-router navega → se reproduce el audio
  → logAgentEvent() → Supabase (agent_usage_events)
```

### Estructura

| Carpeta | Qué contiene | ¿Reutilizable entre apps? |
|---|---|---|
| `core/` | Tipos de acción, validación, ejecutor, analytics | Sí (futuro SDK) |
| `manifest/` | Tipos del manifest + manifest concreto de Evo | Tipos sí; `evo.manifest.ts` no |
| `index.ts` | Exports públicos — **el resto de Evo solo importa de aquí** | — |

## Decisiones arquitectónicas clave

1. **El manifest viaja al backend en cada request** (no está hardcodeado en el servidor).
   El backend no sabe nada de las rutas de Evo: recibe `manifest_routes` y las inyecta en
   el system prompt. Esto permite evolucionar el manifest sin redeploy del backend y es la
   base del modelo multi-tenant (cada app cliente envía el suyo). Coste: ~1-2 KB/request.

2. **Doble validación de acciones.** El backend rechaza intents que no estén en el manifest
   recibido (`_parse_agent_json`), y el cliente vuelve a validar (`parseAgentAction`) y solo
   ejecuta intents declarados (`ActionExecutor`). El LLM nunca puede inyectar rutas libres:
   elige de una lista cerrada.

3. **Degradación segura.** Si el JSON del LLM es inválido o el intent no existe, el turno
   degrada a "respuesta hablada sin acción". Nunca se ejecuta una acción dudosa.

4. **El manifest es declarativo.** Solo datos. Nada de lógica ni handlers dentro del manifest.

5. **Analytics fire-and-forget.** `logAgentEvent` jamás bloquea ni rompe el flujo de voz
   (si la tabla no existe o falla la red, se ignora en silencio).

## Cómo añadir un intent de navegación

1. Añade la entrada en `manifest/evo.manifest.ts` → `routes`:

```ts
{
  intent: 'frases_domains',                 // id estable, snake_case
  label: 'Dominios de frases',              // legible para humanos y para el prompt
  route: '/phrases-domains',                // href real de expo-router (carpeta mobile/mobile/app)
  examples: ['dominios de frases', 'explorar frases'], // frases típicas del usuario
}
```

2. No hay paso 2. El backend recibe el manifest en el siguiente request y el
   `ActionExecutor` resuelve la ruta desde el propio manifest.

Reglas:
- La ruta debe existir en `mobile/mobile/app/` (expo-router). Verifícalo.
- Query params soportados: `'/(tabs)?tab=para-ti'` (se convierten a `{ pathname, params }`).
- `'BACK'` es el único marker especial (router.back con fallback a tabs).
- Nunca hardcodear rutas fuera del manifest.

## Cómo testear localmente

Backend (sin app, valida LLM + JSON + validación de intents):

```bash
cd backend && source .venv/bin/activate
uvicorn main:app --reload --port 8000
# Tests unitarios del parser (sin red):
python3 test_voice_assistant_agent.py
# Turno completo contra el LLM real:
curl -s -X POST http://127.0.0.1:8000/assistant/chat \
  -H "Content-Type: application/json" -H "x-user-id: <uuid>" \
  -d '{"message": "llévame a mi perfil", "current_route": "/", "manifest_version": "1.0.0",
       "manifest_routes": [{"intent": "my_profile", "label": "Mi perfil", "examples": ["mi perfil"]}]}'
```

En dispositivo: el micrófono requiere build nativo (`npx expo run:ios --device`),
no funciona en Expo Go ni simulador. Ver sección "Asistente de voz" en `COMMANDS.md`.

## Instrumentación

Tabla `agent_usage_events` (SQL: `supabase_agent_usage_events.sql` en la raíz del repo).
Eventos: `agent_invoked`, `navigation_executed`, `navigation_failed`, `question_only`,
`agent_timeout`, `agent_stt_empty`, `agent_stt_failed`, `agent_watchdog_reset`,
`agent_consent_granted`, `agent_consent_declined`.
Latencias separadas: `latency_ms` (HTTP completo), `latency_stt_ms` (parar de hablar → texto),
`latency_action_ms` (respuesta → navegación). `was_truncated` marca respuestas cortadas
por `max_tokens` (instrumentado también en logs del backend con contadores).
`context_chars` registra la longitud final del contexto enviado (calibra `MAX_CONTEXT_CHARS`)
y `redactions_applied` los tipos de datos sensibles redactados (nunca los valores).

## Privacidad (v1.1)

- **Consentimiento explícito** (`core/consent.ts` + `components/AssistantConsentModal.tsx`):
  la primera vez que el usuario pulsa el orbe se muestra un modal que explica qué datos
  viajan a proveedores externos. Sin aceptación no se inicia el STT ni sale nada del
  dispositivo. Revocable desde Ajustes → Voz del asistente. Persistido en AsyncStorage
  (`@evo/assistant_consent_v1`), fail-closed si el storage falla.
- **Tope de contexto** (`core/contextLimits.ts`): el contexto combinado se limita a
  `MAX_CONTEXT_CHARS` (1500). Los datos del usuario tienen prioridad; el contexto de
  pantalla absorbe el recorte (`combineContexts`).
- **Saneado de datos sensibles** (`core/sanitization.ts`): última barrera antes del LLM.
  Redacta emails, teléfonos, tarjetas, IBAN y DNI del contexto que añade la app
  (NUNCA de la transcripción del usuario). Tipos redactados → `redactions_applied`.

## Publicaciones visibles en el feed (v1.2)

`core/feedContext.ts` — lógica pura que limita y formatea las publicaciones visibles
para el LLM ("léeme esta publicación", "¿de qué trata el post de @fulano?"):

- Máximo **5 posts** (los más centrados en el viewport, `selectMostCentered`) y
  **200 chars** de preview por post (`clipPostPreview`). Estos límites se aplican
  ANTES del tope general de 1500 chars de `contextLimits.ts`.
- `CommunityScreen` registra el snapshot vía `feedPostsToScreenSnapshot`
  (`utils/voiceAssistantScreenContext.ts`): pestaña Siguiendo → tarjetas visibles
  (`onViewableItemsChanged`); Para ti / visor detalle → el post a pantalla completa,
  marcado como `[POST EN PANTALLA AHORA]`. Se limpia al perder el foco o en Búsqueda.
- El lector del asistente toma el snapshot al invocar el turno (no se actualiza en
  tiempo real durante el turno).
- Feed vacío → texto explícito "Todavía no hay publicaciones cargadas" (el LLM no
  inventa posts). Imágenes: solo metadato `con imagen adjunta`, nunca se envían.
- `has_my_like` y `comments_count` son opcionales: `CommunityPost` no expone esos
  datos hoy; se rellenarán cuando existan (v2, acciones sobre posts vía `post_id`).
- El system prompt del backend (`voice_assistant.py`) instruye cómo resolver
  referencias ("esta publicación", "el post de X"), preguntar ante ambigüedad y no
  decir nunca el `post_id` en voz alta.

Tests de estos módulos (sin React Native ni red):

```bash
npx --yes tsx mobile/src/agent/core/__tests__/run_agent_core_tests.ts
```

## Acciones de interacción simples (v2 — Sprint 1)

Primeras acciones type `execute`: **like, unlike, guardar y quitar de guardados** sobre
el post visible. Sin confirmación (reversibles, sin parámetros del usuario).

Arquitectura — igual que las rutas, las acciones se declaran en el manifest y el
backend sigue siendo agnóstico de Evo:

- **Manifest** (`manifest/evo.manifest.ts`, v1.2.0): cada `ActionIntent` declara
  `category`, `handler` (nombre, no función), `contextRequirements`
  (`requiresVisiblePost`, `requiresAuth`), `idempotencyCheck` y `examples`.
  `manifestActionsForBackend()` viaja en cada turno (`manifest_actions`).
- **Motor** (`core/actionEngine.ts`, lógica pura y testeable):
  manifest lookup → `validateActionContext` → idempotencia → handler. Cualquier
  fallo degrada a `ActionResult` con `error` (telemetría) + `message` (hablado).
- **Handlers** (`handlers/interactions/`): registrados por nombre en
  `handlers/index.ts` (`ACTION_HANDLERS`, `IDEMPOTENCY_CHECKERS`). Operan sobre el
  post enfocado del snapshot (`getFocusedPost`) capturado AL INVOCAR el turno
  (si el usuario hace scroll mientras el backend responde, la acción aplica al
  post que estaba viendo al hablar).
- **Puente de interacciones** (`handlers/interactionBridge.ts`): los votos/guardados
  de Evo viven en contextos de React (`useFeedStore`, `usePersonalProfile`);
  `useRegisterAgentInteractions()` (montado en `VoiceAssistantLayer`) registra
  funciones imperativas que los handlers consumen. Mismo flujo exacto que los
  botones de la UI (el corazón/guardar se actualizan solos).
- **Idempotencia**: los checkers comprueban el estado VIVO del puente (no el
  snapshot, que puede quedar obsoleto si el usuario tocó el corazón con el dedo
  mientras hablaba). "dale like" dos veces → "Ya le habías dado like" sin ejecutar.
- **Voz coherente**: si la acción resulta idempotente o falla, el reply del LLM
  ("Listo, le he dado like") sería falso — el hook habla el `message` real del
  handler con el TTS del dispositivo en su lugar.
- **Backend**: `manifest_actions` añade el bloque `CAPACIDAD DE EJECUTAR ACCIONES`
  al prompt (con `[requiere publicación visible]`) y retira like/guardar de la
  lista de "no soportadas"; clientes v1 sin acciones conservan el prompt legacy.
  `_parse_agent_json` valida `type: execute` contra los intents declarados y
  degrada a `none` ante cualquier rareza (intent inventado, parameters no-objeto).
- **Telemetría**: eventos `action_executed` / `action_failed` / `action_idempotent`
  con `latency_action_ms` y el error técnico dentro de `action_executed` (jsonb).

Fuera de este sprint: repost y acciones con confirmación (Sprint 4), voto negativo
(pendiente de datos de uso), comentar/follow/config (sprints 2-4).

## Acciones de configuración (v2 — Sprint 2)

Cinco acciones que operan sobre el estado del usuario, no sobre un post visible
(manifest v1.3.0): `make_account_public`, `make_account_private`,
`change_assistant_voice`, `enable_notifications`, `disable_notifications`.

- **Confirmación ligera por modal** (`components/ActionConfirmationModal.tsx`):
  las acciones de privacidad declaran `requireConfirmation: true` +
  `confirmationMessageTemplate` en el manifest. Flujo: el LLM responde con la
  pregunta de confirmación como reply (se lee en voz alta) → el cliente NO
  ejecuta → modal nativo Confirmar/Cancelar → Confirmar ejecuta, Cancelar (o
  tocar fuera) habla "Cancelado." y registra `action_cancelled`. La fuente de
  verdad es el `requireConfirmation` del MANIFEST, nunca el del LLM (que solo
  viaja como señal); el texto del modal es el canónico del manifest. La
  confirmación por voz bidireccional llega en Sprint 4.
- **El modal espera FUERA del turno**: el watchdog mata cualquier `thinking`
  > 20 s, así que el turno termina hablando la pregunta y la acción queda en
  `pendingConfirmationRef` (`useVoiceAssistant`); la ejecución ocurre después,
  desde los botones del modal, con la telemetría del turno original.
- **Precheck antes del modal** (`precheckManifestAction`): contexto +
  idempotencia se evalúan ANTES de pedir confirmación. "haz mi cuenta privada"
  cuando ya es privada → "Tu cuenta ya es privada", sin modal.
- **El intent manda sobre los parámetros del LLM**: los handlers compartidos
  (`setAccountPrivacy`, `toggleNotifications`) reciben el intent del manifest
  como tercer argumento y derivan de ÉL el valor (público/privado, on/off).
  Un `parameters.isPrivate` contradictorio del LLM no puede invertir la acción.
- **Feedback con la voz nueva**: `changeAssistantVoice` devuelve
  `data.useNewVoiceForFeedback`; el hook sintetiza el mensaje de éxito con la
  voz recién elegida vía `/assistant/preview-tts` (sin cuota) para que el
  usuario la oiga al instante. "Ya estoy usando la voz de X" si pide la activa.
- **Permiso del sistema**: al activar notificaciones, el puente garantiza el
  permiso del SO (pide el diálogo nativo si aún se puede); si está denegado →
  "Necesitas permitir notificaciones en los ajustes de tu teléfono primero."
  En Expo Go (sin módulo) se aplica solo la preferencia local (misma clave
  `@evo/notifications_enabled` que Ajustes).
- **Puente de configuración** (`handlers/configBridge.ts` +
  `useRegisterAgentConfig` en `VoiceAssistantLayer`): privacidad vía
  `profile.is_private` + `setProfilePrivate` + `refreshProfile`; voz vía
  `VoiceAssistantPreferencesContext`; notificaciones vía AsyncStorage +
  expo-notifications (require protegido, como `pushNotifications.ts`).

Fuera de este sprint: cerrar sesión y confirmación por voz (Sprint 4),
creación con prefill (Sprint 3), relaciones y búsqueda (Sprints 4-5).

## Creación, relaciones, repost, logout y búsqueda (v2 — Sprints 3+4+5)

Manifest v1.4.0. Trece acciones nuevas en cuatro frentes.

### Creación con prefill (Sprint 3) — el agente NUNCA publica

`create_reflection_prefill`, `create_phrase_prefill`, `create_comment_prefill`
(`handlers/creation/creationActions.ts`). Solo navegan/abren el composer con el
contenido pre-rellenado; el usuario revisa y publica a mano. Sin confirmación.

- Reflexión y frase: params de expo-router (`/reflection?prefill=...`,
  `/phrase?prefill=...&prefillAuthor=...`). `ChatInputBar` acepta `initialText`
  (se consume una sola vez y nunca pisa texto ya escrito por el usuario). En
  frases, el autor se siembra en el draft del primer bloque de publicación.
- Comentario: el composer es un componente, no una ruta. `handlers/postUiRegistry.ts`
  permite a cada `ReflectionDetailItem` montado registrar `openCommentComposer(texto)`
  y `openReportPicker()`; el handler los invoca para el post enfocado del snapshot.
  Sin post visible → "Para comentar, abre primero la publicación."
- Prompt backend: bloque `ACCIONES DE CREACIÓN` — el LLM extrae el contenido o
  tema, NUNCA genera la reflexión completa por el usuario.

### Confirmación por VOZ bidireccional (Sprint 4)

Sobre el modal del Sprint 2 (que sigue como fallback visual) se añade escucha
por voz: tras hablar la pregunta de confirmación, el hook entra en fase
**`confirming`** (distinta de `thinking` → no dispara el watchdog) y graba
durante 8 s (`CONFIRMATION_VOICE_WINDOW_MS`).

- `core/confirmationSpeech.ts` (lógica pura): `isAffirmative` / `isNegative` /
  `classifyConfirmationReply`. La negación gana en caso de empate; sin señal →
  ambiguo. Coincidencia por palabra completa ("nosotros" no es "no").
- Afirmativo → ejecuta; negativo → cancela; ambiguo → repregunta UNA vez y
  vuelve a escuchar; timeout → el modal queda visible y manda el toque.
- Respuesta rápida: si el `interimText` ya es claramente sí/no se corta la
  grabación sin esperar los 8 s. Un transcript tardío (3 s de gracia) se
  enruta igualmente a la confirmación, no a un turno nuevo.
- `doubleConfirmation` en el manifest (bloquear usuario): dos rondas de
  pregunta-respuesta antes de ejecutar (`remainingConfirmations`).
- El toque en el modal siempre tiene prioridad sobre la voz.

### Relaciones, repost y logout (Sprint 4)

`follow_user` (sin confirmación; cuenta privada → solicitud), `unfollow_user`
(confirmación), `block_user` (doble confirmación; usa el flujo de moderación
existente de Evo vía puente, jamás lo salta), `report_post` (abre el selector
de motivos existente — el modal ES la confirmación, el agente no denuncia),
`repost_post` (confirmación) y `logout` (confirmación).

- Las acciones de relación exigen **perfil visible**
  (`contextRequirements.requiresVisibleProfile`, validado en `actionEngine`):
  operan sobre el perfil ajeno en pantalla, nunca sobre el propio.
- `core/profileContext.ts`: `VisibleProfile` (`profile_id`, `profile_username`,
  `profile_is_own/_private/_following/_follow_pending/_blocked`) +
  `getTargetProfile`. `ProfileScreen` lo reporta en el snapshot vía
  `profileToScreenSnapshot`.
- Idempotencia viva (`handlers/social/idempotency.ts`): "sigue" cuando ya
  sigue → "Ya sigues a X"; repost repetido → "Ya habías republicado esto".

### Búsqueda y perfiles por nombre (Sprint 5)

- `find_user_profile` (`handlers/search/searchActions.ts`): busca en Supabase
  vía puente y resuelve con `resolveUserMatches` — match exacto de username
  gana; único → navega al perfil; múltiples → "¿Te refieres a @x, @y o @z?"
  (máx 3, el usuario aclara en el siguiente turno); ninguno → "No he
  encontrado ningún usuario con ese nombre."
- `open_search`: navega a la pestaña de búsqueda con la query pre-rellenada
  (`CommunityScreen` acepta `searchQuery` y la pasa a `SearchScreen`).

### Puente de app (`handlers/appBridge.ts`)

`AgentAppBridge` agrupa todo lo que estas acciones necesitan de Evo
(composers, follow/block, repost, logout, búsqueda, navegación a perfil).
`useRegisterAgentApp()` (montado en `VoiceAssistantLayer`) lo implementa con
los hooks/servicios reales (`useFollowState`, `useBlockedUsers`, Supabase,
expo-router). Los handlers siguen siendo puros y testeables con un puente falso.

### Backend

Prompt v2: bloques `ACCIONES DE CREACIÓN`, `ACCIONES SOBRE EL PERFIL VISIBLE`
(con marca `[requiere perfil visible]` por acción) y `BÚSQUEDA Y PERFILES POR
NOMBRE`; reglas de confirmación ampliadas para voz. Los avisos legacy ("no
puedo buscar perfiles", "no puedo cerrar sesión") solo se muestran a clientes
v1 sin `manifest_actions`.

## Límites y protecciones (v1)

- Timeout del turno: 15 s, sin reintentos automáticos (cada retry = otra generación LLM+TTS).
  Medido en real: un turno legítimo tarda 3.4–10.8 s (LLM + TTS).
- Watchdog de fase: `thinking` nunca puede durar más de 20 s — si el STT nativo no emite
  `end`/`error`, o cualquier path de error no resetea la fase, el watchdog libera el orbe
  con mensaje al usuario y evento `agent_watchdog_reset`.
- Rate limit backend: 10 req/min por usuario + cuota diaria de usos IA (1 uso por turno).
- Lock de invocación: mientras un turno está en `thinking` no se acepta otro.
- Navegación (v1) + interacciones simples sin confirmación (v2 Sprint 1) + configuración
  con confirmación por modal (v2 Sprint 2) + creación con prefill, relaciones, repost,
  logout y búsqueda con confirmación por voz + modal (v2 Sprints 3-5). Publicar contenido
  POR el usuario sigue fuera de alcance por diseño: la creación es solo prefill.

## Postmortem: orbe colgado en "pensando" (jun 2026)

Síntoma: tras 3-5 invocaciones el orbe quedaba en `thinking` para siempre, sin error visible.
Causas raíz encontradas (todas corregidas):

1. **Backend — cliente OpenAI sin timeout** (`voice_assistant.py`, `llm.py`): el SDK usa
   600 s + 2 reintentos por defecto y se creaba un cliente nuevo por llamada. Una conexión
   TTS colgada retenía el thread ~10 min; los reintentos del usuario se acumulaban y el
   backend entero dejaba de responder (incluso `/health`). Fix: cliente único reutilizado,
   TTS `timeout=10, max_retries=0` (degrada a TTS del dispositivo), chat `timeout=45, max_retries=1`.
2. **Cliente — STT sin respuesta**: `requestStopRecording` pone `thinking` ANTES de tener el
   transcript; si el módulo nativo no emite `end` ni `error`, nadie reseteaba la fase y el
   orbe ignoraba pulsaciones. Fix: watchdog de 20 s.
3. **Backend — parser**: el LLM a veces antepone texto al JSON (`Vamos.{json}`); el parse
   fallaba, el TTS leía el JSON en voz alta y la navegación se perdía. Fix: extracción de
   JSON embebido balanceado (`_extract_embedded_json`).
