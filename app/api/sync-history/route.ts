import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbQuery } from "@/lib/db";
import { watchHistory } from "@/lib/db/schema";

/**
 * Watch history events are immutable once created (see lib/progressTracker.ts), so
 * syncing is a simple idempotent insert keyed on the client-generated `id` — unlike
 * /api/sync-progress there is no "newer wins" comparison to make.
 *
 * Uses `onConflictDoNothing` so concurrent flushes or duplicate sync requests
 * never fail with unique constraint violations on `watch_history_pkey`.
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const items = await request.json();

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
    }

    // Deduplicate items in the batch by ID first
    const seenIds = new Set<string>();
    const validItems: {
      id: string;
      userId: string;
      tmdbId: string;
      mediaType: "movie" | "tv";
      title: string;
      poster_path: string | null;
      season: number | null;
      episode: number | null;
      event: "started" | "completed";
      genres: unknown;
      occurredAt: number;
    }[] = [];

    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const eventId = item.id ? String(item.id).trim() : null;
      const tmdbId = item.tmdbId ? String(item.tmdbId).trim() : (item.id ? String(item.id).trim() : null);
      if (!eventId || !tmdbId || seenIds.has(eventId)) continue;
      seenIds.add(eventId);

      const mediaType = item.mediaType === "tv" ? "tv" : "movie";
      const title = typeof item.title === "string" && item.title.trim() ? item.title.trim() : "Untitled";
      const season = typeof item.season === "number" && !isNaN(item.season)
        ? Math.round(item.season)
        : (item.season ? parseInt(String(item.season), 10) || null : null);
      const episode = typeof item.episode === "number" && !isNaN(item.episode)
        ? Math.round(item.episode)
        : (item.episode ? parseInt(String(item.episode), 10) || null : null);
      const event = item.event === "completed" ? "completed" : "started";
      const poster_path = item.poster_path ? String(item.poster_path) : null;
      const genres = Array.isArray(item.genres) ? item.genres : null;
      const occurredAt = typeof item.occurredAt === "number" && !isNaN(item.occurredAt)
        ? item.occurredAt
        : Date.now();

      validItems.push({
        id: eventId,
        userId,
        tmdbId,
        mediaType,
        title,
        poster_path,
        season,
        episode,
        event,
        genres,
        occurredAt,
      });
    }

    if (validItems.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    await dbQuery(async (db) => {
      for (const item of validItems) {
        await db
          .insert(watchHistory)
          .values(item)
          .onConflictDoNothing({ target: watchHistory.id });
      }
    });

    return NextResponse.json({ success: true, count: validItems.length });
  } catch (error) {
    console.error("Sync history error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
