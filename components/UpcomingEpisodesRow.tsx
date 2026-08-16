'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import MediaCard from './MediaCard'
import CardRow, { cardRowStyles as styles } from './CardRow'
import type { MediaItem } from '@/lib/tmdb'
import type { UpcomingEpisodeItem, WatchedShowInput } from '@/app/api/upcoming-episodes/route'
import {
  getAllHistoryEvents,
  getAllProgress,
  parseEpisodeKey,
  PROGRESS_SYNC_EVENT,
  SERIES_FINISHED,
} from '@/lib/progressTracker'

/** Matches ContinueWatchingRow — under a minute left and the episode is done with. */
const FINISHED_REMAINING_SECONDS = 60
const MAX_TITLES = 30

/**
 * Shows you follow that have moved on without you: a new episode aired, or the
 * next one has a date.
 *
 * Continue Watching only holds things you can press play on right now, so this is
 * where a series goes once you're caught up — including the case that has no home
 * otherwise, a show you finished months ago quietly getting a new season. The
 * candidate list is derived from watch history, so a title returns here on its own
 * merits whether or not it still has a progress row.
 */
export default function UpcomingEpisodesRow() {
  const [items, setItems] = useState<UpcomingEpisodeItem[]>([])
  const requestedRef = useRef<string>('')

  const loadItems = useCallback(() => {
    const candidates = collectWatchedShows()
    // Same candidate set as last time means the same answer — don't re-ask.
    const signature = JSON.stringify(candidates)
    if (signature === requestedRef.current) return
    requestedRef.current = signature

    const request = candidates.length === 0
      ? Promise.resolve<UpcomingEpisodeItem[]>([])
      : fetch('/api/upcoming-episodes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: candidates }),
        })
          .then(res => (res.ok ? res.json() : null))
          .then((data: { items?: UpcomingEpisodeItem[] } | null) =>
            Array.isArray(data?.items) ? data.items : []
          )

    request
      .then(setItems)
      .catch(err => console.error('[UpcomingEpisodesRow] lookup failed:', err))
  }, [])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  useEffect(() => {
    window.addEventListener('storage', loadItems)
    window.addEventListener(PROGRESS_SYNC_EVENT, loadItems)
    return () => {
      window.removeEventListener('storage', loadItems)
      window.removeEventListener(PROGRESS_SYNC_EVENT, loadItems)
    }
  }, [loadItems])

  if (items.length === 0) return null

  return (
    <CardRow title="New & Upcoming Episodes" emoji="📡">
      {items.map(item => (
        <div key={item.tmdbId} className={styles.cardWrap}>
          <MediaCard
            item={buildMediaItem(item)}
            forcedType="tv"
            customHref={`/watch/${item.tmdbId}?type=tv&s=${item.watchSeason}&e=${item.watchEpisode}`}
            bottomSubtitle={buildSubtitle(item)}
            singleLineTitle={true}
          />
        </div>
      ))}
    </CardRow>
  )
}

function buildMediaItem(item: UpcomingEpisodeItem): MediaItem {
  return {
    id: Number(item.tmdbId),
    name: item.title,
    poster_path: item.poster_path,
    backdrop_path: item.backdrop_path,
    media_type: 'tv',
    overview: '',
    vote_average: 0,
    vote_count: 0,
  }
}

function buildSubtitle(item: UpcomingEpisodeItem) {
  const label = `S${item.season} E${item.episode}`
  if (item.state === 'available') {
    return (
      <>
        <span>{item.newEpisodeCount > 1 ? `${item.newEpisodeCount} new • ` : 'New • '}</span>
        <span>{label}</span>
      </>
    )
  }
  return (
    <>
      <span>{label} • </span>
      <span>{formatAirDate(item.airDate)}</span>
    </>
  )
}

function formatAirDate(airDate: string | null): string {
  if (!airDate) return 'Coming soon'
  const date = new Date(airDate)
  if (isNaN(date.getTime())) return 'Coming soon'

  const days = Math.ceil((date.getTime() - Date.now()) / 86_400_000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days <= 6) return date.toLocaleDateString('en-US', { weekday: 'long' })
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Every TV title in local history, with the furthest episode reached, minus the
 * ones Continue Watching is already showing — a title belongs to one rail or the
 * other, never both.
 */
function collectWatchedShows(): WatchedShowInput[] {
  if (typeof window === 'undefined') return []

  const shows = new Map<string, { season: number; episode: number; lastAt: number }>()
  for (const event of getAllHistoryEvents()) {
    if (event.mediaType !== 'tv') continue
    const season = event.season ?? 1
    const episode = event.episode ?? 1
    const prev = shows.get(event.tmdbId)
    // Furthest reached, not most recent — watching an old episode again doesn't
    // mean the show has anything new for you.
    if (!prev || season > prev.season || (season === prev.season && episode > prev.episode)) {
      shows.set(event.tmdbId, { season, episode, lastAt: Math.max(prev?.lastAt ?? 0, event.occurredAt) })
    } else {
      prev.lastAt = Math.max(prev.lastAt, event.occurredAt)
    }
  }

  const dismissedAtById = new Map<string, number | null>()
  for (const progress of getAllProgress()) {
    if (progress.mediaType !== 'tv') continue
    if (isActionableInContinueWatching(progress)) {
      shows.delete(progress.id)
      continue
    }
    dismissedAtById.set(progress.id, progress.dismissedAt ?? null)
  }

  return Array.from(shows.entries())
    .sort((a, b) => b[1].lastAt - a[1].lastAt)
    .slice(0, MAX_TITLES)
    .map(([tmdbId, show]) => ({
      tmdbId,
      season: show.season,
      episode: show.episode,
      dismissedAt: dismissedAtById.get(tmdbId) ?? null,
    }))
}

/** True when Continue Watching is rendering a card for this title right now. */
function isActionableInContinueWatching(progress: { duration: number; watched: number; dismissedAt?: number | null; nextEpisodeKey?: string | null }): boolean {
  if (progress.dismissedAt) return false
  const finished =
    progress.duration > 0 && progress.duration - progress.watched < FINISHED_REMAINING_SECONDS
  if (!finished) return true
  // Finished: the other row keeps it only if there's a real next episode, or it
  // still has to ask TMDB what comes next.
  if (progress.nextEpisodeKey === SERIES_FINISHED) return false
  return parseEpisodeKey(progress.nextEpisodeKey) !== null || !progress.nextEpisodeKey
}
