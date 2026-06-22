'use client'

export default function HomeError({ error, reset }: { error: Error, reset: () => void }) {
  return (
    <main className="page-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: '1rem' }}>
      <div className="icon" style={{ fontSize: '3rem' }}>⚠️</div>
      <h2>Failed to load content</h2>
      <p style={{ color: 'var(--text-muted)' }}>{error.message || 'Make sure your TMDB_API_KEY is correct.'}</p>
      <button className="btn btn-primary" onClick={() => reset()}>
        Try again
      </button>
    </main>
  )
}
