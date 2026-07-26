'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { ProviderConfig, PlayerCallbacks, PlayerContext, ProviderProgressData } from '@/lib/providers/types'
import type { EpisodeProgress } from '@/lib/progressTracker'
import * as progressTracker from '@/lib/progressTracker'
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
  /** What the iframe src is actually built from. Only differs from season/episode for
   *  self-navigating providers, where the iframe already moved on internally. */
  iframeSeason: number
  iframeEpisode: number
  title: string
  backdrop?: string | null
  poster?: string | null
  iframeKey: number
  transformUrl?: (url: string) => string
  onNextEpisode?: (season: number, episode: number) => void
  /** Called instead of onNextEpisode when the provider self-navigates (e.g. CineSRC, VidFast autoNext).
   *  The iframe is already playing the new episode — only update UI/URL, do NOT reload src. */
  onNextEpisodeSelfNavigated?: (season: number, episode: number) => void
  onClose?: () => void
}

export default function PlayerIframe({
  provider,
  serverUrl,
  mediaType,
  id,
  season,
  episode,
  iframeSeason,
  iframeEpisode,
  title,
  backdrop,
  poster,
  iframeKey,
  transformUrl,
  onNextEpisode,
  onNextEpisodeSelfNavigated,
  onClose,
}: PlayerIframeProps) {
  const router = useRouter()
  const [isReady, setIsReady] = useState(false)
  const [hasError, setHasError] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // The start time is only resolved once per mount (or explicit server switch via iframeKey).
  // On client-side episode changes season/episode props update but we deliberately do NOT
  // re-run this — the iframe just has its src quietly swapped and plays from the beginning
  // of the next episode (or from wherever the external player decides).
  const startTimeRef = useRef<number | null>(null)

  // ── Resume time — runs only on initial mount or explicit server switch ────────

  const resolveStartTime = useCallback(() => {
    if (startTimeRef.current !== null) return
    const resumeTime = progressTracker.getResumeTime(id, season, episode)
    startTimeRef.current = resumeTime
    setIsReady(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  // Intentionally empty deps: we only want this to resolve on the very first render.
  // season/episode changes are handled by updating the iframe src attribute directly,
  // not by remounting the component.

  // ── Progress persistence ─────────────────────────────────────────────────────

  const handleProgress = useCallback(
    (data: ProviderProgressData) => {
      const watched = data.watched ?? 0
      const duration = data.duration ?? 0

      // Normalise provider-specific show_progress into our EpisodeProgress shape
      let show_progress: Record<string, EpisodeProgress> | undefined
      if (data.show_progress) {
        show_progress = {}
        for (const [rawKey, v] of Object.entries(data.show_progress)) {
          const s = Number(v.season)
          const e = Number(v.episode)
          const epWatched = v.progress?.watched ?? v.watched ?? 0
          const epDuration = v.progress?.duration ?? v.duration ?? 0
          // Normalise key to sXeY format
          const epKey = rawKey.toLowerCase().startsWith('s') ? rawKey : `s${s}e${e}`
          show_progress[epKey] = { season: s, episode: e, watched: epWatched, duration: epDuration, updatedAt: Date.now() }
        }
      } else if (mediaType === 'tv') {
        // Synthesise from current episode position (for EmbedMaster / CineSRC)
        show_progress = {
          [`s${season}e${episode}`]: {
            season,
            episode,
            watched,
            duration,
            updatedAt: Date.now(),
          },
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
        activeSeason: season,
        activeEpisode: episode,
        isRealTimeEvent: data.isRealTimeEvent,
      })
    },
    [id, mediaType, provider.id, season, episode, title, backdrop, poster]
  )

  // ── Navigation callbacks ─────────────────────────────────────────────────────

  const handleNextEpisode = useCallback(
    (newSeason: number, newEpisode: number) => {
      if (provider.selfNavigatesNextEpisode && onNextEpisodeSelfNavigated) {
        // Provider already navigated internally — only update UI, leave src alone.
        onNextEpisodeSelfNavigated(newSeason, newEpisode)
      } else if (onNextEpisode) {
        onNextEpisode(newSeason, newEpisode)
      } else {
        router.replace(`/watch/${id}?type=${mediaType}&s=${newSeason}&e=${newEpisode}`)
      }
    },
    [id, mediaType, provider.selfNavigatesNextEpisode, onNextEpisodeSelfNavigated, onNextEpisode, router]
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

  // ── postMessage listener ─────────────────────────────────────────────────────

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

  // ── Effects — function calls only, no inline definitions ─────────────────────

  useEffect(() => {
    resolveStartTime()
  }, [resolveStartTime])

  useEffect(() => {
    if (!provider.onMessage) return
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [handleMessage, provider.onMessage])

  // When the user explicitly switches server (iframeKey increments), reset so the
  // resume time for the new server+episode is looked up fresh.
  useEffect(() => {
    startTimeRef.current = null
    setIsReady(false)
    resolveStartTime()
  }, [iframeKey, resolveStartTime])

  // ── Render ──────────────────────────────────────────────────────────────────

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

  if (!isReady) {
    return <div className={`skeleton ${styles.skeletonPlayer}`} />
  }

  const startTime = startTimeRef.current ?? 0

  const rawUrl = provider.buildUrl(serverUrl, mediaType, id, iframeSeason, iframeEpisode, {
    startTime: startTime > 0 ? startTime : undefined,
    color: '%232563eb',
    back: 'close',
  })

  const embedUrl = transformUrl ? transformUrl(rawUrl) : rawUrl

  return (
    <OfflineTrailerWrapper>
      <iframe
        ref={iframeRef}
        key={iframeKey}
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
