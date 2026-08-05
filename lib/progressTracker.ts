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
 * - mergeRemoteProgress() merges DB items into localStorage, preferring whichever
 *   side has the more advanced watch position (later season/episode beats a merely
 *   more recent updatedAt — see isProgressAtLeastAsAdvanced)
 *
 * DB sync is opt-in per call via `isAuthenticated` (callers read this from
 * `useSession()`, since the session cookie is httpOnly and can't be sniffed from a
 * plain module). Guests never hit the sync endpoints — localStorage remains their
 * entire experience, with zero wasted network calls.
 *
 * Watch History (`logHistoryEvent`/`getAllHistoryEvents`) is a parallel log of
 * "started"/"completed" events — distinct from the mutable progress pointer above.
 * One row per episode/movie (see historyEpisodeKey), updated in place rather than
 * appended, so resuming or rewatching the same episode doesn't pile up duplicate
 * rows. It powers the Profile page's real history & stats, and survives a title
 * being removed from Continue Watching.
 */

import type { Genre } from '@/lib/tmdb'

const STORAGE_PREFIX = 'progress-'
const HISTORY_STORAGE_KEY = 'cinemaphora-history-events'
const PROGRESS_TOMBSTONES_KEY = 'cinemaphora-deleted-progress'
const HISTORY_MAX_ITEMS = 500
const SYNC_DEBOUNCE_MS = 10_000
const STARTED_THRESHOLD_SECONDS = 30
const COMPLETED_RATIO = 0.9

function getProgressTombstones(): Record<string, number> {
  if (typeof localStorage === 'undefined') return {}
  try {
    const raw = localStorage.getItem(PROGRESS_TOMBSTONES_KEY)
    return raw ? (JSON.parse(raw) as Record<string, number>) : {}
  } catch {
    return {}
  }
}

function setProgressTombstone(tmdbId: string, timestamp = Date.now()): void {
  if (typeof localStorage === 'undefined') return
  try {
    const tombstones = getProgressTombstones()
    tombstones[tmdbId] = timestamp
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
    for (const key of Object.keys(tombstones)) {
      if (tombstones[key] < thirtyDaysAgo) delete tombstones[key]
    }
    localStorage.setItem(PROGRESS_TOMBSTONES_KEY, JSON.stringify(tombstones))
  } catch (err) {
    console.error('[progressTracker] Failed to write tombstone:', err)
  }
}

function clearProgressTombstone(tmdbId: string): void {
  if (typeof localStorage === 'undefined') return
  try {
    const tombstones = getProgressTombstones()
    if (tmdbId in tombstones) {
      delete tombstones[tmdbId]
      localStorage.setItem(PROGRESS_TOMBSTONES_KEY, JSON.stringify(tombstones))
    }
  } catch (err) {
    console.error('[progressTracker] Failed to clear tombstone:', err)
  }
}

function syncProgressDelete(tmdbId: string): void {
  fetch('/api/sync-progress', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tmdbId }),
  }).catch(err => console.error('[progressTracker] Delete progress sync failed:', err))
}


export interface EpisodeProgress {
  season: number
  episode: number
  watched: number
  duration: number
  updatedAt: number
}

/** Tracks which "started"/"completed" history events have already been logged for an item. */
interface HistoryFlags {
  started?: boolean
  completed?: boolean
  /** TV only, keyed by `s{season}e{episode}` */
  episodes?: Record<string, { started?: boolean; completed?: boolean }>
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
  genres?: Genre[] | null
  lastProvider: string
  updatedAt: number
  /** Internal bookkeeping — which history events have already fired for this item. */
  history?: HistoryFlags
}

export interface HistoryEvent {
  id: string
  tmdbId: string
  mediaType: 'movie' | 'tv'
  title: string
  poster_path?: string | null
  season?: number
  episode?: number
  event: 'started' | 'completed'
  genres?: Genre[] | null
  occurredAt: number
}

// Internal helpers

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

/**
 * Detects newly-crossed "started"/"completed" thresholds for the current playback
 * position, updating (and returning) the flags so each event only fires once.
 */
