import React from 'react'
import Link from 'next/link'
import styles from './Footer.module.css'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className={styles.footer}>
      <div className={styles.content}>
        <div className={styles.brand}>CinemaPhora</div>
        
        <div className={styles.linkGroups}>
          <div className={styles.linkGroup}>
            <div className={styles.groupLabel}>Browse</div>
            <Link href="/" className={styles.link}>Home</Link>
            <Link href="/trending" className={styles.link}>Trending</Link>
            <Link href="/popular" className={styles.link}>Popular</Link>
            <Link href="/top-rated" className={styles.link}>Top Rated</Link>
          </div>
          <div className={styles.linkGroup}>
            <div className={styles.groupLabel}>Discover</div>
            <Link href="/now-playing" className={styles.link}>Now Playing</Link>
            <Link href="/upcoming" className={styles.link}>Coming Soon</Link>
            <Link href="/discover" className={styles.link}>Discover</Link>
            <Link href="/search" className={styles.link}>Search</Link>
          </div>
          <div className={styles.linkGroup}>
            <div className={styles.groupLabel}>Providers</div>
            <Link href="/providers" className={styles.link}>All Providers</Link>
            <Link href="/provider/8" className={styles.link}>Netflix</Link>
            <Link href="/provider/9" className={styles.link}>Prime Video</Link>
            <Link href="/provider/337" className={styles.link}>Disney+</Link>
          </div>
          <div className={styles.linkGroup}>
            <div className={styles.groupLabel}>Legal</div>
            <Link href="/terms" className={styles.link}>Terms of Use</Link>
            <Link href="/privacy" className={styles.link}>Privacy Policy</Link>
            <Link href="/settings" className={styles.link}>Settings</Link>
          </div>
        </div>

        <p className={styles.disclaimer}>
          Powered by TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.
        </p>

        <div className={styles.copyright}>
          &copy; {currentYear} CinemaPhora. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
