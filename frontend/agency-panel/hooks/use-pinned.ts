"use client"

import { useCallback, useEffect, useState } from "react"

/**
 * A per-browser "keep an eye on this" bookmark set for a board
 * (caregivers pipeline, patients pipeline, candidates list — each
 * board passes its own `storageKey` so their pin sets never mix).
 * Stored in localStorage rather than the backend: pinning is a
 * personal scratch preference for whoever's looking at the screen
 * right now, not agency data other staff need to see or that should
 * survive a device switch.
 */
export function usePinned(storageKey: string) {
  const key = `pinned:${storageKey}`
  const [pinned, setPinned] = useState<Set<number>>(new Set())

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw) setPinned(new Set(JSON.parse(raw) as number[]))
    } catch {
      // Private-window / storage-blocked — pinning just won't persist
      // across reloads; nothing to surface to the user for this.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const toggle = useCallback((id: number) => {
    setPinned((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      try {
        localStorage.setItem(key, JSON.stringify([...next]))
      } catch {}
      return next
    })
  }, [key])

  const isPinned = useCallback((id: number) => pinned.has(id), [pinned])

  return { pinned, isPinned, toggle }
}
