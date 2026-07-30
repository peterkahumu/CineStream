'use client'

export default function HomeError({ error, reset }: { error: Error, reset: () => void }) {
  return (
    <main className="page-content empty-state full-page-error">
      <div className="icon">⚠️</div>
      <h2>Failed to load content</h2>
      <p>{error.message || 'An unexpected error occurred.'}</p>
      <button className="btn btn-primary" onClick={() => reset()}>
        Try again
      </button>
    </main>
  )
}
