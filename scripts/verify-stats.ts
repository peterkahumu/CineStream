/**
 * Verifies that Profile stats survive a title being removed from Continue Watching.
 * Watch time lives in watch_history (the ledger) and watch_progress (the bookmark);
 * computeStats merges them per episode, so purging the bookmark must change nothing.
 * Run: npm test
 */
import { computeStats, type HistoryRow, type ProgressRow } from '@/lib/stats'

const NOW = Date.UTC(2026, 7, 13, 12, 0, 0)
const DAY = 86_400_000
const EP = 2400 // 40 minute episodes

// Love Island: 57 episodes watched over 57 days, all completed.
const loveIslandHistory: HistoryRow[] = Array.from({ length: 57 }, (_, i) => ({
  mediaType: 'tv',
  tmdbId: '63174',
  title: 'Love Island',
  poster_path: '/li.jpg',
  season: 13,
  episode: i + 1,
  event: 'completed',
  genres: [{ id: 10764, name: 'Reality' }],
  watchedSeconds: EP,
  runtimeSeconds: EP,
  occurredAt: NOW - (57 - i) * DAY,
  updatedAt: NOW - (57 - i) * DAY,
  episodeKey: `tv-63174-13-${i + 1}`,
}))

// The same show as a live progress row (still in Continue Watching).
const loveIslandProgress: ProgressRow = {
  mediaType: 'tv',
  tmdbId: '63174',
  title: 'Love Island',
  poster_path: '/li.jpg',
  backdrop_path: '/li-bd.jpg',
  watched: EP,
  duration: EP,
  season: 13,
  episode: 57,
  show_progress: Object.fromEntries(
    Array.from({ length: 57 }, (_, i) => [
      `s13e${i + 1}`,
      { season: 13, episode: i + 1, watched: EP, duration: EP, updatedAt: NOW - (57 - i) * DAY },
    ])
  ),
  genres: [{ id: 10764, name: 'Reality' }],
  updatedAt: NOW - DAY,
}

const movieHistory: HistoryRow = {
  mediaType: 'movie', tmdbId: '550', title: 'Fight Club', poster_path: '/fc.jpg',
  event: 'completed', genres: [{ id: 18, name: 'Drama' }],
  watchedSeconds: 8000, runtimeSeconds: 8340,
  occurredAt: NOW - 2 * DAY, updatedAt: NOW - 2 * DAY, episodeKey: 'movie-550-x-x',
}
const movieProgress: ProgressRow = {
  mediaType: 'movie', tmdbId: '550', title: 'Fight Club', poster_path: '/fc.jpg',
  backdrop_path: '/fc-bd.jpg', watched: 8000, duration: 8340,
  genres: [{ id: 18, name: 'Drama' }], updatedAt: NOW - 2 * DAY,
}

function run(label: string, historyRows: HistoryRow[], progressRows: ProgressRow[]) {
  const s = computeStats({ historyRows, progressRows, now: NOW })
  console.log(
    `${label}\n` +
    `   hours=${(s.totalWatchSeconds / 3600).toFixed(2)}  tvSecs=${s.tvWatchSeconds}  movieSecs=${s.movieWatchSeconds}\n` +
    `   episodesWatched=${s.episodesWatched}  completedEpisodes=${s.completedEpisodesCount}  completedMovies=${s.completedMoviesCount}\n` +
    `   titles=${s.titlesWatched} (tv=${s.tvShowsWatched} movie=${s.moviesWatched})  completionRate=${s.completionRate}%\n` +
    `   topTitles=${s.topTitles.map(t => `${t.title}:${t.watchSeconds}s/${t.episodesCount}ep`).join(', ')}\n` +
    `   topGenres=${s.topGenres.map(g => `${g.name}:${g.count}`).join(', ')}  binge=${s.bingeMetrics.topBingeTitle?.title}:${s.bingeMetrics.topBingeTitle?.episodesCount}ep  avgEp=${s.bingeMetrics.avgEpisodeMinutes}min`
  )
  return s
}

const both = run('BOTH TABLES (normal state)', [...loveIslandHistory, movieHistory], [loveIslandProgress, movieProgress])
const removed = run('\nPROGRESS ROWS PURGED (title removed from Continue Watching)', [...loveIslandHistory, movieHistory], [])
const legacy = run('\nHISTORY WITHOUT SECONDS (pre-migration rows) + progress', loveIslandHistory.map(r => ({ ...r, watchedSeconds: 0, runtimeSeconds: 0 })), [loveIslandProgress])

// Same episode described by both tables with different values: merge, never add.
const divergent = computeStats({
  historyRows: [{
    mediaType: 'tv', tmdbId: '1', title: 'X', season: 1, episode: 1, event: 'started',
    genres: null, watchedSeconds: 2400, runtimeSeconds: 2400, occurredAt: NOW, updatedAt: NOW,
  }],
  progressRows: [{
    mediaType: 'tv', tmdbId: '1', title: 'X', watched: 1200, duration: 2400, season: 1, episode: 1,
    show_progress: { s1e1: { season: 1, episode: 1, watched: 1200, duration: 2400 } },
    genres: null, updatedAt: NOW,
  }],
  now: NOW,
})

const checks: [string, boolean][] = [
  ['hours identical with and without progress rows', both.totalWatchSeconds === removed.totalWatchSeconds],
  ['episode count identical', both.episodesWatched === removed.episodesWatched],
  ['top titles survive removal', removed.topTitles.length === both.topTitles.length && removed.topTitles[0].title === both.topTitles[0].title],
  ['genres survive removal', removed.topGenres.length === both.topGenres.length],
  ['binge metrics survive removal', removed.bingeMetrics.topBingeTitle?.episodesCount === 57],
  ['no double counting (57 eps x 2400s)', both.tvWatchSeconds === 57 * EP],
  ['episodes counted once, not twice', both.episodesWatched === 57],
  ['movie counted once', both.movieWatchSeconds === 8000],
  ['pre-migration history still totals via progress', legacy.tvWatchSeconds === 57 * EP],
  ['completion rate sane', both.completionRate === 100],
  ['avg episode length correct', both.bingeMetrics.avgEpisodeMinutes === 40],
  ['same episode from both tables merges to the max', divergent.tvWatchSeconds === 2400],
  ['...and is counted once', divergent.episodesWatched === 1],
  ['90% of runtime counts as completed even on a "started" row', divergent.completedEpisodesCount === 1],
]

console.log('')
let failed = 0
for (const [name, ok] of checks) {
  if (!ok) failed++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`)
}
console.log(failed === 0 ? '\nAll checks pass.' : `\n${failed} check(s) failed.`)
process.exit(failed === 0 ? 0 : 1)
