import type {
  ProviderConfig,
  PlayerCallbacks,
  PlayerContext,
  ProviderProgressData,
} from './types'

// ── Shared helpers ───────────────────────────────────────────────────────────

/**
 * Resolves the correct media entry from a MEDIA_DATA payload.
 * VidLink / VidNest / VidFast send the entire history keyed by TMDB id.
 * VidFast prefixes movies with "m" and TV with "t" (e.g. "m533535", "t63174").
 * We try an exact match first, then prefixed variants, then fall back to first entry.
 */
function extractMediaEntry(data: Record<string, unknown>, id: string): Record<string, unknown> | null {
  const entry =
    data[id] ??
    data[`m${id}`] ??
    data[`t${id}`] ??
    (Object.values(data)[0] as Record<string, unknown> | undefined)
  return (entry as Record<string, unknown>) ?? null
}

/**
 * Handles the standard MEDIA_DATA + PLAYER_EVENT protocol shared by
 * VidLink, VidNest, and VidFast.
 *
 * MEDIA_DATA is the primary source — sent when the provider's internal
 * localStorage updates, carrying full title/poster/show_progress metadata.
 *
 * PLAYER_EVENT timeupdate is used as a real-time fallback: it fires
 * periodically during playback and ensures progress is captured even before
 * the first MEDIA_DATA arrives.
 */
function handleStandardMessages(
  event: MessageEvent,
  callbacks: PlayerCallbacks,
  context: PlayerContext
): void {
  if (event.data?.type === 'MEDIA_DATA') {
    const entry = extractMediaEntry(event.data.data, context.id)
    if (entry?.progress) {
      const p = entry.progress as { watched: number; duration: number }
      callbacks.onProgress({
        watched: p.watched,
        duration: p.duration,
        title: (entry.title as string) || undefined,
        poster_path: (entry.poster_path as string) || null,
        backdrop_path: (entry.backdrop_path as string) || null,
        last_season_watched: entry.last_season_watched as string | number | undefined,
        last_episode_watched: entry.last_episode_watched as string | number | undefined,
        show_progress: entry.show_progress as ProviderProgressData['show_progress'],
      })
    }
  }

  if (event.data?.type === 'PLAYER_EVENT') {
    const d = event.data.data
    callbacks.onEvent({
      event: d.event,
      currentTime: d.currentTime,
      duration: d.duration,
    })

    // Fallback: synthesise progress from timeupdate so we capture progress
    // immediately during playback, before the first MEDIA_DATA arrives.
    // MEDIA_DATA (with richer metadata) will overwrite this when it fires.
    if (d.event === 'timeupdate' && (d.currentTime ?? 0) > 5) {
      callbacks.onProgress({
        watched: d.currentTime,
        duration: d.duration,
      })
    }
  }
}

// ── Provider registry — ordered by priority ──────────────────────────────────

