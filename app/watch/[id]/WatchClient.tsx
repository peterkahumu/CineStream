'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Capacitor } from '@capacitor/core'
import { ScreenOrientation } from '@capacitor/screen-orientation'
import { StatusBar } from '@capacitor/status-bar'
import { buildEmbedUrl, type StreamingServer } from '@/lib/streamingProvider'
import styles from './page.module.css'

// Set in .env.local / Cloudflare env. When present, all server embeds are
// routed through the ad-stripping proxy. Falls back to direct embed if unset.
const PROXY_BASE = process.env.NEXT_PUBLIC_STREAM_PROXY_URL

interface Props {
  mediaType: 'movie' | 'tv'
  id: string
  season: number
  episode: number
  title: string
  backdrop?: string | null
  servers: StreamingServer[]
  children?: React.ReactNode
}

// URL param cleaner removed to prevent Next.js soft navigation state bugs

function restorePortraitOrientation() {
  if (Capacitor.isNativePlatform()) {
    ScreenOrientation.unlock().catch(console.error)
    StatusBar.setOverlaysWebView({ overlay: false }).catch(console.error)
    StatusBar.show().catch(console.error)
  }
}

function applyProxy(embedUrl: string): string {
  // implemented in proxy-worker folder. status: inactive
  if (!PROXY_BASE) return embedUrl
  return `${PROXY_BASE}/?url=${encodeURIComponent(embedUrl)}`
}

