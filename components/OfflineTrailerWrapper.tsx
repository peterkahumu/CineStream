'use client'

import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import styles from './OfflineTrailerWrapper.module.css'

/**
 * Wraps an iframe-based trailer/player and hides it with a friendly
 * placeholder when the user is offline, preventing the browser from
 * throwing a "This page could not load" error on cached pages.
 */
export default function OfflineTrailerWrapper({ children }: { children: React.ReactNode }) {
  const isOnline = useOnlineStatus()

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