function detectHistoryEvents(
  mediaType: 'movie' | 'tv',
  existingFlags: HistoryFlags | undefined,
  season: number | undefined,
  episode: number | undefined,
  watched: number,
  duration: number
): { events: Array<'started' | 'completed'>; flags: HistoryFlags } {
  const events: Array<'started' | 'completed'> = []
  const flags: HistoryFlags = { ...existingFlags }

  let target: { started?: boolean; completed?: boolean } = flags
  if (mediaType === 'tv' && season != null && episode != null) {
    const epKey = `s${season}e${episode}`
    flags.episodes = { ...flags.episodes }
    flags.episodes[epKey] = { ...flags.episodes[epKey] }
    target = flags.episodes[epKey]
  }

  if (!target.started && watched >= STARTED_THRESHOLD_SECONDS) {
    target.started = true
    events.push('started')
  }
  if (!target.completed && duration > 0 && watched / duration >= COMPLETED_RATIO) {
    target.completed = true
    events.push('completed')
  }

  return { events, flags }
}

// Debounced background sync

let syncTimer: ReturnType<typeof setTimeout> | null = null
let historySyncTimer: ReturnType<typeof setTimeout> | null = null

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

function scheduleHistorySync(items: HistoryEvent[]): void {
  if (typeof window === 'undefined' || items.length === 0) return
  if (historySyncTimer) clearTimeout(historySyncTimer)
  historySyncTimer = setTimeout(() => {
    historySyncTimer = null
    fetch('/api/sync-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(items),
    }).catch(err => console.error('[progressTracker] History sync failed:', err))
  }, SYNC_DEBOUNCE_MS)
}

// Public API — progress

/**
 * Persist progress for a media item.
 * Writes to localStorage immediately, then (when `isAuthenticated`) schedules a
 * debounced DB sync and logs any newly-crossed "started"/"completed" history events.
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
    genres?: Genre[] | null
    isRealTimeEvent?: boolean
  },
  isAuthenticated = false
): void {
  if (typeof localStorage === 'undefined') return

  const existing = getProgress(tmdbId)

  const rawWatched = data.watched ?? 0
  const rawDuration = data.duration ?? 0
  const watchedNum = Math.round(Number(rawWatched) || 0)
  const durationNum = Math.round(Number(rawDuration) || 0)
  const seasonNum = typeof data.season === 'number' && !isNaN(data.season)
    ? Math.round(data.season)
    : (data.season ? parseInt(String(data.season), 10) || undefined : undefined)
  const episodeNum = typeof data.episode === 'number' && !isNaN(data.episode)
    ? Math.round(data.episode)
    : (data.episode ? parseInt(String(data.episode), 10) || undefined : undefined)

  const isDifferentEpisode =
    mediaType === 'tv' &&
    existing?.mediaType === 'tv' &&
    seasonNum !== undefined &&
    episodeNum !== undefined &&
    existing.season !== undefined &&
    existing.episode !== undefined &&
    (seasonNum !== existing.season || episodeNum !== existing.episode)

  const shouldUpdateWatched =
    isDifferentEpisode ||
    data.isRealTimeEvent ||
    watchedNum > (existing?.watched ?? 0)

  const title = data.title || existing?.title || ''
  const poster_path = data.poster_path !== undefined ? data.poster_path : existing?.poster_path ?? null
  const genres = data.genres !== undefined ? data.genres : existing?.genres ?? null

  const { events: historyEvents, flags: history } = detectHistoryEvents(
    mediaType,
    existing?.history,
    seasonNum,
    episodeNum,
    watchedNum,
    durationNum
  )

  const updated: WatchProgress = {
    id: String(tmdbId),
    mediaType,
    title,
    poster_path,
    backdrop_path: data.backdrop_path !== undefined ? data.backdrop_path : existing?.backdrop_path ?? null,
    watched: shouldUpdateWatched ? watchedNum : (existing?.watched ?? 0),
    duration: durationNum || existing?.duration || 0,
    season: seasonNum ?? existing?.season,
    episode: episodeNum ?? existing?.episode,
    show_progress: mergeShowProgress(
      existing?.show_progress,
      data.show_progress,
      data.isRealTimeEvent,
      seasonNum,
      episodeNum
    ),
    genres,
    lastProvider: provider,
    updatedAt: Date.now(),
    history,
  }

  try {
    localStorage.setItem(storageKey(String(tmdbId)), JSON.stringify(updated))
    clearProgressTombstone(String(tmdbId))
    if (isAuthenticated) scheduleDebouncedSync(updated)

    for (const event of historyEvents) {
      logHistoryEvent(String(tmdbId), mediaType, event, {
        title,
        poster_path,
        season: seasonNum,
        episode: episodeNum,
        genres,
      }, isAuthenticated)
    }
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
export function removeProgress(tmdbId: string, isAuthenticated = false): void {
  if (typeof localStorage === 'undefined') return
  const idStr = String(tmdbId).trim()
  localStorage.removeItem(storageKey(idStr))
  setProgressTombstone(idStr)
  if (isAuthenticated) {
    syncProgressDelete(idStr)
  }
}

/**
 * Flush all localStorage progress to the server immediately.
 * Uses sendBeacon when available (works reliably on tab close/unload).
 * Falls back to fetch() for older browsers.
 * Callers are expected to only invoke this for authenticated sessions (see SyncManager).
 */
