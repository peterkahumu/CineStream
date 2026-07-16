'use client'

import Link from 'next/link'
import styles from './OfflineClient.module.css'

export default function OfflinePage() {
  return (
    <main className={`page-container ${styles.container}`}>
      <div className={styles.icon}>📡</div>
      <h1 className={styles.title}>You are offline</h1>
      <p className={styles.description}>
        It looks like you've lost your internet connection. You can still browse 
        your saved movies and TV shows while we wait for the connection to return.
      </p>
      <div className={styles.actions}>
        <button 
          onClick={() => window.location.reload()} 
          className={styles.retryBtn}
        >
          🔄 Try Reconnecting
        </button>
        <Link href="/wishlist" className={styles.wishlistBtn}>
          🔖 Go to Wishlist
        </Link>
      </div>
    </main>
  )
}
