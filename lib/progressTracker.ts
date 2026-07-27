/**
 * Unified watch progress tracker.
 *
 * All providers write to a single key per TMDB item: `progress-{tmdbId}`.
 * Conflict resolution: only overwrites the top-level `watched` time when the
 * incoming value is strictly greater (so switching servers never loses progress).
 * TV show_progress is merged per-episode using the same rule.
 *
 * Sync strategy:
 * - Writes go to localStorage immediately (no latency, offline-safe)
 * - A debounced background sync pushes to /api/sync-progress after 10s of inactivity
 * - flushProgress() sends all items immediately via sendBeacon (reliable on unload)
 * - mergeRemoteProgress() merges DB items into localStorage using latest-updatedAt-wins
 */

const STORAGE_PREFIX = 'progress-'
const SYNC_DEBOUNCE_MS = 10_000

export interface EpisodeProgress {
  season: number
  episode: number
  watched: number
  duration: number
  updatedAt: number
}

export interface WatchProgress {
  id: string
  mediaType: 'movie' | 'tv'
  title: string
  poster_path?: string | null
  backdrop_path?: string | null
  watched: number
  duration: number
  /** Last-watched season (TV only) */
  season?: number
  /** Last-watched episode (TV only) */
  episode?: number
  show_progress?: Record<string, EpisodeProgress>
  lastProvider: string
  updatedAt: number
}

// -- Internal helpers ----------------------------------------------------------

function storageKey(tmdbId: string): string {
  return `${STORAGE_PREFIX}${tmdbId}`
}

function mergeShowProgress(
  existing: Record<string, EpisodeProgress> | undefined,
  incoming: Record<string, EpisodeProgress> | undefined,
  isRealTimeEvent?: boolean,
  activeSeason?: number,
  activeEpisode?: number
): Record<string, EpisodeProgress> | undefined {
  if (!existing && !incoming) return undefined
  const merged: Record<string, EpisodeProgress> = { ...(existing ?? {}) }

  const activeEpKey = activeSeason !== undefined && activeEpisode !== undefined
    ? `s${activeSeason}e${activeEpisode}`
    : undefined

  if (incoming) {
    for (const [key, ep] of Object.entries(incoming)) {
      const prev = merged[key]
      const isCurrentActive = isRealTimeEvent && key === activeEpKey

      if (!prev || isCurrentActive || ep.watched > prev.watched) {
        merged[key] = ep
      }
    }
  }
  return merged
}

// -- Debounced background sync -------------------------------------------------

let syncTimer: ReturnType<typeof setTimeout> | null = null

function scheduleDebouncedSync(item: WatchProgress): void {
  if (typeof window === 'undefined') return
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(() => {
    syncTimer = null
    fetch('/api/sync-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([item]),
    }).catch(err => console.error('[progressTracker] Background sync failed:', err))
  }, SYNC_DEBOUNCE_MS)
}

// -- Public API ----------------------------------------------------------------

/**
 * Persist progress for a media item.
 * Writes to localStorage immediately, then schedules a debounced DB sync.
 */
