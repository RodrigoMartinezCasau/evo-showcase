/**
 * Layout controls for the internal content of "Últimas Publicaciones" preview cards.
 * All offset values are in pixels. Scale is a multiplier (1 = no change).
 * Changing these values moves/scales individual elements visually WITHOUT
 * affecting the outer black card dimensions or horizontal scroll.
 *
 * Applies to both PersonalRecentPostCard and RecentPostCard (OtherUser).
 * Both REFLECTION and FRASE cards share this same config object.
 */
export const REFLECTION_PREVIEW_LAYOUT = {

  // ─── Type label ("REFLEXIÓN" / "FRASE") ──────────────────────────────────
  typeLabelOffsetX: 0,
  typeLabelOffsetY: 0,
  typeLabelScale: 1,
  /** Hex or rgba string for the type label colour. */
  typeLabelColor: 'rgba(255,255,255,0.40)',

  // ─── Main content (title for reflection · phrase text for frase) ──────────
  titleOffsetX: 0,
  titleOffsetY: 0,
  titleScale: 1,

  // ─── Stats block (the whole group moves/scales together) ─────────────────
  statsBlockOffsetX: 0,
  statsBlockOffsetY: 0,
  statsBlockScale: 1,

  // ─── Upvote icon (▲) ─────────────────────────────────────────────────────
  upIconOffsetX: 0,
  upIconOffsetY: 0,
  upIconScale: 1,

  // ─── Upvote count ─────────────────────────────────────────────────────────
  upCountOffsetX: 0,
  upCountOffsetY: 0,
  upCountScale: 1,

  // ─── Downvote icon (▼) ───────────────────────────────────────────────────
  downIconOffsetX: 0,
  downIconOffsetY: 0,
  downIconScale: 1,

  // ─── Downvote count ───────────────────────────────────────────────────────
  downCountOffsetX: 0,
  downCountOffsetY: 0,
  downCountScale: 1,

  // ─── Saved icon (★) ──────────────────────────────────────────────────────
  savedIconOffsetX: 0,
  savedIconOffsetY: 0,
  savedIconScale: 1,

  // ─── Saved count ──────────────────────────────────────────────────────────
  savedCountOffsetX: 0,
  savedCountOffsetY: 0,
  savedCountScale: 1,

  // ─── Vote-ratio percentage ────────────────────────────────────────────────
  percentageOffsetX: 0,
  percentageOffsetY: 0,
  percentageScale: 1,

} as const;
