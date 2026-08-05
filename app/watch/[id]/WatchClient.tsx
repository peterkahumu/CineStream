'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Capacitor } from '@capacitor/core'
import { ScreenOrientation } from '@capacitor/screen-orientation'
import { StatusBar } from '@capacitor/status-bar'
import PROVIDERS from '@/lib/providers'
import type { StreamingServer } from '@/lib/streamingProvider'
import type { Season, Genre } from '@/lib/tmdb'
import PlayerIframe from '@/components/PlayerIframe'
import styles from './page.module.css'

// Route all server embeds through the ad-stripping proxy when configured.
const PROXY_BASE = process.env.NEXT_PUBLIC_STREAM_PROXY_URL

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
  seasons?: Season[]
  children?: React.ReactNode
}

// Helpers

function restorePortraitOrientation() {
  if (Capacitor.isNativePlatform()) {
    ScreenOrientation.unlock().catch(console.error)
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
  seasons,
  children,
}: Props) {
  const router = useRouter()
  const [serverId, setServerId] = useState(servers[0]?.id || '')
  const [iframeKey, setIframeKey] = useState(0)
  const [useDirectEmbed, setUseDirectEmbed] = useState(false)

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

  // Full navigation — page reloads with new episode, all UI updates from fresh server props.
  const handleNextEpisode = useCallback((newSeason: number, newEpisode: number) => {
    let targetS = newSeason
    let targetE = newEpisode

    if (seasons) {
      const sData = seasons.find(s => s.season_number === season)
      if (sData && newSeason === season && newEpisode > sData.episode_count) {
        const nextSData = seasons.find(s => s.season_number === season + 1)
        if (nextSData && nextSData.episode_count > 0) {
          targetS = season + 1
          targetE = 1
        } else {
          // No next season available — do not navigate
          return
        }
      }
    }

    router.replace(`/watch/${id}?type=${mediaType}&s=${targetS}&e=${targetE}`)
  }, [router, id, mediaType, seasons, season])

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
      const currentSeasonData = seasons.find(s => s.season_number === season)

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

      // NEXT
      if (currentSeasonData) {
        if (episode < currentSeasonData.episode_count) {
          nextS = season
          nextE = episode + 1
        } else {
          const nextSeasonData = seasons.find(s => s.season_number === season + 1)
          if (nextSeasonData && nextSeasonData.episode_count > 0) {
            nextS = season + 1
            nextE = 1
          }
        }
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
          <PlayerIframe
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
            iframeKey={iframeKey}
            transformUrl={PROXY_BASE ? buildTransformUrl : undefined}
            onNextEpisode={mediaType === 'tv' ? handleNextEpisode : undefined}
          />
        </div>

        <div className={styles.controlsPanel}>
          {mediaType === 'tv' && (
            <div className={styles.quickEp}>
              <span className={styles.quickLabel}>
                📺 Season {season}, Episode {episode}
              </span>
              <div className={styles.epNav}>
                {prevS !== null && prevE !== null && (
                  <Link
                    href={`/watch/${id}?type=tv&s=${prevS}&e=${prevE}`}
                    className={`btn btn-secondary ${styles.epNavBtn}`}
                  >
                    ← Prev
                  </Link>
                )}
                {nextS !== null && nextE !== null && (
                  <Link
                    href={`/watch/${id}?type=tv&s=${nextS}&e=${nextE}`}
                    className={`btn btn-secondary ${styles.epNavBtn}`}
                  >
                    Next →
                  </Link>
                )}
              </div>
            </div>
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
