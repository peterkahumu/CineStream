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
 *   (same rule wishlistTracker uses), except for whatever title is currently open in
 *   the player (see setActivePlayback) — a periodic poll has no business arbitrating
 *   against a live session, so that title is left untouched until playback closes
 * - SyncManager polls and calls mergeRemoteProgress periodically while a tab is
 *   visible, so progress made on one device shows up on another without a reload
 *
 * DB sync is opt-in per call via `isAuthenticated` (callers read this from
 * `useSession()`, since the session cookie is httpOnly and can't be sniffed from a
 * plain module). Guests never hit the sync endpoints — localStorage remains their
 * entire experience, with zero wasted network calls.
 *
 * Removal is a soft dismiss (`dismissProgress`), not a delete: the row stays in
 * localStorage and the DB carrying its watch seconds, and only Continue Watching
 * filters it out (see `getContinueWatching`). Stats are computed from these rows,
 * so hard-deleting would silently erase a title the user actually watched.
 * `removeProgress` still exists for a genuine "forget this title" purge.
 *
 * Watch History (`logHistoryEvent`/`getAllHistoryEvents`) is a parallel log of
 * "started"/"completed" events — distinct from the mutable progress pointer above.
 * One row per episode/movie (see historyEpisodeKey), updated in place rather than
 * appended, so resuming or rewatching the same episode doesn't pile up duplicate
 * rows. It powers the Profile page's real history & stats, and survives a title
 * being removed from Continue Watching.
 */

import type { Genre, Season, ShowAiringInfo } from '@/lib/tmdb'

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
  /**
   * Where Continue Watching should go once `season`/`episode` finishes — one of
   * `s{n}e{n}`, `CAUGHT_UP`, `SERIES_FINISHED`, or null when unresolved (see
   * `buildNextEpisodeKey`). Always describes the currently-stored season/episode,
   * so it's dropped whenever those change.
   */
  nextEpisodeKey?: string | null
  /** Set by `dismissProgress`; hides the title from Continue Watching without deleting it. */
  dismissedAt?: number | null
  updatedAt: number
  /** Internal bookkeeping — which history events have already fired for this item. */
  history?: HistoryFlags
}

/** `nextEpisodeKey` value meaning "there is no episode after this one, ever". */
export const SERIES_FINISHED = 'end'

/**
 * `nextEpisodeKey` value meaning "you've seen everything that has aired, but the
 * show isn't over". Always re-resolved rather than trusted — the whole point is
 * that it stops being true when the next episode airs.
 */
export const CAUGHT_UP = 'wait'

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

/** Canonical per-episode key used throughout `show_progress` and `nextEpisodeKey`. */
export function episodeKey(season: number, episode: number): string {
  return `s${season}e${episode}`
}

/** Parses `s{n}e{n}` (any casing). Returns null for anything else, including SERIES_FINISHED. */
export function parseEpisodeKey(key: string | null | undefined): { season: number; episode: number } | null {
  if (!key) return null
  const match = /^s(\d+)e(\d+)$/i.exec(key.trim())
  if (!match) return null
  return { season: Number(match[1]), episode: Number(match[2]) }
}

/** Orders two episodes: negative when `a` comes before `b`. */
function compareEpisodes(
  a: { season: number; episode: number },
  b: { season: number; episode: number }
): number {
  return a.season - b.season || a.episode - b.episode
}

/** TMDB statuses that mean more episodes are expected, even with nothing scheduled. */
function isReturning(info: ShowAiringInfo): boolean {
  if (info.in_production) return true
  const status = info.status?.toLowerCase() ?? ''
  return status === 'returning series' || status === 'in production' || status === 'planned'
}

/** The episode the season list places after `season`/`episode`, aired or not. */
function nextInSeasonList(
  seasons: Season[] | undefined,
  season: number,
  episode: number
): { season: number; episode: number } | null {
  const current = seasons?.find(s => s.season_number === season)
  if (!current || !current.episode_count) return null
  if (episode < current.episode_count) return { season, episode: episode + 1 }
  const next = seasons?.find(s => s.season_number === season + 1)
  if (next && next.episode_count > 0) return { season: season + 1, episode: 1 }
  return null
}

