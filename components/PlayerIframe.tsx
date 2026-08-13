'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import type { ProviderConfig, PlayerCallbacks, PlayerContext, ProviderProgressData } from '@/lib/providers/types'
import type { EpisodeProgress, WatchProgress } from '@/lib/progressTracker'
import * as progressTracker from '@/lib/progressTracker'
import type { Genre } from '@/lib/tmdb'
import OfflineTrailerWrapper from './OfflineTrailerWrapper'
import pageStyles from '@/app/watch/[id]/page.module.css'
import styles from './PlayerIframe.module.css'

interface PlayerIframeProps {
  provider: ProviderConfig
  serverUrl: string
  mediaType: 'movie' | 'tv'
  id: string
  season: number
  episode: number
  title: string
  backdrop?: string | null
  poster?: string | null
  genres?: Genre[]
  /** See WatchProgress.nextEpisodeKey — resolved by WatchClient from TMDB season data. */
  nextEpisodeKey?: string
  iframeKey: number
  transformUrl?: (url: string) => string
  onNextEpisode?: (season: number, episode: number) => void
  onClose?: () => void
}

export default function PlayerIframe({
  provider,
  serverUrl,
  mediaType,
  id,
  season,
  episode,
  title,
  backdrop,
  poster,
  genres,
  nextEpisodeKey,
  iframeKey,
  transformUrl,
  onNextEpisode,
  onClose,
}: PlayerIframeProps) {
  const router = useRouter()
  const { status } = useSession()
  const isAuthenticated = status === 'authenticated'
  const [hasError, setHasError] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Start time is resolved once per mount (or explicit server switch via iframeKey).
  // Since episode changes trigger a full page reload, a fresh mount always picks up
  // the correct resume time without needing to reset this manually. `null` doubles
  // as "not resolved yet" (gates the skeleton below) — plain state rather than a
  // ref, since reading a ref's value during render isn't safe (react-hooks/refs).
  const [startTime, setStartTime] = useState<number | null>(null)

  // Guard against the same episode triggering onNextEpisode more than once.
  // Providers like VidLink can fire multiple 'ended' events in quick succession,
  // or buffered events from the previous iframe can arrive after the listener is
  // re-attached. This ref ensures we only navigate once per episode.
  const nextEpisodeTriggeredForRef = useRef<string | null>(null)

  // Resume time — runs on mount, explicit server switch, or episode change.
  // localStorage is the source of truth; when this device has never stored
  // anything for the title (new device, cleared storage, private window) a
  // signed-in user's server copy is consulted before giving up and starting
  // from zero. Merging isn't an option here — setActivePlayback has already
  // walled this title off from inbound syncs — so the remote row is only read.
  const resolveStartTime = useCallback(() => {
    const local = progressTracker.getResumeTime(id, season, episode)
    if (local > 0 || progressTracker.hasLocalProgress(id) || !isAuthenticated) {
      setStartTime(local)
      return
    }

    let cancelled = false
    fetch('/api/get-progress')
      .then(res => (res.ok ? res.json() : null))
      .then((remote: WatchProgress[] | null) => {
        if (cancelled) return
        const match = Array.isArray(remote)
          ? remote.find(item => String(item.id).trim() === String(id).trim())
          : undefined
        setStartTime(match ? progressTracker.getResumeTimeFrom(match, season, episode) : 0)
      })
      .catch(() => {
        if (!cancelled) setStartTime(0)
      })

    return () => {
      cancelled = true
    }
  }, [id, season, episode, isAuthenticated])

  // Progress persistence
  const handleProgress = useCallback(
    (data: ProviderProgressData) => {
      // Guard: if we are already navigating to the next episode, ignore further 
      // progress updates for the current episode to prevent stale state overwrites.
      if (nextEpisodeTriggeredForRef.current) return

      const watched = Math.round(Number(data.watched) || 0)
      const duration = Math.round(Number(data.duration) || 0)

      // Normalise provider-specific show_progress into our EpisodeProgress shape.
      // Keys are always rebuilt as sXeY: providers have sent "S1E2" and other
      // spellings, and a key that doesn't match the one getResumeTime looks up
      // is the same as having no progress at all.
      let show_progress: Record<string, EpisodeProgress> | undefined
      if (mediaType === 'tv') {
        const currentS = typeof season === 'number' && !isNaN(season) ? Math.round(season) : 1
        const currentE = typeof episode === 'number' && !isNaN(episode) ? Math.round(episode) : 1
        show_progress = {}

        for (const [rawKey, v] of Object.entries(data.show_progress ?? {})) {
          const parsed = progressTracker.parseEpisodeKey(rawKey)
          const s = Math.round(Number(v.season) || parsed?.season || 1)
          const e = Math.round(Number(v.episode) || parsed?.episode || 1)
          const epWatched = Math.round(Number(v.progress?.watched ?? v.watched ?? 0))
          const epDuration = Math.round(Number(v.progress?.duration ?? v.duration ?? 0))
          show_progress[progressTracker.episodeKey(s, e)] = {
            season: s,
            episode: e,
            watched: epWatched,
            duration: epDuration,
            updatedAt: Date.now(),
          }
        }

        // Always carry an entry for the episode actually playing. Providers that
        // send no map at all (EmbedMaster / CineSRC) need it, and so do the ones
        // whose map happens to omit the current episode — without it the resume
        // point for this episode is lost the moment it's needed.
        const currentKey = progressTracker.episodeKey(currentS, currentE)
        if (!show_progress[currentKey]) {
          show_progress[currentKey] = {
            season: currentS,
            episode: currentE,
            watched,
            duration,
            updatedAt: Date.now(),
          }
        }
      }

      progressTracker.saveProgress(id, mediaType, provider.id, {
        watched,
        duration,
        title: data.title || title,
        poster_path: data.poster_path !== undefined ? data.poster_path : (poster ?? null),
        backdrop_path: data.backdrop_path !== undefined ? data.backdrop_path : (backdrop ?? null),
        season: mediaType === 'tv' ? season : undefined,
        episode: mediaType === 'tv' ? episode : undefined,
        show_progress,
        genres,
        nextEpisodeKey,
        isRealTimeEvent: data.isRealTimeEvent,
      }, isAuthenticated)
    },
    [id, mediaType, provider.id, season, episode, title, backdrop, poster, genres, nextEpisodeKey, isAuthenticated]
  )

  // Navigation callbacks
  const handleNextEpisode = useCallback(
    (newSeason: number, newEpisode: number) => {
      // Guard: only trigger once per episode to prevent rapid-fire 'ended' events
      // from the same or a stale iframe from cascading through multiple episodes.
      const currentEpKey = `s${season}e${episode}`
      if (nextEpisodeTriggeredForRef.current === currentEpKey) return
      nextEpisodeTriggeredForRef.current = currentEpKey

      if (onNextEpisode) {
        onNextEpisode(newSeason, newEpisode)
      } else {
        router.replace(`/watch/${id}?type=${mediaType}&s=${newSeason}&e=${newEpisode}`)
      }
    },
    [id, mediaType, season, episode, onNextEpisode, router]
  )

  const handleClose = useCallback(() => {
    if (onClose) {
      onClose()
    } else {
      router.push(`/details/${id}?type=${mediaType}`)
    }
  }, [id, mediaType, onClose, router])

  const handleError = useCallback(
    (msg: string) => {
      console.error(`[${provider.id}] Stream error:`, msg)
      setHasError(true)
    },
    [provider.id]
  )

  // postMessage listener
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      if (!provider.onMessage) return

      // Guard: validate origin against single string or array of trusted domains
      if (provider.origin) {
        const trusted = Array.isArray(provider.origin)
          ? provider.origin.includes(event.origin)
          : event.origin === provider.origin
        if (!trusted) return
      }

      // Ignore messages from old/stale iframes
      if (iframeRef.current && event.source !== iframeRef.current.contentWindow) {
        return
      }

      const context: PlayerContext = { id, mediaType, season, episode, title }
      const callbacks: PlayerCallbacks = {
        onProgress: handleProgress,
        onEvent: (_data) => {
          // Reserved for future analytics — events are intentionally not logged here
        },
        onNextEpisode: handleNextEpisode,
        onClose: handleClose,
        onError: handleError,
      }

      provider.onMessage(event, callbacks, context)
    },
    [provider, id, mediaType, season, episode, title, handleProgress, handleNextEpisode, handleClose, handleError]
  )

  const handleRetry = useCallback(() => {
    setHasError(false)
  }, [])

  // Effects — function calls only, no inline definitions
  useEffect(() => {
    if (!provider.onMessage) return
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [handleMessage, provider.onMessage])

  // When the component mounts, when the user explicitly switches server (iframeKey increments),
  // or when the episode changes (resolveStartTime is recreated), look up the resume time fresh.
  useEffect(() => {
    setStartTime(null)
    return resolveStartTime()
  }, [iframeKey, resolveStartTime])

  // Mark this title as actively playing so a periodic background sync never
  // overwrites a live session (see progressTracker's activePlaybackId). Scoped
  // to `id` rather than season/episode so it stays marked across an in-show
  // episode change, not just the initial mount.
  useEffect(() => {
    progressTracker.setActivePlayback(id)
    return () => progressTracker.clearActivePlayback(id)
  }, [id])

  // Render

  if (hasError) {
    return (
      <div className={`${pageStyles.playerSection} ${styles.errorContainer} empty-state`}>
        <div className={styles.errorIcon}>⚠️</div>
        <h3 className={styles.errorTitle}>Stream failed to load</h3>
        <p className={styles.errorText}>
          Could not load content from <strong>{provider.name}</strong>.
          Try switching to another server.
        </p>
        <button className="btn btn-primary" onClick={handleRetry}>
          Retry Connection
        </button>
      </div>
    )
  }

  if (startTime === null) {
    return <div className={`skeleton ${styles.skeletonPlayer}`} />
  }

  const rawUrl = provider.buildUrl(serverUrl, mediaType, id, season, episode, {
    startTime: startTime > 0 ? startTime : undefined,
    color: '%232563eb',
    back: 'close',
  })

  const embedUrl = transformUrl ? transformUrl(rawUrl) : rawUrl

  return (
    <OfflineTrailerWrapper>
      <iframe
        ref={iframeRef}
        key={`${iframeKey}-${season}-${episode}`}
        src={embedUrl}
        className={pageStyles.player}
        loading="eager"
        title={`${title} player`}
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
        allowFullScreen
      />
    </OfflineTrailerWrapper>
  )
}
