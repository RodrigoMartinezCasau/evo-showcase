/**
 * Bridge: FollowProvider runs before PersonalProfileProvider can expose context,
 * so follow actions call this to trigger immediate profile batch fetches for new follow edges.
 */
type Primer = (userIds: string[]) => void;

let primer: Primer | null = null;

export function registerFollowProfilePrimer(fn: Primer | null): void {
  primer = fn;
}

export function primeFollowProfileIds(userIds: string[]): void {
  if (userIds.length === 0) return;
  primer?.(userIds);
}