/**
 * Resolves what follows `season`/`episode`:
 * - `s{n}e{n}` — a real, already-aired episode to continue with
 * - `CAUGHT_UP` — you're up to date but the show has more coming (dated or merely
 *   expected). A pending answer, not a conclusion — re-resolve it, don't cache it
 * - `SERIES_FINISHED` — that was the last episode there will ever be
 * - `null` — TMDB doesn't describe this season, so we can't say
 *
 * Never guesses `episode + 1`, and never advances past `last_episode_to_air`:
 * `seasons[].episode_count` includes unaired episodes, so trusting it mid-season
 * on an airing show sends you to an episode no server can play.
 */
export function buildNextEpisodeKey(
  info: ShowAiringInfo | undefined,
  season: number,
  episode: number
): string | null {
  if (!info) return null
  const candidate = nextInSeasonList(info.seasons, season, episode)

  if (candidate) {
    const lastAired = info.last_episode_to_air
    // Without an airing anchor the season list is all we have — trust it.
    if (!lastAired) return episodeKey(candidate.season, candidate.episode)
    const aired = { season: lastAired.season_number, episode: lastAired.episode_number }
    return compareEpisodes(candidate, aired) <= 0
      ? episodeKey(candidate.season, candidate.episode)
      : CAUGHT_UP
  }

  // Nothing after it in the season list. Either the show is over, or the next
  // season simply hasn't been added to TMDB yet.
  if (info.next_episode_to_air) return CAUGHT_UP
  if (isReturning(info)) return CAUGHT_UP
  if (!info.seasons?.some(s => s.season_number === season)) return null
  return SERIES_FINISHED
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
let pendingSyncItems = new Map<string, WatchProgress>()
let pendingHistoryItems = new Map<string, HistoryEvent>()
let lastSyncTime = 0
let lastHistorySyncTime = 0

function executeProgressSync() {
  if (syncTimer) {
    clearTimeout(syncTimer)
    syncTimer = null
  }
  if (pendingSyncItems.size === 0) return

  const items = Array.from(pendingSyncItems.values())
  pendingSyncItems.clear()
  lastSyncTime = Date.now()

  fetch('/api/sync-progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(items),
  }).catch(err => console.error('[progressTracker] Background sync failed:', err))
}

function scheduleDebouncedSync(item: WatchProgress): void {
  if (typeof window === 'undefined') return
  
  pendingSyncItems.set(item.id, item)
  const now = Date.now()
  const timeSinceLastSync = now - lastSyncTime

  if (timeSinceLastSync >= SYNC_DEBOUNCE_MS) {
    executeProgressSync()
  } else if (!syncTimer) {
    syncTimer = setTimeout(executeProgressSync, SYNC_DEBOUNCE_MS - timeSinceLastSync)
  }
}

function executeHistorySync() {
  if (historySyncTimer) {
    clearTimeout(historySyncTimer)
    historySyncTimer = null
  }
  if (pendingHistoryItems.size === 0) return

  const items = Array.from(pendingHistoryItems.values())
  pendingHistoryItems.clear()
  lastHistorySyncTime = Date.now()

  fetch('/api/sync-history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(items),
  }).catch(err => console.error('[progressTracker] History sync failed:', err))
}