export function saveProgress(
  tmdbId: string,
  mediaType: 'movie' | 'tv',
  provider: string,
  data: {
    watched: number
    duration: number
    title?: string
    poster_path?: string | null
    backdrop_path?: string | null
    season?: number
    episode?: number
    show_progress?: Record<string, EpisodeProgress>
    isRealTimeEvent?: boolean
  }
): void {
  if (typeof localStorage === 'undefined') return

  const existing = getProgress(tmdbId)

  const isDifferentEpisode =
    mediaType === 'tv' &&
    existing?.mediaType === 'tv' &&
    data.season !== undefined &&
    data.episode !== undefined &&
    existing.season !== undefined &&
    existing.episode !== undefined &&
    (data.season !== existing.season || data.episode !== existing.episode)

  const shouldUpdateWatched =
    isDifferentEpisode ||
    data.isRealTimeEvent ||
    data.watched > (existing?.watched ?? 0)

  const updated: WatchProgress = {
    id: tmdbId,
    mediaType,
    title: data.title || existing?.title || '',
    poster_path: data.poster_path !== undefined ? data.poster_path : existing?.poster_path ?? null,
    backdrop_path: data.backdrop_path !== undefined ? data.backdrop_path : existing?.backdrop_path ?? null,
    watched: shouldUpdateWatched ? data.watched : (existing?.watched ?? 0),
    duration: data.duration || existing?.duration || 0,
    season: data.season ?? existing?.season,
    episode: data.episode ?? existing?.episode,
    show_progress: mergeShowProgress(
      existing?.show_progress,
      data.show_progress,
      data.isRealTimeEvent,
      data.season,
      data.episode
    ),
    lastProvider: provider,
    updatedAt: Date.now(),
  }

  try {
    localStorage.setItem(storageKey(tmdbId), JSON.stringify(updated))
    scheduleDebouncedSync(updated)
  } catch (err) {
    console.error('[progressTracker] Failed to save:', err)
  }
}

/** Read a single item's progress. Returns null if not found or on SSR. */
function getProgress(tmdbId: string): WatchProgress | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(storageKey(tmdbId))
    return raw ? (JSON.parse(raw) as WatchProgress) : null
  } catch {
    return null
  }
}

/**
 * Returns the resume time in seconds for the given media item.
 * For TV, returns the episode-specific progress when season+episode are provided.
 */
export function getResumeTime(tmdbId: string, season?: number, episode?: number): number {
  const p = getProgress(tmdbId)
  if (!p) return 0
  
  if (p.mediaType === 'tv' && season != null && episode != null) {
    const epKey = `s${season}e${episode}`
    const ep = p.show_progress?.[epKey]
    if (ep) {
      // If completed (over 95%), reset to beginning
      if (ep.duration > 0 && (ep.watched / ep.duration) > 0.95) return 0
      return ep.watched
    }
    return 0
  }
  
  // Movie completed check
  if (p.duration > 0 && (p.watched / p.duration) > 0.95) return 0
  return p.watched ?? 0
}

/**
 * All tracked items, sorted by most recently updated.
 */
export function getAllProgress(): WatchProgress[] {
  if (typeof localStorage === 'undefined') return []
  const items: WatchProgress[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key?.startsWith(STORAGE_PREFIX)) continue
    try {
      const raw = localStorage.getItem(key)
      if (raw) items.push(JSON.parse(raw) as WatchProgress)
    } catch {
      // skip malformed entries
    }
  }
  return items.sort((a, b) => b.updatedAt - a.updatedAt)
}

/** Remove a single item from the tracker. */
export function removeProgress(tmdbId: string): void {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(storageKey(tmdbId))
}

/**
 * Flush all localStorage progress to the server immediately.
 * Uses sendBeacon when available (works reliably on tab close/unload).
 * Falls back to fetch() for older browsers.
 */
export function flushProgress(): void {
  if (typeof window === 'undefined') return
  const items = getAllProgress()
  if (items.length === 0) return

  if (syncTimer) {
    clearTimeout(syncTimer)
    syncTimer = null
  }

  const payload = JSON.stringify(items)
  const url = '/api/sync-progress'

  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }))
  } else {
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(err => console.error('[progressTracker] Flush sync failed:', err))
  }
}

/**
 * Merge remote DB items into localStorage using latest-updatedAt-wins strategy.
 * Call this after fetching history from the server on login.
 */
export function mergeRemoteProgress(remoteItems: WatchProgress[]): void {
  if (typeof localStorage === 'undefined') return
  for (const remote of remoteItems) {
    const local = getProgress(remote.id)
    if (!local || remote.updatedAt > local.updatedAt) {
      try {
        localStorage.setItem(storageKey(remote.id), JSON.stringify(remote))
      } catch (err) {
        console.error('[progressTracker] Failed to merge remote item:', err)
      }
    }
  }
}
