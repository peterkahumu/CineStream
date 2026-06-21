'use client'
import { useState, useEffect, useRef } from 'react'
import { tmdbFetch } from '@/lib/tmdb'

interface UseTmdbResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useTmdb<T>(
  endpoint: string | null,
  params: Record<string, string | number | boolean> = {}
): UseTmdbResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cacheRef = useRef<Map<string, T>>(new Map())

  const paramsKey = JSON.stringify(params)
  const cacheKey  = `${endpoint}${paramsKey}`

  const doFetch = async () => {
    if (!endpoint) return
    const cached = cacheRef.current.get(cacheKey)
    if (cached) { setData(cached); return }

    setLoading(true)
    setError(null)
    try {
      const result = await tmdbFetch<T>(endpoint, params)
      cacheRef.current.set(cacheKey, result)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { doFetch() }, [endpoint, paramsKey])

  return { data, loading, error, refetch: doFetch }
}
