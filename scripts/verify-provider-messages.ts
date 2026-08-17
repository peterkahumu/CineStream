/**
 * Guards the MEDIA_DATA key-matching in lib/providers/index.ts.
 *
 * VidLink / VidNest / VidFast post their entire library, keyed by TMDB id, on
 * every update. Reading the wrong key writes another title's name, poster,
 * duration and show_progress against the id actually playing — which is how a
 * Mr. Robot episode was recorded as "The Odyssey" with a 9871-second runtime,
 * and how that runtime then pinned the episode below the completion threshold.
 *
 * Run: npm test
 */
import PROVIDERS from '@/lib/providers'
import type { ProviderProgressData, PlayerCallbacks, PlayerContext } from '@/lib/providers/types'

const vidfast = PROVIDERS.find(p => p.id === 'vidfast')!

const context: PlayerContext = {
  id: '62560',
  mediaType: 'tv',
  season: 1,
  episode: 5,
  title: 'Mr. Robot',
}

/** Feeds a MEDIA_DATA payload through the provider and returns what it reported. */
function deliver(payload: Record<string, unknown>): ProviderProgressData[] {
  const seen: ProviderProgressData[] = []
  const callbacks: PlayerCallbacks = {
    onProgress: d => seen.push(d),
    onEvent: () => {},
    onNextEpisode: () => {},
    onClose: () => {},
    onError: () => {},
  }
  vidfast.onMessage!(
    { data: { type: 'MEDIA_DATA', data: payload } } as MessageEvent,
    callbacks,
    context
  )
  return seen
}

const odyssey = {
  title: 'The Odyssey',
  poster_path: '/5rhTDKUhPYvpdQIijFIs5VoWsON.jpg',
  progress: { watched: 10, duration: 9871 },
}
const mrRobot = {
  title: 'Mr. Robot',
  poster_path: '/kv1nRqgebSsREnd7vdC2pSGjpLo.jpg',
  progress: { watched: 109, duration: 2683 },
}

// The exact production shape: the library holds another title, and nothing for
// the id we asked it to play.
const foreignOnly = deliver({ m1368337: odyssey })

// The same library, but this time it does know the id playing.
const exactKey = deliver({ m1368337: odyssey, '62560': mrRobot })

// VidFast prefixes TV ids with "t".
const prefixedKey = deliver({ m1368337: odyssey, t62560: mrRobot })

// An entry that names an id other than its key — keyed wrongly by the provider.
const mismatchedInner = deliver({ '62560': { ...odyssey, id: '1368337' } })

// The entry repeating its own id in the prefixed spelling is still a match.
const prefixedInner = deliver({ t62560: { ...mrRobot, id: 't62560' } })

const checks: [string, boolean][] = [
  ['an unrelated library entry is never reported as this title', foreignOnly.length === 0],
  ['...so no foreign duration can reach the ledger', !foreignOnly.some(d => d.duration === 9871)],
  ['an exact id match is still reported', exactKey.length === 1 && exactKey[0].duration === 2683],
  ['...with that title\'s own metadata', exactKey[0]?.title === 'Mr. Robot'],
  ['a "t"-prefixed id still matches', prefixedKey.length === 1 && prefixedKey[0].duration === 2683],
  ['an entry naming a different id is rejected', mismatchedInner.length === 0],
  ['an entry repeating its own prefixed id is accepted', prefixedInner.length === 1],
]

let failed = 0
for (const [name, ok] of checks) {
  if (!ok) failed++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`)
}
console.log(failed === 0 ? '\nAll cases pass.' : `\n${failed} case(s) failed.`)
process.exit(failed === 0 ? 0 : 1)
