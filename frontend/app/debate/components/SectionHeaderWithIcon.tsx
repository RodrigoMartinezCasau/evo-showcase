'use client'

import { STYLE_CONTROLS } from '../styles/debateBlockSizes'

const SC = STYLE_CONTROLS

type Props = {
  title: string
  iconSrc: string
}

/**
 * Cabecera de sección con estrella. Flex layout evita overlap con títulos largos.
 */
export function SectionHeaderWithIcon({ title, iconSrc }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: SC.GAP_AFTER_MAIN_TITLE,
      }}
      role="heading"
      aria-level={2}
    >
      <div
        style={{
          flexShrink: 0,
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
          flex: 1,
          minWidth: 0,
          fontSize: SC.TEXT_MAIN_TITLE_SIZE,
          lineHeight: 1.35,
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
