'use client'

import { STYLE_CONTROLS } from '../styles/debateBlockSizes'

const SC = STYLE_CONTROLS

type Props = {
  title: string
  iconSrc: string
}

/**
 * Cabecera de sección con estrella en gutter (posición absoluta).
 * El texto usa TEXT_LEFT_PADDING; cambiar STAR_MAIN_SIZE no mueve el texto.
 */
export function SectionHeaderWithIcon({ title, iconSrc }: Props) {
  return (
    <div
      style={{
        position: 'relative',
        paddingLeft: SC.TEXT_LEFT_PADDING,
        marginBottom: SC.GAP_AFTER_MAIN_TITLE,
        minHeight: SC.STAR_MAIN_SIZE,
      }}
      role="heading"
      aria-level={2}
    >
      {/* Estrella: absoluta, no afecta flujo del texto */}
      <div
        style={{
          position: 'absolute',
          left: SC.STAR_MAIN_LEFT_OFFSET,
          top: SC.STAR_MAIN_TOP_OFFSET,
          width: SC.STAR_MAIN_SIZE,
          height: SC.STAR_MAIN_SIZE,
        }}
        aria-hidden
      >
        <img
          src={iconSrc}
          alt=""
          width={SC.STAR_MAIN_SIZE}
          height={SC.STAR_MAIN_SIZE}
          style={{ display: 'block', width: SC.STAR_MAIN_SIZE, height: SC.STAR_MAIN_SIZE }}
        />
      </div>
      <span
        style={{
          fontSize: SC.TEXT_MAIN_TITLE_SIZE,
          lineHeight: SC.LINE_HEIGHT_MAIN,
          fontWeight: 600,
          color: '#e4e4e7',
          display: 'block',
        }}
      >
        {title}
      </span>
    </div>
  )
}