function scheduleHistorySync(items: HistoryEvent[]): void {
  if (typeof window === 'undefined' || items.length === 0) return

  for (const item of items) {
    pendingHistoryItems.set(item.id, item)
  }

  const now = Date.now()
  const timeSinceLastSync = now - lastHistorySyncTime

  if (timeSinceLastSync >= SYNC_DEBOUNCE_MS) {
    executeHistorySync()
  } else if (!historySyncTimer) {
    historySyncTimer = setTimeout(executeHistorySync, SYNC_DEBOUNCE_MS - timeSinceLastSync)
  }
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
    nextEpisodeKey?: string | null
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
    // The stored key describes the stored season/episode, so a move to a
    // different episode invalidates it until the caller supplies a fresh one.
    nextEpisodeKey: data.nextEpisodeKey ?? (isDifferentEpisode ? null : existing?.nextEpisodeKey ?? null),
    // Fresh progress means the user is watching it again — undo any dismissal.
    dismissedAt: null,
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

/** 0 when the position is within the last 5% of the runtime, else the position itself. */
function resumeOrRestart(watched: number, duration: number): number {
  if (duration > 0 && watched / duration > 0.95) return 0
  return watched || 0
}

/**
 * Finds an episode's entry in `show_progress` without trusting the key's exact
 * format: providers have sent `S1E2`, and entries also carry their own
 * season/episode fields, so an exact-key miss is not proof of "never watched".
 */
function findEpisodeProgress(
  show_progress: Record<string, EpisodeProgress> | undefined,
  season: number,
  episode: number
): EpisodeProgress | undefined {
  if (!show_progress) return undefined
  const exact = show_progress[episodeKey(season, episode)]
  if (exact) return exact

  for (const [key, ep] of Object.entries(show_progress)) {
    if (!ep) continue
    if (Number(ep.season) === season && Number(ep.episode) === episode) return ep
    const parsed = parseEpisodeKey(key)
    if (parsed && parsed.season === season && parsed.episode === episode) return ep
  }
  return undefined
}

/**
 * Returns the resume time in seconds for the given media item.
 * For TV, returns the episode-specific progress when season+episode are provided,
 * falling back to the item's top-level position when that position belongs to the
 * same episode — a `show_progress` entry can be missing (provider sent a map that
 * omitted the current episode, or a DB row synced before per-episode tracking),
 * and restarting a half-watched episode from zero is the worse failure.
 */
export function getResumeTime(tmdbId: string, season?: number, episode?: number): number {
  const p = getProgress(tmdbId)
  if (!p) return 0

  if (p.mediaType === 'tv' && season != null && episode != null) {
    const ep = findEpisodeProgress(p.show_progress, season, episode)
    if (ep) return resumeOrRestart(ep.watched, ep.duration)
    if (p.season === season && p.episode === episode) return resumeOrRestart(p.watched, p.duration)
    return 0
  }

  return resumeOrRestart(p.watched ?? 0, p.duration)
}

/**
 * Resume time computed from an arbitrary progress record rather than localStorage.
 * Used to fall back to the server's copy when this device has none (see PlayerIframe).
 */
export function getResumeTimeFrom(item: WatchProgress, season?: number, episode?: number): number {
  if (item.mediaType === 'tv' && season != null && episode != null) {
    const ep = findEpisodeProgress(item.show_progress, season, episode)
    if (ep) return resumeOrRestart(ep.watched, ep.duration)
    if (item.season === season && item.episode === episode) return resumeOrRestart(item.watched, item.duration)
    return 0
  }
  return resumeOrRestart(item.watched ?? 0, item.duration)
}

/** True when this device has never stored anything for the title. */
export function hasLocalProgress(tmdbId: string): boolean {
  return getProgress(tmdbId) !== null
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

/** Items eligible for the Continue Watching row — everything the user hasn't dismissed. */
export function getContinueWatching(): WatchProgress[] {
  return getAllProgress().filter(item => !item.dismissedAt)
}

/** Writes an item back to localStorage with a fresh `updatedAt`, and syncs it now. */
function updateProgressItem(item: WatchProgress, isAuthenticated: boolean): void {
  try {
    localStorage.setItem(storageKey(item.id), JSON.stringify(item))
  } catch (err) {
    console.error('[progressTracker] Failed to update item:', err)
    return
  }
  if (!isAuthenticated) return
  pendingSyncItems.set(item.id, item)
  executeProgressSync()
}

/**
 * Hide a title from Continue Watching while keeping its watch data.
 * This is what the row's remove button does — a hard `removeProgress` would take
 * the title's watch seconds out of Profile stats along with it.
 */
export function dismissProgress(tmdbId: string, isAuthenticated = false): void {
  if (typeof localStorage === 'undefined') return
  const idStr = String(tmdbId).trim()
  const existing = getProgress(idStr)
  if (!existing) return
  const now = Date.now()
  updateProgressItem({ ...existing, dismissedAt: now, updatedAt: now }, isAuthenticated)
}

/** Records what follows the item's current episode (see `buildNextEpisodeKey`). */
export function setNextEpisodeKey(tmdbId: string, key: string, isAuthenticated = false): void {
  if (typeof localStorage === 'undefined') return
  const idStr = String(tmdbId).trim()
  const existing = getProgress(idStr)
  if (!existing || existing.nextEpisodeKey === key) return
  updateProgressItem({ ...existing, nextEpisodeKey: key, updatedAt: Date.now() }, isAuthenticated)
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(PROGRESS_SYNC_EVENT))
}

/**
 * Permanently forget a title — drops its progress locally and on the server.
 * Note this also drops its watch seconds from Profile stats; the Continue
 * Watching remove button uses `dismissProgress` instead.
 */
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
  if (typeof pendingSyncItems !== 'undefined') {
    pendingSyncItems.clear()
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
 * TMDB id of whatever title is currently open in the player, or null. Set by
 * PlayerIframe on mount, cleared on unmount.
 *
 * mergeRemoteProgress skips this id entirely. Comparing timestamps can't
 * safely settle a conflict against a live session — an intentional rewind
 * writes its own fresh, later timestamp, so plain last-write-wins would
 * usually protect it anyway, but two devices actively playing the same title
 * at once can each keep producing genuinely later timestamps back and forth.
 * Rather than let a periodic poll referee that, we just don't let inbound
 * data touch the active title until playback closes.
 */
let activePlaybackId: string | null = null

/** Marks a title as actively open in the player. See `activePlaybackId`. */
export function setActivePlayback(tmdbId: string): void {
  activePlaybackId = String(tmdbId).trim()
}

/**
 * Clears active-playback tracking, but only if `tmdbId` is still the one
 * marked active — guards a stale unmount from clobbering a newer mount's mark.
 */
export function clearActivePlayback(tmdbId: string): void {
  if (activePlaybackId === String(tmdbId).trim()) activePlaybackId = null
}

/**
 * Fired after mergeRemoteProgress actually changes localStorage. Components
 * that only read progress on mount (or on a native `storage` event, which
 * doesn't fire in the tab that made the write) listen for this so a periodic
 * background poll in the same tab still refreshes their UI.
 */
export const PROGRESS_SYNC_EVENT = 'cinemaphora:progress-sync'

/**
 * Merge remote DB items into localStorage using latest-updatedAt-wins per
 * item — same rule `mergeRemoteWishlist` uses — skipping whatever title is
 * currently open in the player (see `activePlaybackId`). Per-episode
 * `show_progress` is still unioned from both sides, higher-watched-per-episode
 * wins, so neither device's episode progress is lost. Call this after
 * fetching progress from the server on login, or from a periodic poll.
 */
export function mergeRemoteProgress(remoteItems: WatchProgress[]): void {
  if (typeof localStorage === 'undefined') return
  const tombstones = getProgressTombstones()
  let changed = false

  for (const remote of remoteItems) {
    const remoteId = String(remote.id).trim()
    if (remoteId === activePlaybackId) continue

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
        changed = true
      } catch (err) {
        console.error('[progressTracker] Failed to merge remote item:', err)
      }
      continue
    }

    if (remote.updatedAt <= local.updatedAt) continue

    const merged: WatchProgress = {
      ...remote,
      show_progress: mergeShowProgress(local.show_progress, remote.show_progress),
      // History flags aren't stored server-side, so a remote row always arrives
      // without them — keep the local ones or every merge re-fires this title's
      // "started"/"completed" events and back-dates its history rows to now.
      history: { ...remote.history, ...local.history },
    }

    try {
      localStorage.setItem(storageKey(remoteId), JSON.stringify(merged))
      changed = true
    } catch (err) {
      console.error('[progressTracker] Failed to merge remote item:', err)
    }
  }

  if (changed && typeof window !== 'undefined') {
    window.dispatchEvent(new Event(PROGRESS_SYNC_EVENT))
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
  if (typeof pendingHistoryItems !== 'undefined') {
    pendingHistoryItems.clear()
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
