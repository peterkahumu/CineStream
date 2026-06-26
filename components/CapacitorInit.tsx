'use client'

import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { SplashScreen } from '@capacitor/splash-screen'

export default function CapacitorInit() {
  useEffect(() => {
    // Hide the splash screen only when the React component tree is mounted.
    // This prevents the "white screen" flash between the web view loading and React hydrating.
    if (Capacitor.isNativePlatform()) {
      SplashScreen.hide().catch((err) => console.error('Failed to hide splash screen:', err))
    }
  }, [])

  return null // This is a logic-only component
}