export function flushProgress(): void {
  if (typeof window === 'undefined') return
  const tombstones = getProgressTombstones()
  const items = getAllProgress().filter(item => {
    const deletedAt = tombstones[item.id]
    return !deletedAt || item.updatedAt > deletedAt
  })
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
 * True when `a`'s watch position is at least as advanced as `b`'s.
 *
 * For TV, a later season/episode always wins regardless of raw timestamps —
 * two devices can drift out of clock sync, but "further into the show" is
 * never wrong as a source of truth. Ties (same episode) fall back to watched
 * seconds, then updatedAt. Movies, and any TV item missing season/episode,
 * skip straight to the watched/updatedAt comparison.
 */
function isProgressAtLeastAsAdvanced(a: WatchProgress, b: WatchProgress): boolean {
  if (
    a.mediaType === 'tv' && b.mediaType === 'tv' &&
    a.season != null && a.episode != null &&
    b.season != null && b.episode != null
  ) {
    if (a.season !== b.season) return a.season > b.season
    if (a.episode !== b.episode) return a.episode > b.episode
  }
  if (a.watched !== b.watched) return a.watched > b.watched
  return a.updatedAt >= b.updatedAt
}

/**
 * Merge remote DB items into localStorage. The item with the more advanced
 * watch position (see `isProgressAtLeastAsAdvanced`) becomes the source of
 * truth for the top-level pointer (season/episode/watched/title/etc.), while
 * per-episode `show_progress` is unioned from both — same higher-watched-wins
 * rule `saveProgress` uses — so neither device's episode progress is lost.
 * Call this after fetching history from the server on login.
 */
export function mergeRemoteProgress(remoteItems: WatchProgress[]): void {
  if (typeof localStorage === 'undefined') return
  const tombstones = getProgressTombstones()

  for (const remote of remoteItems) {
    const remoteId = String(remote.id).trim()
    const deletedAt = tombstones[remoteId]

    // If item was deleted locally and remote item hasn't been updated since deletion:
    if (deletedAt && (Number(remote.updatedAt) || 0) <= deletedAt) {
      // Suppress resurrection and ensure server row is deleted
      syncProgressDelete(remoteId)
      continue
    }

    // If remote item is newer than the deletion, user re-watched it after deletion! Clear tombstone.
    if (deletedAt && (Number(remote.updatedAt) || 0) > deletedAt) {
      clearProgressTombstone(remoteId)
    }

    const local = getProgress(remoteId)
    if (!local) {
      try {
        localStorage.setItem(storageKey(remoteId), JSON.stringify(remote))
      } catch (err) {
        console.error('[progressTracker] Failed to merge remote item:', err)
      }
      continue
    }

    const remoteWins = isProgressAtLeastAsAdvanced(remote, local)
    const winner = remoteWins ? remote : local
    const loser = remoteWins ? local : remote

    const merged: WatchProgress = {
      ...winner,
      show_progress: mergeShowProgress(loser.show_progress, winner.show_progress),
    }

    try {
      localStorage.setItem(storageKey(remoteId), JSON.stringify(merged))
    } catch (err) {
      console.error('[progressTracker] Failed to merge remote item:', err)
    }
  }
}

// Public API — watch history

function readHistoryEvents(): HistoryEvent[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as HistoryEvent[]) : []
  } catch {
    return []
  }
}

function writeHistoryEvents(events: HistoryEvent[]): void {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(events))
  } catch (err) {
    console.error('[progressTracker] Failed to save history event:', err)
  }
}

/** Stable per-episode/movie identity, used to upsert a single history row instead of appending. */
function historyEpisodeKey(mediaType: 'movie' | 'tv', tmdbId: string, season?: number, episode?: number): string {
  return `${mediaType}-${tmdbId}-${season ?? 'x'}-${episode ?? 'x'}`
}

