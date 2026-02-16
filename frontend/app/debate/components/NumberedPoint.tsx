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
 * Punto numerado: estrella + número en gutter (absolutos), texto con TEXT_LEFT_PADDING.
 * Cambiar STAR_SUBTITLE_SIZE o NUMBER_SIZE no mueve el texto.
 */
export function NumberedPoint({ index, subtitle, bullets, starIconSrc }: Props) {
  return (
    <div style={{ marginBottom: SC.SPACING_BETWEEN_BLOCKS }}>
      {/* Fila subtítulo: estrella absoluta + texto */}
      <div
        style={{
          position: 'relative',
          paddingLeft: SC.TEXT_LEFT_PADDING,
          minHeight: SC.STAR_SUBTITLE_SIZE,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: SC.STAR_SUBTITLE_LEFT_OFFSET,
            top: SC.STAR_SUBTITLE_TOP_OFFSET,
            width: SC.STAR_SUBTITLE_SIZE,
            height: SC.STAR_SUBTITLE_SIZE,
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
        <p
          style={{
            margin: 0,
            fontSize: SC.TEXT_SUBTITLE_SIZE,
            lineHeight: SC.LINE_HEIGHT_MAIN,
            color: '#a3a3a3',
          }}
        >
          {subtitle}
        </p>
      </div>
      {bullets.length > 0 && (
        <ul
          style={{
            margin: `${SC.SPACING_BETWEEN_SUBTITLE_AND_BODY}px 0 0`,
            paddingLeft: SC.BODY_PADDING_LEFT + SC.TEXT_LEFT_PADDING,
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
  )
}
