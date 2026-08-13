'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { flushProgress, flushHistoryEvents, mergeRemoteProgress, backfillHistorySeconds } from '@/lib/progressTracker'
import { flushWishlist, mergeRemoteWishlist } from '@/lib/wishlistTracker'

/**
 * SyncManager — keeps localStorage and the DB in sync in both directions, on:
 * - Tab becoming hidden (visibilitychange) — flushes progress, history & wishlist
 * - Page unload (beforeunload) — same, via sendBeacon
 * - A periodic poll while the tab is visible — pulls progress & wishlist and
 *   silently merges them in, so a change made on another device shows up here
 *   without needing a reload
 *
 * Only runs when the user has an active session.
 */

const POLL_INTERVAL_MS = 30_000

let pollTimer: ReturnType<typeof setInterval> | null = null
let didBackfillHistory = false

function pollRemoteUpdates() {
  Promise.all([
    fetch('/api/get-progress').then(res => (res.ok ? res.json() : null)).catch(() => null),
    fetch('/api/get-watchlist').then(res => (res.ok ? res.json() : null)).catch(() => null),
  ]).then(([progress, watchlist]) => {
    if (Array.isArray(progress) && progress.length > 0) mergeRemoteProgress(progress)
    if (Array.isArray(watchlist) && watchlist.length > 0) mergeRemoteWishlist(watchlist)

    // Once per session, after the merge: lift watch seconds out of progress rows
    // and into the history ledger for anything watched before it tracked them.
    if (!didBackfillHistory) {
      didBackfillHistory = true
      backfillHistorySeconds()
    }
  })
}

function startPolling() {
  if (pollTimer) return
  pollTimer = setInterval(pollRemoteUpdates, POLL_INTERVAL_MS)
}

function stopPolling() {
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = null
}

function handleVisibilityChange() {
  if (document.visibilityState === 'hidden') {
    stopPolling()
    flushProgress()
    flushHistoryEvents()
    flushWishlist()
  } else {
    // Catch up immediately on regaining focus, then resume the periodic poll.
    pollRemoteUpdates()
    startPolling()
  }
}

function handleBeforeUnload() {
  flushProgress()
  flushHistoryEvents()
  flushWishlist()
}

export default function SyncManager() {
  const { data: session } = useSession()

  useEffect(() => {
    if (!session?.user) return

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    if (document.visibilityState === 'visible') {
      pollRemoteUpdates()
      startPolling()
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      stopPolling()
    }
  }, [session])

  return null
}
