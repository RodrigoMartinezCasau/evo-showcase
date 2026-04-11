/**
 * Editor de colores del strip FAVORITOS / CARPETAS / PENSAMIENTOS (pestaña activa).
 *
 * Cada clave es un `clanId` en minúsculas (mismo criterio que `getSidebarFolderColors`).
 * Dentro de cada clan editas las tres pestañas por separado:
 * - `label`: color del texto cuando esa pestaña está activa.
 * - `icon`: tint del PNG cuando está activo; `null` = sin tint (color original del asset).
 *
 * `default` se usa si no hay clan o el clan no está en el mapa.
 */
export type SidebarClanTabId = 'favorites' | 'folders' | 'thoughts';

export type SidebarClanTabActiveColors = {
  label: string;
  icon: string | null;
};

export type SidebarClanTabColorRow = Record<SidebarClanTabId, SidebarClanTabActiveColors>;

const SIDEBAR_CLAN_TAB_COLOR_EDITOR: Record<string, SidebarClanTabColorRow> = {
  nihilista: {
    favorites: { label: '#535147', icon: '#535147' },
    folders: { label: '#bdb29c', icon: '#bdb29c' },
    thoughts: { label: '#535147', icon: null },
  },
  cientista: {
    favorites: { label: '#fdfef0', icon: '#fdfef0' },
    folders: { label: '#54d5cf', icon: '#54d5cf' },
    thoughts: { label: '#298280', icon: null },
  },
  estoico: {
    favorites: { label: '#444827', icon: '#444827' },
    folders: { label: '#818a41', icon: '#818a41' },
    thoughts: { label: '#444827', icon: null },
  },
  existencialista: {
    favorites: { label: '#f9bc4b', icon: '#f9bc4b' },
    folders: { label: '#c93a39', icon: '#c93a39' },
    thoughts: { label: '#f9bc4b', icon: null },
  },
  racionalista: {
    favorites: { label: '#46b8f9', icon: '#46b8f9' },
    folders: { label: '#395df2', icon: '#395df2' },
    thoughts: { label: '#46b8f9', icon: null },
  },
  humanista: {
    favorites: { label: '#d08733', icon: '#d08733' },
    folders: { label: '#efb318', icon: '#efb318' },
    thoughts: { label: '#d08733', icon: null },
  },
  realista: {
    favorites: { label: '#f9a666', icon: '#f9a666' },
    folders: { label: '#a2a3a8', icon: '#a2a3a8' },
    thoughts: { label: '#f9a666', icon: null },
  },
  trascendentalista: {
    favorites: { label: '#e4de5b', icon: '#e4de5b' },
    folders: { label: '#cb6ce6', icon: '#cb6ce6' },
    thoughts: { label: '#e4de5b', icon: null },
  },
  default: {
    favorites: { label: '#7000ff', icon: '#C7FF02' },
    folders: { label: '#C7FF02', icon: '#C7FF02' },
    thoughts: { label: '#4f59fe', icon: null },
  },
};

function normalizeClanKey(clanId: string | null | undefined): string {
  if (!clanId || String(clanId).trim() === '') return 'default';
  return String(clanId).trim().toLowerCase();
}

export function getSidebarClanTabColorRow(clanId: string | null | undefined): SidebarClanTabColorRow {
  const k = normalizeClanKey(clanId);
  return SIDEBAR_CLAN_TAB_COLOR_EDITOR[k] ?? SIDEBAR_CLAN_TAB_COLOR_EDITOR.default;
}

/** Hex para `tintColor` o `undefined` si no hay tint. */
export function sidebarTabIconTint(icon: string | null | undefined): string | undefined {
  if (icon == null) return undefined;
  const s = String(icon).trim();
  return s === '' ? undefined : s;
}
