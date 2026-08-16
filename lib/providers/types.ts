interface BuildUrlOpts {
  startTime?: number
  color?: string
  back?: string
}

export interface ProviderProgressData {
  watched: number
  duration: number
  title?: string
  poster_path?: string | null
  backdrop_path?: string | null
  /** Provider-specific show_progress map — normalised by PlayerIframe before storage */
  show_progress?: Record<string, {
    season: string | number
    episode: string | number
    progress?: { watched: number; duration: number }
    watched?: number
    duration?: number
  }>
  isRealTimeEvent?: boolean
}

interface ProviderEventData {
  event: 'play' | 'pause' | 'seeked' | 'ended' | 'timeupdate'
  currentTime: number
  duration: number
}

/** Current playback context, passed to each provider's onMessage handler */
export interface PlayerContext {
  id: string
  mediaType: 'movie' | 'tv'
  season: number
  episode: number
  title: string
}

export interface PlayerCallbacks {
  onProgress(data: ProviderProgressData): void
  onEvent(data: ProviderEventData): void
  onNextEpisode(season: number, episode: number): void
  onClose(): void
  onError(msg: string): void
}

export interface ProviderConfig {
  id: string
  name: string
  /**
   * The NEXT_PUBLIC_* env key holding the base URL.
   * The full URL (including any player ID segment) is stored here — never hardcoded.
   */
  envKey: string
  /** advanced = postMessage events supported; basic = URL params only */
  tier: 'advanced' | 'basic'
  /**
   * Trusted postMessage origin(s), checked before `onMessage` runs. Pass a string
   * array for providers that send from multiple domains (e.g. VidFast).
   *
   * Optional even when `onMessage` is set: providers that redirect the frame to a
   * rotating domain can't be pinned to a fixed origin without their events being
   * dropped. Leaving it undefined falls back to PlayerIframe's frame-tree check,
   * which already limits senders to frames we embed. `onMessage` alone decides
   * whether a provider supports events.
   */
  origin?: string | string[]
  buildUrl(
    base: string,
    type: 'movie' | 'tv',
    id: string | number,
    season: number,
    episode: number,
    opts?: BuildUrlOpts
  ): string
  /**
   * Handle a raw MessageEvent from the iframe. Only called for senders inside our
   * own iframe tree, and — when `origin` is set — from a matching origin.
   */
  onMessage?(event: MessageEvent, callbacks: PlayerCallbacks, context: PlayerContext): void
}
