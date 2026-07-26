'use client'

import {
  createContext, useContext, useEffect, useState, useCallback,
  type ReactNode,
} from 'react'
import {
  UserSettings, DEFAULT_SETTINGS,
  readAllSettings, writeSetting, applySettingsToDOM,
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

  const onSystemChange = useCallback(() => {
    setSettings(prev => {
      if (prev.theme === 'system') {
        applySettingsToDOM(prev)
      }
      return prev
    })
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

  const updateSetting = useCallback(<K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K],
  ) => {
    writeSetting(key, value)
    setSettings(prev => {
      const next = { ...prev, [key]: value }
      applySettingsToDOM(next)
      return next
    })
  }, [])

  return (
    <SettingsContext.Provider value={{ settings, updateSetting }}>
      {children}
    </SettingsContext.Provider>
  )
}
