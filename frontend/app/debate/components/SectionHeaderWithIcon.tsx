'use client'

import { UI_TUNING } from '../styles/debateBlockSizes'

const starContainerStyle: React.CSSProperties = {
  flexShrink: 0,
  width: UI_TUNING.STAR_TITLE_SIZE_PX,
  height: UI_TUNING.STAR_TITLE_SIZE_PX,
  minWidth: UI_TUNING.STAR_TITLE_SIZE_PX,
  minHeight: UI_TUNING.STAR_TITLE_SIZE_PX,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const textContainerStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
}

const titleStyle: React.CSSProperties = {
  fontSize: UI_TUNING.FONT_TITLE_PX,
  lineHeight: UI_TUNING.LINE_TITLE,
  fontWeight: 600,
  color: '#e4e4e7',
  margin: 0,
}

type Props = {
  title: string
  iconSrc: string
}

/**
 * Cabecera de sección con icono a la izquierda (títulos principales: Postura, Contrapostura, Pregunta).
 */
export function SectionHeaderWithIcon({ title, iconSrc }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: UI_TUNING.STAR_GAP_PX,
        marginBottom: UI_TUNING.GAP_AFTER_MAIN_TITLE_PX,
      }}
      role="heading"
      aria-level={2}
    >
      <div style={starContainerStyle} aria-hidden>
        <img
          src={iconSrc}
          alt=""
          width={UI_TUNING.STAR_TITLE_SIZE_PX}
          height={UI_TUNING.STAR_TITLE_SIZE_PX}
          style={{ display: 'block', width: UI_TUNING.STAR_TITLE_SIZE_PX, height: UI_TUNING.STAR_TITLE_SIZE_PX }}
        />
      </div>
      <div style={textContainerStyle}>
        <span style={titleStyle}>{title}</span>
      </div>
    </div>
  )
}
