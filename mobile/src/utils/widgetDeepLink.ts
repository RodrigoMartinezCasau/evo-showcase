import * as Linking from 'expo-linking';

export type WidgetPostDeepLink = { tab: 'para-ti'; postId: string };

function normalizeQueryParam(value: string | string[] | undefined): string | undefined {
  if (value == null) return undefined;
  const raw = Array.isArray(value) ? value[0] : value;
  const s = typeof raw === 'string' ? raw.trim() : '';
  return s.length > 0 ? s : undefined;
}

/** Deep link emitted by the home-screen widget (`evo:///?tab=para-ti&postId=…`). */
export function parseWidgetPostDeepLink(url: string | null | undefined): WidgetPostDeepLink | null {
  if (!url) return null;
  const { queryParams } = Linking.parse(url);
  if (!queryParams) return null;
  const tab = normalizeQueryParam(queryParams.tab as string | string[] | undefined);
  const postId = normalizeQueryParam(queryParams.postId as string | string[] | undefined);
  if (tab !== 'para-ti' || !postId) return null;
  return { tab: 'para-ti', postId };
}

export function normalizeRouteParam(value: string | string[] | undefined): string | undefined {
  return normalizeQueryParam(value);
}
