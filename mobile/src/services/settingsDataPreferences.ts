import AsyncStorage from '@react-native-async-storage/async-storage';

const DATA_SAVER_KEY = '@evo/settings_data_saver';
const WIFI_ONLY_SYNC_KEY = '@evo/settings_wifi_only_sync';

export async function getDataSaverEnabled(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(DATA_SAVER_KEY);
    return v === 'true';
  } catch {
    return false;
  }
}

export async function setDataSaverEnabled(value: boolean): Promise<void> {
  await AsyncStorage.setItem(DATA_SAVER_KEY, value ? 'true' : 'false');
}

export async function getWifiOnlySyncEnabled(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(WIFI_ONLY_SYNC_KEY);
    return v === 'true';
  } catch {
    return false;
  }
}

export async function setWifiOnlySyncEnabled(value: boolean): Promise<void> {
  await AsyncStorage.setItem(WIFI_ONLY_SYNC_KEY, value ? 'true' : 'false');
}
