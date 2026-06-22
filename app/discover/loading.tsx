import LoadingSpinner from '@/components/LoadingSpinner'

export default function DiscoverLoading() {
  return (
    <main className="page-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <LoadingSpinner size="lg" text="Loading Discover…" />
    </main>
  )
}
