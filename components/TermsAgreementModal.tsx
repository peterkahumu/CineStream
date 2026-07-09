'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import styles from './TermsAgreementModal.module.css'

export default function TermsAgreementModal() {
  const [showModal, setShowModal] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    const accepted = localStorage.getItem('termsAccepted')
    if (accepted !== 'true') {
      setShowModal(true)
    }
  }, [])

  const handleAccept = () => {
    // Set HTTP cookie so Next.js Middleware can read it server-side
    const expires = new Date()
    expires.setFullYear(expires.getFullYear() + 10)
    document.cookie = `cinemaphora_terms=true; path=/; expires=${expires.toUTCString()}; SameSite=Lax`
    // Also keep localStorage for client-side reads (SettingsContext)
    localStorage.setItem('termsAccepted', 'true')
    window.dispatchEvent(new Event('termsAccepted'))
    setShowModal(false)
  }

  const handleDecline = () => {
    setShowConfirm(true)
  }

  const handleConfirmDecline = () => {
    setShowModal(false)
    router.push('/declined')
  }

  // Prevent hydration mismatch by not rendering anything until mounted
  if (!mounted) return null
  if (!showModal) return null
  
  // Do not show the modal on the legal pages themselves so the user can actually read them!
  if (pathname === '/terms' || pathname === '/privacy' || pathname === '/declined') return null

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {showConfirm ? (
          <>
            <h2 className={styles.title}>Are you sure?</h2>
            <p className={styles.message}>
              You cannot use CinemaPhora without agreeing to the Terms of Use and Privacy Policy. 
              If you decline, you will not be able to access the application.
            </p>
            <div className={styles.buttonContainer}>
              <button className={styles.acceptButton} onClick={() => setShowConfirm(false)}>
                Go Back
              </button>
              <button className={`${styles.declineButton} ${styles.dangerButton}`} onClick={handleConfirmDecline}>
                Yes, I Decline
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className={styles.title}>Welcome to CinemaPhora</h2>
            <p className={styles.message}>
              Before you continue, please review our{' '}
              <Link href="/terms" className={styles.link}>
                Terms of Use
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className={styles.link}>
                Privacy Policy
              </Link>. 
              By clicking "I Agree", you acknowledge that CinemaPhora is an indexing service and does not host any media files.
            </p>
            <div className={styles.buttonContainer}>
              <button className={styles.acceptButton} onClick={handleAccept}>
                I Agree
              </button>
              <button className={`${styles.declineButton} ${styles.dangerButton}`} onClick={handleDecline}>
                I Decline
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
