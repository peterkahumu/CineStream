/**
 * Shared utilities for the cinemaphora_terms acceptance cookie.
 * All cookie reads/writes go through here — no raw document.cookie parsing elsewhere.
 */

const TERMS_COOKIE = 'cinemaphora_terms'
/** Event name dispatched (client-side only) when the terms state changes. */
export const TERMS_EVENT = 'termsAccepted'

/** Reads the cookie. Safe to call only in browser context. */
export function getTermsAccepted(): boolean {
  return (
    document.cookie
      .split('; ')
      .find(row => row.startsWith(`${TERMS_COOKIE}=`))
      ?.split('=')[1] === 'true'
  )
}

/**
 * Writes the cookie and fires the `termsAccepted` window event so all
 * listening components (TermsAgreementModal, settings page, etc.) update
 * their UI in sync.
 *
 * @param accepted pass `true` to accept, `false` to revoke.
 */
export function setTermsAccepted(accepted: boolean): void {
  const expires = new Date()
  // Use a far-future expiry for both true and false so Capacitor WebViews
  // always overwrite the previous value instead of ignoring a max-age=0 delete.
  expires.setFullYear(expires.getFullYear() + 10)
  document.cookie = `${TERMS_COOKIE}=${accepted}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`
  window.dispatchEvent(new Event(TERMS_EVENT))
}
