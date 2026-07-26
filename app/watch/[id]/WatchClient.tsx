'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Capacitor } from '@capacitor/core'
import { ScreenOrientation } from '@capacitor/screen-orientation'
import { StatusBar } from '@capacitor/status-bar'
import PROVIDERS from '@/lib/providers'
import type { StreamingServer } from '@/lib/streamingProvider'
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
  children,
}: Props) {
  const router = useRouter()
  const [serverId, setServerId] = useState(servers[0]?.id || '')
  const [iframeKey, setIframeKey] = useState(0)
  const [useDirectEmbed, setUseDirectEmbed] = useState(false)

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

  const handleNextEpisode = useCallback((newSeason: number, newEpisode: number) => {
    router.replace(`/watch/${id}?type=${mediaType}&s=${newSeason}&e=${newEpisode}`)
  }, [router, id, mediaType])

  // ── Render ──────────────────────────────────────────────────────────────────

  const capabilityNotice = getCapabilityNotice(activeServer.id, activeServer.tier)

  return (
    <>
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
                {(season > 1 || episode > 1) && (
                  <Link
                    href={`/watch/${id}?type=tv&s=${episode > 1 ? season : season - 1}&e=${episode > 1 ? episode - 1 : 1}`}
                    className={`btn btn-secondary ${styles.epNavBtn}`}
                  >
                    ← Prev
                  </Link>
                )}
                <Link
                  href={`/watch/${id}?type=tv&s=${season}&e=${episode + 1}`}
                  className={`btn btn-secondary ${styles.epNavBtn}`}
                >
                  Next →
                </Link>
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
