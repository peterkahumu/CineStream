'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import FilterBar, { FilterState } from '@/components/FilterBar'
import MediaCard from '@/components/MediaCard'
import LoadingSpinner from '@/components/LoadingSpinner'
import { discover, MediaItem, TMDBPage } from '@/lib/tmdb'
import styles from './page.module.css'

const DEFAULT_FILTERS: FilterState = {
  media: 'movie',
  sort_by: 'popularity.desc',
  genreId: '',
  country: '',
  year: '',
  minRating: '',
  language: '',
}

function DiscoverContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [filters, setFilters] = useState<FilterState>({
    ...DEFAULT_FILTERS,
    media: (searchParams.get('media') as 'movie' | 'tv') || 'movie',
    sort_by: searchParams.get('sort') || 'popularity.desc',
  })
  const [items, setItems] = useState<MediaItem[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDiscover = useCallback(async (f: FilterState, pg: number, append = false) => {
    append ? setLoadingMore(true) : setLoading(true)
    setError(null)
    try {
      const params: Record<string, string | number | boolean> = {
        sort_by: f.sort_by,
        page: pg,
        'vote_count.gte': 10,
      }
      if (f.genreId)   params['with_genres']             = f.genreId
      if (f.country)   params['with_origin_country']     = f.country
      if (f.language)  params['with_original_language']  = f.language
      if (f.minRating) params['vote_average.gte']        = f.minRating
      if (f.year) {
        if (f.media === 'movie') params['primary_release_year'] = f.year
        else                     params['first_air_date_year']  = f.year
      }

      const data: TMDBPage<MediaItem> = await discover({ media: f.media, ...params } as Parameters<typeof discover>[0])
      setTotalPages(data.total_pages)
      setItems(prev => append ? [...prev, ...data.results] : data.results)
    } catch {
      setError('Failed to load results. Make sure TMDB_API_KEY is set in .env.local.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    setPage(1)
    setItems([])
    fetchDiscover(filters, 1)
    const params = new URLSearchParams()
    if (filters.media !== 'movie') params.set('media', filters.media)
    if (filters.sort_by !== 'popularity.desc') params.set('sort', filters.sort_by)
    router.replace(`/discover?${params.toString()}`, { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  const loadMore = () => {
    const next = page + 1
    setPage(next)
    fetchDiscover(filters, next, true)
  }

  return (
    <main className="page-content">
      <div className="page-container">
        <div className={styles.header}>
          <h1 className={styles.title}>Discover</h1>
          <p className={styles.subtitle}>
            Browse {filters.media === 'movie' ? 'movies' : 'TV shows'} by genre, country, year and more
          </p>
        </div>

        <FilterBar filters={filters} onChange={f => { setFilters(f); setPage(1) }} />

        {loading && <LoadingSpinner size="lg" text="Loading…" />}

        {error && !loading && (
          <div className={styles.error}>⚠️ {error}</div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="empty-state">
            <div className="icon">🎬</div>
            <h3>No results found</h3>
            <p>Try adjusting or resetting your filters.</p>
          </div>
        )}

        {items.length > 0 && (
          <>
            <p className={styles.resultCount}>{items.length} titles loaded</p>
            <div className="media-grid animate-fadeIn">
              {items.map(item => (
                <MediaCard key={item.id} item={item} forcedType={filters.media} />
              ))}
            </div>

            {page < Math.min(totalPages, 20) && (
              <div className={styles.loadMoreWrap}>
                {loadingMore
                  ? <LoadingSpinner size="md" />
                  : (
                    <button className="btn btn-secondary" onClick={loadMore} style={{ padding: '10px 40px' }}>
                      Load More
                    </button>
                  )}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}

export default function DiscoverPage() {
  return (
    <Suspense fallback={<LoadingSpinner size="lg" text="Loading…" />}>
      <DiscoverContent />
    </Suspense>
  )
}
