'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { flushProgress, flushHistoryEvents } from '@/lib/progressTracker'

/**
 * SyncManager — Flushes localStorage progress & watch history to the DB on:
 * - Tab becoming hidden (visibilitychange)
 * - Page unload (beforeunload)
 *
 * Only flushes when the user has an active session.
 * Uses sendBeacon internally so it works reliably on tab close.
 */

function handleVisibilityChange() {
  if (document.visibilityState === 'hidden') {
    flushProgress()
    flushHistoryEvents()
  }
}

function handleBeforeUnload() {
  flushProgress()
  flushHistoryEvents()
}

export default function SyncManager() {
  const { data: session } = useSession()

  useEffect(() => {
    if (!session?.user) return

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [session])

  return null
}
