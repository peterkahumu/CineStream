/**
 * Profile stats aggregation.
 *
 * Watch time is derived from `watch_history` first — the durable ledger, one row
 * per episode/movie carrying its own `watchedSeconds` — and from `watch_progress`
 * second. Where both describe the same episode the larger value wins, so the two
 * sources heal towards each other and a title removed from Continue Watching
 * keeps its hours, its place in Top Titles and its genres.
 *
 * Pure and side-effect free so it can be exercised without a database; the route
 * handler only supplies rows.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const MONTH_MS = 30 * DAY_MS;
const THREE_MONTHS_MS = 90 * DAY_MS;
const TOP_GENRES_LIMIT = 8;
const MAX_ACTIVITY_DAYS = 90;

export type TimeRangeKey = "7d" | "30d" | "mtd" | "90d" | "all";

export interface GenreTally {
  id: number;
  name: string;
  count: number;
}

export interface ActivityPoint {
  date: string;
  count: number;
  movies: number;
  tvShows: number;
}

export interface TopTitleStat {
  tmdbId: string;
  mediaType: "movie" | "tv";
  title: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  genres?: { id: number; name: string }[] | null;
  watchSeconds: number;
  episodesCount: number;
  percentageOfTotal: number;
  lastWatchedAt: number;
}

export interface BingeMetrics {
  topBingeTitle: {
    title: string;
    mediaType: "movie" | "tv";
    episodesCount: number;
    watchSeconds: number;
    poster_path?: string | null;
  } | null;
  avgEpisodeMinutes: number;
  completedEpisodesCount: number;
  completedMoviesCount: number;
}

export interface HistoryRow {
  mediaType: string;
  tmdbId: string;
  title?: string | null;
  poster_path?: string | null;
  season?: number | null;
  episode?: number | null;
  event: string;
  genres: unknown;
  watchedSeconds?: number | null;
  runtimeSeconds?: number | null;
  occurredAt: number;
  updatedAt?: number | null;
  episodeKey?: string | null;
}

export interface ProgressRow {
  mediaType: string;
  tmdbId: string;
  title: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  watched?: number | null;
  duration?: number | null;
  season?: number | null;
  episode?: number | null;
  show_progress?: unknown;
  genres: unknown;
  updatedAt: number;
}

/** A single episode/movie's watch time, merged across watch_history and watch_progress. */
interface EpisodeStat {
  titleKey: string;
  tmdbId: string;
  mediaType: "movie" | "tv";
  seconds: number;
  runtime: number;
  completed: boolean;
  lastWatchedAt: number;
}

/** Display metadata for a title, taken from whichever table has it. */
interface TitleMeta {
  tmdbId: string;
  mediaType: "movie" | "tv";
  title: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  genres?: { id: number; name: string }[] | null;
}

interface ShowProgressEntry {
  season?: number;
  episode?: number;
  watched?: number;
  duration?: number;
}

/** Parses a `s{n}e{n}` show_progress key. */
function parseEpisodeKey(key: string): { season: number; episode: number } | null {
  const match = /^s(\d+)e(\d+)$/i.exec(key.trim());
  return match ? { season: Number(match[1]), episode: Number(match[2]) } : null;
}

function tallyGenres(rows: { mediaType: string; tmdbId: string; genres: unknown }[]): GenreTally[] {
  const genresByTitle = new Map<string, { id: number; name: string }[]>();
  for (const row of rows) {
    const titleKey = `${row.mediaType}-${row.tmdbId}`;
    if (genresByTitle.has(titleKey)) continue;
    genresByTitle.set(
      titleKey,
      Array.isArray(row.genres) ? (row.genres as { id: number; name: string }[]) : []
    );
  }

  const counts = new Map<number, GenreTally>();
  for (const genres of genresByTitle.values()) {
    for (const genre of genres) {
      if (!genre || typeof genre.id !== "number" || !genre.name) continue;
      const existing = counts.get(genre.id);
      if (existing) existing.count += 1;
      else counts.set(genre.id, { id: genre.id, name: genre.name, count: 1 });
    }
  }

  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, TOP_GENRES_LIMIT);
}

