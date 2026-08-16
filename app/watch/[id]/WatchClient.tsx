'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Capacitor } from '@capacitor/core'
import { StatusBar } from '@capacitor/status-bar'
import { unlockOrientation } from '@/lib/playerOrientation'
import PROVIDERS from '@/lib/providers'
import type { StreamingServer } from '@/lib/streamingProvider'
import type { Genre, ShowAiringInfo } from '@/lib/tmdb'
import PlayerIframe from '@/components/PlayerIframe'
import EpisodeDrawer from './EpisodeDrawer'
import { buildNextEpisodeKey, parseEpisodeKey } from '@/lib/progressTracker'
import styles from './page.module.css'

// Route all server embeds through the ad-stripping proxy when configured.
const PROXY_BASE = process.env.NEXT_PUBLIC_STREAM_PROXY_URL

// The proxy serves the embed from its own origin, so that — not the provider's
// domain — is where postMessage events come from once filtering is on.
const PROXY_ORIGIN = (() => {
  if (!PROXY_BASE) return undefined
  try {
    return new URL(PROXY_BASE).origin
  } catch {
    return undefined
  }
})()

interface Props {
  mediaType: 'movie' | 'tv'
  id: string
  season: number
  episode: number
  title: string
  backdrop?: string | null
  poster?: string | null
  genres?: Genre[]
  servers: StreamingServer[]
  /** TV only — season list plus the airing signals that say which episodes exist yet. */
  airing?: ShowAiringInfo
  children?: React.ReactNode
}

// Helpers

function restorePortraitOrientation() {
  if (Capacitor.isNativePlatform()) {
    unlockOrientation().catch(console.error)
    StatusBar.setOverlaysWebView({ overlay: false }).catch(console.error)
    StatusBar.show().catch(console.error)
  }
}

function applyProxy(embedUrl: string): string {
  if (!PROXY_BASE) return embedUrl
  return `${PROXY_BASE}/?url=${encodeURIComponent(embedUrl)}`
}

function getCapabilityNotice(providerId: string, tier: 'advanced' | 'basic'): string {
  if (tier === 'basic') return '◦ Basic mode — progress is not tracked on this server.'
  switch (providerId) {
    case 'cinesrc':
      return '✨ Auto-resume active · Next episode detection enabled'
    case 'vidfast':
      return '⚡ Progress tracking active · Auto-next episode enabled'
    // EmbedMaster's embed URL takes no start-time parameter, so it tracks and
    // advances but can't be told where to resume from.
    case 'embedmaster':
      return '⚡ Progress tracking active · Auto-next episode enabled'
    default:
      return '⚡ Progress tracking & auto-resume active'
  }
}

// Component

