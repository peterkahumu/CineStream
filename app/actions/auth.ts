"use server";

import { auth } from "@/auth";
import { dbQuery } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const MAX_DISPLAY_NAME_LENGTH = 60;
const MIN_PASSWORD_LENGTH = 6;
// Loose sanity check, not full RFC 5322 — just enough to reject obvious garbage.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function checkEmailExists(email: string) {
  if (!email) return false;

  const [user] = await dbQuery((db) =>
    db.select().from(users).where(eq(users.email, email)).limit(1)
  );
  return !!user;
}

export async function registerUser(formData: FormData) {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  // The client form enforces these too (type="email", minLength={6}), but that's
  // trivially bypassed by calling this server action directly — this is the real gate.
  if (!EMAIL_RE.test(email)) {
    return { error: "Please enter a valid email address." };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }

  let existingUser = false;
  try {
    existingUser = await checkEmailExists(email);
  } catch {
    return { error: "Database error checking email. Please try again." };
  }

  if (existingUser) {
    return { error: "User already exists with that email." };
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    await dbQuery((db) =>
      db.insert(users).values({
        email,
        password: hashedPassword,
      })
    );
    return { success: true };
  } catch (error) {
    console.error("Registration error:", error);
    return { error: "Failed to register user." };
  }
}

export async function updateDisplayName(name: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized." };
  }

  const userId = session.user.id;

  const trimmed = name.trim();
  if (!trimmed || trimmed.length > MAX_DISPLAY_NAME_LENGTH) {
    return { error: `Name must be between 1 and ${MAX_DISPLAY_NAME_LENGTH} characters.` };
  }

  try {
    await dbQuery((db) =>
      db.update(users).set({ name: trimmed }).where(eq(users.id, userId))
    );
    return { success: true, name: trimmed };
  } catch (error) {
    console.error("Update display name error:", error);
    return { error: "Failed to update display name." };
  }
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized." };
  }

  if (!currentPassword || !newPassword) {
    return { error: "Current and new password are required." };
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return { error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }

  const userId = session.user.id;

  try {
    const [user] = await dbQuery((db) =>
      db.select().from(users).where(eq(users.id, userId)).limit(1)
    );
    if (!user?.password) {
      return { error: "Unable to verify current password." };
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return { error: "Current password is incorrect." };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await dbQuery((db) =>
      db.update(users).set({ password: hashedPassword }).where(eq(users.id, userId))
    );
    return { success: true };
  } catch (error) {
    console.error("Change password error:", error);
    return { error: "Failed to change password." };
  }
}

/**
 * Deletes the signed-in user's account after re-verifying their password.
 * All owned rows (progress, history, watchlist, settings) cascade-delete via
 * the `onDelete: "cascade"` foreign keys in lib/db/schema.ts. The caller is
 * responsible for signing the user out afterward.
 */
export async function deleteAccount(password: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized." };
  }

  if (!password) {
    return { error: "Enter your password to confirm." };
  }

  const userId = session.user.id;

  try {
    const [user] = await dbQuery((db) =>
      db.select().from(users).where(eq(users.id, userId)).limit(1)
    );
    if (!user?.password) {
      return { error: "Unable to verify password." };
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return { error: "Incorrect password." };
    }

    await dbQuery((db) => db.delete(users).where(eq(users.id, userId)));
    return { success: true };
  } catch (error) {
    console.error("Delete account error:", error);
    return { error: "Failed to delete account." };
  }
}
