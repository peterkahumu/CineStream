'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './TermsAgreementModal.module.css'
import Modal from './Modal'
import { getTermsAccepted, setTermsAccepted, TERMS_EVENT } from '@/lib/terms'

/** Routes where the modal must never appear (user needs to read the docs). */
const SUPPRESSED_PATHS = new Set(['/terms', '/privacy', '/declined', '/~offline'])

export default function TermsAgreementModal() {
  const [showModal, setShowModal] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const sync = () => setShowModal(!getTermsAccepted())

    sync()
    window.addEventListener(TERMS_EVENT, sync)
    return () => window.removeEventListener(TERMS_EVENT, sync)
  }, [])

  // Don't show on legal/declined/offline pages, and don't render until mounted
  if (SUPPRESSED_PATHS.has(pathname)) return null
  if (!showModal) return null

  const handleAccept = () => setTermsAccepted(true)  // event fires → sync() → showModal=false

  const handleDecline = () => setShowConfirm(true)

  const handleConfirmDecline = () => {
    setShowModal(false)
    // Hard navigate so middleware sees the cookie state correctly
    window.location.href = '/declined'
  }

  return (
    <>
      {/* Main Welcome Modal */}
      <Modal
        isOpen={!showConfirm}
        title="Welcome to CinemaPhora"
        description={
          <>
            Before you continue, please review our{' '}
            <Link href="/terms" className={styles.link}>Terms of Use</Link>{' '}
            and{' '}
            <Link href="/privacy" className={styles.link}>Privacy Policy</Link>.{' '}
            By clicking &ldquo;I Agree&rdquo;, you acknowledge that CinemaPhora is an
            indexing service and does not host any media files.
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
