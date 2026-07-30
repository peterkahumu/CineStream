'use client'

export default function DiscoverError({ error, reset }: { error: Error, reset: () => void }) {
  return (
    <main className="page-content empty-state full-page-error">
      <div className="icon">⚠️</div>
      <h2>Something went wrong!</h2>
      <p>{error.message || 'Failed to load discover page.'}</p>
      <button className="btn btn-primary" onClick={() => reset()}>
        Try again
      </button>
    </main>
  )
}
