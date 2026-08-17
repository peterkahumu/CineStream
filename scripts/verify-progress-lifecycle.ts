/**
 * Verifies the invariants that watch progress silently broke on: a resume point
 * survives the events a player fires while it is still loading, moving to a new
 * episode doesn't disturb the old one's position, and a stored entry is still
 * found whatever spelling its key arrived in.
 *
 * progressTracker only touches localStorage inside its functions, so a Map-backed
 * shim installed before the dynamic import is enough to exercise it here — hence
 * the import inside main() rather than at the top. Guests (isAuthenticated = false)
 * never reach the network. Run: npm test
 */

class MemoryStorage {
  private store = new Map<string, string>()
  get length() { return this.store.size }
  key(i: number) { return Array.from(this.store.keys())[i] ?? null }
  getItem(k: string) { return this.store.get(k) ?? null }
  setItem(k: string, v: string) { this.store.set(k, String(v)) }
  removeItem(k: string) { this.store.delete(k) }
  clear() { this.store.clear() }
}

const storage = new MemoryStorage()
;(globalThis as unknown as { localStorage: MemoryStorage }).localStorage = storage

const ID = '1399'

let failed = 0
function check(label: string, actual: number, want: number) {
  const ok = actual === want
  if (!ok) failed++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : ` — got ${actual}, want ${want}`}`)
}

async function main() {
  const tracker = await import('@/lib/progressTracker')

  /** Mimics one PlayerIframe.handleProgress call for a TV episode. */
  const play = (
    season: number,
    episode: number,
    watched: number,
    duration: number,
    isRealTimeEvent = true
  ) => {
    tracker.saveProgress(ID, 'tv', 'vidapi', {
      watched,
      duration,
      title: 'Test Show',
      season,
      episode,
      show_progress: {
        [tracker.episodeKey(season, episode)]: {
          season, episode, watched, duration, updatedAt: Date.now(),
        },
      },
      isRealTimeEvent,
    }, false)
  }

  const resume = (s: number, e: number) => tracker.getResumeTime(ID, s, e)

  // A player that has not loaded metadata reports 0/0. That must not be mistaken for
  // the user rewinding to the start, or every reopen wipes the resume point.
  storage.clear()
  play(1, 3, 900, 2700)
  play(1, 3, 0, 0)
  check('a 0s / 0-duration live event does not erase a stored position', resume(1, 3), 900)

  // ...but the guard must not swallow a real rewind, which always knows its duration.
  storage.clear()
  play(1, 3, 900, 2700)
  play(1, 3, 12, 2700)
  check('a genuine rewind (position and duration known) still lowers the position', resume(1, 3), 12)

  // The invariant the component-lifetime bug broke: after moving on, the new episode
  // records and the one behind it keeps its own place. Episode 1 is left part-watched
  // so its resume point is a real position rather than the restart-at-95% case below.
  storage.clear()
  play(1, 1, 1200, 2700)
  play(1, 2, 240, 2700)
  check('progress recorded for a new episode after advancing', resume(1, 2), 240)
  check('the previous episode keeps its own resume point', resume(1, 1), 1200)

  // Advancing twice in one session — one advance was never enough to catch this.
  play(1, 3, 480, 2700)
  check('progress still recorded after a second advance', resume(1, 3), 480)

  // A title that is 95%+ done restarts rather than resuming three seconds from the end.
  storage.clear()
  play(1, 1, 2690, 2700)
  check('an all-but-finished episode resumes from the start', resume(1, 1), 0)

  // Providers have sent "S1E2". PlayerIframe rebuilds keys, but a row synced from an
  // older client can still carry one, and the reader has to cope.
  storage.clear()
  tracker.saveProgress(ID, 'tv', 'vidlink', {
    watched: 100,
    duration: 2700,
    title: 'Test Show',
    season: 1,
    episode: 2,
    show_progress: {
      'S1E2': { season: 1, episode: 2, watched: 640, duration: 2700, updatedAt: Date.now() },
    },
  }, false)
  check('an upper-cased S1E2 key is still resolved', resume(1, 2), 640)

  console.log(failed === 0 ? '\nAll cases pass.' : `\n${failed} case(s) failed.`)
  process.exit(failed === 0 ? 0 : 1)
}

main()
