'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { ProviderConfig, PlayerCallbacks, PlayerContext, ProviderProgressData } from '@/lib/providers/types'
import type { EpisodeProgress, WatchProgress } from '@/lib/progressTracker'
import * as progressTracker from '@/lib/progressTracker'
import type { Genre } from '@/lib/tmdb'
import OfflineTrailerWrapper from './OfflineTrailerWrapper'
import pageStyles from '@/app/watch/[id]/page.module.css'
import styles from './PlayerIframe.module.css'

/**
 * Permissions delegated to the provider iframe.
 *
 * Every feature is granted with an explicit `*` allowlist rather than the bare
 * feature name. A bare name delegates only to the origin in the iframe's `src`,
 * and most providers immediately redirect somewhere else — vidfast.pro lands on
 * vidfast.vc, embedmaster.link on embdmstrplayer.com, multiembed.mov on
 * streamingnow.mov. Once the frame is on the redirect target it is no longer in
 * the allowlist, so the player's own fullscreen button dies with
 * "Permissions policy violation: fullscreen is not allowed in this document".
 * `*` also survives the extra nesting those players use internally.
 */
const IFRAME_ALLOW = 'autoplay *; fullscreen *; picture-in-picture *; encrypted-media *'

/**
 * True when `source` is our iframe's window, or any window nested inside it.
 *
 * A plain `event.source === iframe.contentWindow` only holds for providers that
 * post from the frame we loaded directly. Providers that redirect into a player
 * on another domain post from a frame nested one or more levels deeper, and
 * those messages were being dropped before their handler ever ran.
 *
 * `window.parent` stays readable across origins, so walking up from the sender
 * enforces the same boundary as before — only frames we actually embed can pass
 * — without caring how deeply a provider nests its player. The depth cap stops
 * a malformed or self-referential parent chain from spinning.
 */
function isFromFrameTree(source: MessageEventSource | null, frame: Window | null | undefined): boolean {
  if (!source || !frame) return false
  try {
    let current = source as Window
    for (let depth = 0; depth < 10; depth++) {
      if (current === frame) return true
      const parent = current.parent as Window | null
      if (!parent || parent === current) return false
      current = parent
    }
  } catch {
    // Cross-origin access to `parent` is spec-allowed, but a detached or
    // otherwise exotic sender can still throw. Treat it as untrusted.
    return false
  }
  return false
}

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
  /** Session state, lifted to WatchClient so it can key this component by it. */
  isAuthenticated: boolean
  /**
   * Origin the embed is actually served from when the ad-filtering proxy is on.
   * Provider events then arrive from the worker, not from the provider's own
   * domain, and pinning to the latter would discard every one of them.
   */
  proxyOrigin?: string
  transformUrl?: (url: string) => string
  /** Returns whether it actually navigated — see handleNextEpisode. */
  onNextEpisode?: (season: number, episode: number) => boolean
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
  isAuthenticated,
  proxyOrigin,
  transformUrl,
  onNextEpisode,
  onClose,
}: PlayerIframeProps) {
  const router = useRouter()
  const [hasError, setHasError] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Resume position for this mount. `null` doubles as "not resolved yet" and gates
  // the skeleton below.
  //
  // WatchClient keys this component by id/season/episode/server/auth, so one mount
  // only ever plays one episode on one server. That is what makes every ref and
  // piece of state here safe: each is per-episode, and so is the mount. Anything
  // added below inherits that guarantee — don't reach for a manual reset.
  const [startTime, setStartTime] = useState<number | null>(null)

  // The episode we have already handed off to the next-episode flow. Providers
  // like VidLink fire several 'ended' events in quick succession, and a stale
  // frame's buffered events can arrive after the listener is re-attached, so both
  // the hand-off and the progress writer check against it.
  const nextEpisodeTriggeredForRef = useRef<string | null>(null)

  // Resume time — resolved once per mount, which is once per episode and server.
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
      // Ignore late progress for an episode we have already handed off, so a stale
      // frame's buffered events can't overwrite the episode now playing. Scoped to
      // that episode: a bare truthiness check here silently killed progress for the
      // whole rest of the session once any hand-off had happened.
      if (nextEpisodeTriggeredForRef.current === progressTracker.episodeKey(season, episode)) return

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
        // TMDB wins over anything the provider says this is. These props are
        // resolved server-side from the id in the URL, so they cannot describe a
        // different title; a provider payload can, and has. The provider's own
        // strings are kept only as a fallback for whatever TMDB left blank.
        title: title || data.title || '',
        poster_path: poster ?? data.poster_path ?? null,
        backdrop_path: backdrop ?? data.backdrop_path ?? null,
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
      // Only hand off once per episode, so rapid-fire 'ended' events from the same
      // or a stale iframe can't cascade through several episodes.
      const currentEpKey = progressTracker.episodeKey(season, episode)
      if (nextEpisodeTriggeredForRef.current === currentEpKey) return

      let navigated = true
      if (onNextEpisode) {
        navigated = onNextEpisode(newSeason, newEpisode)
      } else {
        router.replace(`/watch/${id}?type=${mediaType}&s=${newSeason}&e=${newEpisode}`)
      }

      // Mark the episode departed only once something actually navigated. When the
      // show is caught up or finished WatchClient declines and we stay right here,
      // still playing this episode — marking it then would stop it recording.
      if (navigated) nextEpisodeTriggeredForRef.current = currentEpKey
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

      // Guard: validate origin against the provider's declared domain(s), plus the
      // ad-filtering proxy's own origin when the embed was routed through it — the
      // frame is then served by the worker, so pinning to the provider alone would
      // discard every event. isFromFrameTree below still holds the real boundary.
      if (provider.origin) {
        const declared = Array.isArray(provider.origin) ? provider.origin : [provider.origin]
        const trusted = declared.includes(event.origin) || event.origin === proxyOrigin
        if (!trusted) return
      }

      // Ignore messages from old/stale iframes, and from any frame we don't embed.
      if (!isFromFrameTree(event.source, iframeRef.current?.contentWindow)) {
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
    [provider, proxyOrigin, id, mediaType, season, episode, title, handleProgress, handleNextEpisode, handleClose, handleError]
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

  // Look up the resume time once for this mount. The component is keyed per episode
  // and server, so a remount is the only thing that can invalidate the answer.
  //
  // The localStorage branch of resolveStartTime commits synchronously, which the
  // set-state-in-effect rule flags. It is one render on mount, behind the skeleton
  // below, and it can't move: a lazy useState initialiser would read localStorage
  // during hydration and render the iframe where the server rendered a skeleton.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    return resolveStartTime()
  }, [resolveStartTime])

  // Mark this title as actively playing so a periodic background sync never
  // overwrites a live session (see progressTracker's activePlaybackId). An episode
  // change remounts this component, so the pair runs clear-then-set within a single
  // commit; clearActivePlayback is id-guarded and mergeRemoteProgress only ever runs
  // from a fetch callback, so no poll can slip through the gap.
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
        src={embedUrl}
        className={pageStyles.player}
        loading="eager"
        title={`${title} player`}
        allow={IFRAME_ALLOW}
        allowFullScreen
      />
    </OfflineTrailerWrapper>
  )
}
