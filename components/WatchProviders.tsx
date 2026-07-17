'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import styles from './WatchProviders.module.css'

interface Provider {
  provider_id: number
  provider_name: string
  logo_path: string
}

interface ProviderSet {
  flatrate?: Provider[]
  rent?: Provider[]
  buy?: Provider[]
  ads?: Provider[]
}

interface Props {
  id: string
  mediaType: 'movie' | 'tv'
}

function getRegionFromCache(): string {
  try {
    const cached = localStorage.getItem('cinemaphora-geo')
    if (cached) {
      const parsed = JSON.parse(cached)
      return parsed.countryCode || 'US'
    }
  } catch {}
  return 'US'
}

async function fetchProviders(id: string, mediaType: string, region: string): Promise<{ data: ProviderSet | null, actualRegion: string }> {
  const res = await fetch(`/api/tmdb/${mediaType}/${id}/watch/providers`)
  if (!res.ok) return { data: null, actualRegion: region }
  const json = await res.json()
  
  const localData = json?.results?.[region]
  const hasLocal = localData && (
    (localData.flatrate?.length ?? 0) +
    (localData.rent?.length ?? 0) +
    (localData.buy?.length ?? 0) +
    (localData.ads?.length ?? 0)
  ) > 0

  if (hasLocal) return { data: localData, actualRegion: region }

  // Fallback to US
  const usData = json?.results?.['US']
  return { data: usData ?? null, actualRegion: usData ? 'US' : region }
}

export default function WatchProviders({ id, mediaType }: Props) {
  const [providers, setProviders] = useState<ProviderSet | null>(null)
  const [region, setRegion] = useState('US')
  const [loading, setLoading] = useState(true)

  const handleLoad = useCallback(async (regionCode: string) => {
    setLoading(true)
    const { data, actualRegion } = await fetchProviders(id, mediaType, regionCode)
    setProviders(data)
    setRegion(actualRegion)
    setLoading(false)
  }, [id, mediaType])

  useEffect(() => {
    const regionCode = getRegionFromCache()
    handleLoad(regionCode)
  }, [handleLoad])

  if (loading) {
    return (
      <div className={styles.skeleton}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`${styles.logoSkeleton} skeleton`} />
        ))}
      </div>
    )
  }

  const hasAny = providers && (
    (providers.flatrate?.length ?? 0) +
    (providers.rent?.length ?? 0) +
    (providers.buy?.length ?? 0) +
    (providers.ads?.length ?? 0)
  ) > 0

  if (!hasAny) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>📡</span>
        <p>Streaming information not available for your region ({region}).</p>
        <a
          href={`https://www.themoviedb.org/${mediaType}/${id}/watch`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary"
          style={{ marginTop: '1rem' }}
        >
          Check on TMDB ↗
        </a>
      </div>
    )
  }

  const renderGroup = (label: string, items: Provider[] | undefined, emoji: string) => {
    if (!items?.length) return null
    return (
      <div className={styles.group}>
        <h4 className={styles.groupLabel}>{emoji} {label}</h4>
        <div className={styles.logos}>
          {items.map(p => (
            <div key={p.provider_id} className={styles.logoWrap} title={p.provider_name}>
              <Image
                src={`https://image.tmdb.org/t/p/w92${p.logo_path}`}
                alt={p.provider_name}
                fill
                sizes="48px"
                className={styles.logo}
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <p className={styles.regionNote}>Showing availability for <strong>{region}</strong></p>
      {renderGroup('Stream', providers?.flatrate, '▶️')}
      {renderGroup('Free with Ads', providers?.ads, '📺')}
      {renderGroup('Rent', providers?.rent, '🎬')}
      {renderGroup('Buy', providers?.buy, '🛒')}
      <p className={styles.tmdbCredit}>
        Data provided by{' '}
        <a href="https://www.justwatch.com" target="_blank" rel="noopener noreferrer">JustWatch</a>
        {' '}via TMDB.
      </p>
    </div>
  )
}
