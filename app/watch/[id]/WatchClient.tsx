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
}

export default function WatchClient({ mediaType, id, season, episode, title, servers }: Props) {
  const [server, setServer] = useState(servers[0]?.id || '')
  const [iframeKey, setIframeKey] = useState(0)
  const [lightsOut, setLightsOut] = useState(false)

  // ... (keep useEffect as is)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let immersiveInterval: NodeJS.Timeout | null = null

    const handleFullscreenChange = async () => {
      try {
        if (document.fullscreenElement) {
          // Add a tiny delay before forcing rotation. This prevents a race condition
          // where the WebView calculates the fullscreen video boundaries using portrait dimensions,
          // which causes the video to look zoomed-in or cropped.
          setTimeout(async () => {
            await ScreenOrientation.lock({ orientation: 'landscape' })
            // Set overlay to true during fullscreen so the status bar behaves
            // transiently (Immersive Sticky) when swiped down by the user
            await StatusBar.setOverlaysWebView({ overlay: true })
            await StatusBar.hide()

            // ensures the status bar auto-hides again after being pulled down.
            immersiveInterval = setInterval(() => {
              if (document.fullscreenElement) {
                StatusBar.hide().catch(() => {})
              }
            }, 2500)
          }, 300)
        } else {
          setTimeout(async () => {
            await ScreenOrientation.unlock()
            // Restore overlay to false so it doesn't overlap the app's navbar
            await StatusBar.setOverlaysWebView({ overlay: false })
            await StatusBar.show()
            if (immersiveInterval) {
              clearInterval(immersiveInterval)
              immersiveInterval = null
            }
          }, 300)
        }
      } catch (error) {
        console.error('Failed to change screen orientation:', error)
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      if (immersiveInterval) clearInterval(immersiveInterval)
    }
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
