import { redirect } from 'next/navigation'

/**
 * Settings have been merged into the Profile page.
 * Redirect all visitors to /profile#settings.
 */
export default function SettingsRedirect() {
  redirect('/profile')
}
