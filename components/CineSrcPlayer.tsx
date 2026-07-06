'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { buildEmbedUrl, type StreamingServer } from '@/lib/streamingProvider'
import pageStyles from '@/app/watch/[id]/page.module.css'
import styles from './CineSrcPlayer.module.css'

interface CineSrcPlayerProps {
  serverObj: StreamingServer
  mediaType: 'movie' | 'tv'
  id: string
  season: number
  episode: number
  title: string
  backdrop?: string | null
  iframeKey: number
  transformUrl?: (url: string) => string
}

export default function CineSrcPlayer({
  serverObj,
  mediaType,
  id,
  season,
  episode,
  title,
  backdrop,
  iframeKey,
  transformUrl
}: CineSrcPlayerProps) {
  const router = useRouter()
  const [isReady, setIsReady] = useState(false)
  const [startTime, setStartTime] = useState(0)
  const [hasError, setHasError] = useState(false)

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
        } else {
          setStartTime(0)
        }
      } catch (e) {
        console.error('Failed to parse progress', e)
        setStartTime(0)
      }
    } else {
      setStartTime(0)
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
        // Update URL and trigger Next.js soft navigation so page title updates
        router.replace(`/watch/${id}?type=${mediaType}&s=${data.season}&e=${data.episode}`)
        break
      case 'cinesrc:close':
        // Handle integrated back button
        router.push(`/details/${id}?type=${mediaType}`)
        break
      case 'cinesrc:error':
        console.error('CineSrc Stream Error:', data.error)
        setHasError(true)
        break
    }
  }, [id, mediaType, season, episode, title, backdrop, router])

  useEffect(() => {
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [handleMessage])

  if (hasError) {
    return (
      <div className={`${pageStyles.playerSection} ${styles.errorContainer} empty-state`}>
        <h3 className={styles.errorTitle}>Stream failed to load</h3>
        <p className={styles.errorText}>The requested content could not be loaded from CineSrc.</p>
        <button 
          className="btn btn-primary"
          onClick={() => setHasError(false)} // Gives user a chance to retry/refresh component
        >
          Retry Connection
        </button>
      </div>
    )
  }

  if (!isReady) {
    return <div className={`skeleton ${styles.skeletonPlayer}`} />
  }

  const rawEmbedUrl = buildEmbedUrl(serverObj.url, serverObj.id, mediaType, id, season, episode, {
    startTime,
    color: '%232563eb', // Matches --accent in globals.css
    back: 'close'
  })
  
  const embedUrl = transformUrl ? transformUrl(rawEmbedUrl) : rawEmbedUrl

  return (
    <iframe
      key={`${embedUrl}-${iframeKey}`}
      src={embedUrl}
      className={pageStyles.player}
      loading="eager"
      title={`${title} player`}
      allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
      allowFullScreen
    />
  )
}