const PROVIDERS: ProviderConfig[] = [
  // ── 1. CineSRC ──────────────────────────────────────────────────────────────
  // Custom cinesrc:* event protocol; supports auto-resume, next-episode, and close.
  {
    id: 'cinesrc',
    name: 'CineSRC',
    envKey: 'NEXT_PUBLIC_CINESRC_URL',
    tier: 'advanced',
    origin: 'https://cinesrc.st',
    buildUrl(base, type, id, s, e, opts) {
      const url = type === 'movie' ? `${base}/movie/${id}` : `${base}/tv/${id}`
      const params = new URLSearchParams()
      if (type === 'tv') {
        params.set('s', String(s))
        params.set('e', String(e))
      }
      if (opts?.startTime) {
        params.set('t', String(Math.floor(opts.startTime)))
        params.set('continueprompt', 'false')
      }
      if (opts?.color) params.set('color', opts.color)
      if (opts?.back) params.set('back', opts.back)
      const qs = params.toString()
      const finalQs = qs
        ? `${qs}&rotateprompt=false&rotate=false`
        : 'rotateprompt=false&rotate=false'
      return `${url}?${finalQs}`
    },
    onMessage(event, callbacks) {
      const { type, ...data } = event.data as { type: string;[k: string]: unknown }
      switch (type) {
        case 'cinesrc:timeupdate':
          if ((data.currentTime as number) > 5) {
            callbacks.onProgress({
              watched: data.currentTime as number,
              duration: (data.duration as number) || 0,
            })
          }
          break
        case 'cinesrc:nextepisode':
          callbacks.onNextEpisode(Number(data.season), Number(data.episode))
          break
        case 'cinesrc:close':
          callbacks.onClose()
          break
        case 'cinesrc:error':
          callbacks.onError((data.error as string) || 'Unknown CineSRC error')
          break
      }
    },
  },


  // ── 2. VidLink ───────────────────────────────────────────────────────────────
  // Standard MEDIA_DATA + PLAYER_EVENT. Supports startAt for cross-device resume.
  {
    id: 'vidlink',
    name: 'VidLink',
    envKey: 'NEXT_PUBLIC_VIDLINK_URL',
    tier: 'advanced',
    origin: 'https://vidlink.pro',
    buildUrl(base, type, id, s, e, opts) {
      const params = new URLSearchParams()
      if (opts?.startTime) params.set('startAt', String(Math.floor(opts.startTime)))
      const qs = params.toString()
      if (type === 'movie') return qs ? `${base}/movie/${id}?${qs}` : `${base}/movie/${id}`
      return qs ? `${base}/tv/${id}/${s}/${e}?${qs}` : `${base}/tv/${id}/${s}/${e}`
    },
    onMessage(event, callbacks, context) {
      handleStandardMessages(event, callbacks, context)
    },
  },

  // ── 3. VidNest ───────────────────────────────────────────────────────────────
  // Standard MEDIA_DATA + PLAYER_EVENT. Uses 'progress' param name for resume on TV.
  {
    id: 'vidnest',
    name: 'VidNest',
    envKey: 'NEXT_PUBLIC_VIDNEST_URL',
    tier: 'advanced',
    origin: 'https://vidnest.fun',
    buildUrl(base, type, id, s, e, opts) {
      if (type === 'movie') {
        const params = new URLSearchParams()
        if (opts?.startTime) params.set('startAt', String(Math.floor(opts.startTime)))
        const qs = params.toString()
        return qs ? `${base}/movie/${id}?${qs}` : `${base}/movie/${id}`
      }
      const params = new URLSearchParams()
      if (opts?.startTime) params.set('progress', String(Math.floor(opts.startTime)))
      const qs = params.toString()
      return qs ? `${base}/tv/${id}/${s}/${e}?${qs}` : `${base}/tv/${id}/${s}/${e}`
    },
    onMessage(event, callbacks, context) {
      handleStandardMessages(event, callbacks, context)
    },
  },

  // ── 4. VidFast ───────────────────────────────────────────────────────────────
  // Standard MEDIA_DATA + PLAYER_EVENT. Supports autoNext in-player for TV.
  // Trusts all documented VidFast domains — the player may send from any of them
  // regardless of which URL loaded the iframe. The embed URL itself is still
  // controlled by NEXT_PUBLIC_VIDFAST_URL in the user's env.
  {
    id: 'vidfast',
    name: 'VidFast',
    envKey: 'NEXT_PUBLIC_VIDFAST_URL',
    tier: 'advanced',
    origin: [
      'https://vidfast.pro',
      'https://vidfast.in',
      'https://vidfast.io',
      'https://vidfast.me',
      'https://vidfast.net',
      'https://vidfast.pm',
      'https://vidfast.xyz',
      'https://vidfast.vc',
      'https://vidfast.bz',
    ],
    buildUrl(base, type, id, s, e, opts) {
      const params = new URLSearchParams({
        autoPlay: 'true',
        title: 'true',
        poster: 'true',
      })
      if (opts?.startTime) params.set('startAt', String(Math.floor(opts.startTime)))
      if (type === 'movie') return `${base}/movie/${id}?${params}`
      params.set('nextButton', 'true')
      params.set('autoNext', 'true')
      return `${base}/tv/${id}/${s}/${e}?${params}`
    },
    onMessage(event, callbacks, context) {
      handleStandardMessages(event, callbacks, context)
    },
  },

  // ── 5. VidAPI ────────────────────────────────────────────────────────────────
  // Standard postMessage PLAYER_EVENT protocol. Supports resumeAt for cross-device resume.
  {
    id: 'vidapi',
    name: 'VidAPI',
    envKey: 'NEXT_PUBLIC_VIDAPI_URL',
    tier: 'advanced',
    origin: 'https://vaplayer.ru',
    buildUrl(base, type, id, s, e, opts) {
      const params = new URLSearchParams()
      if (opts?.startTime) params.set('resumeAt', String(Math.floor(opts.startTime)))
      if (opts?.color) params.set('primaryColor', opts.color)
      const qs = params.toString()
      if (type === 'movie') return qs ? `${base}/embed/movie/${id}?${qs}` : `${base}/embed/movie/${id}`
      return qs ? `${base}/embed/tv/${id}/${s}/${e}?${qs}` : `${base}/embed/tv/${id}/${s}/${e}`
    },
    onMessage(event, callbacks) {
      if (event.data?.type === 'PLAYER_EVENT') {
        const d = event.data.data
        if (!d) return

        const statusMap: Record<string, 'play' | 'pause' | 'seeked' | 'ended' | 'timeupdate'> = {
          playing: 'timeupdate', // Used for frequent updates
          paused: 'pause',
          seeked: 'seeked',
          completed: 'ended',
        }

        const eventType = statusMap[d.player_status] || 'timeupdate'

        callbacks.onEvent({
          event: eventType,
          currentTime: d.player_progress || 0,
          duration: d.player_duration || 0,
        })

        // Only trigger progress on active playback states
        if (d.player_status === 'playing' || d.player_status === 'seeked' || d.player_status === 'paused') {
          callbacks.onProgress({
            watched: d.player_progress || 0,
            duration: d.player_duration || 0,
          })
        }

        if (d.player_status === 'completed' && d.player_info?.mediaType === 'tv') {
          callbacks.onNextEpisode(Number(d.player_info.season), Number(d.player_info.episode) + 1)
        }
      }
    },
  },


  // ── 6. EmbedMaster ───────────────────────────────────────────────────────────
  // PlayerJS protocol. Player ID is encoded in the base URL from env — never hardcoded.
  // No MEDIA_DATA; progress is synthesised from player events.
  // pause and seeked are used in addition to timeupdate because EmbedMaster
  // does not explicitly document timeupdate but always fires pause/seeked.
  {
    id: 'embedmaster',
    name: 'EmbedMaster',
    envKey: 'NEXT_PUBLIC_EMBEDMASTER_URL',
    tier: 'advanced',
    origin: 'https://embedmaster.link',
    buildUrl(base, type, id, s, e) {
      if (type === 'movie') return `${base}/movie/${id}`
      return `${base}/tv/${id}/${s}/${e}`
    },
    onMessage(event, callbacks) {
      const data = event.data
      if (!data || data.source !== 'embedmaster_player') return
      const validEvents = ['play', 'pause', 'seeked', 'ended', 'timeupdate'] as const
      type ValidEvent = typeof validEvents[number]
      const eventType = data.event as string
      if (!validEvents.includes(eventType as ValidEvent)) return

      callbacks.onEvent({
        event: eventType as ValidEvent,
        currentTime: data.info?.currentTime ?? 0,
        duration: data.info?.duration ?? 0,
      })

      // Synthesise progress on pause, seeked, and timeupdate.
      // pause and seeked are guaranteed by the EmbedMaster/PlayerJS protocol.
      // timeupdate is included as a bonus if the player supports it.
      const progressTriggers: string[] = ['timeupdate', 'pause', 'seeked']
      if (progressTriggers.includes(eventType) && (data.info?.currentTime ?? 0) > 5) {
        callbacks.onProgress({
          watched: data.info.currentTime as number,
          duration: (data.info.duration as number) ?? 0,
        })
      }
    },
  },

  // ── 7. PrimeSrc ──────────────────────────────────────────────────────────────
  // No postMessage events. Injects startAt into URL for resume on both movies and TV.
  {
    id: 'primesrc',
    name: 'PrimeSrc',
    envKey: 'NEXT_PUBLIC_PRIMESRC_URL',
    tier: 'basic',
    buildUrl(base, type, id, s, e, opts) {
      if (type === 'movie') {
        const params = new URLSearchParams({ tmdb: String(id) })
        if (opts?.startTime) params.set('startAt', String(Math.floor(opts.startTime)))
        return `${base}/movie?${params}`
      }
      const params = new URLSearchParams({ tmdb: String(id), season: String(s), episode: String(e) })
      if (opts?.startTime) params.set('startAt', String(Math.floor(opts.startTime)))
      return `${base}/tv?${params}`
    },
  },

  // ── 8. Multiembed ────────────────────────────────────────────────────────────
  // No events, no resume. Basic fallback.
  {
    id: 'multiembed',
    name: 'Multiembed',
    envKey: 'NEXT_PUBLIC_MULTIEMBED_URL',
    tier: 'basic',
    buildUrl(base, type, id, s, e) {
      if (type === 'movie') return `${base}/?video_id=${id}&tmdb=1`
      return `${base}/?video_id=${id}&tmdb=1&s=${s}&e=${e}`
    },
  },

  // ── 9. MoviesAPI ─────────────────────────────────────────────────────────────
  // No events, no resume. Basic fallback.
  {
    id: 'moviesapi',
    name: 'MoviesAPI',
    envKey: 'NEXT_PUBLIC_MOVIESAPI_URL',
    tier: 'basic',
    buildUrl(base, type, id, s, e) {
      if (type === 'movie') return `${base}/movie/${id}`
      return `${base}/tv/${id}/${s}/${e}`
    },
  },
]

export default PROVIDERS
export type { ProviderConfig }
