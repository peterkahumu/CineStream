/** All user-configurable preferences */
export type Theme = 'light' | 'dark' | 'system' | 'cinema' | 'amoled' | 'dim'
export type Layout = 'grid' | 'list'
export type WishlistSort = 'added' | 'alpha' | 'rating' | 'date'
type CertificationCeiling = 'G' | 'PG' | 'PG-13' | 'R' | 'NC-17' | 'none'

export interface UserSettings {
  theme: Theme
  reduceMotion: boolean
  dataSaver: boolean
  safeSearch: boolean
  autoplayTrailers: boolean
  defaultLayout: Layout
  region: string          // ISO 3166-1, e.g. 'US'
  language: string        // BCP 47, e.g. 'en-US'
  saveSearchHistory: boolean
  defaultSortWishlist: WishlistSort
  preferredProviders: number[] // TMDB provider IDs
  maxCertification: CertificationCeiling
}

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'system',
  reduceMotion: false,
  dataSaver: false,
  safeSearch: true,
  autoplayTrailers: false,
  defaultLayout: 'grid',
  region: 'US',
  language: 'en-US',
  saveSearchHistory: true,
  defaultSortWishlist: 'added',
  preferredProviders: [],
  maxCertification: 'none',
}

const COOKIE_PREFIX = 'cp_'
const COOKIE_EXPIRES_YEARS = 10
const UPDATED_AT_COOKIE = `${COOKIE_PREFIX}updatedAt`
const SYNC_DEBOUNCE_MS = 3_000

function cookieKey(key: keyof UserSettings): string {
  return COOKIE_PREFIX + key
}

function setCookie(name: string, value: string) {
  const expires = new Date()
  expires.setFullYear(expires.getFullYear() + COOKIE_EXPIRES_YEARS)
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`
}

function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined
  const match = document.cookie.split(';').find(c => c.trim().startsWith(name + '='))
  if (!match) return undefined
  return decodeURIComponent(match.split('=')[1].trim())
}

/** Read a single setting from cookies, falling back to the default */
function readSetting<K extends keyof UserSettings>(key: K): UserSettings[K] {
  const raw = getCookie(cookieKey(key))
  if (raw === undefined) return DEFAULT_SETTINGS[key]
  const def = DEFAULT_SETTINGS[key]
  if (typeof def === 'boolean') return (raw === 'true') as UserSettings[K]
  if (Array.isArray(def)) {
    try { return JSON.parse(raw) as UserSettings[K] }
    catch { return def }
  }
  return raw as UserSettings[K]
}

/** Read all settings from cookies */
export function readAllSettings(): UserSettings {
  return Object.fromEntries(
    (Object.keys(DEFAULT_SETTINGS) as (keyof UserSettings)[]).map(k => [k, readSetting(k)])
  ) as unknown as UserSettings
}

/** Persist one setting to a cookie, and record when it happened (see readUpdatedAt). */
export function writeSetting<K extends keyof UserSettings>(key: K, value: UserSettings[K]) {
  const serialized = Array.isArray(value) ? JSON.stringify(value) : String(value)
  setCookie(cookieKey(key), serialized)
  writeUpdatedAt(Date.now())
}

/** When this device's settings were last changed (epoch ms). 0 if never touched. */
export function readUpdatedAt(): number {
  const raw = getCookie(UPDATED_AT_COOKIE)
  return raw ? Number(raw) || 0 : 0
}

/** Explicitly pin the "last changed" timestamp — used after adopting remote settings. */
export function writeUpdatedAt(timestamp: number) {
  setCookie(UPDATED_AT_COOKIE, String(timestamp))
}

/** Apply data-* attributes to the <html> element based on settings */
export function applySettingsToDOM(settings: UserSettings) {
  const html = document.documentElement
  
  // Theme
  if (settings.theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    html.dataset.theme = prefersDark ? 'dark' : 'light'
  } else {
    html.dataset.theme = settings.theme
  }

  // Reduce motion
  html.dataset.reduceMotion = String(settings.reduceMotion)

  // Data saver
  html.dataset.dataSaver = String(settings.dataSaver)

  // Layout
  html.dataset.layout = settings.defaultLayout
}

// Cross-device sync (signed-in users only)
// Guests never call these — cookies remain their entire experience. See
// components/SettingsProvider.tsx for when/how these are invoked.

/** Fetch this user's DB-synced settings. Returns null if none saved yet, or on error. */
export async function fetchRemoteSettings(): Promise<{ settings: UserSettings; updatedAt: number } | null> {
  try {
    const res = await fetch('/api/get-settings')
    if (!res.ok) return null
    return (await res.json()) as { settings: UserSettings; updatedAt: number } | null
  } catch (err) {
    console.error('[settings] Failed to fetch remote settings:', err)
    return null
  }
}

function pushSettings(settings: UserSettings, updatedAt: number): void {
  fetch('/api/sync-settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ settings, updatedAt }),
  }).catch(err => console.error('[settings] Failed to sync settings:', err))
}

/** Push the full settings blob to the DB immediately (used for the post-login catch-up). */
export function pushSettingsNow(settings: UserSettings, updatedAt: number): void {
  pushSettings(settings, updatedAt)
}

let syncTimer: ReturnType<typeof setTimeout> | null = null

/** Debounced push of the full settings blob to the DB, called after each change. */
export function scheduleSettingsSync(settings: UserSettings, updatedAt: number): void {
  if (typeof window === 'undefined') return
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(() => {
    syncTimer = null
    pushSettings(settings, updatedAt)
  }, SYNC_DEBOUNCE_MS)
}
