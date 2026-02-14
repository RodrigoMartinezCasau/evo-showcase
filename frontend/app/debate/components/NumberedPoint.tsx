'use client'

import { UI_TUNING } from '../styles/debateBlockSizes'

const starWrapperStyle: React.CSSProperties = {
  position: 'relative',
  flexShrink: 0,
  width: UI_TUNING.STAR_SUB_SIZE_PX,
  height: UI_TUNING.STAR_SUB_SIZE_PX,
  minWidth: UI_TUNING.STAR_SUB_SIZE_PX,
  minHeight: UI_TUNING.STAR_SUB_SIZE_PX,
}

const starImgStyle: React.CSSProperties = {
  display: 'block',
  width: UI_TUNING.STAR_SUB_SIZE_PX,
  height: UI_TUNING.STAR_SUB_SIZE_PX,
}

const numberOverlayStyle: React.CSSProperties = {
  position: 'absolute',
  left: '50%',
  top: '50%',
  transform: `translate(-50%, -50%) translate(${UI_TUNING.STAR_NUM_OFFSET_X_PX}px, ${UI_TUNING.STAR_NUM_OFFSET_Y_PX}px)`,
  fontSize: UI_TUNING.STAR_NUM_FONT_PX,
  fontWeight: UI_TUNING.STAR_NUM_WEIGHT,
  color: '#e4e4e7',
  pointerEvents: 'none',
  margin: 0,
  lineHeight: 1,
}

const textContainerStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
}

const subtitleStyle: React.CSSProperties = {
  fontSize: UI_TUNING.FONT_SUBTITLE_PX,
  lineHeight: UI_TUNING.LINE_SUBTITLE,
  color: '#a3a3a3',
  margin: 0,
}

const bodyStyle: React.CSSProperties = {
  margin: 0,
  paddingLeft: UI_TUNING.BODY_PADDING_LEFT_PX,
  listStyle: 'disc',
  fontSize: UI_TUNING.FONT_BODY_PX,
  lineHeight: UI_TUNING.LINE_BODY,
  color: '#e4e4e7',
}

type Props = {
  index: number
  subtitle: string
  bullets: Array<{ text: string } | string>
  starIconSrc: string
}

/**
 * Un punto numerado: estrella con número + subtítulo, y debajo los bullets.
 */
export function NumberedPoint({ index, subtitle, bullets, starIconSrc }: Props) {
  return (
    <div style={{ marginBottom: UI_TUNING.GAP_BETWEEN_POINTS_PX }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: UI_TUNING.STAR_GAP_PX,
        }}
      >
        <div style={starWrapperStyle} aria-hidden>
          <img src={starIconSrc} alt="" width={UI_TUNING.STAR_SUB_SIZE_PX} height={UI_TUNING.STAR_SUB_SIZE_PX} style={starImgStyle} />
          <span style={numberOverlayStyle}>{index}</span>
        </div>
        <div style={textContainerStyle}>
          <p style={subtitleStyle}>{subtitle}</p>
        </div>
      </div>
      {bullets.length > 0 && (
        <ul style={{ ...bodyStyle, marginTop: UI_TUNING.GAP_SUBTITLE_TO_BODY_PX }}>
          {bullets.map((b, i) => (
            <li key={i} style={{ marginBottom: UI_TUNING.GAP_BETWEEN_BULLETS_PX }}>
              {typeof b === 'string' ? b : (b as { text: string }).text}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
