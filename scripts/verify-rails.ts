/**
 * Verifies the hand-off between Continue Watching and the Upcoming rail: every
 * watched show lands in exactly one of them (or neither), never both.
 *
 * The two rows decide independently — one from stored progress, one from watch
 * history — so this pins the two rule sets against each other. Run: npm test
 */
import { buildNextEpisodeKey, airedEpisodesAfter, parseEpisodeKey, SERIES_FINISHED } from '@/lib/episodes'
import type { Season, ShowAiringInfo } from '@/lib/tmdb'

const NOW = Date.now()
const DAY = 86_400_000
const EP = 2400

const season = (n: number, count: number): Season => ({
  id: n, season_number: n, episode_count: count, name: `S${n}`, overview: '', poster_path: null, air_date: null,
})
const ref = (s: number, e: number, daysAgo: number) => ({
  season_number: s,
  episode_number: e,
  air_date: new Date(NOW - daysAgo * DAY).toISOString().slice(0, 10),
})

interface Progress {
  duration: number
  watched: number
  dismissedAt?: number | null
  nextEpisodeKey?: string | null
}

/** Mirrors ContinueWatchingRow.loadItems. */
function inContinueWatching(p: Progress | null): boolean {
  if (!p || p.dismissedAt) return false
  const finished = p.duration > 0 && p.duration - p.watched < 60
  if (!finished) return true
  if (p.nextEpisodeKey === SERIES_FINISHED) return false
  return parseEpisodeKey(p.nextEpisodeKey) !== null || !p.nextEpisodeKey
}

/** Mirrors UpcomingEpisodesRow.collectWatchedShows + the route's resolveShow. */
function inUpcoming(
  p: Progress | null,
  info: ShowAiringInfo,
  watchedSeason: number,
  watchedEpisode: number
): boolean {
  if (inContinueWatching(p)) return false
  const dismissedAt = p?.dismissedAt ?? null
  const unwatched = airedEpisodesAfter(info, watchedSeason, watchedEpisode, 6)

  if (unwatched.length > 0) {
    if (unwatched.length > 5) return false
    const airedAt = info.last_episode_to_air?.air_date
      ? Date.parse(info.last_episode_to_air.air_date)
      : NaN
    if (dismissedAt && (!Number.isFinite(airedAt) || airedAt <= dismissedAt)) return false
    return true
  }

  if (!info.next_episode_to_air?.air_date) return false
  if (dismissedAt) return false
  const airsAt = Date.parse(info.next_episode_to_air.air_date)
  return Number.isFinite(airsAt) && airsAt - NOW <= 120 * DAY
}

interface Case {
  name: string
  info: ShowAiringInfo
  /** Furthest episode watched. */
  at: [number, number]
  progress: Progress | null
  expect: 'continue' | 'upcoming' | 'neither'
}

const midEpisode: Progress = { duration: EP, watched: 600 }
const finished = (nextEpisodeKey: string | null): Progress => ({ duration: EP, watched: EP, nextEpisodeKey })

const cases: Case[] = [
  {
    name: 'mid-episode — Continue Watching owns it',
    info: { seasons: [season(13, 57)], last_episode_to_air: ref(13, 30, 1), status: 'Returning Series' },
    at: [13, 20], progress: midEpisode, expect: 'continue',
  },
  {
    name: 'finished an episode, next one aired — Continue Watching advances',
    info: { seasons: [season(13, 57)], last_episode_to_air: ref(13, 30, 1), status: 'Returning Series' },
    at: [13, 20], progress: finished('s13e21'), expect: 'continue',
  },
  {
    name: 'caught up mid-run, next airs tomorrow — hands off to Upcoming',
    info: {
      seasons: [season(13, 57)], last_episode_to_air: ref(13, 30, 1),
      next_episode_to_air: ref(13, 31, -1), status: 'Returning Series',
    },
    at: [13, 30], progress: finished('wait'), expect: 'upcoming',
  },
  {
    name: 'season finale, next season unscheduled — neither rail nags you',
    info: {
      seasons: [season(13, 57)], last_episode_to_air: ref(13, 57, 2),
      next_episode_to_air: null, status: 'Returning Series',
    },
    at: [13, 57], progress: finished('wait'), expect: 'neither',
  },
  {
    name: 'that same show a year later, S14 now airing — Upcoming brings it back',
    info: {
      seasons: [season(13, 57), season(14, 8)], last_episode_to_air: ref(14, 2, 1),
      next_episode_to_air: ref(14, 3, -1), status: 'Returning Series',
    },
    at: [13, 57], progress: finished('wait'), expect: 'upcoming',
  },
  {
    name: 'series ended — dropped from both',
    info: { seasons: [season(5, 10)], last_episode_to_air: ref(5, 10, 400), status: 'Ended' },
    at: [5, 10], progress: finished(SERIES_FINISHED), expect: 'neither',
  },
  {
    name: 'removed by the user, nothing new since — stays gone',
    info: {
      seasons: [season(13, 57)], last_episode_to_air: ref(13, 57, 10),
      next_episode_to_air: ref(14, 1, -30), status: 'Returning Series',
    },
    at: [13, 57], progress: { duration: EP, watched: EP, dismissedAt: NOW - 5 * DAY }, expect: 'neither',
  },
  {
    name: 'removed by the user, then a new episode aired — comes back',
    info: {
      seasons: [season(13, 57), season(14, 8)], last_episode_to_air: ref(14, 1, 1),
      status: 'Returning Series',
    },
    at: [13, 57], progress: { duration: EP, watched: EP, dismissedAt: NOW - 5 * DAY }, expect: 'upcoming',
  },
  {
    name: 'no progress row at all (finished long ago), new season out — Upcoming',
    info: {
      seasons: [season(1, 10), season(2, 6)], last_episode_to_air: ref(2, 2, 3),
      status: 'Returning Series',
    },
    at: [1, 10], progress: null, expect: 'upcoming',
  },
  {
    name: 'miles behind — not a notification, that is Continue Watching territory',
    info: { seasons: [season(1, 100)], last_episode_to_air: ref(1, 100, 30), status: 'Ended' },
    at: [1, 1], progress: null, expect: 'neither',
  },
]

let failed = 0
for (const c of cases) {
  const cw = inContinueWatching(c.progress)
  const up = inUpcoming(c.progress, c.info, c.at[0], c.at[1])
  const actual = cw && up ? 'BOTH' : cw ? 'continue' : up ? 'upcoming' : 'neither'
  const ok = actual === c.expect
  if (!ok) failed++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.name}\n      -> ${actual}${ok ? '' : ` (expected ${c.expect})`}`)
}

// The resolver the rows share must agree with the rail's own view of "aired".
const ongoing: ShowAiringInfo = {
  seasons: [season(13, 57)],
  last_episode_to_air: ref(13, 30, 1),
  next_episode_to_air: ref(13, 31, -1),
  status: 'Returning Series',
}
const keyAtEdge = buildNextEpisodeKey(ongoing, 13, 30)
const airedAtEdge = airedEpisodesAfter(ongoing, 13, 30)
const consistent = keyAtEdge === 'wait' && airedAtEdge.length === 0
if (!consistent) failed++
console.log(`${consistent ? 'PASS' : 'FAIL'}  "caught up" and "nothing aired past you" agree at the boundary`)

console.log(failed === 0 ? '\nAll cases pass.' : `\n${failed} case(s) failed.`)
process.exit(failed === 0 ? 0 : 1)
