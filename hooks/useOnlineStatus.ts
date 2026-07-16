'use client'

import { useState, useEffect } from 'react'

/**
 * Returns the current online status of the browser, updating reactively
 * when the connection is gained or lost.
 *
 * Initialises to `true` during SSR (window is not available) and immediately
 * corrects itself on the first client-side render via useEffect.
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    // Correct the initial value now that we're in the browser
    setIsOnline(navigator.onLine)

    const goOnline = () => setIsOnline(true)
    const goOffline = () => setIsOnline(false)

    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  return isOnline
}
