'use client'

import { useLayoutEffect, type RefObject } from 'react'

const DEFAULT_MIN_HEIGHT = 44
const DEFAULT_MAX_HEIGHT = 200

/**
 * Adjusts textarea height to fit content, between minHeight and maxHeight.
 * Call with the textarea ref and current value; use with resize: none and overflowY: auto.
 */
export function useAutoResizeTextarea(
  ref: RefObject<HTMLTextAreaElement | null>,
  value: string,
  options?: { minHeight?: number; maxHeight?: number }
) {
  const minHeight = options?.minHeight ?? DEFAULT_MIN_HEIGHT
  const maxHeight = options?.maxHeight ?? DEFAULT_MAX_HEIGHT

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    el.style.height = 'auto'
    const next = Math.min(maxHeight, Math.max(minHeight, el.scrollHeight))
    el.style.height = `${next}px`
  }, [value, minHeight, maxHeight])
}
