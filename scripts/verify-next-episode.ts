/**
 * Verifies the "what comes after this episode" resolver — the logic that decides
 * whether Continue Watching advances, waits, or drops a show. Run: npm test
 *
 * There is no test runner in this project; these are plain tsx scripts that exit
 * non-zero on failure.
 */
import { buildNextEpisodeKey, airedEpisodesAfter } from '@/lib/episodes'
import type { Season, ShowAiringInfo } from '@/lib/tmdb'

const s = (n: number, count: number): Season => ({
  id: n, season_number: n, episode_count: count, name: `S${n}`, overview: '', poster_path: null, air_date: null,
})
const ep = (season: number, episode: number) => ({ season_number: season, episode_number: episode, air_date: '2026-08-01' })

const cases: [string, ShowAiringInfo | undefined, number, number, string | null][] = [
  ['mid-season, next has aired',
    { seasons: [s(13, 57)], last_episode_to_air: ep(13, 30), status: 'Returning Series' }, 13, 20, 's13e21'],
  ['mid-season, next exists in TMDB but has NOT aired',
    { seasons: [s(13, 57)], last_episode_to_air: ep(13, 30), next_episode_to_air: ep(13, 31), status: 'Returning Series' }, 13, 30, 'wait'],
  ['finale, show returning, next season unscheduled (Love Island)',
    { seasons: [s(13, 57)], last_episode_to_air: ep(13, 57), next_episode_to_air: null, status: 'Returning Series', in_production: false }, 13, 57, 'wait'],
  ['finale, show ended',
    { seasons: [s(13, 57)], last_episode_to_air: ep(13, 57), next_episode_to_air: null, status: 'Ended' }, 13, 57, 'end'],
  ['finale, show canceled',
    { seasons: [s(5, 10)], last_episode_to_air: ep(5, 10), status: 'Canceled' }, 5, 10, 'end'],
  ['season rollover, next season already airing',
    { seasons: [s(13, 57), s(14, 10)], last_episode_to_air: ep(14, 3), status: 'Returning Series' }, 13, 57, 's14e1'],
  ['season rollover, next season listed but not aired yet',
    { seasons: [s(13, 57), s(14, 10)], last_episode_to_air: ep(13, 57), next_episode_to_air: ep(14, 1), status: 'Returning Series' }, 13, 57, 'wait'],
  ['no airing anchor at all — trust the season list',
    { seasons: [s(13, 57)] }, 13, 20, 's13e21'],
  ['no data', undefined, 13, 20, null],
  ['season missing from the list', { seasons: [s(1, 10)], last_episode_to_air: ep(1, 10), status: 'Ended' }, 13, 20, null],
  ['specials (season 0) then season 1',
    { seasons: [s(0, 3), s(1, 8)], last_episode_to_air: ep(1, 8), status: 'Ended' }, 0, 3, 's1e1'],
]

let failed = 0
for (const [name, info, season, episode, expected] of cases) {
  const got = buildNextEpisodeKey(info, season, episode)
  const ok = got === expected
  if (!ok) failed++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}\n      s${season}e${episode} -> ${JSON.stringify(got)}${ok ? '' : ` (expected ${JSON.stringify(expected)})`}`)
}
// airedEpisodesAfter — what the Upcoming rail counts as "new episodes out"

const airedCases: [string, ShowAiringInfo, number, number, string][] = [
  ['a new season aired while you were away (Love Island S14)',
    { seasons: [s(13, 57), s(14, 8)], last_episode_to_air: ep(14, 3), status: 'Returning Series' }, 13, 57, 's14e1,s14e2,s14e3'],
  ['caught up — nothing aired past you',
    { seasons: [s(13, 57)], last_episode_to_air: ep(13, 57), status: 'Returning Series' }, 13, 57, ''],
  ['season catalogued ahead of broadcast — only aired episodes count',
    { seasons: [s(1, 10)], last_episode_to_air: ep(1, 4), status: 'Returning Series' }, 1, 2, 's1e3,s1e4'],
  ['specials are not "new episodes"',
    { seasons: [s(0, 5), s(1, 3)], last_episode_to_air: ep(1, 3), status: 'Ended' }, 1, 1, 's1e2,s1e3'],
  ['miles behind — capped rather than walking the whole catalogue',
    { seasons: [s(1, 100)], last_episode_to_air: ep(1, 100), status: 'Ended' }, 1, 1, '10 episodes'],
  ['no airing anchor — cannot claim anything is out',
    { seasons: [s(1, 10)] }, 1, 1, ''],
]

for (const [name, info, season, episode, expected] of airedCases) {
  const got = airedEpisodesAfter(info, season, episode)
  const rendered = got.length > 5
    ? `${got.length} episodes`
    : got.map(e => `s${e.season}e${e.episode}`).join(',')
  const ok = rendered === expected
  if (!ok) failed++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}\n      s${season}e${episode} -> ${rendered || '(none)'}${ok ? '' : ` (expected ${expected || '(none)'})`}`)
}

console.log(failed === 0 ? '\nAll cases pass.' : `\n${failed} case(s) failed.`)
process.exit(failed === 0 ? 0 : 1)
