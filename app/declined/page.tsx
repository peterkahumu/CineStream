'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'

export default function DeclinedPage() {
  const router = useRouter()

  const handleAgree = () => {
    localStorage.setItem('termsAccepted', 'true')
    window.dispatchEvent(new Event('termsAccepted'))
    router.push('/')
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
