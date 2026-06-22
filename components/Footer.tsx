import React from 'react'
import Link from 'next/link'
import styles from './Footer.module.css'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className={styles.footer}>
      <div className={styles.content}>
        <div className={styles.brand}>CinemaPhora</div>
        
        <div className={styles.links}>
          <Link href="/" className={styles.link}>Home</Link>
          <Link href="/discover" className={styles.link}>Discover</Link>
          <Link href="/search" className={styles.link}>Search</Link>
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
