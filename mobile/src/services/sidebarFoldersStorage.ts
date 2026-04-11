import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SidebarFolder } from '@evoconn/types';

const STORAGE_KEY = 'evoconn_sidebar_folders_v1';

function isFolder(x: unknown): x is SidebarFolder {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return typeof o.id === 'string' && typeof o.name === 'string';
}

export async function loadSidebarFoldersFromStorage(): Promise<SidebarFolder[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isFolder);
  } catch {
    return [];
  }
}

export async function saveSidebarFoldersToStorage(folders: SidebarFolder[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(folders));
  } catch {
    // ignore
  }
}
