/**
 * Colores dinámicos para la vista de carpetas del sidebar, según clan del usuario.
 */
export type SidebarFolderClanColors = {
  primary: string;
  secondary: string;
  tertiary: string;
};

const SIDEBAR_FOLDER_CLAN_COLORS: Record<string, SidebarFolderClanColors> = {
  nihilista: { primary: '#bdb29c', secondary: '#535147', tertiary: '#37343b' },
  cientista: { primary: '#54d5cf', secondary: '#fdfef0', tertiary: '#298280' },
  estoico: { primary: '#818a41', secondary: '#444827', tertiary: '#868833' },
  existencialista: { primary: '#c93a39', secondary: '#f9bc4b', tertiary: '#591c2d' },
  racionalista: { primary: '#395df2', secondary: '#46b8f9', tertiary: '#defcef' },
  humanista: { primary: '#efb318', secondary: '#d08733', tertiary: '#2d996a' },
  realista: { primary: '#a2a3a8', secondary: '#f9a666', tertiary: '#696969' },
  trascendentalista: { primary: '#cb6ce6', secondary: '#e4de5b', tertiary: '#3f2247' },
};

const DEFAULT_COLORS: SidebarFolderClanColors = {
  primary: '#C7FF02',
  secondary: '#C7FF02',
  tertiary: '#666666',
};

export function getSidebarFolderColors(clanId: string | null | undefined): SidebarFolderClanColors {
  if (!clanId || String(clanId).trim() === '') return DEFAULT_COLORS;
  return SIDEBAR_FOLDER_CLAN_COLORS[clanId.trim().toLowerCase()] ?? DEFAULT_COLORS;
}
