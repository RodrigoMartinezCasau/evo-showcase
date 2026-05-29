import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '../../mobile/lib/supabase';
import { compareSemver, parseNativeBuildNumber } from '@evoconn/utils/compareAppVersion';

export type RemoteAppConfig = {
  min_marketing_version: string;
  min_ios_build_number: string;
  min_android_version_code: string;
  maintenance_mode: boolean;
  maintenance_message: string | null;
  ios_store_url: string | null;
  android_store_url: string | null;
};

export type AppLaunchGate =
  | { status: 'ok' }
  | { status: 'maintenance'; message: string }
  | { status: 'update_required'; storeUrl: string };

const DEFAULT_ANDROID_STORE =
  'https://play.google.com/store/apps/details?id=com.evoconn.evo';

/** App Store listing for EVO (ascAppId 6764981767). Override via ios_store_url in Supabase if needed. */
const DEFAULT_IOS_STORE = 'https://apps.apple.com/app/id6764981767';

export function getInstalledVersionInfo(): {
  marketingVersion: string;
  nativeBuild: number;
} {
  const marketingVersion = Constants.expoConfig?.version?.trim() || '0.0.0';

  let nativeBuildRaw: string | number | null | undefined;
  if (Platform.OS === 'ios') {
    nativeBuildRaw =
      Constants.expoConfig?.ios?.buildNumber ?? Constants.platform?.ios?.buildNumber;
  } else if (Platform.OS === 'android') {
    nativeBuildRaw =
      Constants.expoConfig?.android?.versionCode ?? Constants.platform?.android?.versionCode;
  }

  const nativeBuild = parseNativeBuildNumber(
    nativeBuildRaw != null ? String(nativeBuildRaw) : null,
  );
  return { marketingVersion, nativeBuild };
}

export function evaluateLaunchGate(
  config: RemoteAppConfig,
  installed = getInstalledVersionInfo(),
): AppLaunchGate {
  if (config.maintenance_mode) {
    const message =
      config.maintenance_message?.trim() ||
      'Estamos en mantenimiento. Vuelve a intentarlo en unos minutos.';
    return { status: 'maintenance', message };
  }

  const minMarketing = config.min_marketing_version?.trim() || '0.0.0';
  if (compareSemver(installed.marketingVersion, minMarketing) < 0) {
    return {
      status: 'update_required',
      storeUrl: resolveStoreUrl(config),
    };
  }

  if (Platform.OS === 'ios') {
    const minBuild = parseNativeBuildNumber(config.min_ios_build_number);
    if (installed.nativeBuild > 0 && minBuild > 0 && installed.nativeBuild < minBuild) {
      return { status: 'update_required', storeUrl: resolveStoreUrl(config) };
    }
  }

  if (Platform.OS === 'android') {
    const minCode = parseNativeBuildNumber(config.min_android_version_code);
    if (installed.nativeBuild > 0 && minCode > 0 && installed.nativeBuild < minCode) {
      return { status: 'update_required', storeUrl: resolveStoreUrl(config) };
    }
  }

  return { status: 'ok' };
}

function resolveStoreUrl(config: RemoteAppConfig): string {
  if (Platform.OS === 'ios') {
    const custom = config.ios_store_url?.trim();
    if (custom) return custom;
    return DEFAULT_IOS_STORE;
  }
  const custom = config.android_store_url?.trim();
  if (custom) return custom;
  return DEFAULT_ANDROID_STORE;
}

export async function fetchRemoteAppConfig(): Promise<RemoteAppConfig | null> {
  try {
    const { data, error } = await supabase
      .from('app_config')
      .select(
        'min_marketing_version,min_ios_build_number,min_android_version_code,maintenance_mode,maintenance_message,ios_store_url,android_store_url',
      )
      .eq('id', 1)
      .maybeSingle();

    if (error || !data) return null;
    return data as RemoteAppConfig;
  } catch {
    return null;
  }
}

export async function resolveAppLaunchGate(): Promise<AppLaunchGate> {
  if (__DEV__) {
    return { status: 'ok' };
  }

  const config = await fetchRemoteAppConfig();
  if (!config) {
    return { status: 'ok' };
  }
  return evaluateLaunchGate(config);
}
