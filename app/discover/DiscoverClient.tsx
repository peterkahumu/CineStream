'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import MediaCard from '@/components/MediaCard'
import LoadingSpinner from '@/components/LoadingSpinner'
import { discover, MediaItem } from '@/lib/tmdb'
import styles from './page.module.css'

export default function DiscoverClient({
  initialItems,
  totalPages,
  searchParams
}: {
  initialItems: MediaItem[]
  totalPages: number
  searchParams: Record<string, string>
}) {
  const [items, setItems] = useState<MediaItem[]>(initialItems)
  const [page, setPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [exhausted, setExhausted] = useState(page >= Math.min(totalPages, 20))
  const sentinelRef = useRef<HTMLDivElement>(null)

  const loadMore = useCallback(async () => {
    const next = page + 1
    if (loadingMore || next > Math.min(totalPages, 20)) return
    setLoadingMore(true)
    try {
      const media = searchParams.media || 'movie'
      const params: Record<string, string | number | boolean> = {
        sort_by: searchParams.sort || 'popularity.desc',
        page: next,
        'vote_count.gte': 10,
      }
      if (searchParams.genre)     params['with_genres']            = searchParams.genre
      if (searchParams.country)   params['with_origin_country']    = searchParams.country
      if (searchParams.language)  params['with_original_language'] = searchParams.language
      if (searchParams.minRating) params['vote_average.gte']       = searchParams.minRating
      if (searchParams.year) {
        if (media === 'movie') params['primary_release_year'] = searchParams.year
        else                   params['first_air_date_year']  = searchParams.year
      }

      const data = await discover({ media, ...params } as any)
      setItems(prev => [...prev, ...data.results])
      setPage(next)
      if (next >= Math.min(totalPages, 20)) setExhausted(true)
    } catch (e) {
      console.error('Failed to load more', e)
    } finally {
      setLoadingMore(false)
    }
  }, [page, loadingMore, totalPages, searchParams])

  // IntersectionObserver — triggers loadMore when the sentinel scrolls into view
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore && !exhausted) {
          loadMore()
        }
      },
      { rootMargin: '300px' } // start loading 300px before the sentinel is visible
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadMore, loadingMore, exhausted])

  if (items.length === 0) {
    return (
      <div className="empty-state">
        <div className="icon">🎬</div>
        <h3>No results found</h3>
        <p>Try adjusting or resetting your filters.</p>
      </div>
    )
  }

  return (
    <>
      <p className={styles.resultCount}>{items.length} titles loaded</p>
      <div className="media-grid animate-fadeIn">
        {items.map(item => (
          <MediaCard key={item.id} item={item} forcedType={searchParams.media as any || 'movie'} />
        ))}
      </div>

      {/* Sentinel — observed by IntersectionObserver to trigger loadMore */}
      <div ref={sentinelRef} className={styles.sentinel} aria-hidden="true" />

      {loadingMore && (
        <div className={styles.loadMoreWrap}>
          <LoadingSpinner size="md" />
        </div>
      )}

      {exhausted && items.length > 0 && (
        <div className={styles.endMessage}>
          <span>✓ You&apos;ve seen it all</span>
        </div>
      )}
    </>
  )
}
