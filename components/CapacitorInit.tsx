'use client'

import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar } from '@capacitor/status-bar'
import { App } from '@capacitor/app'
import { useRouter } from 'next/navigation'
import { lockLandscape, unlockOrientation } from '@/lib/playerOrientation'

// Shared orientation helper
// window.screen.orientation.lock/unlock are non-standard on the web and typed
// as non-existent in lib.dom.d.ts, so we use a typed wrapper here instead of
// scattering `as any` casts across three locations.
function getWebOrientation(): { lock?: (o: string) => Promise<void>; unlock?: () => void } | null {
  if (typeof window === 'undefined' || !window.screen?.orientation) return null
  return window.screen.orientation as unknown as {
    lock?: (o: string) => Promise<void>
    unlock?: () => void
  }
}

// Helper functions (defined outside useEffect)

async function setupSplashAndStatusBar() {
  await SplashScreen.hide().catch((err) => console.error('Failed to hide splash screen:', err))
  await StatusBar.setOverlaysWebView({ overlay: false }).catch((err) => console.error('StatusBar.setOverlaysWebView failed:', err))
  await StatusBar.setBackgroundColor({ color: '#0f172a' }).catch((err) => console.error('StatusBar.setBackgroundColor failed:', err))
}

function registerBackButton(router: ReturnType<typeof useRouter>) {
  return App.addListener('backButton', () => {
    if (window.location.pathname === '/') {
      App.exitApp()
    } else {
      router.back()
    }
  })
}

async function handleFullscreenEnter(immersiveRef: { interval: NodeJS.Timeout | null }) {
  try {
    await new Promise(resolve => setTimeout(resolve, 300))
    if (Capacitor.isNativePlatform()) {
      await lockLandscape()
      await StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {})
      await StatusBar.hide().catch(() => {})

      immersiveRef.interval = setInterval(() => {
        if (document.fullscreenElement) {
          StatusBar.hide().catch(() => {})
        }
      }, 2500)
    } else {
      await getWebOrientation()?.lock?.('landscape')?.catch(() => {})
    }
  } catch (error) {
    console.error('Failed to enter fullscreen orientation:', error)
  }
}

async function handleFullscreenExit(immersiveRef: { interval: NodeJS.Timeout | null }) {
  try {
    await new Promise(resolve => setTimeout(resolve, 300))
    if (Capacitor.isNativePlatform()) {
      await unlockOrientation()
      await StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {})
      await StatusBar.show().catch(() => {})
      if (immersiveRef.interval) {
        clearInterval(immersiveRef.interval)
        immersiveRef.interval = null
      }
    } else {
      getWebOrientation()?.unlock?.()
    }
  } catch (error) {
    console.error('Failed to exit fullscreen orientation:', error)
  }
}

function createFullscreenHandler(immersiveRef: { interval: NodeJS.Timeout | null }) {
  return () => {
    if (document.fullscreenElement) {
      handleFullscreenEnter(immersiveRef)
    } else {
      handleFullscreenExit(immersiveRef)
    }
  }
}

function setupListeners(router: ReturnType<typeof useRouter>) {
  const immersiveRef: { interval: NodeJS.Timeout | null } = { interval: null }
  const handleFullscreenChange = createFullscreenHandler(immersiveRef)
  
  let backListenerPromise: Promise<import('@capacitor/core').PluginListenerHandle> | null = null

  document.addEventListener('fullscreenchange', handleFullscreenChange)

  if (Capacitor.isNativePlatform()) {
    setupSplashAndStatusBar()
    backListenerPromise = registerBackButton(router)
  }

  return () => {
    if (backListenerPromise) {
      backListenerPromise.then(l => l.remove()).catch(() => {})
    }
    document.removeEventListener('fullscreenchange', handleFullscreenChange)
    if (immersiveRef.interval) clearInterval(immersiveRef.interval)

    if (Capacitor.isNativePlatform()) {
      unlockOrientation()
      StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {})
      StatusBar.show().catch(() => {})
    } else {
      getWebOrientation()?.unlock?.()
    }
  }
}

// Component

export default function CapacitorInit() {
  const router = useRouter()

  useEffect(() => {
    const cleanup = setupListeners(router)
    return cleanup
  }, [router])

  return null // Logic-only component
}
