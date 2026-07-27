import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import ProfileClient from "./ProfileClient";
import styles from "./Profile.module.css";

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className={`page-content page-container ${styles.profilePage}`}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>My Profile</h1>
          <p className={styles.subtitle}>Signed in as {session.user.email}</p>
        </div>

        <form
          action={async () => {
            "use server";
            await signOut();
          }}
        >
          <button type="submit" className={styles.signOutBtn}>
            Sign Out
          </button>
        </form>
      </div>

      <ProfileClient />
    </div>
  );
}

