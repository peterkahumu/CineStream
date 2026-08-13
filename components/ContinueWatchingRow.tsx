'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import Modal from './Modal'
import MediaCard from './MediaCard'
import type { MediaItem } from '@/lib/tmdb'
import {
  getContinueWatching,
  dismissProgress,
  mergeRemoteProgress,
  buildNextEpisodeKey,
  parseEpisodeKey,
  setNextEpisodeKey,
  PROGRESS_SYNC_EVENT,
  SERIES_FINISHED,
  type WatchProgress,
} from '@/lib/progressTracker'
import type { ShowAiringInfo } from '@/lib/tmdb'
import { useSession } from 'next-auth/react'
import styles from './ContinueWatchingRow.module.css'

/** Under a minute left counts as finished — the card should move on from that episode. */
const FINISHED_REMAINING_SECONDS = 60

export default function ContinueWatchingRow() {
  const [items, setItems] = useState<WatchProgress[]>([])
  const [itemToRemove, setItemToRemove] = useState<WatchProgress | null>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  // TMDB lookups already in flight, keyed by `${id}-s{n}e{n}` so a re-render
  // (or a second row mount) doesn't fire the same request again.
  const resolvingRef = useRef<Set<string>>(new Set())
  const { status } = useSession()

  /**
   * Ask TMDB what follows this episode and store the answer — for rows written
   * before `nextEpisodeKey` existed, and for anything sitting on CAUGHT_UP, which
   * stops being true the moment the next episode airs. `setNextEpisodeKey` fires
   * PROGRESS_SYNC_EVENT, which re-runs loadItems with the answer in hand.
   */
  const resolveNextEpisode = useCallback((item: WatchProgress, isAuthenticated: boolean) => {
    const season = item.season ?? 1
    const episode = item.episode ?? 1
    const lookupKey = `${item.id}-s${season}e${episode}`
    if (resolvingRef.current.has(lookupKey)) return
    resolvingRef.current.add(lookupKey)

    fetch(`/api/tmdb/tv/${item.id}`)
      .then(res => (res.ok ? res.json() : null))
      .then((data: ShowAiringInfo | null) => {
        const key = buildNextEpisodeKey(data ?? undefined, season, episode)
        if (key) setNextEpisodeKey(item.id, key, isAuthenticated)
      })
      .catch(err => console.error('[ContinueWatchingRow] next-episode lookup failed:', err))
  }, [])

  // Data loading
  const loadItems = useCallback(() => {
    const isAuthenticated = status === 'authenticated'
    const visible: WatchProgress[] = []
    const unresolved: WatchProgress[] = []

    for (const item of getContinueWatching()) {
      const finished =
        item.duration > 0 && item.duration - item.watched < FINISHED_REMAINING_SECONDS

      if (!finished) {
        visible.push(item)
        continue
      }

      // Finished the movie, or the last episode there will ever be — nothing left
      // to continue, so take it out of the row (stats keep the watch data).
      if (item.mediaType === 'movie' || item.nextEpisodeKey === SERIES_FINISHED) {
        dismissProgress(item.id, isAuthenticated)
        continue
      }

      const next = parseEpisodeKey(item.nextEpisodeKey)
      if (next) {
        visible.push({ ...item, season: next.season, episode: next.episode, watched: 0 })
        continue
      }

      // Caught up (more coming, not out yet) or never resolved: keep the card on
      // the episode we know exists — never a guessed episode + 1 — and re-ask
      // TMDB, since "caught up" expires the moment the next episode airs.
      visible.push(item)
      unresolved.push(item)
    }

    setItems(visible)
    for (const item of unresolved) resolveNextEpisode(item, isAuthenticated)
  }, [status, resolveNextEpisode])

  // Effects — function calls only
  useEffect(() => {
    loadItems()
  }, [loadItems])

  // Background DB sync if user is logged in
  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/get-progress')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            mergeRemoteProgress(data)
            loadItems() // Refresh UI with synced data
          }
        })
        .catch(err => console.error('[ContinueWatchingRow] sync failed:', err))
    }
  }, [status, loadItems])

  // Storage events fire when another tab modifies localStorage; PROGRESS_SYNC_EVENT
  // fires when SyncManager's periodic poll merges in a change within this same tab.
  useEffect(() => {
    window.addEventListener('storage', loadItems)
    window.addEventListener(PROGRESS_SYNC_EVENT, loadItems)
    return () => {
      window.removeEventListener('storage', loadItems)
      window.removeEventListener(PROGRESS_SYNC_EVENT, loadItems)
    }
  }, [loadItems])

  // Interaction handlers
  const requestRemove = useCallback((item: WatchProgress, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setItemToRemove(item)
  }, [])

  const confirmRemove = useCallback(() => {
    if (itemToRemove) {
      dismissProgress(itemToRemove.id, status === 'authenticated')
      loadItems()
      setItemToRemove(null)
    }
  }, [itemToRemove, loadItems, status])

  const cancelRemove = useCallback(() => {
    setItemToRemove(null)
  }, [])

  const scroll = useCallback((direction: 'left' | 'right') => {
    if (!scrollerRef.current) return
    const { clientWidth } = scrollerRef.current
    const amount = direction === 'left' ? -clientWidth * 0.75 : clientWidth * 0.75
    scrollerRef.current.scrollBy({ left: amount, behavior: 'smooth' })
  }, [])

  // Utilities
  function formatTimeLeft(watched: number, duration: number): string {
    if (duration > watched + 10) {
      const remaining = duration - watched
      const h = Math.floor(remaining / 3600)
      const m = Math.floor((remaining % 3600) / 60)
      return h > 0 ? `${h}h ${m}m left` : `${m}m left`
    }
    const h = Math.floor(watched / 3600)
    const m = Math.floor((watched % 3600) / 60)
    return h > 0 ? `${h}h ${m}m watched` : `${m}m watched`
  }

  function buildWatchUrl(item: WatchProgress): string {
    if (item.mediaType === 'movie') return `/watch/${item.id}?type=movie`
    const s = item.season ?? 1
    const e = item.episode ?? 1
    return `/watch/${item.id}?type=tv&s=${s}&e=${e}`
  }

  function buildMediaItem(item: WatchProgress): MediaItem {
    return {
      id: Number(item.id),
      title: item.title,
      poster_path: item.poster_path || null,
      backdrop_path: item.backdrop_path || null,
      media_type: item.mediaType,
      overview: '',
      vote_average: 0,
      vote_count: 0
    }
  }

  // Render
  if (items.length === 0) return null

  return (
    <section className={styles.section}>
      <div className="section-header">
        <h2 className="section-title">
          <span style={{ marginRight: 4 }}>⏱️</span>
          Continue Watching
        </h2>
      </div>

      <div className={styles.rowContainer}>
        <button
          className={`${styles.scrollBtn} ${styles.scrollLeft}`}
          onClick={() => scroll('left')}
          aria-label="Scroll left"
        >
          ‹
        </button>

        <div className={styles.scroller} ref={scrollerRef}>
          {items.map((item) => {
            const progress = item.duration
              ? Math.min(100, Math.max(0, (item.watched / item.duration) * 100))
              : 0
            const url = buildWatchUrl(item)
            const mediaItem = buildMediaItem(item)

            const bottomSubtitle = (
              <>
                {item.mediaType === 'tv' && (
                  <span>S{item.season ?? 1} E{item.episode ?? 1} • </span>
                )}
                <span>{formatTimeLeft(item.watched, item.duration)}</span>
              </>
            )

            return (
              <div key={item.id} className={styles.cardWrap}>
                <MediaCard
                  item={mediaItem}
                  forcedType={item.mediaType}
                  progress={item.watched === 0 ? undefined : progress}
                  bottomSubtitle={bottomSubtitle}
                  onRemove={(e) => requestRemove(item, e)}
                  customHref={url}
                  singleLineTitle={true}
                />
              </div>
            )
          })}
        </div>

        <button
          className={`${styles.scrollBtn} ${styles.scrollRight}`}
          onClick={() => scroll('right')}
          aria-label="Scroll right"
        >
          ›
        </button>
      </div>

      <Modal
        isOpen={!!itemToRemove}
        title="Remove Continue Watching"
        description={`Remove "${itemToRemove?.title}" from your continue watching? It stays in your watch history and stats.`}
        confirmText="Remove"
        onConfirm={confirmRemove}
        onCancel={cancelRemove}
      />
    </section>
  )
}
