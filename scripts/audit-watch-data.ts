/**
 * Audits watch_history for the defects that corrupted Profile stats, and
 * optionally repairs the one class of them that TMDB can still answer.
 *
 *   npx tsx scripts/audit-watch-data.ts                 # read-only report
 *   npx tsx scripts/audit-watch-data.ts --fix-runtimes  # backfill from TMDB
 *
 * Needs DATABASE_URL. --fix-runtimes also needs TMDB_API_KEY.
 * Both are read from .env.local / .dev.vars.
 *
 * Exits non-zero when an actionable defect is present, so it can be run on a
 * schedule to catch the provider metadata leak coming back.
 */
import { readFileSync } from 'node:fs'
import postgres from 'postgres'

for (const file of ['.env.local', '.dev.vars']) {
  try {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const m = /^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
    }
  } catch {
    // file absent — rely on the ambient environment
  }
}

const FIX_RUNTIMES = process.argv.includes('--fix-runtimes')

const DATABASE_URL = process.env.DATABASE_URL
  || process.env.CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set (checked env, .env.local, .dev.vars).')
  process.exit(2)
}

const sql = postgres(DATABASE_URL, { prepare: false, max: 1, connect_timeout: 15 })

const bold = (s: string) => `\x1b[1m${s}\x1b[0m`
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`

function section(n: string, title: string, rows: unknown[], verdict: string) {
  console.log(`\n${bold(`${n}. ${title}`)}`)
  if (rows.length === 0) {
    console.log(`   clean`)
    return
  }
  console.table(rows)
  console.log(`   ${verdict}`)
}

async function main() {
  let actionable = 0

  // A. One tmdbId recorded under more than one name. The provider MEDIA_DATA
  //    payload is the whole library keyed by id; reading the wrong key writes
  //    another title's name, poster and duration against the id playing.
  const titleConflicts = await sql`
    SELECT "userId", "tmdbId", "mediaType",
           array_agg(DISTINCT title) AS names,
           count(*)::int AS rows
    FROM watch_history
    GROUP BY 1, 2, 3
    HAVING count(DISTINCT title) > 1
  `
  actionable += titleConflicts.length
  section('A', 'Titles leaking between ids', titleConflicts,
    'The provider metadata leak is live again — check lib/providers/index.ts extractMediaEntry.')

  // B. A runtime wildly out of line with the rest of the same show is the same
  //    leak seen through the duration field.
  const runtimeOutliers = await sql`
    SELECT h.id, h.title, h.season, h.episode,
           h."runtimeSeconds", round(m.typical)::int AS typical_for_show
    FROM watch_history h
    JOIN (
      SELECT "userId", "tmdbId", "mediaType",
             percentile_cont(0.5) WITHIN GROUP (ORDER BY "runtimeSeconds") AS typical
      FROM watch_history
      WHERE COALESCE("runtimeSeconds", 0) > 0
      GROUP BY 1, 2, 3
      HAVING count(*) >= 3
    ) m ON m."userId" = h."userId" AND m."tmdbId" = h."tmdbId" AND m."mediaType" = h."mediaType"
    WHERE COALESCE(h."runtimeSeconds", 0) > m.typical * 2
    ORDER BY h.title, h.season, h.episode
  `
  actionable += runtimeOutliers.length
  section('B', 'Runtimes out of line with their own show', runtimeOutliers,
    'A leaked duration. Completion is watchedSeconds/runtimeSeconds, so these can never read as finished.')

  // C. watchedSeconds above runtimeSeconds cannot happen from real playback.
  const overruns = await sql`
    SELECT id, title, season, episode, "watchedSeconds", "runtimeSeconds"
    FROM watch_history
    WHERE COALESCE("runtimeSeconds", 0) > 0
      AND "watchedSeconds" > "runtimeSeconds" * 1.05
    ORDER BY title, season, episode
  `
  actionable += overruns.length
  section('C', 'Position past the end of the asset', overruns,
    'Either the position or the runtime came from a different asset.')

  // D. The event and the measurement disagree in the direction the measurement
  //    can settle: seconds say finished, the row still says started.
  const staleEvents = await sql`
    SELECT id, title, season, episode, "watchedSeconds", "runtimeSeconds"
    FROM watch_history
    WHERE event <> 'completed'
      AND COALESCE("runtimeSeconds", 0) > 0
      AND "watchedSeconds"::numeric / "runtimeSeconds" >= 0.9
    ORDER BY title, season, episode
  `
  actionable += staleEvents.length
  section('D', 'Finished by measurement, still logged as started', staleEvents,
    'Run step 4 of scripts/repair-watch-history.sql.')

  // E. Informational: rows carrying no measurement at all. Pre-dating the
  //    seconds columns (added 2026-08-13) with no progress entry left to
  //    backfill from. Not a live defect — a permanent gap, unless TMDB can
  //    still supply the runtime.
  const unmeasured = await sql`
    SELECT title, "mediaType", event, count(*)::int AS rows
    FROM watch_history
    WHERE COALESCE("watchedSeconds", 0) = 0 OR COALESCE("runtimeSeconds", 0) = 0
    GROUP BY 1, 2, 3
    ORDER BY rows DESC
  `
  section('E', 'No measurement recorded (informational)', unmeasured,
    FIX_RUNTIMES ? 'Attempting TMDB backfill below.' : 'Re-run with --fix-runtimes to recover runtimes from TMDB.')

  console.log(
    `\n${actionable === 0 ? 'No actionable defects.' : `${actionable} actionable row(s) across A-D.`}`
  )

  if (FIX_RUNTIMES) await fixRuntimes()

  await sql.end()
  process.exit(actionable === 0 ? 0 : 1)
}

/**
 * Fills runtimeSeconds from TMDB for episodes that never recorded one, and gives
 * an episode already logged as completed the watchedSeconds to match.
 *
 * This is recovery, not invention: TMDB publishes the real runtime, and the row's
 * own event says it was watched to the end. It replaces the median-of-the-show
 * estimate lib/stats.ts falls back to — that estimate exists precisely because
 * these columns were empty, and it stops being used the moment they are not.
 *
 * A row logged only as "started" is left alone. Its runtime is filled in, but how
 * far into it the user actually got is genuinely unknown and stays unknown.
 */
async function fixRuntimes() {
  const key = process.env.TMDB_API_KEY
  if (!key) {
    console.error('\nTMDB_API_KEY is not set — cannot recover runtimes.')
    return
  }
  const auth: Record<string, string> = key.length > 100 ? { Authorization: `Bearer ${key}` } : {}
  const keyParam = key.length > 100 ? '' : `api_key=${key}`

  const targets = await sql<{ tmdbId: string; season: number }[]>`
    SELECT DISTINCT "tmdbId", season
    FROM watch_history
    WHERE "mediaType" = 'tv'
      AND season IS NOT NULL
      AND COALESCE("runtimeSeconds", 0) = 0
    ORDER BY "tmdbId", season
  `

  console.log(`\n${bold('Recovering runtimes from TMDB')} — ${targets.length} season(s) to look up.`)

  let filled = 0
  let completedFilled = 0

  for (const { tmdbId, season } of targets) {
    const url = `https://api.themoviedb.org/3/tv/${tmdbId}/season/${season}?${keyParam}`
    let episodes: { episode_number: number; runtime: number | null }[]
    try {
      const res = await fetch(url, { headers: auth })
      if (!res.ok) {
        console.log(`   ${dim(`tv/${tmdbId} s${season}: TMDB ${res.status}, skipped`)}`)
        continue
      }
      episodes = ((await res.json()) as { episodes?: typeof episodes }).episodes ?? []
    } catch (err) {
      console.log(`   ${dim(`tv/${tmdbId} s${season}: ${String(err)}, skipped`)}`)
      continue
    }

    for (const ep of episodes) {
      const runtime = Math.round((ep.runtime ?? 0) * 60)
      if (runtime <= 0) continue

      const now = Date.now()
      // Runtime for every unmeasured episode; position only where the row's own
      // event already asserts it was watched to the end.
      const rows = await sql`
        UPDATE watch_history
        SET "runtimeSeconds" = ${runtime},
            "watchedSeconds" = CASE WHEN event = 'completed' THEN ${runtime} ELSE "watchedSeconds" END,
            "updatedAt" = ${now}
        WHERE "mediaType" = 'tv'
          AND "tmdbId" = ${tmdbId}
          AND season = ${season}
          AND episode = ${ep.episode_number}
          AND COALESCE("runtimeSeconds", 0) = 0
        RETURNING id, title, event
      `
      for (const r of rows) {
        filled++
        if (r.event === 'completed') completedFilled++
      }
    }
    console.log(`   tv/${tmdbId} s${season}: ${episodes.length} episode(s) checked`)
  }

  console.log(
    `\n${filled} row(s) given a real runtime; ${completedFilled} of those were already ` +
    `logged as completed and now carry the matching watch time.`
  )
}

main().catch(async (err) => {
  console.error(err)
  await sql.end().catch(() => {})
  process.exit(2)
})
