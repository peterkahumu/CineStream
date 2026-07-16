'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import styles from './TermsAgreementModal.module.css'
import Modal from './Modal'

export default function TermsAgreementModal() {
  const [showModal, setShowModal] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    const accepted = document.cookie.split('; ').find(row => row.startsWith('cinemaphora_terms='))?.split('=')[1] === 'true'
    if (!accepted) {
      setShowModal(true)
    }
  }, [])

  const handleAccept = () => {
    // Set HTTP cookie so Next.js Middleware can read it server-side, and client can read it too
    const expires = new Date()
    expires.setFullYear(expires.getFullYear() + 10)
    document.cookie = `cinemaphora_terms=true; path=/; expires=${expires.toUTCString()}; SameSite=Lax`
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
    <>
      {/* Main Welcome Modal */}
      <Modal
        isOpen={showModal && !showConfirm}
        title="Welcome to CinemaPhora"
        description={
          <>
            Before you continue, please review our{' '}
            <Link href="/terms" className={styles.link}>
              Terms of Use
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className={styles.link}>
              Privacy Policy
            </Link>. 
            By clicking "I Agree", you acknowledge that CinemaPhora is an indexing service and does not host any media files.
          </>
        }
        confirmText="I Agree"
        cancelText="I Decline"
        onConfirm={handleAccept}
        onCancel={handleDecline}
      />

      {/* Decline Confirmation Modal */}
      <Modal
        isOpen={showConfirm}
        title="Are you sure?"
        description="You cannot use CinemaPhora without agreeing to the Terms of Use and Privacy Policy. If you decline, you will not be able to access the application."
        confirmText="Yes, I Decline"
        cancelText="Go Back"
        onConfirm={handleConfirmDecline}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  )
}
