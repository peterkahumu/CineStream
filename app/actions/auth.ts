"use server";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function checkEmailExists(email: string) {
  if (!email) return false;
  
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return !!user;
}

export async function registerUser(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const existingUser = await checkEmailExists(email);
  if (existingUser) {
    return { error: "User already exists with that email." };
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    await db.insert(users).values({
      email,
      password: hashedPassword,
    });
    return { success: true };
  } catch (error) {
    console.error("Registration error:", error);
    return { error: "Failed to register user." };
  }
}
