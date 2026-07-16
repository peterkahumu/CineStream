'use client'

import { useState, useEffect } from 'react'
import styles from './OfflineTrailerWrapper.module.css'

export default function OfflineTrailerWrapper({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false)
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    setIsOnline(navigator.onLine)
    setIsReady(true)
    
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!isReady) {
    return <div className={styles.offlineBox} style={{ animation: 'pulse 2s infinite' }} />
  }

  if (!isOnline) {
    return (
      <div className={styles.offlineBox}>
        <div className={styles.icon}>📡</div>
        <p>Trailer unavailable offline</p>
      </div>
    )
  }

  return <>{children}</>
}
