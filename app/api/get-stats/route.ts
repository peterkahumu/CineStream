import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbQuery } from "@/lib/db";
import { watchHistory, watchProgress } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { computeStats } from "@/lib/stats";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Re-exported so components can keep importing the shapes from the route they call.
export type {
  TimeRangeKey,
  GenreTally,
  ActivityPoint,
  TopTitleStat,
  BingeMetrics,
} from "@/lib/stats";

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

    return NextResponse.json(computeStats({ historyRows, progressRows }), {
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
