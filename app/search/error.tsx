'use client'

export default function SearchError({ error, reset }: { error: Error, reset: () => void }) {
  return (
    <main className="page-content empty-state full-page-error">
      <div className="icon">⚠️</div>
      <h2>Search failed</h2>
      <p>{error.message || 'Failed to complete the search.'}</p>
      <button className="btn btn-primary" onClick={() => reset()}>
        Try again
      </button>
    </main>
  )
}
