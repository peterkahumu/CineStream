'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { setTermsAccepted } from '@/lib/terms'
import styles from './page.module.css'

function DeclinedContent() {
  const searchParams = useSearchParams()

  const handleAgree = () => {
    setTermsAccepted(true)
    // Hard navigate so middleware sees the new cookie immediately
    const redirect = searchParams.get('redirect')
    window.location.href = redirect || '/'
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
