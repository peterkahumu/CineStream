'use client'
import { useState, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { ScreenOrientation } from '@capacitor/screen-orientation'
import { StatusBar } from '@capacitor/status-bar'
import { buildEmbedUrl, type StreamingServer } from '@/lib/streamingProvider'
import styles from './page.module.css'

interface Props {
  mediaType: 'movie' | 'tv'
  id: string
  season: number
  episode: number
  title: string
  servers: StreamingServer[]
  children?: React.ReactNode
}

function cleanWatchUrlParams() {
  if (typeof window === 'undefined' || !window.history.replaceState) return
  const url = new URL(window.location.href)
  if (url.searchParams.has('s') || url.searchParams.has('e')) {
    url.searchParams.delete('s')
    url.searchParams.delete('e')
    window.history.replaceState({}, '', url.toString())
  }
}

function restorePortraitOrientation() {
  if (Capacitor.isNativePlatform()) {
    ScreenOrientation.unlock().catch(console.error)
    StatusBar.setOverlaysWebView({ overlay: false }).catch(console.error)
    StatusBar.show().catch(console.error)
  }
}

export default function WatchClient({ mediaType, id, season, episode, title, servers, children }: Props) {
  const [server, setServer] = useState(servers[0]?.id || '')
  const [iframeKey, setIframeKey] = useState(0)
  const [lightsOut, setLightsOut] = useState(false)

  useEffect(() => {
    cleanWatchUrlParams()
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
  const embedUrl = buildEmbedUrl(activeServerObj.url, server, mediaType, id, season, episode)

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
            onClick={() => { setServer(s.id); setIframeKey(k => k + 1) }}
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
      </div>
    </div>
  )
}
