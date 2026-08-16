import { NextResponse } from "next/server";
import { getTVAiringInfo } from "@/lib/tmdb";
import { airedEpisodesAfter } from "@/lib/episodes";

/**
 * Resolves which of the shows a viewer follows have something new out, or
 * something scheduled — the data behind the Upcoming Episodes rail.
 *
 * Takes the caller's furthest-watched episode per show rather than reading it
 * server-side, so it works identically for guests (whose history only ever lives
 * in localStorage) and signed-in users, with no auth branch. Nothing is stored;
 * the only reads are TMDB lookups, which tmdbFetch caches for an hour.
 */

export const dynamic = "force-dynamic";

/** How far behind you can be and still call it "a new episode is out". */
const NEW_EPISODE_WINDOW = 5;
/** Beyond this the show isn't upcoming, it's just something you might watch one day. */
const UPCOMING_WINDOW_DAYS = 120;
/** Caps the TMDB fan-out per request. */
const MAX_TITLES = 30;

export interface WatchedShowInput {
  tmdbId: string;
  /** Furthest episode watched. */
  season: number;
  episode: number;
  /** When the show was removed from Continue Watching, if it was. */
  dismissedAt?: number | null;
}

export interface UpcomingEpisodeItem {
  tmdbId: string;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  /** `available`: aired, unwatched. `upcoming`: nothing new yet, next one is dated. */
  state: "available" | "upcoming";
  /** The episode being advertised. */
  season: number;
  episode: number;
  /** Episodes aired past the viewer, for the "3 new episodes" case. */
  newEpisodeCount: number;
  airDate: string | null;
  /** Where the card goes: the new episode, or a rewatch of the last one seen. */
  watchSeason: number;
  watchEpisode: number;
}

function parseInput(raw: unknown): WatchedShowInput[] {
  if (!raw || typeof raw !== "object") return [];
  const items = (raw as { items?: unknown }).items;
  if (!Array.isArray(items)) return [];

  const out: WatchedShowInput[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const tmdbId = row.tmdbId ? String(row.tmdbId).trim() : null;
    const season = Math.round(Number(row.season));
    const episode = Math.round(Number(row.episode));
    if (!tmdbId || !Number.isFinite(season) || !Number.isFinite(episode)) continue;
    out.push({
      tmdbId,
      season,
      episode,
      dismissedAt: typeof row.dismissedAt === "number" ? row.dismissedAt : null,
    });
    if (out.length >= MAX_TITLES) break;
  }
  return out;
}

async function resolveShow(input: WatchedShowInput, now: number): Promise<UpcomingEpisodeItem | null> {
  const info = await getTVAiringInfo(Number(input.tmdbId)).catch(() => null);
  if (!info) return null;

  const unwatchedAired = airedEpisodesAfter(info, input.season, input.episode, NEW_EPISODE_WINDOW + 1);

  const base = {
    tmdbId: input.tmdbId,
    title: info.name || info.title || "Untitled",
    poster_path: info.poster_path ?? null,
    backdrop_path: info.backdrop_path ?? null,
  };

  if (unwatchedAired.length > 0) {
    // Further behind than the window means you're not "missing a new episode",
    // you're just behind — that belongs in Continue Watching, not here.
    if (unwatchedAired.length > NEW_EPISODE_WINDOW) return null;

    const next = unwatchedAired[0];
    const lastAired = info.last_episode_to_air;
    const airedAt = lastAired?.air_date ? Date.parse(lastAired.air_date) : NaN;

    // A show you removed only comes back once something actually airs after that.
    if (input.dismissedAt && (!Number.isFinite(airedAt) || airedAt <= input.dismissedAt)) {
      return null;
    }

    return {
      ...base,
      state: "available",
      season: next.season,
      episode: next.episode,
      newEpisodeCount: unwatchedAired.length,
      airDate: lastAired?.air_date ?? null,
      watchSeason: next.season,
      watchEpisode: next.episode,
    };
  }

  // Caught up. Only worth a card if the next one has a date on it — an
  // indefinite hiatus is not something to keep staring at.
  const next = info.next_episode_to_air;
  if (!next?.air_date) return null;
  // Dismissed and nothing has aired since — it stays gone.
  if (input.dismissedAt) return null;

  const airsAt = Date.parse(next.air_date);
  if (!Number.isFinite(airsAt)) return null;
  if (airsAt - now > UPCOMING_WINDOW_DAYS * 86_400_000) return null;

  return {
    ...base,
    state: "upcoming",
    season: next.season_number,
    episode: next.episode_number,
    newEpisodeCount: 0,
    airDate: next.air_date,
    // Nothing new to play, so the card offers the last episode watched again.
    watchSeason: input.season,
    watchEpisode: input.episode,
  };
}

export async function POST(request: Request) {
  try {
    const inputs = parseInput(await request.json());
    if (inputs.length === 0) return NextResponse.json({ items: [] });

    const now = Date.now();
    const resolved = await Promise.all(inputs.map((input) => resolveShow(input, now)));
    const items = resolved.filter((item): item is UpcomingEpisodeItem => item !== null);

    // Something you can watch now outranks something you have to wait for; then
    // by air date, freshest first.
    items.sort((a, b) => {
      if (a.state !== b.state) return a.state === "available" ? -1 : 1;
      const aTime = a.airDate ? Date.parse(a.airDate) : 0;
      const bTime = b.airDate ? Date.parse(b.airDate) : 0;
      return a.state === "available" ? bTime - aTime : aTime - bTime;
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Upcoming episodes error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
