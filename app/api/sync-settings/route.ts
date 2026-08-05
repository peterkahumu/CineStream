import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbQuery } from "@/lib/db";
import { userSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { settings, updatedAt } = body ?? {};

    if (!settings || typeof settings !== "object" || typeof updatedAt !== "number" || isNaN(updatedAt)) {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
    }

    await dbQuery(async (db) => {
      const existing = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, userId))
        .limit(1);

      if (existing.length > 0) {
        // Latest-updatedAt-wins
        if (updatedAt >= Number(existing[0].updatedAt || 0)) {
          await db
            .update(userSettings)
            .set({ settings, updatedAt })
            .where(eq(userSettings.userId, userId));
        }
      } else {
        await db
          .insert(userSettings)
          .values({ userId, settings, updatedAt })
          .onConflictDoUpdate({
            target: userSettings.userId,
            set: { settings, updatedAt },
          });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Sync settings error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

