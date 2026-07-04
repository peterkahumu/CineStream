import WishlistClient from './WishlistClient'
import ScrollToTop from '@/components/ScrollToTop'

export const metadata = {
  title: 'My List | CinemaPhora',
  description: 'Your saved movies and TV shows.',
}

export default function WishlistPage() {
  return (
    <main className="page-content">
      <ScrollToTop />
      <div className="page-container">
        <h1 style={{ fontSize: '2rem', marginBottom: 'var(--space-lg)' }}>
          <span style={{ marginRight: '8px' }}>💖</span>
          My List
        </h1>
        <WishlistClient />
      </div>
    </main>
  )
}
