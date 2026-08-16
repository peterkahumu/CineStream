import { registerPlugin } from '@capacitor/core'

/** Bridge to android/app/src/main/java/com/cinemaphora/app/PlayerOrientationPlugin.java */
interface PlayerOrientationPlugin {
  lockSensorLandscape(): Promise<void>
}

const PlayerOrientation = registerPlugin<PlayerOrientationPlugin>('PlayerOrientation')

/**
 * Rotates into landscape for fullscreen playback, while still letting the device
 * flip between the two landscape directions.
 *
 * Falls back to @capacitor/screen-orientation's fixed landscape when the native
 * plugin isn't there. That matters in practice: capacitor.config.ts points
 * `server.url` at the live site, so an installed APK runs whatever JS is
 * deployed — including this call, from a shell built before the plugin existed.
 * Fixed landscape is the old, half-broken behaviour, but it beats not rotating.
 */
export async function lockLandscape(): Promise<void> {
  try {
    await PlayerOrientation.lockSensorLandscape()
  } catch {
    await import('@capacitor/screen-orientation')
      .then(m => m.ScreenOrientation.lock({ orientation: 'landscape' }))
      .catch(() => {})
  }
}

/**
 * Hands orientation back to the system.
 *
 * ScreenOrientation.unlock() already resolves to SCREEN_ORIENTATION_UNSPECIFIED,
 * which is exactly right here, so there is no native counterpart to lockLandscape.
 */
export async function unlockOrientation(): Promise<void> {
  await import('@capacitor/screen-orientation')
    .then(m => m.ScreenOrientation.unlock())
    .catch(() => {})
}
