'use client'

import { useEffect, useState } from 'react'
import { fetchUsage } from '../api'
import { USAGE_BADGE_UI_CONFIG } from '../styles/debateBlockSizes'

const USAGE_STORAGE_KEY = 'physics_debate_usage'
const DEFAULT_DAILY_LIMIT = 30

type Usage = {
  dailyLimit: number
  used: number
  remaining: number
  date: string
}

function getDefaultUsage(): Usage {
  const today = new Date().toISOString().slice(0, 10)
  return { dailyLimit: DEFAULT_DAILY_LIMIT, used: 0, remaining: DEFAULT_DAILY_LIMIT, date: today }
}

function loadUsageFromStorage(): Usage | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(USAGE_STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as Usage
    if (typeof data.remaining === 'number' && typeof data.dailyLimit === 'number') return data
  } catch {
    // ignore
  }
  return null
}

function saveUsageToStorage(u: Usage) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(u))
  } catch {
    // ignore
  }
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

type UsageCounterProps = { inline?: boolean }

export function UsageCounter({ inline = false }: UsageCounterProps) {
  const [usage, setUsage] = useState<Usage | null>(() =>
    USAGE_BADGE_UI_CONFIG.enabled ? loadUsageFromStorage() ?? getDefaultUsage() : null
  )

  async function loadUsage() {
    try {
      const data = await fetchUsage()
      setUsage(data)
      saveUsageToStorage(data)
    } catch {
      // Fallback: show last known or default so limiter is always visible
      setUsage((prev) => prev ?? loadUsageFromStorage() ?? getDefaultUsage())
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

  /** Compact variant for TopBar: always visible */
  if (inline) {
    return (
      <span
        style={{
          fontSize: 13,
          color: 'rgba(255,255,255,0.85)',
          fontWeight: 600,
          whiteSpace: 'nowrap',
        }}
      >
        {usage.remaining} usos
      </span>
    )
  }

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