function buildActivitySeries(rows: HistoryRow[], now: number, daysCount = MAX_ACTIVITY_DAYS): ActivityPoint[] {
  const byDay = new Map<string, { movies: Set<string>; tv: Set<string> }>();
  for (let i = daysCount - 1; i >= 0; i--) {
    const dateStr = new Date(now - i * DAY_MS).toISOString().slice(0, 10);
    byDay.set(dateStr, { movies: new Set(), tv: new Set() });
  }

  for (const row of rows) {
    const dateStr = new Date(row.occurredAt).toISOString().slice(0, 10);
    const dayEntry = byDay.get(dateStr);
    if (dayEntry) {
      if (row.mediaType === "movie") {
        dayEntry.movies.add(row.tmdbId);
      } else {
        const epKey = `${row.tmdbId}-s${row.season ?? "x"}e${row.episode ?? "x"}`;
        dayEntry.tv.add(epKey);
      }
    }
  }

  return Array.from(byDay.entries()).map(([date, sets]) => ({
    date,
    count: sets.movies.size + sets.tv.size,
    movies: sets.movies.size,
    tvShows: sets.tv.size,
  }));
}

function calculateStreak(activitySeries: ActivityPoint[]): number {
  let streak = 0;
  for (let i = activitySeries.length - 1; i >= 0; i--) {
    if (activitySeries[i].count > 0) {
      streak++;
    } else if (i === activitySeries.length - 1) {
      continue;
    } else {
      break;
    }
  }
  return streak;
}

export interface StatsInput {
  historyRows: HistoryRow[];
  progressRows: ProgressRow[];
  now?: number;
}

