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
      // Hide the status bar globally for a true full-screen immersive app experience
      StatusBar.hide().catch((err) => console.error('Failed to hide status bar:', err))
    }
  }, [])

  return null // This is a logic-only component
}
