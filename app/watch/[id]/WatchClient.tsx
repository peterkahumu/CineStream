'use client'
import { useState, useRef, useCallback } from 'react'
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
  const [isFullscreen, setIsFullscreen] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const handleFullscreen = useCallback(async () => {
    const el = wrapperRef.current
    if (!el) return
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen()
        setIsFullscreen(true)
      } else {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch {
      // Fallback: try on the iframe itself
      try {
        if (iframeRef.current && !document.fullscreenElement) {
          await iframeRef.current.requestFullscreen()
          setIsFullscreen(true)
        }
      } catch { /* ignore */ }
    }
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
      <div className={styles.playerWrapper} ref={wrapperRef}>
        <iframe
          ref={iframeRef}
          key={`${embedUrl}-${iframeKey}`}
          src={embedUrl}
          className={styles.player}
          loading="lazy"
          title={`${title} player`}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
        <button
          className={styles.fullscreenBtn}
          onClick={handleFullscreen}
          title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? (
            // Compress icon
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/>
            </svg>
          ) : (
            // Expand icon
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
            </svg>
          )}
        </button>
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