export function computeStats({ historyRows, progressRows, now = Date.now() }: StatsInput) {
  const currentMonthStr = new Date(now).toISOString().slice(0, 7);

  const titlesThisWeek = new Set<string>();
  const titlesThisMonth = new Set<string>();

  const rows7d: HistoryRow[] = [];
  const rows30d: HistoryRow[] = [];
  const rowsMtd: HistoryRow[] = [];
  const rows90d: HistoryRow[] = [];

  /**
   * One entry per distinct episode/movie, merged from both tables by identity.
   *
   * watch_history is the durable ledger — it survives a title being removed from
   * Continue Watching, so the hours stay on the board. watch_progress is still
   * read and merged in: it covers everything watched before history carried
   * seconds, and anything trimmed from the local log. Where both describe the
   * same episode, the larger value wins (furthest position reached), so nothing
   * is double-counted and the two heal towards each other.
   */
  const episodeStats = new Map<string, EpisodeStat>();
  const titleMeta = new Map<string, TitleMeta>();

  function recordEpisode(
    mediaType: "movie" | "tv",
    tmdbId: string,
    season: number | null | undefined,
    episode: number | null | undefined,
    seconds: number,
    runtime: number,
    completed: boolean,
    at: number
  ) {
    const identity = `${mediaType}-${tmdbId}-${season ?? "x"}-${episode ?? "x"}`;
    const prev = episodeStats.get(identity);
    const capped = runtime > 0 ? Math.min(seconds, runtime) : seconds;
    episodeStats.set(identity, {
      titleKey: `${mediaType}-${tmdbId}`,
      tmdbId,
      mediaType,
      seconds: Math.max(prev?.seconds ?? 0, Math.max(0, capped)),
      runtime: Math.max(prev?.runtime ?? 0, Math.max(0, runtime)),
      completed: (prev?.completed ?? false) || completed,
      lastWatchedAt: Math.max(prev?.lastWatchedAt ?? 0, at || 0),
    });
  }

  function recordTitle(
    mediaType: "movie" | "tv",
    tmdbId: string,
    meta: Partial<TitleMeta>
  ) {
    const titleKey = `${mediaType}-${tmdbId}`;
    const prev = titleMeta.get(titleKey);
    titleMeta.set(titleKey, {
      tmdbId,
      mediaType,
      title: meta.title || prev?.title || "Untitled",
      poster_path: meta.poster_path ?? prev?.poster_path ?? null,
      backdrop_path: meta.backdrop_path ?? prev?.backdrop_path ?? null,
      genres: (meta.genres?.length ? meta.genres : prev?.genres) ?? null,
    });
  }

  for (const row of historyRows) {
    const mediaType = row.mediaType === "tv" ? "tv" : "movie";
    const seconds = Math.round(Number(row.watchedSeconds) || 0);
    const runtime = Math.round(Number(row.runtimeSeconds) || 0);
    const completed =
      row.event === "completed" || (runtime > 0 && seconds / runtime >= 0.9);

    recordTitle(mediaType, row.tmdbId, {
      title: row.title ?? undefined,
      poster_path: row.poster_path,
      genres: Array.isArray(row.genres) ? (row.genres as GenreTally[]) : null,
    });
    recordEpisode(
      mediaType,
      row.tmdbId,
      row.season,
      row.episode,
      seconds,
      runtime,
      completed,
      Number(row.updatedAt) || row.occurredAt
    );

    const titleKey = `${mediaType}-${row.tmdbId}`;
    if (now - row.occurredAt <= WEEK_MS) {
      titlesThisWeek.add(titleKey);
      rows7d.push(row);
    }
    if (now - row.occurredAt <= MONTH_MS) {
      titlesThisMonth.add(titleKey);
      rows30d.push(row);
    }
    if (new Date(row.occurredAt).toISOString().slice(0, 7) === currentMonthStr) {
      rowsMtd.push(row);
    }
    if (now - row.occurredAt <= THREE_MONTHS_MS) {
      rows90d.push(row);
    }
  }

  for (const row of progressRows) {
    const mediaType = row.mediaType === "tv" ? "tv" : "movie";
    const at = Number(row.updatedAt) || now;
    const parsedGenres = Array.isArray(row.genres)
      ? (row.genres as GenreTally[])
      : null;

    recordTitle(mediaType, row.tmdbId, {
      title: row.title,
      poster_path: row.poster_path,
      backdrop_path: row.backdrop_path,
      genres: parsedGenres,
    });

    const watched = Math.round(Number(row.watched) || 0);
    const duration = Math.round(Number(row.duration) || 0);

    if (mediaType === "movie") {
      recordEpisode(
        "movie", row.tmdbId, null, null,
        watched, duration, duration > 0 && watched / duration >= 0.9, at
      );
      continue;
    }

    const showObj = row.show_progress && typeof row.show_progress === "object"
      ? (row.show_progress as Record<string, ShowProgressEntry>)
      : null;
    let episodesFromMap = 0;

    for (const [epKey, ep] of Object.entries(showObj ?? {})) {
      if (!ep) continue;
      const parsed = parseEpisodeKey(epKey);
      const season = Number(ep.season) || parsed?.season;
      const episode = Number(ep.episode) || parsed?.episode;
      if (season == null || episode == null) continue;
      const epWatched = Math.round(Number(ep.watched) || 0);
      const epDuration = Math.round(Number(ep.duration) || 0);
      if (epWatched <= 0) continue;
      episodesFromMap++;
      recordEpisode(
        "tv", row.tmdbId, season, episode,
        epWatched, epDuration, epDuration > 0 && epWatched / epDuration >= 0.9, at
      );
    }

    // Nothing per-episode to go on — fall back to the pointer's own position.
    if (episodesFromMap === 0 && watched > 0) {
      recordEpisode(
        "tv", row.tmdbId, row.season, row.episode,
        watched, duration, duration > 0 && watched / duration >= 0.9, at
      );
    }
  }

  // Roll episodes up into per-title and per-media totals
  let movieWatchSeconds = 0;
  let tvWatchSeconds = 0;
  const watchedEpisodesSet = new Set<string>();
  const completedEpisodesSet = new Set<string>();
  const completedMoviesSet = new Set<string>();
  const startedMoviesSet = new Set<string>();
  const titleTotals = new Map<string, { watchSeconds: number; episodesCount: number; lastWatchedAt: number }>();

  for (const [identity, stat] of episodeStats) {
    if (stat.mediaType === "movie") {
      movieWatchSeconds += stat.seconds;
      if (stat.seconds > 0) startedMoviesSet.add(stat.titleKey);
      if (stat.completed) completedMoviesSet.add(stat.titleKey);
    } else {
      tvWatchSeconds += stat.seconds;
      if (stat.seconds > 0) watchedEpisodesSet.add(identity);
      if (stat.completed) completedEpisodesSet.add(identity);
    }

    const totals = titleTotals.get(stat.titleKey);
    if (totals) {
      totals.watchSeconds += stat.seconds;
      if (stat.seconds > 0) totals.episodesCount += 1;
      totals.lastWatchedAt = Math.max(totals.lastWatchedAt, stat.lastWatchedAt);
    } else {
      titleTotals.set(stat.titleKey, {
        watchSeconds: stat.seconds,
        episodesCount: stat.seconds > 0 ? 1 : 0,
        lastWatchedAt: stat.lastWatchedAt,
      });
    }
  }

  const titleKeys = new Set<string>(titleMeta.keys());
  const movieKeys = new Set<string>();
  const tvKeys = new Set<string>();
  const titleStatsMap = new Map<
    string,
    {
      tmdbId: string;
      mediaType: "movie" | "tv";
      title: string;
      poster_path?: string | null;
      backdrop_path?: string | null;
      genres?: { id: number; name: string }[] | null;
      watchSeconds: number;
      episodesCount: number;
      lastWatchedAt: number;
    }
  >();

  for (const [titleKey, meta] of titleMeta) {
    if (meta.mediaType === "movie") movieKeys.add(titleKey);
    else tvKeys.add(titleKey);

    const totals = titleTotals.get(titleKey);
    titleStatsMap.set(titleKey, {
      tmdbId: meta.tmdbId,
      mediaType: meta.mediaType,
      title: meta.title,
      poster_path: meta.poster_path,
      backdrop_path: meta.backdrop_path,
      genres: meta.genres,
      watchSeconds: totals?.watchSeconds ?? 0,
      episodesCount: totals?.episodesCount ?? 0,
      lastWatchedAt: totals?.lastWatchedAt || now,
    });
  }

  const totalWatchSeconds = movieWatchSeconds + tvWatchSeconds;
  const safeTotal = totalWatchSeconds || 1;

  // Generate Top Titles leaderboard
  const topTitles: TopTitleStat[] = Array.from(titleStatsMap.values())
    .filter((t) => t.watchSeconds > 0)
    .sort((a, b) => b.watchSeconds - a.watchSeconds)
    .slice(0, 5)
    .map((t) => ({
      ...t,
      percentageOfTotal: Math.round((t.watchSeconds / safeTotal) * 100),
    }));

  // Binge Metrics
  const topTvShow = Array.from(titleStatsMap.values())
    .filter((t) => t.mediaType === "tv" && t.episodesCount > 0)
    .sort((a, b) => b.episodesCount - a.episodesCount || b.watchSeconds - a.watchSeconds)[0];

  const totalTvEpisodes = Array.from(titleStatsMap.values())
    .filter((t) => t.mediaType === "tv")
    .reduce((acc, t) => acc + t.episodesCount, 0);

  const avgEpisodeMinutes =
    totalTvEpisodes > 0 ? Math.round(tvWatchSeconds / totalTvEpisodes / 60) : 0;

  const bingeMetrics: BingeMetrics = {
    topBingeTitle: topTvShow
      ? {
          title: topTvShow.title,
          mediaType: "tv",
          episodesCount: topTvShow.episodesCount,
          watchSeconds: topTvShow.watchSeconds,
          poster_path: topTvShow.poster_path,
        }
      : null,
    avgEpisodeMinutes,
    completedEpisodesCount: completedEpisodesSet.size,
    completedMoviesCount: completedMoviesSet.size,
  };

  // Build Activity Timeline & Streaks
  const activitySeries = buildActivitySeries(historyRows, now, MAX_ACTIVITY_DAYS);
  const activeStreak = calculateStreak(activitySeries);

  // Calculate Completion Rate across all distinct started items
  const totalCompletedMovies = completedMoviesSet.size;
  const totalCompletedEpisodes = completedEpisodesSet.size;
  const totalCompletedItems = totalCompletedMovies + totalCompletedEpisodes;

  const totalStartedMovies = startedMoviesSet.size;
  const totalStartedEpisodes = watchedEpisodesSet.size;
  const totalStartedItems = totalStartedMovies + totalStartedEpisodes;

  const completionRate =
    totalStartedItems > 0 ? Math.round((totalCompletedItems / totalStartedItems) * 100) : 0;

  // Genres by Time Range
  const allGenreRows = [
    ...historyRows.map((r) => ({ mediaType: r.mediaType, tmdbId: r.tmdbId, genres: r.genres })),
    ...progressRows.map((r) => ({ mediaType: r.mediaType, tmdbId: r.tmdbId, genres: r.genres })),
  ];

  const genresByRange = {
    "7d": tallyGenres(rows7d),
    "30d": tallyGenres(rows30d),
    mtd: tallyGenres(rowsMtd),
    "90d": tallyGenres(rows90d),
    all: tallyGenres(allGenreRows),
  };

  const responsePayload = {
    titlesWatched: titleKeys.size,
    titlesCompleted: totalCompletedItems,
    completedMoviesCount: totalCompletedMovies,
    completedEpisodesCount: totalCompletedEpisodes,
    totalStartedItems,
    moviesWatched: movieKeys.size,
    tvShowsWatched: tvKeys.size,
    episodesWatched: watchedEpisodesSet.size,
    completionRate,
    totalWatchSeconds,
    movieWatchSeconds,
    tvWatchSeconds,
    thisWeek: titlesThisWeek.size,
    thisMonth: titlesThisMonth.size,
    totalWatchEvents: historyRows.length,
    activeStreak,
    topTitles,
    bingeMetrics,
    topGenres: genresByRange["all"],
    genresByRange,
    activity: activitySeries.slice(-7),
    activitySeries,
    updatedAt: now,
  };

    return responsePayload;
}
