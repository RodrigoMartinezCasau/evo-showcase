'use client'

import { useEffect, useState } from 'react'
import { fetchUsage } from '../api'
import { USAGE_BADGE_UI_CONFIG } from '../styles/debateBlockSizes'

type Usage = {
  dailyLimit: number
  used: number
  remaining: number
  date: string
}

function styleWithOffsets(
  base: React.CSSProperties,
  topPx: number,
  leftPx: number,
  rightPx: number | null,
  bottomPx: number | null
): React.CSSProperties {
  const s: React.CSSProperties = { ...base, position: 'absolute', top: topPx, left: leftPx }
  if (rightPx != null) s.right = rightPx
  if (bottomPx != null) s.bottom = bottomPx
  return s
}

export function UsageCounter() {
  const [usage, setUsage] = useState<Usage | null>(null)

  async function loadUsage() {
    try {
      const data = await fetchUsage()
      setUsage(data)
    } catch {
      // Silently ignore; counter is informational only
    }
  }

  useEffect(() => {
    loadUsage()
    const handler = () => {
      void loadUsage()
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('usage-updated', handler)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('usage-updated', handler)
      }
    }
  }, [])

  if (!usage || !USAGE_BADGE_UI_CONFIG.enabled) return null

  const cfg = USAGE_BADGE_UI_CONFIG
  const row = cfg.row
  const label = cfg.label
  const value = cfg.value
  const icon = cfg.icon

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: row.heightPx,
        marginTop: row.marginTopPx,
        marginLeft: row.marginLeftPx,
        marginRight: row.marginRightPx,
        marginBottom: row.marginBottomPx,
      }}
    >
      <span
        style={styleWithOffsets(
          {
            fontSize: label.fontSizePx,
            color: label.color,
            fontWeight: label.fontWeight,
          },
          label.topPx,
          label.leftPx,
          label.rightPx,
          label.bottomPx
        )}
      >
        {label.text}
      </span>
      <span
        style={styleWithOffsets(
          {
            fontSize: value.fontSizePx,
            color: value.color,
            fontWeight: value.fontWeight,
            maxWidth: value.maxWidthPx,
            textAlign: value.textAlign,
            overflow: value.overflow,
            textOverflow: value.textOverflow,
            whiteSpace: value.whiteSpace,
          },
          value.topPx,
          value.leftPx,
          value.rightPx,
          value.bottomPx
        )}
      >
        {usage.remaining}
      </span>
      <span
        style={styleWithOffsets(
          {
            width: icon.sizePx,
            height: icon.sizePx,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: icon.opacity,
          },
          icon.topPx + icon.nudgeYpx,
          icon.leftPx + icon.nudgeXpx,
          icon.rightPx,
          icon.bottomPx
        )}
      >
        <img
          src={icon.src}
          alt=""
          role="presentation"
          style={{
            width: icon.sizePx,
            height: icon.sizePx,
            objectFit: 'contain',
            display: 'block',
          }}
        />
      </span>
    </div>
  )
}
