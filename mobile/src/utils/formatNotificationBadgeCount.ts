/** Máximo mostrado en la campana antes de pasar a «+99». */
export const NOTIFICATION_BADGE_DISPLAY_MAX = 99;

/** Texto del badge de la campana (1…99 o «+99»). */
export function formatNotificationBadgeCount(unreadCount: number): string {
  if (unreadCount > NOTIFICATION_BADGE_DISPLAY_MAX) {
    return `+${NOTIFICATION_BADGE_DISPLAY_MAX}`;
  }
  return String(unreadCount);
}
