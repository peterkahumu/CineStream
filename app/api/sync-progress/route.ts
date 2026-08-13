import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbQuery } from "@/lib/db";
import { watchProgress } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

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

    // Deduplicate incoming batch by tmdbId, keeping the latest updatedAt item
    const map = new Map<string, {
      tmdbId: string;
      mediaType: "movie" | "tv";
      title: string;
      poster_path: string | null;
      backdrop_path: string | null;
      watched: number;
      duration: number;
      season: number | null;
      episode: number | null;
      show_progress: unknown;
      genres: unknown;
      lastProvider: string | null;
      nextEpisodeKey: string | null;
      dismissedAt: number | null;
      updatedAt: number;
    }>();

    for (const item of items) {
      if (!item || typeof item !== "object") continue;

      const tmdbId = item.id ? String(item.id).trim() : (item.tmdbId ? String(item.tmdbId).trim() : null);
      if (!tmdbId) continue;

      const mediaType: "movie" | "tv" = item.mediaType === "tv" ? "tv" : "movie";
      const title = typeof item.title === "string" && item.title.trim() ? item.title.trim() : "Untitled";
      const poster_path = item.poster_path ? String(item.poster_path) : null;
      const backdrop_path = item.backdrop_path ? String(item.backdrop_path) : null;
      const watched = Math.round(Number(item.watched) || 0);
      const duration = Math.round(Number(item.duration) || 0);
      const season = typeof item.season === "number" && !isNaN(item.season)
        ? Math.round(item.season)
        : (item.season ? parseInt(String(item.season), 10) || null : null);
      const episode = typeof item.episode === "number" && !isNaN(item.episode)
        ? Math.round(item.episode)
        : (item.episode ? parseInt(String(item.episode), 10) || null : null);
      const show_progress = item.show_progress && typeof item.show_progress === "object" ? item.show_progress : null;
      const genres = Array.isArray(item.genres) ? item.genres : null;
      const lastProvider = item.lastProvider ? String(item.lastProvider) : null;
      const nextEpisodeKey = item.nextEpisodeKey ? String(item.nextEpisodeKey) : null;
      const dismissedAt = typeof item.dismissedAt === "number" && !isNaN(item.dismissedAt)
        ? item.dismissedAt
        : null;
      const updatedAt = typeof item.updatedAt === "number" && !isNaN(item.updatedAt)
        ? item.updatedAt
        : Date.now();

      const existingEntry = map.get(tmdbId);
      if (!existingEntry || updatedAt >= existingEntry.updatedAt) {
        map.set(tmdbId, {
          tmdbId,
          mediaType,
          title,
          poster_path,
          backdrop_path,
          watched,
          duration,
          season,
          episode,
          show_progress,
          genres,
          lastProvider,
          nextEpisodeKey,
          dismissedAt,
          updatedAt,
        });
      }
    }

    const uniqueItems = Array.from(map.values());
    if (uniqueItems.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    // One dbQuery call for the whole batch, so every item in the loop shares a
    // single connection instead of opening one per query.
    await dbQuery(async (db) => {
      for (const item of uniqueItems) {
        const existing = await db
          .select()
          .from(watchProgress)
          .where(
            and(
              eq(watchProgress.userId, userId),
              eq(watchProgress.tmdbId, item.tmdbId)
            )
          );

        if (existing.length > 0) {
          const latestExisting = existing.reduce((prev, curr) =>
            Number(curr.updatedAt || 0) > Number(prev.updatedAt || 0) ? curr : prev
          );
          const existingUpdatedAt = Number(latestExisting.updatedAt) || 0;

          // If incoming timestamp is newer or equal, update it
          if (item.updatedAt >= existingUpdatedAt) {
            await db
              .update(watchProgress)
              .set({
                mediaType: item.mediaType,
                title: item.title !== "Untitled" ? item.title : latestExisting.title,
                poster_path: item.poster_path ?? latestExisting.poster_path,
                backdrop_path: item.backdrop_path ?? latestExisting.backdrop_path,
                watched: item.watched,
                duration: item.duration,
                season: item.season ?? latestExisting.season,
                episode: item.episode ?? latestExisting.episode,
                show_progress: item.show_progress ?? latestExisting.show_progress,
                genres: item.genres ?? latestExisting.genres,
                lastProvider: item.lastProvider ?? latestExisting.lastProvider,
                nextEpisodeKey: item.nextEpisodeKey ?? latestExisting.nextEpisodeKey,
                // Overwritten, not coalesced — clearing it (a rewatch) has to win.
                dismissedAt: item.dismissedAt,
                updatedAt: item.updatedAt,
              })
              .where(eq(watchProgress.id, latestExisting.id));
          }
        } else {
          // Insert new progress row
          await db.insert(watchProgress).values({
            userId,
            tmdbId: item.tmdbId,
            mediaType: item.mediaType,
            title: item.title,
            poster_path: item.poster_path,
            backdrop_path: item.backdrop_path,
            watched: item.watched,
            duration: item.duration,
            season: item.season,
            episode: item.episode,
            show_progress: item.show_progress,
            genres: item.genres,
            lastProvider: item.lastProvider,
            nextEpisodeKey: item.nextEpisodeKey,
            dismissedAt: item.dismissedAt,
            updatedAt: item.updatedAt,
          });
        }
      }
    });

    return NextResponse.json({ success: true, count: uniqueItems.length });
  } catch (error) {
    console.error("Sync progress error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const tmdbId = body?.tmdbId ? String(body.tmdbId).trim() : null;

    if (!tmdbId) {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
    }

    await dbQuery((db) =>
      db
        .delete(watchProgress)
        .where(
          and(
            eq(watchProgress.userId, userId),
            eq(watchProgress.tmdbId, tmdbId)
          )
        )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete watch progress error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
