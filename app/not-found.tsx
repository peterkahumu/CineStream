import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="page-content empty-state full-page-error not-found">
      <div className="icon">🎬</div>
      <h1>Page Not Found</h1>
      <p>
        The page you&apos;re looking for doesn&apos;t exist. Try heading back home.
      </p>
      <Link href="/" className="btn btn-primary btn-large">
        ← Back to Home
      </Link>
    </main>
  )
}
