'use client'

import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar } from '@capacitor/status-bar'

export default function CapacitorInit() {
  useEffect(() => {
    // Hide the splash screen only when the React component tree is mounted.
    if (Capacitor.isNativePlatform()) {
      SplashScreen.hide().catch((err) => console.error('Failed to hide splash screen:', err))
      // Keep the status bar visible, but prevent it from overlapping the app UI
      StatusBar.setOverlaysWebView({ overlay: false }).catch((err) => console.log(err))
      StatusBar.setBackgroundColor({ color: '#0f172a' }).catch((err) => console.log(err))
    }
  }, [])

  return null // This is a logic-only component
}
