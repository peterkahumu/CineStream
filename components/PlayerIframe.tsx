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
  title: string
  backdrop?: string | null
  poster?: string | null
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
  iframeKey,
  transformUrl,
  onNextEpisode,
  onClose,
}: PlayerIframeProps) {
  const router = useRouter()
  const [isReady, setIsReady] = useState(false)
  const [startTime, setStartTime] = useState(0)
  const [hasError, setHasError] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // ── Resume time ─────────────────────────────────────────────────────────────

  const handleResumeLoad = useCallback(() => {
    const resumeTime = progressTracker.getResumeTime(id, season, episode)
    setStartTime(resumeTime)
    setIsReady(true)
  }, [id, season, episode])

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
        season: mediaType === 'tv' ? (Number(data.last_season_watched) || season) : undefined,
        episode: mediaType === 'tv' ? (Number(data.last_episode_watched) || episode) : undefined,
        show_progress,
      })
    },
    [id, mediaType, provider.id, season, episode, title, backdrop, poster]
  )

  // ── Navigation callbacks ─────────────────────────────────────────────────────

  const handleNextEpisode = useCallback(
    (newSeason: number, newEpisode: number) => {
      if (onNextEpisode) {
        onNextEpisode(newSeason, newEpisode)
      } else {
        router.replace(`/watch/${id}?type=${mediaType}&s=${newSeason}&e=${newEpisode}`)
      }
    },
    [id, mediaType, onNextEpisode, router]
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
    handleResumeLoad()
  }, [handleResumeLoad])

  useEffect(() => {
    if (!provider.onMessage) return
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [handleMessage, provider.onMessage])

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
        key={`${embedUrl}-${iframeKey}`}
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
