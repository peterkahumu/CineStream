'use client'

/**
 * Shared geo-detection utility.
 *
 * Single source of truth for the user's detected country.
 * All components that need geo data should use this module instead of
 * calling their own fetch or reading a different localStorage key.
 *
 * Storage key: 'cinemaphora-geo'
 * Shape: { countryCode: string; countryName: string }
 */

const GEO_CACHE_KEY = 'cinemaphora-geo'
const GEO_API_URL = 'https://get.geojs.io/v1/ip/geo.json'

export interface GeoData {
  countryCode: string
  countryName: string
}

/**
 * Returns cached geo data from localStorage, or null if not yet detected.
 * Safe to call anywhere — returns null in SSR context.
 */
export function getCachedGeo(): GeoData | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(GEO_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // Validate shape before returning
    if (typeof parsed.countryCode === 'string' && typeof parsed.countryName === 'string') {
      return parsed as GeoData
    }
    return null
  } catch {
    return null
  }
}

/**
 * Fetches geo data from the API, caches it, and returns the result.
 * Falls back to { countryCode: 'US', countryName: 'Global' } on error.
 */
export async function fetchAndCacheGeo(): Promise<GeoData> {
  try {
    const res = await fetch(GEO_API_URL)
    if (!res.ok) throw new Error('Geo API returned non-ok status')
    const data = await res.json()
    const geo: GeoData = {
      countryCode: data.country_code || 'US',
      countryName: data.country || 'Global',
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(geo))
    }
    return geo
  } catch {
    return { countryCode: 'US', countryName: 'Global' }
  }
}

/**
 * Returns geo data: uses cache if available, otherwise fetches and caches.
 * This is the primary function most components should call.
 */
export async function getGeo(): Promise<GeoData> {
  const cached = getCachedGeo()
  if (cached) return cached
  return fetchAndCacheGeo()
}
