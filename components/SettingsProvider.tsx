'use client'

import {
  createContext, useContext, useEffect, useState, useCallback, useRef,
  type ReactNode,
} from 'react'
import { useSession } from 'next-auth/react'
import {
  UserSettings, DEFAULT_SETTINGS,
  readAllSettings, writeSetting, applySettingsToDOM,
  readUpdatedAt, writeUpdatedAt, fetchRemoteSettings,
  pushSettingsNow, scheduleSettingsSync,
} from '@/lib/settings'
import { getCachedGeo } from '@/lib/geo'

interface SettingsContextValue {
  settings: UserSettings
  updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  updateSetting: () => {},
})

export function useSettings() {
  return useContext(SettingsContext)
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS)
  const { status } = useSession()

  // Read via a ref (not a `status` dependency) so `updateSetting` stays referentially
  // stable across auth-status changes for the many onChange handlers that use it.
  const isAuthenticatedRef = useRef(false)

  const onSystemChange = useCallback(() => {
    setSettings(prev => {
      if (prev.theme === 'system') {
        applySettingsToDOM(prev)
      }
      return prev
    })
  }, [])

  // Guests keep cookies as their entire experience. Signed-in users additionally get
  // them merged with (and kept in sync with) the DB, latest-updatedAt-wins — same
  // strategy as lib/progressTracker.ts uses for watch progress.
  const syncSettingsWithRemote = useCallback(async () => {
    const remote = await fetchRemoteSettings()
    const localUpdatedAt = readUpdatedAt()

    if (remote && remote.updatedAt > localUpdatedAt) {
      // The DB (another device) has newer settings — adopt them here.
      for (const key of Object.keys(remote.settings) as (keyof UserSettings)[]) {
        writeSetting(key, remote.settings[key])
      }
      writeUpdatedAt(remote.updatedAt)
      const merged = readAllSettings()
      setSettings(merged)
      applySettingsToDOM(merged)
    } else {
      // This device is newer (or nothing has ever synced) — push it up.
      pushSettingsNow(readAllSettings(), localUpdatedAt || Date.now())
    }
  }, [])

  // Read cookies on first mount and apply to DOM
  useEffect(() => {
    const loaded = readAllSettings()
    setSettings(loaded)
    applySettingsToDOM(loaded)

    // Auto-detect region if not explicitly set
    if (!document.cookie.includes('cp_region=')) {
      // Prefer the shared geo cache to avoid a redundant network request
      const cachedGeo = getCachedGeo()
      if (cachedGeo) {
        writeSetting('region', cachedGeo.countryCode)
        setSettings(prev => {
          const next = { ...prev, region: cachedGeo.countryCode }
          applySettingsToDOM(next)
          return next
        })
      } else {
        fetch('https://countries.dev/ip')
          .then(r => r.json())
          .then(data => {
            if (data.countryCode) {
              // Update state and cookie
              writeSetting('region', data.countryCode)
              setSettings(prev => {
                const next = { ...prev, region: data.countryCode }
                applySettingsToDOM(next)
                return next
              })
            }
          })
          .catch(console.error)
      }
    }

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', onSystemChange)
    return () => mq.removeEventListener('change', onSystemChange)
  }, [onSystemChange])

  // Keep the auth-status ref current, and reconcile with the DB once signed in.
  useEffect(() => {
    isAuthenticatedRef.current = status === 'authenticated'
    if (status === 'authenticated') syncSettingsWithRemote()
  }, [status, syncSettingsWithRemote])

  const updateSetting = useCallback(<K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K],
  ) => {
    writeSetting(key, value)
    const updatedAt = readUpdatedAt()
    setSettings(prev => {
      const next = { ...prev, [key]: value }
      applySettingsToDOM(next)
      if (isAuthenticatedRef.current) scheduleSettingsSync(next, updatedAt)
      return next
    })
  }, [])

  return (
    <SettingsContext.Provider value={{ settings, updateSetting }}>
      {children}
    </SettingsContext.Provider>
  )
}
