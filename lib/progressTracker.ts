/**
 * Unified watch progress tracker.
 *
 * All providers write to a single key per TMDB item: `progress-{tmdbId}`.
 * Conflict resolution: only overwrites the top-level `watched` time when the
 * incoming value is strictly greater (so switching servers never loses progress).
 * TV show_progress is merged per-episode using the same rule.
 */

export const STORAGE_PREFIX = 'progress-'

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

function storageKey(tmdbId: string): string {
  return `${STORAGE_PREFIX}${tmdbId}`
}

function mergeShowProgress(
  existing: Record<string, EpisodeProgress> | undefined,
  incoming: Record<string, EpisodeProgress> | undefined
): Record<string, EpisodeProgress> | undefined {
  if (!existing && !incoming) return undefined
  const merged: Record<string, EpisodeProgress> = { ...(existing ?? {}) }
  if (incoming) {
    for (const [key, ep] of Object.entries(incoming)) {
      const prev = merged[key]
      if (!prev || ep.watched > prev.watched) {
        merged[key] = ep
      }
    }
  }
  return merged
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Persist progress for a media item.
 * Overwrites top-level `watched` only when `data.watched` is greater than stored.
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
  }
): void {
  if (typeof localStorage === 'undefined') return

  const existing = getProgress(tmdbId)
  const shouldUpdateWatched = data.watched > (existing?.watched ?? 0)

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
    show_progress: mergeShowProgress(existing?.show_progress, data.show_progress),
    lastProvider: provider,
    updatedAt: Date.now(),
  }

  try {
    localStorage.setItem(storageKey(tmdbId), JSON.stringify(updated))
  } catch (err) {
    console.error('[progressTracker] Failed to save:', err)
  }
}

/** Read a single item's progress. Returns null if not found or on SSR. */
export function getProgress(tmdbId: string): WatchProgress | null {
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
    return p.show_progress?.[epKey]?.watched ?? 0
  }
  return p.watched ?? 0
}

/**
 * All tracked items, sorted by most recently updated.
 * Performs a single O(n) scan of localStorage keys with the known prefix.
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
