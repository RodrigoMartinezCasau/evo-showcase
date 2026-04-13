/**
 * Layout controls for the internal content of "Últimas Publicaciones" preview cards.
 * All offset values are in pixels. Scale is a multiplier (1 = no change).
 * Changing these values moves/scales individual elements visually WITHOUT
 * affecting the outer black card dimensions or horizontal scroll.
 *
 * Applies to both PersonalRecentPostCard and RecentPostCard (OtherUser).
 * Both REFLECTION and FRASE cards share this same config object.
 *
 * Icons are the same SVGs used in the "Para ti" action column:
 *   detailActions/31    → upvote
 *   detailActions/29    → downvote
 *   detailActions/33    → saved
 *   detailActions/flecha → percentage (double-arrow cycle icon)
 */
export const PROFILE_POST_PREVIEW_LAYOUT = {

  // ─── Whole internal content group ────────────────────────────────────────
  /** Moves/scales ALL internal content without touching the outer black card. */
  profilePreviewContentOffsetX: 0,
  profilePreviewContentOffsetY: 0,
  profilePreviewContentScale: 1,

  // ─── Type label ("REFLEXIÓN" / "FRASE") ──────────────────────────────────
  profilePreviewTypeLabelOffsetX: 0,
  profilePreviewTypeLabelOffsetY: 0,
  profilePreviewTypeLabelScale: 1,
  /** Hex or rgba string for the type-label colour. */
  profilePreviewTypeLabelColor: 'rgba(255,255,255,0.40)',

  // ─── Main content (title for reflection · phrase text for frase) ──────────
  profilePreviewMainTextOffsetX: 0,
  profilePreviewMainTextOffsetY: 0,
  profilePreviewMainTextScale: 1,

  // ─── Stats bar — ONE unified size editor ─────────────────────────────────
  /**
   * Single scale that controls the ENTIRE stats bar uniformly:
   *   - icon pixel size   = profilePreviewStatsIconBaseSize   × scale
   *   - number font size  = profilePreviewStatsCountBaseFontSize × scale
   *   - gap between cols  = 10px × scale  (proportional, never breaks layout)
   *   - gap icon↔number   = 3px  × scale
   *   - flecha icon scale = profilePreviewFlechaIconScale × scale (stacks)
   *
   * Outer black card is NEVER affected. Safe range: 0.6 – 2.0.
   * Current default is 1.0 (22px icons, 20px numbers).
   * Previous value was 1.5 — reduce here to make everything smaller.
   */
  profilePreviewStatsBarScale: 1,
  /** Base icon size in pixels at scale 1. */
  profilePreviewStatsIconBaseSize: 22,
  /** Base font size for the count numbers at scale 1. */
  profilePreviewStatsCountBaseFontSize: 20,

  // ─── Stats block position (moves the whole bar, does not resize it) ───────
  profilePreviewStatsBlockOffsetX: 0,
  profilePreviewStatsBlockOffsetY: 0,

  // ─── Uniform spacing between stat columns ────────────────────────────────
  /**
   * Gap in pixels between each stat column (upvote / downvote / saved / %).
   * All four gaps are identical. This is applied AFTER barScale — raise or
   * lower this value independently to tighten or loosen the row.
   * Default 10 (same as before). Safe range: 4 – 28.
   */
  profilePreviewStatsColSpacing: 30,

  // ─── Fine-tune per-column positions (icon + its count move together) ──────
  profilePreviewUpColOffsetX: 0,
  profilePreviewUpColOffsetY: 0,

  profilePreviewDownColOffsetX: 0,
  profilePreviewDownColOffsetY: 0,

  profilePreviewSavedColOffsetX: 0,
  profilePreviewSavedColOffsetY: 0,

  // ─── Percentage column (flecha.svg icon on top, percentage text below) ─────
  profilePreviewPercentageColOffsetX: 0,
  profilePreviewPercentageColOffsetY: 0,

  /**
   * Individual scale for the flecha icon ONLY.
   * The flecha SVG's arrows occupy roughly 50 % of its 600×600 viewBox,
   * so the default is 1.8 to visually match the upvote/downvote/saved icons.
   * Adjust freely without affecting outer card or other columns.
   */
  profilePreviewFlechaIconScale: 1.8,
  profilePreviewFlechaIconOffsetX: 0,
  profilePreviewFlechaIconOffsetY: 0,

} as const;
