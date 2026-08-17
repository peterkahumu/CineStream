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
      watchedSeconds: number;
      runtimeSeconds: number;
      occurredAt: number;
      updatedAt: number;
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
      const updatedAt = typeof item.updatedAt === "number" && !isNaN(item.updatedAt)
        ? item.updatedAt
        : occurredAt;
      const watchedSeconds = Math.max(0, Math.round(Number(item.watchedSeconds) || 0));
      const runtimeSeconds = Math.max(0, Math.round(Number(item.runtimeSeconds) || 0));

      const episodeKey = `${mediaType}-${tmdbId}-${season ?? "x"}-${episode ?? "x"}`;
      const existing = byEpisode.get(episodeKey);
      if (!existing || updatedAt >= existing.updatedAt) {
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
          // Seconds never regress, even when an older row wins the metadata.
          watchedSeconds: Math.max(watchedSeconds, existing?.watchedSeconds ?? 0),
          runtimeSeconds: Math.max(runtimeSeconds, existing?.runtimeSeconds ?? 0),
          occurredAt,
          updatedAt,
          episodeKey,
        });
      } else if (watchedSeconds > existing.watchedSeconds || runtimeSeconds > existing.runtimeSeconds) {
        existing.watchedSeconds = Math.max(watchedSeconds, existing.watchedSeconds);
        existing.runtimeSeconds = Math.max(runtimeSeconds, existing.runtimeSeconds);
      }
    }

    const validItems = Array.from(byEpisode.values());
    if (validItems.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    // Metadata is last-write-wins by updatedAt (sync requests arrive out of order),
    // but watch seconds merge with GREATEST regardless: furthest-position is
    // monotonic, so a stale device must never talk another one's watch time down.
    const isNewer = sql`COALESCE(${watchHistory.updatedAt}, ${watchHistory.occurredAt}) <= excluded."updatedAt"`;

    await dbQuery(async (db) => {
      for (const item of validItems) {
        await db
          .insert(watchHistory)
          .values(item)
          .onConflictDoUpdate({
            target: [watchHistory.userId, watchHistory.episodeKey],
            set: {
              title: sql`CASE WHEN ${isNewer} THEN excluded."title" ELSE ${watchHistory.title} END`,
              poster_path: sql`CASE WHEN ${isNewer} THEN excluded."poster_path" ELSE ${watchHistory.poster_path} END`,
              event: sql`CASE WHEN ${isNewer} THEN excluded."event" ELSE ${watchHistory.event} END`,
              genres: sql`CASE WHEN ${isNewer} AND excluded."genres" IS NOT NULL THEN excluded."genres" ELSE ${watchHistory.genres} END`,
              watchedSeconds: sql`GREATEST(COALESCE(${watchHistory.watchedSeconds}, 0), COALESCE(excluded."watchedSeconds", 0))`,
              // Runtime is a fixed property of the asset, not a high-water mark, so
              // it is last-write-wins like the other metadata. GREATEST was wrong and
              // unrecoverable: one bad duration from a mis-keyed provider payload
              // pinned the row's runtime high forever, and since completion is
              // watchedSeconds/runtimeSeconds >= 0.9, that episode could never be
              // recorded as finished again. A zero still never overwrites a known
              // runtime — that is a client with nothing to say, not a correction.
              runtimeSeconds: sql`CASE WHEN ${isNewer} AND COALESCE(excluded."runtimeSeconds", 0) > 0 THEN excluded."runtimeSeconds" ELSE COALESCE(${watchHistory.runtimeSeconds}, 0) END`,
              occurredAt: sql`CASE WHEN ${isNewer} THEN excluded."occurredAt" ELSE ${watchHistory.occurredAt} END`,
              updatedAt: sql`GREATEST(COALESCE(${watchHistory.updatedAt}, 0), COALESCE(excluded."updatedAt", 0))`,
            },
          });
      }
    });

    return NextResponse.json({ success: true, count: validItems.length });
  } catch (error) {
    console.error("Sync history error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
