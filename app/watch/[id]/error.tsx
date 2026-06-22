'use client'

export default function WatchError({ error, reset }: { error: Error, reset: () => void }) {
  return (
    <main className="page-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
      <div className="icon" style={{ fontSize: '3rem' }}>⚠️</div>
      <h2>Playback Error</h2>
      <p style={{ color: 'var(--text-muted)' }}>{error.message || 'Failed to load this media title.'}</p>
      <button className="btn btn-primary" onClick={() => reset()}>
        Try again
      </button>
    </main>
  )
}