/**
 * Record a "started"/"completed" event for an episode/movie — updating its existing
 * history row if one already exists (same episode, resumed or rewatched) rather than
 * appending a new one — and (when `isAuthenticated`) schedule a debounced DB sync.
 * Normally called internally by `saveProgress` — exported for cases like manual
 * "mark as watched" actions.
 */
export function logHistoryEvent(
  tmdbId: string,
  mediaType: 'movie' | 'tv',
  event: 'started' | 'completed',
  data: {
    title: string
    poster_path?: string | null
    season?: number
    episode?: number
    genres?: Genre[] | null
  },
  isAuthenticated = false
): void {
  if (typeof localStorage === 'undefined') return

  const seasonNum = typeof data.season === 'number' && !isNaN(data.season)
    ? Math.round(data.season)
    : (data.season ? parseInt(String(data.season), 10) || undefined : undefined)
  const episodeNum = typeof data.episode === 'number' && !isNaN(data.episode)
    ? Math.round(data.episode)
    : (data.episode ? parseInt(String(data.episode), 10) || undefined : undefined)

  const key = historyEpisodeKey(mediaType, String(tmdbId), seasonNum, episodeNum)
  const events = readHistoryEvents()
  const existingIdx = events.findIndex(
    e => historyEpisodeKey(e.mediaType, e.tmdbId, e.season, e.episode) === key
  )

  let entry: HistoryEvent
  if (existingIdx !== -1) {
    // Same episode/movie — update its row in place, keeping the same id so a DB
    // sync updates the existing record instead of inserting a duplicate.
    entry = {
      ...events[existingIdx],
      title: data.title || events[existingIdx].title,
      poster_path: data.poster_path ?? events[existingIdx].poster_path,
      genres: data.genres ?? events[existingIdx].genres,
      event,
      occurredAt: Date.now(),
    }
    events[existingIdx] = entry
  } else {
    entry = {
      id: crypto.randomUUID(),
      tmdbId: String(tmdbId),
      mediaType,
      title: data.title || '',
      poster_path: data.poster_path ?? null,
      season: seasonNum,
      episode: episodeNum,
      event,
      genres: data.genres ?? null,
      occurredAt: Date.now(),
    }
    events.unshift(entry)
  }

  writeHistoryEvents(events.slice(0, HISTORY_MAX_ITEMS))
  if (isAuthenticated) scheduleHistorySync([entry])
}

/** All locally-logged history events, most recent first. */
export function getAllHistoryEvents(): HistoryEvent[] {
  return readHistoryEvents()
}

/** Remove all history events (used by "Clear All Data" in Settings). */
export function clearHistoryEvents(): void {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(HISTORY_STORAGE_KEY)
}

/**
 * Merge remote DB history events into localStorage, one row per episode/movie
 * (latest-occurredAt-wins). Merges by episode identity rather than `id` — two
 * devices can independently generate different ids for the same episode before
 * ever syncing with each other, so id-only matching would leave duplicates.
 * Call this after fetching history from the server on login.
 */
export function mergeRemoteHistory(remoteItems: HistoryEvent[]): void {
  if (typeof localStorage === 'undefined') return
  const local = readHistoryEvents()
  const byKey = new Map<string, HistoryEvent>()

  for (const e of local) {
    byKey.set(historyEpisodeKey(e.mediaType, e.tmdbId, e.season, e.episode), e)
  }

  for (const remote of remoteItems) {
    const key = historyEpisodeKey(remote.mediaType, remote.tmdbId, remote.season, remote.episode)
    const existing = byKey.get(key)
    if (!existing || remote.occurredAt > existing.occurredAt) {
      byKey.set(key, remote)
    }
  }

  const merged = Array.from(byKey.values())
  merged.sort((a, b) => b.occurredAt - a.occurredAt)
  writeHistoryEvents(merged.slice(0, HISTORY_MAX_ITEMS))
}

/**
 * Flush all localStorage history events to the server immediately (tab close/hidden).
 * Callers are expected to only invoke this for authenticated sessions (see SyncManager).
 */
export function flushHistoryEvents(): void {
  if (typeof window === 'undefined') return
  const events = getAllHistoryEvents()
  if (events.length === 0) return

  if (historySyncTimer) {
    clearTimeout(historySyncTimer)
    historySyncTimer = null
  }

  const payload = JSON.stringify(events)
  const url = '/api/sync-history'

  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }))
  } else {
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(err => console.error('[progressTracker] History flush failed:', err))
  }
}
