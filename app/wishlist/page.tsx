import WishlistClient from './WishlistClient'
import ScrollToTop from '@/components/ScrollToTop'

export const metadata = {
  title: 'My List',
  description: 'Your saved movies and TV shows.',
}

export default function WishlistPage() {
  return (
    <main className="page-content">
      <ScrollToTop />
      <div className="page-container">
        <h1 className="page-heading">
          <span className="heading-icon">💖</span>
          My List
        </h1>
        <WishlistClient />
      </div>
    </main>
  )
}