export default function WatchClient({ mediaType, id, season, episode, title, backdrop, servers, children }: Props) {
  const router = useRouter()
  const [server, setServer] = useState(servers[0]?.id || '')
  const [iframeKey, setIframeKey] = useState(0)
  const [lightsOut, setLightsOut] = useState(false)
  const [currentSeason, setCurrentSeason] = useState(season)
  const [currentEpisode, setCurrentEpisode] = useState(episode)
  const [useDirectEmbed, setUseDirectEmbed] = useState(false)

  // New state for CineSrc integration
  const [isReady, setIsReady] = useState(false)
  const [startTime, setStartTime] = useState(0)
  const [autoSkip, setAutoSkip] = useState(false)

  useEffect(() => {
    return () => restorePortraitOrientation()
  }, [])

  useEffect(() => {
    // Fetch saved progress to avoid hydration mismatch and start video at the right time
    const key = `cinesrc-progress-${mediaType}-${id}`
    const saved = localStorage.getItem(key)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        // For TV, only resume if it's the same season and episode
        if (mediaType === 'movie' || (parsed.season === season && parsed.episode === episode)) {
          setStartTime(parsed.time || 0)
        }
      } catch (e) {
        console.error('Failed to parse progress', e)
      }
    }
    setIsReady(true)
  }, [id, mediaType, season, episode])

  const handleMessage = useCallback((event: MessageEvent) => {
    if (event.origin !== 'https://cinesrc.st') return
    const { type, ...data } = event.data

    switch (type) {
      case 'cinesrc:timeupdate':
        if (data.currentTime > 5) { // don't save immediately to avoid saving 0s
          const key = `cinesrc-progress-${mediaType}-${id}`
          localStorage.setItem(key, JSON.stringify({
            id,
            mediaType,
            title,
            backdrop,
            season,
            episode,
            time: data.currentTime,
            duration: data.duration || 0,
            updatedAt: Date.now()
          }))
        }
        break
      case 'cinesrc:nextepisode':
        // Update URL without full page reload
        window.history.replaceState(null, '', `/watch/${id}?type=${mediaType}&s=${data.season}&e=${data.episode}`)
        // Update local state to instantly reflect in UI
        setCurrentSeason(data.season)
        setCurrentEpisode(data.episode)
        setStartTime(0) // Start the new episode from the beginning
        break
      case 'cinesrc:close':
        // Handle integrated back button
        router.push(`/details/${id}?type=${mediaType}`)
        break
      case 'cinesrc:play':
        // setLightsOut(true) // Disabled per user request
        break
      case 'cinesrc:ended':
        // setLightsOut(false) // Disabled per user request
        break
    }
  }, [id, mediaType, season, episode, title, backdrop, router])

  useEffect(() => {
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [handleMessage])

  if (servers.length === 0) {
    return (
      <div className={`${styles.playerSection} empty-state`}>
        <h3>No Streaming Servers Configured</h3>
        <p>Please configure the streaming provider URLs in your .env.local file.</p>
      </div>
    )
  }

  const activeServerObj = servers.find(s => s.id === server) || servers[0]
  const rawEmbedUrl = buildEmbedUrl(activeServerObj.url, server, mediaType, id, currentSeason, currentEpisode, {
    startTime,
    autoSkip,
    color: '%232563eb', // Matches --accent in globals.css
    back: 'close'
  })
  // Route through the ad-stripping proxy unless the user has toggled direct mode
  const embedUrl = useDirectEmbed ? rawEmbedUrl : applyProxy(rawEmbedUrl)

  function switchServer(serverId: string) {
    setServer(serverId)
    setIframeKey(k => k + 1)
  }

  function toggleDirectEmbed() {
    setUseDirectEmbed(v => !v)
    setIframeKey(k => k + 1)
  }

  return (
    <>
      <div className={styles.playerWrapper}>
        {lightsOut && (
          <div className={styles.lightsOutOverlay} onClick={() => setLightsOut(false)} />
        )}
        
        <div className={`${styles.playerSection} ${lightsOut ? styles.playerSectionLightsOut : ''}`}>
          {isReady ? (
            <iframe
              key={`${embedUrl}-${iframeKey}`}
              src={embedUrl}
              className={styles.player}
              loading="eager"
              title={`${title} player`}
              allow="autoplay; picture-in-picture; encrypted-media"
              allowFullScreen
            />
          ) : (
            <div className="skeleton" style={{ width: '100%', height: '100%', aspectRatio: '16/9', borderRadius: 'var(--radius-lg)' }} />
          )}
        </div>

        <div className={styles.controlsPanel}>
          {mediaType === 'tv' && (
            <div className={styles.quickEp}>
              <span className={styles.quickLabel}>
                📺 Season {currentSeason}, Episode {currentEpisode}
              </span>
              <div className={styles.epNav}>
                {(currentSeason > 1 || currentEpisode > 1) && (
                  <Link
                    href={`/watch/${id}?type=tv&s=${currentEpisode > 1 ? currentSeason : currentSeason - 1}&e=${currentEpisode > 1 ? currentEpisode - 1 : 1}`}
                    className={`btn btn-secondary ${styles.epNavBtn}`}
                  >
                    ← Prev
                  </Link>
                )}
                <Link
                  href={`/watch/${id}?type=tv&s=${currentSeason}&e=${currentEpisode + 1}`}
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
                className={`btn ${server === s.id ? 'btn-primary' : 'btn-secondary'} ${styles.serverBtn}`}
                onClick={() => switchServer(s.id)}
              >
                {s.name}
              </button>
            ))}
            
            <button 
              className={`btn ${styles.lightsOutBtn} ${lightsOut ? styles.lightsOutBtnActive : ''}`}
              onClick={() => setLightsOut(!lightsOut)}
              title="Toggle Theatre Mode"
            >
              {lightsOut ? '💡 Turn Lights On' : '🎬 Lights Out'}
            </button>

            {PROXY_BASE && (
              <button
                className={`btn btn-secondary ${styles.serverBtn}`}
                onClick={toggleDirectEmbed}
                title={useDirectEmbed ? 'Switch back to ad-filtered mode' : 'Bypass the ad filter for this server'}
              >
                {useDirectEmbed ? '🛡️ Filter' : '⚡ Direct'}
              </button>
            )}

            {server === 'cinesrc' && (
              <button
                className={`btn ${autoSkip ? 'btn-primary' : 'btn-secondary'} ${styles.serverBtn}`}
                onClick={() => setAutoSkip(!autoSkip)}
                title="Automatically skip intros and recaps"
              >
                ⏭️ Auto-Skip {autoSkip ? 'On' : 'Off'}
              </button>
            )}
          </div>
          
          <div style={{ marginTop: 'var(--space-md)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {server === 'cinesrc' ? (
               <span>✨ <strong>Premium Features Enabled:</strong> Auto-Resume and Skip Intros are active for CineSRC.</span>
            ) : (
               <span>Switch to <strong>CineSRC</strong> to unlock advanced features like Auto-Resume and Auto-Skip Intros.</span>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
