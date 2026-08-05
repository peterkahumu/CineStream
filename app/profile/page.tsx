import { auth, signOut } from "@/auth"
import { redirect } from "next/navigation"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import type { Metadata } from "next"
import ProfileClient from "./ProfileClient"
import buttonStyles from "./Profile.module.css"

export const metadata: Metadata = {
  title: "Profile",
  description: "Your CinemaPhora account — continue watching, watch history, and stats.",
}

export default async function ProfilePage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/login")
  }

  // Read fresh from the DB rather than trusting the JWT, so a just-edited display
  // name is always reflected without needing to force a session/token refresh.
  const [user] = await db
    .select({ name: users.name, email: users.email, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)

  return (
    <div className="page-content page-container">
      <ProfileClient
        name={user?.name ?? null}
        email={user?.email ?? session.user.email ?? ""}
        memberSince={user?.createdAt?.toISOString() ?? null}
      >
        <form
          action={async () => {
            "use server"
            await signOut()
          }}
        >
          <button type="submit" className={buttonStyles.signOutBtn}>
            Sign Out
          </button>
        </form>
      </ProfileClient>
    </div>
  )
}
