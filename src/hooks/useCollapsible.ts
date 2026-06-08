import { useEffect, useState } from 'react'

/**
 * Boolean open/closed state for a collapsible panel, persisted to localStorage
 * under `key`. Falls back to `defaultOpen` when nothing is stored (or storage
 * is unavailable, e.g. private mode).
 */
export function useCollapsible(key: string, defaultOpen = false) {
  const [open, setOpen] = useState(() => {
    try {
      const stored = localStorage.getItem(key)
      return stored === null ? defaultOpen : stored === 'true'
    } catch {
      return defaultOpen
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, String(open))
    } catch {
      // ignore storage failures (e.g. private mode / disabled storage)
    }
  }, [key, open])

  return [open, setOpen] as const
}
