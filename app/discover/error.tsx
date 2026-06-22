'use client'

export default function DiscoverError({ error, reset }: { error: Error, reset: () => void }) {
  return (
    <main className="page-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
      <div className="icon" style={{ fontSize: '3rem' }}>⚠️</div>
      <h2>Something went wrong!</h2>
      <p style={{ color: 'var(--text-muted)' }}>{error.message || 'Failed to load discover page.'}</p>
      <button className="btn btn-primary" onClick={() => reset()}>
        Try again
      </button>
    </main>
  )
}
