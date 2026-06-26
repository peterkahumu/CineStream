'use client'
import { useState, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { ScreenOrientation } from '@capacitor/screen-orientation'
import { StatusBar } from '@capacitor/status-bar'
import { buildEmbedUrl, STREAMING_SERVERS } from '@/lib/streamingProvider'
import styles from './page.module.css'

interface Props {
  mediaType: 'movie' | 'tv'
  id: string
  season: number
  episode: number
  title: string
}

export default function WatchClient({ mediaType, id, season, episode, title }: Props) {
  const [server, setServer] = useState(STREAMING_SERVERS[0]?.id || '')
  const [iframeKey, setIframeKey] = useState(0)

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    const handleFullscreenChange = async () => {
      try {
        if (document.fullscreenElement) {
          // Add a tiny delay before forcing rotation. This prevents a race condition
          // where the WebView calculates the fullscreen video boundaries using portrait dimensions,
          // which causes the video to look zoomed-in or cropped.
          setTimeout(async () => {
            await ScreenOrientation.lock({ orientation: 'landscape' })
            await StatusBar.hide()
          }, 300)
        } else {
          setTimeout(async () => {
            await ScreenOrientation.unlock()
            await StatusBar.show()
          }, 300)
        }
      } catch (error) {
        console.error('Failed to change screen orientation:', error)
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  if (STREAMING_SERVERS.length === 0) {
    return (
      <div className={`${styles.playerSection} empty-state`}>
        <h3>No Streaming Servers Configured</h3>
        <p>Please configure the streaming provider URLs in your .env.local file.</p>
      </div>
    )
  }

  const embedUrl = buildEmbedUrl(server, mediaType, id, season, episode)

  return (
    <div className={styles.playerSection}>
      <div className={styles.playerWrapper}>
        <iframe
          key={`${embedUrl}-${iframeKey}`}
          src={embedUrl}
          className={styles.player}
          loading="eager"
          title={`${title} player`}
          allow="autoplay *; fullscreen *; picture-in-picture *; encrypted-media *; web-share *"
          allowFullScreen
        />
      </div>

      <div className={styles.serverSelector}>
        <span>If the video fails to load, try switching servers:</span>
        {STREAMING_SERVERS.map(s => (
          <button
            key={s.id}
            className={`btn ${server === s.id ? 'btn-primary' : 'btn-secondary'} ${styles.serverBtn}`}
            onClick={() => { setServer(s.id); setIframeKey(k => k + 1) }}
          >
            {s.name}
          </button>
        ))}
      </div>
    </div>
  )
}
