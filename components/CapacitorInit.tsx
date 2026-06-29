'use client'

import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar } from '@capacitor/status-bar'
import { App } from '@capacitor/app'
import { useRouter } from 'next/navigation'

export default function CapacitorInit() {
  const router = useRouter()

  useEffect(() => {
    // Hide the splash screen only when the React component tree is mounted.
    if (Capacitor.isNativePlatform()) {
      SplashScreen.hide().catch((err) => console.error('Failed to hide splash screen:', err))
      // Keep the status bar visible, but prevent it from overlapping the app UI
      StatusBar.setOverlaysWebView({ overlay: false }).catch((err) => console.log(err))
      StatusBar.setBackgroundColor({ color: '#0f172a' }).catch((err) => console.log(err))
      
      // Handle the Android hardware back button
      const backListener = App.addListener('backButton', () => {
        if (window.location.pathname === '/') {
          // If on the homepage, exit the app natively
          App.exitApp()
        } else {
          // Otherwise, use Next.js routing to go back
          router.back()
        }
      })

      // Handle global fullscreen events (e.g. video player or trailers)
      let immersiveInterval: NodeJS.Timeout | null = null
      const handleFullscreenChange = async () => {
        try {
          if (document.fullscreenElement) {
            setTimeout(async () => {
              await import('@capacitor/screen-orientation').then(m => m.ScreenOrientation.lock({ orientation: 'landscape' })).catch(() => {})
              await StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {})
              await StatusBar.hide().catch(() => {})

              immersiveInterval = setInterval(() => {
                if (document.fullscreenElement) {
                  StatusBar.hide().catch(() => {})
                }
              }, 2500)
            }, 300)
          } else {
            setTimeout(async () => {
              await import('@capacitor/screen-orientation').then(m => m.ScreenOrientation.unlock()).catch(() => {})
              await StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {})
              await StatusBar.show().catch(() => {})
              if (immersiveInterval) {
                clearInterval(immersiveInterval)
                immersiveInterval = null
              }
            }, 300)
          }
        } catch (error) {
          console.error('Failed to change screen orientation:', error)
        }
      }
      
      document.addEventListener('fullscreenchange', handleFullscreenChange)

      return () => {
        backListener.then(l => l.remove()).catch(() => {})
        document.removeEventListener('fullscreenchange', handleFullscreenChange)
        if (immersiveInterval) clearInterval(immersiveInterval)
        
        // Failsafe on global unmount (though this rarely unmounts)
        import('@capacitor/screen-orientation').then(m => m.ScreenOrientation.unlock()).catch(() => {})
        StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {})
        StatusBar.show().catch(() => {})
      }
    }
  }, [router])

  return null // This is a logic-only component
}
