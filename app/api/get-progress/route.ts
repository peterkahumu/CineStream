import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { watchProgress } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const progress = await db
      .select()
      .from(watchProgress)
      .where(eq(watchProgress.userId, session.user.id))
      .orderBy(desc(watchProgress.updatedAt));

    // Map to local storage format
    const formatted = progress.map(p => ({
      id: p.tmdbId,
      mediaType: p.mediaType,
      title: p.title,
      poster_path: p.poster_path,
      backdrop_path: p.backdrop_path,
      watched: p.watched,
      duration: p.duration,
      season: p.season,
      episode: p.episode,
      show_progress: p.show_progress,
      lastProvider: p.lastProvider,
      updatedAt: p.updatedAt,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Get progress error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