export default function WatchClient({
  mediaType,
  id,
  season,
  episode,
  title,
  backdrop,
  poster,
  genres,
  servers,
  airing,
  children,
}: Props) {
  const router = useRouter()
  // Read here rather than inside PlayerIframe so it can go in that component's key:
  // the resume lookup takes a different path once the session resolves.
  const { status } = useSession()
  const isAuthenticated = status === 'authenticated'
  const [serverId, setServerId] = useState(servers[0]?.id || '')
  const [iframeKey, setIframeKey] = useState(0)
  const [useDirectEmbed, setUseDirectEmbed] = useState(false)

  const seasons = airing?.seasons

  // What Continue Watching should point at once this episode finishes, and what
  // an auto-next is allowed to navigate to. Never `episode + 1` on faith — see
  // buildNextEpisodeKey. Undefined for movies and when TMDB can't tell us.
  const nextEpisodeKey = mediaType === 'tv'
    ? buildNextEpisodeKey(airing, season, episode) ?? undefined
    : undefined
  const resolvedNext = parseEpisodeKey(nextEpisodeKey)

  // Effects

  const cleanupOrientation = useCallback(() => {
    restorePortraitOrientation()
  }, [])

  useEffect(() => {
    return cleanupOrientation
  }, [cleanupOrientation])

  // Event handlers
  // Declared before the early return below — none of them depend on `activeServer`/
  // `activeProvider` (which do), so hooks stay in the same order on every render
  // regardless of whether `servers` is empty (see Rules of Hooks).

  const switchServer = useCallback((newId: string) => {
    setServerId(newId)
    setIframeKey(k => k + 1)
  }, [])

  const toggleDirectEmbed = useCallback(() => {
    setUseDirectEmbed(v => !v)
    setIframeKey(k => k + 1)
  }, [])

  const buildTransformUrl = useCallback((url: string): string => {
    return useDirectEmbed ? url : applyProxy(url)
  }, [useDirectEmbed])

  // Soft navigation — the route re-renders with the new episode and all UI updates
  // from fresh server props. Our own resolution wins over whatever the provider asks
  // for: players routinely fire "next" as current + 1, which walks off the end of a
  // season or into an episode that hasn't aired. Only when TMDB tells us nothing do
  // we follow them.
  //
  // Returns whether it navigated. Declining is normal — a show you're caught up on
  // has nowhere to go — and the player needs to know, because it must not write this
  // episode off while it is still the one playing.
  const handleNextEpisode = useCallback((newSeason: number, newEpisode: number): boolean => {
    let targetS = newSeason
    let targetE = newEpisode

    if (nextEpisodeKey) {
      if (!resolvedNext) return false // caught up or finished — nothing to navigate to
      targetS = resolvedNext.season
      targetE = resolvedNext.episode
    }

    router.replace(`/watch/${id}?type=${mediaType}&s=${targetS}&e=${targetE}`)
    return true
  }, [router, id, mediaType, nextEpisodeKey, resolvedNext])

  // Early returns

  if (servers.length === 0) {
    return (
      <div className={`${styles.playerSection} empty-state`}>
        <h3>No Streaming Servers Configured</h3>
        <p>Please configure the streaming provider URLs in your .env.local file.</p>
      </div>
    )
  }

  // Resolve active provider

  const activeServer = servers.find(s => s.id === serverId) || servers[0]
  const activeProvider = PROVIDERS.find(p => p.id === activeServer.id) || PROVIDERS[0]

  // Calculate Navigation

  let prevS: number | null = null
  let prevE: number | null = null
  let nextS: number | null = null
  let nextE: number | null = null

  if (mediaType === 'tv') {
    if (seasons) {
      // PREV
      if (episode > 1) {
        prevS = season
        prevE = episode - 1
      } else if (season > 1) {
        prevS = season - 1
        const prevSeasonData = seasons.find(s => s.season_number === prevS)
        if (prevSeasonData && prevSeasonData.episode_count > 0) {
          prevE = prevSeasonData.episode_count
        }
      }

      // NEXT — absent when you're caught up or the show is over, so the button
      // disappears instead of offering an episode that can't play.
      if (resolvedNext) {
        nextS = resolvedNext.season
        nextE = resolvedNext.episode
      }
    } else {
      // Fallback if no season data
      if (episode > 1) {
        prevS = season
        prevE = episode - 1
      }
      nextS = season
      nextE = episode + 1
    }
  }

  // Render

  const capabilityNotice = getCapabilityNotice(activeServer.id, activeServer.tier)
  const backHref = mediaType === 'tv'
    ? `/details/${id}?type=tv&tab=watch&s=${season}&e=${episode}`
    : `/details/${id}?type=movie`

  return (
    <>
      <div className={styles.header}>
        <Link href={backHref} className={styles.backBtn}>
          ← Back to Details
        </Link>
        <h1 className={styles.title}>
          {title} {mediaType === 'tv' ? `- Season ${season} Episode ${episode}` : ''}
        </h1>
      </div>

      <div className={styles.playerWrapper}>
        <div className={styles.playerSection}>
          {/*
            Keyed by everything the player's internal state is scoped to. Episode
            changes here are soft navigations, so without this the component is
            re-rendered rather than remounted and its refs leak from one episode
            into the next — which is how progress tracking used to die mid-session.
            One mount, one episode, one server, one session state.
          */}
          <PlayerIframe
            key={`${id}-${season}-${episode}-${iframeKey}-${isAuthenticated}`}
            provider={activeProvider}
            serverUrl={activeServer.url}
            mediaType={mediaType}
            id={id}
            season={season}
            episode={episode}
            title={title}
            backdrop={backdrop}
            poster={poster}
            genres={genres}
            nextEpisodeKey={nextEpisodeKey}
            isAuthenticated={isAuthenticated}
            proxyOrigin={useDirectEmbed ? undefined : PROXY_ORIGIN}
            transformUrl={PROXY_BASE ? buildTransformUrl : undefined}
            onNextEpisode={mediaType === 'tv' ? handleNextEpisode : undefined}
          />
        </div>

        <div className={styles.controlsPanel}>
          {mediaType === 'tv' && (
            <EpisodeDrawer
              /* Episode changes are a soft navigation, so this remounts the
                 drawer when the season moves and its picker would otherwise
                 stay parked on the season you just left. */
              key={season}
              id={id}
              season={season}
              episode={episode}
              airing={airing}
              prevHref={prevS !== null && prevE !== null ? `/watch/${id}?type=tv&s=${prevS}&e=${prevE}` : null}
              nextHref={nextS !== null && nextE !== null ? `/watch/${id}?type=tv&s=${nextS}&e=${nextE}` : null}
            />
          )}

          {children}

          <div className={styles.serverSelector}>
            <span className={styles.serverLabel}>Servers:</span>
            {servers.map(s => (
              <button
                key={s.id}
                className={`btn ${serverId === s.id ? 'btn-primary' : 'btn-secondary'} ${styles.serverBtn}`}
                onClick={() => switchServer(s.id)}
                title={s.tier === 'basic' ? 'Basic server — no progress tracking' : 'Advanced server — progress tracking enabled'}
              >
                {s.tier === 'advanced' ? '⚡ ' : ''}{s.name}
                {s.tier === 'basic' && <span className={styles.basicBadge}>Basic</span>}
              </button>
            ))}

            {PROXY_BASE && (
              <button
                className={`btn btn-secondary ${styles.serverBtn}`}
                onClick={toggleDirectEmbed}
                title={useDirectEmbed ? 'Switch back to ad-filtered mode' : 'Bypass the ad filter for this server'}
              >
                {useDirectEmbed ? '🛡️ Filter' : '⚡ Direct'}
              </button>
            )}
          </div>

          <div className={styles.capabilityNotice}>
            <span>{capabilityNotice}</span>
          </div>
        </div>
      </div>
    </>
  )
}
