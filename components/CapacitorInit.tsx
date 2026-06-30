'use client'

import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar } from '@capacitor/status-bar'
import { App } from '@capacitor/app'
import { useRouter } from 'next/navigation'

// ─── Helper functions (defined outside useEffect) ─────────────────────────────

async function setupSplashAndStatusBar() {
  await SplashScreen.hide().catch((err) => console.error('Failed to hide splash screen:', err))
  await StatusBar.setOverlaysWebView({ overlay: false }).catch((err) => console.log(err))
  await StatusBar.setBackgroundColor({ color: '#0f172a' }).catch((err) => console.log(err))
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
    await import('@capacitor/screen-orientation')
      .then(m => m.ScreenOrientation.lock({ orientation: 'landscape' }))
      .catch(() => {})
    await StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {})
    await StatusBar.hide().catch(() => {})

    immersiveRef.interval = setInterval(() => {
      if (document.fullscreenElement) {
        StatusBar.hide().catch(() => {})
      }
    }, 2500)
  } catch (error) {
    console.error('Failed to enter fullscreen orientation:', error)
  }
}

async function handleFullscreenExit(immersiveRef: { interval: NodeJS.Timeout | null }) {
  try {
    await new Promise(resolve => setTimeout(resolve, 300))
    await import('@capacitor/screen-orientation')
      .then(m => m.ScreenOrientation.unlock())
      .catch(() => {})
    await StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {})
    await StatusBar.show().catch(() => {})
    if (immersiveRef.interval) {
      clearInterval(immersiveRef.interval)
      immersiveRef.interval = null
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function CapacitorInit() {
  const router = useRouter()

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    // Object ref so the interval can be mutated across handler calls
    const immersiveRef: { interval: NodeJS.Timeout | null } = { interval: null }

    setupSplashAndStatusBar()

    const backListenerPromise = registerBackButton(router)

    const handleFullscreenChange = createFullscreenHandler(immersiveRef)
    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      backListenerPromise.then(l => l.remove()).catch(() => {})
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      if (immersiveRef.interval) clearInterval(immersiveRef.interval)

      // Failsafe on unmount
      import('@capacitor/screen-orientation').then(m => m.ScreenOrientation.unlock()).catch(() => {})
      StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {})
      StatusBar.show().catch(() => {})
    }
  }, [router])

  return null // Logic-only component
}
