/** Compare dotted semver strings (1.0.0). Returns -1 if a<b, 0 if equal, 1 if a>b. */
export function compareSemver(a: string, b: string): number {
  const pa = a.trim().split('.').map((x) => parseInt(x, 10) || 0);
  const pb = b.trim().split('.').map((x) => parseInt(x, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da < db) return -1;
    if (da > db) return 1;
  }
  return 0;
}

export function parseNativeBuildNumber(raw: string | null | undefined): number {
  const n = parseInt(String(raw ?? '').trim(), 10);
  return Number.isFinite(n) ? n : 0;
}
