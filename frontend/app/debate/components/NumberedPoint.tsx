'use client'

import { STYLE_CONTROLS } from '../styles/debateBlockSizes'

const SC = STYLE_CONTROLS

type Props = {
  index: number
  subtitle: string
  bullets: Array<{ text: string } | string>
  starIconSrc: string
}

/**
 * Punto numerado: flex layout para evitar overlap entre icono, título y bullets.
 */
export function NumberedPoint({ index, subtitle, bullets, starIconSrc }: Props) {
  return (
    <div style={{ marginBottom: SC.SPACING_BETWEEN_BLOCKS }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <div
          style={{
            flexShrink: 0,
            width: SC.STAR_SUBTITLE_SIZE,
            height: SC.STAR_SUBTITLE_SIZE,
            position: 'relative',
          }}
          aria-hidden
        >
          <img
            src={starIconSrc}
            alt=""
            width={SC.STAR_SUBTITLE_SIZE}
            height={SC.STAR_SUBTITLE_SIZE}
            style={{ display: 'block', width: SC.STAR_SUBTITLE_SIZE, height: SC.STAR_SUBTITLE_SIZE }}
          />
          <span
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: `translate(-50%, -50%) translate(${SC.NUMBER_LEFT_OFFSET}px, ${SC.NUMBER_TOP_OFFSET}px)`,
              fontSize: SC.NUMBER_SIZE,
              fontWeight: SC.NUMBER_WEIGHT,
              color: '#e4e4e7',
              pointerEvents: 'none',
              margin: 0,
              lineHeight: 1,
            }}
          >
            {index}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              marginBottom: bullets.length > 0 ? SC.SPACING_BETWEEN_SUBTITLE_AND_BODY : 0,
              fontSize: SC.TEXT_SUBTITLE_SIZE,
              lineHeight: 1.4,
              color: '#a3a3a3',
            }}
          >
            {subtitle}
          </p>
          {bullets.length > 0 && (
            <ul
              style={{
                margin: 0,
                paddingLeft: SC.BODY_PADDING_LEFT,
                listStyle: 'disc',
                fontSize: SC.TEXT_BODY_SIZE,
                lineHeight: SC.LINE_HEIGHT_BODY,
                color: '#e4e4e7',
              }}
            >
              {bullets.map((b, i) => (
                <li key={i} style={{ marginBottom: SC.SPACING_BETWEEN_BULLETS }}>
                  {typeof b === 'string' ? b : (b as { text: string }).text}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
