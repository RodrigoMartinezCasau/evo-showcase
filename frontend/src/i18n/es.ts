/**
 * Spanish UI strings. Keys are stable for future en.ts (English).
 */
export const es = {
  // App / layout
  appTitle: 'Physics Copilot',
  appDescription: 'Asistente para física',

  // Home page
  homeTitle: 'Physics Copilot',
  homeDescription: 'Asistente para consultas de física.',
  homeGoChat: 'Ir al chat',

  // Landing (empty state)
  landingHeadline: '¡Dime tu reflexión YA!',
  landingSubtitle:
    'Escribe abajo para empezar un debate con hechos, citas y preguntas abiertas.',

  // Mode
  modeLabel: 'Modo:',
  modeDebate: 'Debate',
  modeStudents: 'Students',
  modeScripts: 'Scripts',
  modeSwitcher: 'Cambiar modo',

  // New-thread buttons
  newDebate: 'Nuevo debate',
  newStudents: 'Nuevos students',
  newScript: 'Nuevo script',

  // Placeholders
  placeholderDebate: 'Escribe tu reflexión…',
  placeholderStudents: 'Pega tu texto o idea…',
  placeholderScripts: 'Tema + plataforma + objetivo…',
  placeholderMessage: 'Escribe tu mensaje…',
  sidebarSearchPlaceholder: 'Buscar debates…',

  // Sidebar
  sidebarExpand: 'Expandir barra lateral',
  sidebarCollapse: 'Contraer barra lateral',
  sidebarDefaultTitle: 'Nuevo debate',
  sidebarEditTitle: 'Editar título',

  // Chat input / send
  ariaMessageInput: 'Escribir mensaje',
  ariaSend: 'Enviar',

  // Top bar
  homeButtonTitle: 'Volver al inicio',
  premiumUpgrade: 'Mejorar a Premium',

  // Coming soon
  comingSoon: 'Próximamente',
  scriptsComingSoon: 'Generar guion — Próximamente',

  // Errors (user-facing)
  errorLoadDebate: 'Error al cargar debate',
  errorCreateDebate: 'Error al crear debate',
  errorUpdateTitle: 'Error al actualizar título',
  errorConnection: 'Error de conexión.',
  errorRetry: 'Error al generar la respuesta. Vuelve a intentarlo.',

  // Assistant card labels (debate layer)
  assistantSteelman: 'Tu postura (en su mejor versión)',
  assistantContrapunto: 'Contrapunto',
  assistantPregunta: 'Pregunta',

  // Tabs / panels
  tabFacts: 'Hechos científicos',
  tabQuotes: 'Citas textuales',
  tabCreator: 'Ideas de Creator',
  detailsTitleOptions: 'Opciones de título',
  detailsOutline: 'Esquema / ideas de vídeo',
  detailsNoFacts: 'No hay hechos científicos relevantes todavía.',
  detailsNoQuotes: 'No hay citas relevantes en la KB todavía.',
  detailsNoCreatorYet: 'Aún no hay ideas de guion para esta respuesta.',
  detailsGenerating: 'Generando…',
  detailsGenerateScript: 'Generar guion / ideas',

  // AssistantCard accordions + empty / loading
  assistantLoading: 'Cargando…',
  assistantNoFacts: 'No hay hechos científicos relevantes todavía.',
  assistantNoQuotes: 'No hay citas relevantes en la KB todavía.',
  assistantNoCreatorYet: 'Aún no hay ideas de guion. Genera al abrir esta sección.',
  assistantGenerateScript: 'Generar guion / ideas',

  // DetailsPanel "Sources"
  sourcesLabel: 'Fuentes:',
} as const

export type I18nKeys = keyof typeof es
