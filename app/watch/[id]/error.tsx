'use client'

export default function WatchError({ error, reset }: { error: Error, reset: () => void }) {
  return (
    <main className="page-content empty-state full-page-error">
      <div className="icon">⚠️</div>
      <h2>Playback Error</h2>
      <p>{error.message || 'Failed to load this media title.'}</p>
      <button className="btn btn-primary" onClick={() => reset()}>
        Try again
      </button>
    </main>
  )
}
