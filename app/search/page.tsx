import { searchMulti } from '@/lib/tmdb'
import SearchClient from './SearchClient'

export const dynamic = 'force-dynamic'

export default async function SearchPage(props: { searchParams: Promise<any> | any }) {
  const searchParams = await props.searchParams
  const q = typeof searchParams.q === 'string' ? searchParams.q.trim() : ''

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
        <SearchClient initialQ={q} results={results} total={total} totalPages={totalPages} />
      </div>
    </main>
  )
}
