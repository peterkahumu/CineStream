/**
 * "My List" (wishlist) tracker.
 *
 * Mirrors progressTracker.ts's local-first + debounced-DB-sync pattern: writes
 * land in localStorage immediately, then (when `isAuthenticated`) get batched
 * and pushed to /api/sync-watchlist after a short debounce — so rapid edits
 * (e.g. toggling "watched" on a few items back to back) cost one DB round trip
 * instead of one per click. Removals skip the debounce and go out right away
 * since they're rare, one-off actions rather than a stream of edits.
 *
 * Guests never hit the sync endpoints — localStorage remains their entire
 * experience, with zero wasted network calls.
 */

/** Exported so SettingsClient's export/import/backup tools read the same key. */
export const WISHLIST_KEY = 'cinemaphora-wishlist'
const SYNC_DEBOUNCE_MS = 10_000

export interface WishlistItem {
  id: string // TMDB id, as a string
  mediaType: 'movie' | 'tv'
  title: string
  poster: string | null
  backdrop: string | null
  addedAt: number
  watchedAt?: number
  folderName?: string
  updatedAt: number
}

// Internal helpers

function readWishlist(): WishlistItem[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(WISHLIST_KEY)
    return raw ? (JSON.parse(raw) as WishlistItem[]) : []
  } catch {
    return []
  }
}

function writeWishlist(items: WishlistItem[]): void {
  try {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(items))
  } catch (err) {
    console.error('[wishlistTracker] Failed to save:', err)
  }
}

function findIndex(items: WishlistItem[], id: string, mediaType: 'movie' | 'tv'): number {
  return items.findIndex(i => i.id === id && i.mediaType === mediaType)
}

// Debounced background sync

let syncTimer: ReturnType<typeof setTimeout> | null = null
// Keyed by `${mediaType}-${id}` so distinct items changed within the same
// debounce window all go out together instead of clobbering one another.
const pendingSync = new Map<string, WishlistItem>()

function scheduleDebouncedSync(item: WishlistItem): void {
  if (typeof window === 'undefined') return
  pendingSync.set(`${item.mediaType}-${item.id}`, item)
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(() => {
    const items = Array.from(pendingSync.values())
    pendingSync.clear()
    syncTimer = null
    fetch('/api/sync-watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(items),
    }).catch(err => console.error('[wishlistTracker] Background sync failed:', err))
  }, SYNC_DEBOUNCE_MS)
}

function syncDelete(id: string, mediaType: 'movie' | 'tv'): void {
  fetch('/api/sync-watchlist', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tmdbId: id, mediaType }),
  }).catch(err => console.error('[wishlistTracker] Delete sync failed:', err))
}

// Public API

export function getWishlist(): WishlistItem[] {
  return readWishlist()
}

export function isInWishlist(id: string, mediaType: 'movie' | 'tv'): boolean {
  return findIndex(readWishlist(), id, mediaType) !== -1
}

/** No-op (returns the unchanged list) if the item is already saved. */
export function addToWishlist(
  item: { id: string; mediaType: 'movie' | 'tv'; title: string; poster: string | null; backdrop: string | null },
  isAuthenticated = false
): WishlistItem[] {
  const list = readWishlist()
  if (findIndex(list, item.id, item.mediaType) !== -1) return list

  const now = Date.now()
  const entry: WishlistItem = { ...item, addedAt: now, updatedAt: now }
  const next = [entry, ...list]
  writeWishlist(next)
  if (isAuthenticated) scheduleDebouncedSync(entry)
  return next
}

export function removeFromWishlist(
  id: string,
  mediaType: 'movie' | 'tv',
  isAuthenticated = false
): WishlistItem[] {
  const list = readWishlist()
  const next = list.filter(i => !(i.id === id && i.mediaType === mediaType))
  writeWishlist(next)
  if (isAuthenticated) syncDelete(id, mediaType)
  return next
}

export function setWatched(
  id: string,
  mediaType: 'movie' | 'tv',
  watched: boolean,
  isAuthenticated = false
): WishlistItem[] {
  const list = readWishlist()
  const idx = findIndex(list, id, mediaType)
  if (idx === -1) return list

  const updated: WishlistItem = { ...list[idx], watchedAt: watched ? Date.now() : undefined, updatedAt: Date.now() }
  const next = [...list]
  next[idx] = updated
  writeWishlist(next)
  if (isAuthenticated) scheduleDebouncedSync(updated)
  return next
}

export function setFolder(
  id: string,
  mediaType: 'movie' | 'tv',
  folderName: string | undefined,
  isAuthenticated = false
): WishlistItem[] {
  const list = readWishlist()
  const idx = findIndex(list, id, mediaType)
  if (idx === -1) return list

  const updated: WishlistItem = { ...list[idx], folderName, updatedAt: Date.now() }
  const next = [...list]
  next[idx] = updated
  writeWishlist(next)
  if (isAuthenticated) scheduleDebouncedSync(updated)
  return next
}

/**
 * Merge remote DB items into localStorage using latest-updatedAt-wins per item.
 * Call this after fetching the wishlist from the server on login / on visiting
 * the My List page while authenticated.
 */
export function mergeRemoteWishlist(remoteItems: WishlistItem[]): void {
  if (typeof localStorage === 'undefined') return
  const local = readWishlist()

  for (const remote of remoteItems) {
    const idx = findIndex(local, remote.id, remote.mediaType)
    if (idx === -1) {
      local.push(remote)
    } else if (remote.updatedAt > local[idx].updatedAt) {
      local[idx] = remote
    }
  }

  writeWishlist(local)
}

/**
 * Flush all localStorage wishlist items to the server immediately (tab
 * close/hidden). Uses sendBeacon when available. Callers are expected to only
 * invoke this for authenticated sessions (see SyncManager).
 */
export function flushWishlist(): void {
  if (typeof window === 'undefined') return
  const items = readWishlist()
  if (items.length === 0) return

  if (syncTimer) {
    clearTimeout(syncTimer)
    syncTimer = null
  }
  pendingSync.clear()

  const payload = JSON.stringify(items)
  const url = '/api/sync-watchlist'

  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }))
  } else {
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(err => console.error('[wishlistTracker] Flush sync failed:', err))
  }
}
