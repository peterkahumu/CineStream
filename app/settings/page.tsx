import type { Metadata } from 'next'
import SettingsClient from './SettingsClient'

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Personalise your CinemaPhora experience — appearance, playback, content filters, and data management. Available whether you\'re signed in or just browsing as a guest.',
}

/**
 * Settings are available to everyone — signed-in users and guests alike.
 * Guests get cookie/localStorage-backed preferences (see lib/settings.ts);
 * signed-in users additionally get them synced across devices (SettingsProvider).
 */
export default function SettingsPage() {
  return <SettingsClient />
}
