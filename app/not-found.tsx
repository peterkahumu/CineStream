import Link from 'next/link'

export default function NotFound() {
  return (
    <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', gap: '24px', textAlign: 'center', padding: '24px' }}>
      <div style={{ fontSize: '5rem' }}>🎬</div>
      <h1 style={{ fontSize: '2rem', fontFamily: 'var(--font-display)' }}>Page Not Found</h1>
      <p style={{ color: 'var(--text-secondary)', maxWidth: '360px', lineHeight: 1.6 }}>
        The page you&apos;re looking for doesn&apos;t exist. Try heading back home.
      </p>
      <Link href="/" className="btn btn-primary" style={{ padding: '12px 28px', fontSize: '1rem' }}>
        ← Back to Home
      </Link>
    </main>
  )
}
