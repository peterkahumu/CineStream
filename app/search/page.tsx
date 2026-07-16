import { searchMulti } from '@/lib/tmdb'
import SearchClient from './SearchClient'
import FilterBar from '@/components/FilterBar'
import { Suspense } from 'react'

export const dynamic = 'force-dynamic'

export default async function SearchPage(props: { searchParams: Promise<any> | any }) {
  const searchParams = await props.searchParams
  const q = typeof searchParams.q === 'string' ? searchParams.q.trim() : ''
  const media = searchParams.media || 'all'

  let results: any[] = []
  let total = 0
  let totalPages = 0

  if (q) {
    const data = await searchMulti(q)
    results = (data.results || []).filter((r: any) => r.media_type !== 'person')
    total = data.total_results || results.length
    totalPages = data.total_pages || 1
  }

  return (
    <main className="page-content">
      <div className="page-container">
        
        {results.length > 0 && (
          <Suspense fallback={<div style={{ height: 60, marginBottom: 'var(--space-xl)' }} />}>
            <FilterBar
              hideAdvancedFilters={true}
              movieGenres={[]}
              tvGenres={[]}
              countries={[]}
            />
          </Suspense>
        )}

        <SearchClient initialQ={q} results={results} total={total} totalPages={totalPages} media={media} />
      </div>
    </main>
  )
}
