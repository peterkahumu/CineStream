/**
 * Episode ordering and availability logic, derived from TMDB season/airing data.
 *
 * Pure and free of browser APIs so both the client tracker and server routes can
 * use it — the answer to "what should the user watch next" has to be identical on
 * both sides or Continue Watching and the Upcoming rail will disagree.
 */

import type { Season, ShowAiringInfo } from '@/lib/tmdb'

/** `nextEpisodeKey` value meaning "there is no episode after this one, ever". */
export const SERIES_FINISHED = 'end'

/**
 * `nextEpisodeKey` value meaning "you've seen everything that has aired, but the
 * show isn't over". Always re-resolved rather than trusted — the whole point is
 * that it stops being true when the next episode airs.
 */
export const CAUGHT_UP = 'wait'

/** Canonical per-episode key used throughout `show_progress` and `nextEpisodeKey`. */
export function episodeKey(season: number, episode: number): string {
  return `s${season}e${episode}`
}

/** Parses `s{n}e{n}` (any casing). Returns null for anything else, including SERIES_FINISHED. */
export function parseEpisodeKey(key: string | null | undefined): { season: number; episode: number } | null {
  if (!key) return null
  const match = /^s(\d+)e(\d+)$/i.exec(key.trim())
  if (!match) return null
  return { season: Number(match[1]), episode: Number(match[2]) }
}

/** Orders two episodes: negative when `a` comes before `b`. */
function compareEpisodes(
  a: { season: number; episode: number },
  b: { season: number; episode: number }
): number {
  return a.season - b.season || a.episode - b.episode
}

/** TMDB statuses that mean more episodes are expected, even with nothing scheduled. */
function isReturning(info: ShowAiringInfo): boolean {
  if (info.in_production) return true
  const status = info.status?.toLowerCase() ?? ''
  return status === 'returning series' || status === 'in production' || status === 'planned'
}

/** The episode the season list places after `season`/`episode`, aired or not. */
function nextInSeasonList(
  seasons: Season[] | undefined,
  season: number,
  episode: number
): { season: number; episode: number } | null {
  const current = seasons?.find(s => s.season_number === season)
  if (!current || !current.episode_count) return null
  if (episode < current.episode_count) return { season, episode: episode + 1 }
  const next = seasons?.find(s => s.season_number === season + 1)
  if (next && next.episode_count > 0) return { season: season + 1, episode: 1 }
  return null
}

/**
 * Resolves what follows `season`/`episode`:
 * - `s{n}e{n}` — a real, already-aired episode to continue with
 * - `CAUGHT_UP` — you're up to date but the show has more coming (dated or merely
 *   expected). A pending answer, not a conclusion — re-resolve it, don't cache it
 * - `SERIES_FINISHED` — that was the last episode there will ever be
 * - `null` — TMDB doesn't describe this season, so we can't say
 *
 * Never guesses `episode + 1`, and never advances past `last_episode_to_air`:
 * `seasons[].episode_count` includes unaired episodes, so trusting it mid-season
 * on an airing show sends you to an episode no server can play.
 */
export function buildNextEpisodeKey(
  info: ShowAiringInfo | undefined,
  season: number,
  episode: number
): string | null {
  if (!info) return null
  const candidate = nextInSeasonList(info.seasons, season, episode)

  if (candidate) {
    const lastAired = info.last_episode_to_air
    // Without an airing anchor the season list is all we have — trust it.
    if (!lastAired) return episodeKey(candidate.season, candidate.episode)
    const aired = { season: lastAired.season_number, episode: lastAired.episode_number }
    return compareEpisodes(candidate, aired) <= 0
      ? episodeKey(candidate.season, candidate.episode)
      : CAUGHT_UP
  }

  // Nothing after it in the season list. Either the show is over, or the next
  // season simply hasn't been added to TMDB yet.
  if (info.next_episode_to_air) return CAUGHT_UP
  if (isReturning(info)) return CAUGHT_UP
  if (!info.seasons?.some(s => s.season_number === season)) return null
  return SERIES_FINISHED
}

/**
 * How many episodes of `season` have actually aired, i.e. how many a server can
 * be expected to play.
 *
 * `seasons[].episode_count` catalogues the whole season including episodes that
 * haven't aired, so listing that many is the same trap `buildNextEpisodeKey`
 * avoids — it offers episodes that resolve to a dead player.
 */
export function airedEpisodeCount(info: ShowAiringInfo | undefined, season: number): number {
  const entry = info?.seasons?.find(s => s.season_number === season)
  if (!entry?.episode_count) return 0

  const lastAired = info?.last_episode_to_air
  // Without an airing anchor the season list is all we have — trust it.
  if (!lastAired) return entry.episode_count

  if (season < lastAired.season_number) return entry.episode_count
  if (season > lastAired.season_number) return 0
  return Math.min(entry.episode_count, lastAired.episode_number)
}

/**
 * Aired episodes that come after `season`/`episode`, in order, capped at `limit`.
 * Specials (season 0) are skipped — they are not what "a new episode is out" means.
 *
 * Clamped to `last_episode_to_air`, so a season TMDB has fully catalogued but only
 * partly aired yields only the episodes that actually exist to watch.
 */
export function airedEpisodesAfter(
  info: ShowAiringInfo | undefined,
  season: number,
  episode: number,
  limit = 10
): { season: number; episode: number }[] {
  const lastAired = info?.last_episode_to_air
  if (!info || !lastAired) return []

  const out: { season: number; episode: number }[] = []
  const seasons = (info.seasons ?? [])
    .filter(s => s.season_number > 0 && s.episode_count > 0)
    .sort((a, b) => a.season_number - b.season_number)

  for (const s of seasons) {
    if (s.season_number < season) continue
    if (s.season_number > lastAired.season_number) break

    const cap = s.season_number === lastAired.season_number
      ? Math.min(s.episode_count, lastAired.episode_number)
      : s.episode_count

    for (let e = 1; e <= cap; e++) {
      if (s.season_number === season && e <= episode) continue
      out.push({ season: s.season_number, episode: e })
      if (out.length >= limit) return out
    }
  }
  return out
}
