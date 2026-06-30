'use client'
import { useState, useEffect } from 'react'
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
  if (!PROXY_BASE) return embedUrl
  return `${PROXY_BASE}/?url=${encodeURIComponent(embedUrl)}`
}

export default function WatchClient({ mediaType, id, season, episode, title, servers, children }: Props) {
  const [server, setServer] = useState(servers[0]?.id || '')
  const [iframeKey, setIframeKey] = useState(0)
  const [lightsOut, setLightsOut] = useState(false)
  const [useDirectEmbed, setUseDirectEmbed] = useState(false)

  useEffect(() => {
    return () => restorePortraitOrientation()
  }, [])

  if (servers.length === 0) {
    return (
      <div className={`${styles.playerSection} empty-state`}>
        <h3>No Streaming Servers Configured</h3>
        <p>Please configure the streaming provider URLs in your .env.local file.</p>
      </div>
    )
  }

  const activeServerObj = servers.find(s => s.id === server) || servers[0]
  const rawEmbedUrl = buildEmbedUrl(activeServerObj.url, server, mediaType, id, season, episode)
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
    <div className={styles.playerWrapper}>
      {lightsOut && (
        <div className={styles.lightsOutOverlay} onClick={() => setLightsOut(false)} />
      )}
      
      <div className={`${styles.playerSection} ${lightsOut ? styles.playerSectionLightsOut : ''}`}>
        <iframe
          key={`${embedUrl}-${iframeKey}`}
          src={embedUrl}
          className={styles.player}
          loading="eager"
          title={`${title} player`}
          allow="autoplay; picture-in-picture; encrypted-media"
          allowFullScreen
        />
      </div>

      {children}

      <div className={styles.serverSelector}>
        <span>If the video fails to load, try switching servers:</span>
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

        {/* Escape hatch: bypass proxy if provider detects and blocks it */}
        {PROXY_BASE && (
          <button
            className={`btn btn-secondary ${styles.serverBtn}`}
            onClick={toggleDirectEmbed}
            title={useDirectEmbed ? 'Switch back to ad-filtered mode' : 'Bypass the ad filter for this server'}
          >
            {useDirectEmbed ? '🛡️ Enable Filter' : '⚡ Direct Mode'}
          </button>
        )}
      </div>
    </div>
  )
}
