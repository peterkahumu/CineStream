'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Capacitor } from '@capacitor/core'
import { ScreenOrientation } from '@capacitor/screen-orientation'
import { StatusBar } from '@capacitor/status-bar'
import PROVIDERS from '@/lib/providers'
import type { StreamingServer } from '@/lib/streamingProvider'
import type { Season } from '@/lib/tmdb'
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
  servers: StreamingServer[]
  seasons?: Season[]
  children?: React.ReactNode
}

// ── Helpers ──────────────────────────────────────────────────────────────────

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

// ── Component ────────────────────────────────────────────────────────────────

export default function WatchClient({
  mediaType,
  id,
  season,
  episode,
  title,
  backdrop,
  poster,
  servers,
  seasons,
  children,
}: Props) {
  const router = useRouter()
  const [serverId, setServerId] = useState(servers[0]?.id || '')
  const [iframeKey, setIframeKey] = useState(0)
  const [useDirectEmbed, setUseDirectEmbed] = useState(false)

  const [currentSeason, setCurrentSeason] = useState(season)
  const [currentEpisode, setCurrentEpisode] = useState(episode)
  // iframeSeason/iframeEpisode track what the iframe is actually pointed at.
  // For self-navigating providers (CineSRC, VidFast) these are NOT updated on
  // next-episode events — the provider already moved the iframe internally.
  const [iframeSeason, setIframeSeason] = useState(season)
  const [iframeEpisode, setIframeEpisode] = useState(episode)
  const [prevPropSeason, setPrevPropSeason] = useState(season)
  const [prevPropEpisode, setPrevPropEpisode] = useState(episode)

  if (season !== prevPropSeason || episode !== prevPropEpisode) {
    setPrevPropSeason(season)
    setPrevPropEpisode(episode)
    setCurrentSeason(season)
    setCurrentEpisode(episode)
    setIframeSeason(season)
    setIframeEpisode(episode)
  }

  // ── Effects ─────────────────────────────────────────────────────────────────

  const cleanupOrientation = useCallback(() => {
    restorePortraitOrientation()
  }, [])

  useEffect(() => {
    return cleanupOrientation
  }, [cleanupOrientation])

  // ── Early returns ────────────────────────────────────────────────────────────

  if (servers.length === 0) {
    return (
      <div className={`${styles.playerSection} empty-state`}>
        <h3>No Streaming Servers Configured</h3>
        <p>Please configure the streaming provider URLs in your .env.local file.</p>
      </div>
    )
  }

  // ── Resolve active provider ──────────────────────────────────────────────────

  const activeServer = servers.find(s => s.id === serverId) || servers[0]
  const activeProvider = PROVIDERS.find(p => p.id === activeServer.id) || PROVIDERS[0]

  // ── Event handlers ───────────────────────────────────────────────────────────

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

  const updateDocumentTitle = useCallback((s: number, e: number) => {
    document.title = `Watch ${title} - Season ${s} Episode ${e} | CinemaPhora`
  }, [title])

  const handleEpisodeChange = useCallback((targetS: number, targetE: number, replace: boolean = false, uiOnly: boolean = false) => {
    setCurrentSeason(targetS)
    setCurrentEpisode(targetE)
    if (!uiOnly) {
      setIframeSeason(targetS)
      setIframeEpisode(targetE)
    }
    const url = `/watch/${id}?type=${mediaType}&s=${targetS}&e=${targetE}`
    if (replace) {
      window.history.replaceState(null, '', url)
    } else {
      window.history.pushState(null, '', url)
    }
    updateDocumentTitle(targetS, targetE)
  }, [id, mediaType, updateDocumentTitle])

  // For providers that self-navigate: only update UI, do not touch iframe src.
  const handleNextEpisodeSelfNavigated = useCallback((newSeason: number, newEpisode: number) => {
    let targetS = newSeason
    let targetE = newEpisode

    if (seasons) {
      const sData = seasons.find(s => s.season_number === currentSeason)
      if (sData && newSeason === currentSeason && newEpisode > sData.episode_count) {
        const nextSData = seasons.find(s => s.season_number === currentSeason + 1)
        if (nextSData && nextSData.episode_count > 0) {
          targetS = currentSeason + 1
          targetE = 1
        } else {
          return
        }
      }
    }

    handleEpisodeChange(targetS, targetE, true, true)
  }, [currentSeason, seasons, handleEpisodeChange])

  // For providers that do NOT self-navigate: update iframe src (reloads iframe to new episode).
  const handleNextEpisode = useCallback((newSeason: number, newEpisode: number) => {
    let targetS = newSeason
    let targetE = newEpisode

    if (seasons) {
      const sData = seasons.find(s => s.season_number === currentSeason)
      if (sData && newSeason === currentSeason && newEpisode > sData.episode_count) {
        const nextSData = seasons.find(s => s.season_number === currentSeason + 1)
        if (nextSData && nextSData.episode_count > 0) {
          targetS = currentSeason + 1
          targetE = 1
        } else {
          return
        }
      }
    }

    handleEpisodeChange(targetS, targetE, true, false)
  }, [currentSeason, seasons, handleEpisodeChange])

  // ── Calculate Navigation ───────────────────────────────────────────────────

  let prevS: number | null = null
  let prevE: number | null = null
  let nextS: number | null = null
  let nextE: number | null = null

  if (mediaType === 'tv') {
    if (seasons) {
      const currentSeasonData = seasons.find(s => s.season_number === currentSeason)
      
      // PREV
      if (currentEpisode > 1) {
        prevS = currentSeason
        prevE = currentEpisode - 1
      } else if (currentSeason > 1) {
        prevS = currentSeason - 1
        const prevSeasonData = seasons.find(s => s.season_number === prevS)
        if (prevSeasonData && prevSeasonData.episode_count > 0) {
          prevE = prevSeasonData.episode_count
        }
      }
      
      // NEXT
      if (currentSeasonData) {
        if (currentEpisode < currentSeasonData.episode_count) {
          nextS = currentSeason
          nextE = currentEpisode + 1
        } else {
          const nextSeasonData = seasons.find(s => s.season_number === currentSeason + 1)
          if (nextSeasonData && nextSeasonData.episode_count > 0) {
            nextS = currentSeason + 1
            nextE = 1
          }
        }
      }
    } else {
      // Fallback if no season data
      if (currentEpisode > 1) {
        prevS = currentSeason
        prevE = currentEpisode - 1
      }
      nextS = currentSeason
      nextE = currentEpisode + 1
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const capabilityNotice = getCapabilityNotice(activeServer.id, activeServer.tier)

  return (
    <>
      <div className={styles.header}>
        <Link href={`/details/${id}?type=${mediaType}`} className={styles.backBtn}>
          ← Back to Details
        </Link>
        <h1 className={styles.title}>
          {title} {mediaType === 'tv' ? `- Season ${currentSeason} Episode ${currentEpisode}` : ''}
        </h1>
      </div>

      <div className={styles.playerWrapper}>
        <div className={styles.playerSection}>
          <PlayerIframe
            provider={activeProvider}
            serverUrl={activeServer.url}
            mediaType={mediaType}
            id={id}
            season={currentSeason}
            episode={currentEpisode}
            iframeSeason={iframeSeason}
            iframeEpisode={iframeEpisode}
            title={title}
            backdrop={backdrop}
            poster={poster}
            iframeKey={iframeKey}
            transformUrl={PROXY_BASE ? buildTransformUrl : undefined}
            onNextEpisode={mediaType === 'tv' ? handleNextEpisode : undefined}
            onNextEpisodeSelfNavigated={mediaType === 'tv' ? handleNextEpisodeSelfNavigated : undefined}
          />
        </div>

        <div className={styles.controlsPanel}>
          {mediaType === 'tv' && (
            <div className={styles.quickEp}>
              <span className={styles.quickLabel}>
                📺 Season {currentSeason}, Episode {currentEpisode}
              </span>
              <div className={styles.epNav}>
                {prevS !== null && prevE !== null && (
                  <a
                    href={`/watch/${id}?type=tv&s=${prevS}&e=${prevE}`}
                    className={`btn btn-secondary ${styles.epNavBtn}`}
                    onClick={(e) => {
                      e.preventDefault()
                      handleEpisodeChange(prevS!, prevE!)
                    }}
                  >
                    ← Prev
                  </a>
                )}
                {nextS !== null && nextE !== null && (
                  <a
                    href={`/watch/${id}?type=tv&s=${nextS}&e=${nextE}`}
                    className={`btn btn-secondary ${styles.epNavBtn}`}
                    onClick={(e) => {
                      e.preventDefault()
                      handleEpisodeChange(nextS!, nextE!)
                    }}
                  >
                    Next →
                  </a>
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
