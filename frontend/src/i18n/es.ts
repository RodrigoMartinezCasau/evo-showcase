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
  placeholderDebateExample: 'Ej: ¿Existe Dios según la ciencia?',
  placeholderInConversation: 'Reflexiona cuanto quieras...',
  placeholderStudents: 'Pega tu texto o idea…',
  placeholderScripts: 'Tema + plataforma + objetivo…',
  placeholderMessage: 'Escribe tu mensaje…',
  sidebarSearchPlaceholder: 'Buscar debates…',

  // Chat feedback
  thinking: 'Pensando…',

  // Sidebar
  sidebarExpand: 'Expandir barra lateral',
  sidebarCollapse: 'Contraer barra lateral',
  sidebarDefaultTitle: 'Nuevo debate',
  sidebarEditTitle: 'Editar título',
  sidebarFavorites: 'Favoritos',
  sidebarFolders: 'Carpetas',
  sidebarNewFolder: 'Nueva carpeta',
  sidebarNewFolderPrompt: 'Nueva carpeta…',
  newFolderNamePlaceholder: 'Nombre de la carpeta',
  newFolderCreate: 'Crear',
  newFolderDuplicateError: 'Ya existe una carpeta con ese nombre',
  sidebarNoFolder: 'Sin carpeta',
  sidebarConversations: 'Conversaciones',
  sidebarMarkFavorite: 'Marcar como favorito',
  sidebarUnmarkFavorite: 'Quitar de favoritos',
  sidebarMoveToFolder: 'Mover a carpeta',
  sidebarRename: 'Renombrar conversación',
  sidebarRenameFolder: 'Renombrar carpeta',
  sidebarDeleteDebate: 'Eliminar debate',
  sidebarDeleteFolder: 'Eliminar carpeta',
  sidebarYourDebates: 'TUS DEBATES',
  confirmDeleteDebateTitle: 'Eliminar debate',
  confirmDeleteDebateBody: '¿Seguro que quieres eliminar este debate? Esta acción no se puede deshacer.',
  confirmDeleteFolderTitle: 'Eliminar carpeta',
  confirmDeleteFolderBody: '¿Seguro que quieres eliminar esta carpeta? Los debates dentro no se borrarán, solo se quedarán sin carpeta.',
  confirmCancel: 'Cancelar',
  confirmDelete: 'Eliminar',
  errorDeleteDebate: 'Error al eliminar debate',
  errorDeleteFolder: 'Error al eliminar carpeta',
  errorCreateFolder: 'Error al crear carpeta',

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
