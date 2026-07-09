'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import styles from './page.module.css'

function DeclinedContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleAgree = () => {
    // Set proper HTTP cookie for Middleware
    const expires = new Date()
    expires.setFullYear(expires.getFullYear() + 10)
    document.cookie = `cinemaphora_terms=true; path=/; expires=${expires.toUTCString()}; SameSite=Lax`
    localStorage.setItem('termsAccepted', 'true')
    window.dispatchEvent(new Event('termsAccepted'))
    // Return user to their original destination if available
    const redirect = searchParams.get('redirect')
    router.push(redirect || '/')
  }

  return (
    <div className="page-content page-container">
      <div className={styles.container}>
        <div className={styles.icon}>🛑</div>
        <h1 className={styles.title}>Terms Declined</h1>
        <p className={styles.message}>
          You must agree to the Terms of Use and Privacy Policy to use CinemaPhora.
          Because you declined, access to the application is restricted.
        </p>
        <div className={styles.buttons}>
          <Link href="/" className={styles.reviewButton}>
            Review Terms Again
          </Link>
          <button onClick={handleAgree} className={styles.agreeButton}>
            I Agree
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DeclinedPage() {
  return (
    <Suspense fallback={<div className="page-content page-container" />}>
      <DeclinedContent />
    </Suspense>
  )
}
