import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbQuery } from "@/lib/db";
import { watchHistory, watchProgress } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

interface HistoryRow {
  mediaType: string;
  tmdbId: string;
  title?: string | null;
  season?: number | null;
  episode?: number | null;
  event: string;
  genres: unknown;
  occurredAt: number;
  episodeKey?: string | null;
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

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const [historyRows, progressRows] = await dbQuery((db) =>
      Promise.all([
        db.select().from(watchHistory).where(eq(watchHistory.userId, userId)),
        db.select().from(watchProgress).where(eq(watchProgress.userId, userId)),
      ])
    );

    const now = Date.now();
    const currentMonthStr = new Date(now).toISOString().slice(0, 7);

    // Title Tracking & Categorisation
    const titleKeys = new Set<string>();
    const movieKeys = new Set<string>();
    const tvKeys = new Set<string>();
    const titlesThisWeek = new Set<string>();
    const titlesThisMonth = new Set<string>();

    const rows7d: HistoryRow[] = [];
    const rows30d: HistoryRow[] = [];
    const rowsMtd: HistoryRow[] = [];
    const rows90d: HistoryRow[] = [];

    // History Event Deduplication & Categorisation
    const completedEpisodesSet = new Set<string>();
    const startedEpisodesSet = new Set<string>();
    const completedMoviesSet = new Set<string>();
    const startedMoviesSet = new Set<string>();

    for (const row of historyRows) {
      const titleKey = `${row.mediaType}-${row.tmdbId}`;
      titleKeys.add(titleKey);

      if (row.mediaType === "movie") {
        movieKeys.add(titleKey);
        startedMoviesSet.add(titleKey);
        if (row.event === "completed") {
          completedMoviesSet.add(titleKey);
        }
      } else {
        tvKeys.add(titleKey);
        const epIdentifier = `${row.tmdbId}-s${row.season ?? 0}e${row.episode ?? 0}`;
        startedEpisodesSet.add(epIdentifier);
        if (row.event === "completed") {
          completedEpisodesSet.add(epIdentifier);
        }
      }

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

    // Process watchProgress for exact watch seconds per title
    let movieWatchSeconds = 0;
    let tvWatchSeconds = 0;
    // Every distinct episode with time on it, from both sources — history rows and
    // per-episode show_progress use the same `${tmdbId}-s{n}e{n}` identity, so an
    // episode known to both is counted once.
    const watchedEpisodesSet = new Set<string>(startedEpisodesSet);

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

    for (const row of progressRows) {
      const titleKey = `${row.mediaType}-${row.tmdbId}`;
      titleKeys.add(titleKey);

      const parsedGenres = Array.isArray(row.genres)
        ? (row.genres as { id: number; name: string }[])
        : null;

      if (row.mediaType === "movie") {
        movieKeys.add(titleKey);
        startedMoviesSet.add(titleKey);
        const watched = Math.round(Number(row.watched) || 0);
        const duration = Math.round(Number(row.duration) || 0);
        const valid = duration > 0 ? Math.min(watched, duration) : watched;
        movieWatchSeconds += valid;

        if (duration > 0 && valid / duration >= 0.9) {
          completedMoviesSet.add(titleKey);
        }

        titleStatsMap.set(titleKey, {
          tmdbId: row.tmdbId,
          mediaType: "movie",
          title: row.title,
          poster_path: row.poster_path,
          backdrop_path: row.backdrop_path,
          genres: parsedGenres,
          watchSeconds: valid,
          episodesCount: valid > 0 ? 1 : 0,
          lastWatchedAt: row.updatedAt || now,
        });
      } else {
        // TV series
        tvKeys.add(titleKey);
        let showEpisodesWatchSeconds = 0;
        let episodesCountInShow = 0;

        if (row.show_progress && typeof row.show_progress === "object") {
          const showObj = row.show_progress as Record<
            string,
            { watched?: number; duration?: number; updatedAt?: number }
          >;
          for (const [epKey, ep] of Object.entries(showObj)) {
            if (!ep) continue;
            const epWatched = Math.round(Number(ep.watched) || 0);
            const epDuration = Math.round(Number(ep.duration) || 0);
            const epValid = epDuration > 0 ? Math.min(epWatched, epDuration) : epWatched;
            if (epValid > 0) {
              showEpisodesWatchSeconds += epValid;
              episodesCountInShow++;
              watchedEpisodesSet.add(`${row.tmdbId}-${epKey}`);
            }

            if (epDuration > 0 && epWatched / epDuration >= 0.9) {
              completedEpisodesSet.add(`${row.tmdbId}-${epKey}`);
            }
          }
        }

        if (episodesCountInShow > 0) {
          tvWatchSeconds += showEpisodesWatchSeconds;

          titleStatsMap.set(titleKey, {
            tmdbId: row.tmdbId,
            mediaType: "tv",
            title: row.title,
            poster_path: row.poster_path,
            backdrop_path: row.backdrop_path,
            genres: parsedGenres,
            watchSeconds: showEpisodesWatchSeconds,
            episodesCount: episodesCountInShow,
            lastWatchedAt: row.updatedAt || now,
          });
        } else {
          const watched = Math.round(Number(row.watched) || 0);
          const duration = Math.round(Number(row.duration) || 0);
          const valid = duration > 0 ? Math.min(watched, duration) : watched;
          tvWatchSeconds += valid;
          if (valid > 0) {
            watchedEpisodesSet.add(`${row.tmdbId}-s${row.season ?? 0}e${row.episode ?? 0}`);
          }

          titleStatsMap.set(titleKey, {
            tmdbId: row.tmdbId,
            mediaType: "tv",
            title: row.title,
            poster_path: row.poster_path,
            backdrop_path: row.backdrop_path,
            genres: parsedGenres,
            watchSeconds: valid,
            episodesCount: valid > 0 ? 1 : 0,
            lastWatchedAt: row.updatedAt || now,
          });
        }
      }
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

    return NextResponse.json(responsePayload, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error) {
    console.error("Get stats error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
