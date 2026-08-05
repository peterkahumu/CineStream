import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbQuery } from "@/lib/db";
import { watchHistory } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

/**
 * Watch history: one row per episode/movie (see lib/db/schema.ts), upserted by
 * (userId, episodeKey) with latest-occurredAt-wins — matches lib/progressTracker.ts's
 * logHistoryEvent, which updates the same local row in place rather than appending.
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

    // Dedupe the incoming batch by episode identity, keeping the latest occurredAt —
    // avoids sending two conflicting rows for the same episode in one statement.
    const byEpisode = new Map<string, {
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
      episodeKey: string;
    }>();

    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const eventId = item.id ? String(item.id).trim() : null;
      const tmdbId = item.tmdbId ? String(item.tmdbId).trim() : (item.id ? String(item.id).trim() : null);
      if (!eventId || !tmdbId) continue;

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

      const episodeKey = `${mediaType}-${tmdbId}-${season ?? "x"}-${episode ?? "x"}`;
      const existing = byEpisode.get(episodeKey);
      if (!existing || occurredAt >= existing.occurredAt) {
        byEpisode.set(episodeKey, {
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
          episodeKey,
        });
      }
    }

    const validItems = Array.from(byEpisode.values());
    if (validItems.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    await dbQuery(async (db) => {
      for (const item of validItems) {
        await db
          .insert(watchHistory)
          .values(item)
          .onConflictDoUpdate({
            target: [watchHistory.userId, watchHistory.episodeKey],
            set: {
              title: item.title,
              poster_path: item.poster_path,
              event: item.event,
              genres: item.genres,
              occurredAt: item.occurredAt,
            },
            // Only apply if this update is at least as new as what's already stored —
            // sync requests can arrive out of order.
            setWhere: sql`${watchHistory.occurredAt} <= ${item.occurredAt}`,
          });
      }
    });

    return NextResponse.json({ success: true, count: validItems.length });
  } catch (error) {
    console.error("Sync history error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
