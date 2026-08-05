"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";
import { checkEmailExists } from "@/app/actions/auth";
import { syncOnLogin } from "@/lib/authSync";
import styles from "@/components/Auth.module.css";

export default function LoginClient() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const exists = await checkEmailExists(email);
      if (exists) {
        setStep(2);
      } else {
        router.push(`/register?email=${encodeURIComponent(email)}`);
      }
    } catch {
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (res?.error) {
        toast.error("Invalid email or password.");
      } else {
        toast.success("Successfully logged in!");
        // Don't block the redirect on this — it's a handful of DB round trips
        // (progress/history/watchlist merge + push) that can take a few seconds.
        // It keeps running in the background; the pages it feeds re-sync on
        // their own mount anyway (see ContinueWatchingRow, WishlistClient, etc).
        syncOnLogin();
        router.push("/");
        router.refresh();
      }
    } catch {
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.loginCard}>
        <h1 className={styles.title}>Welcome Back</h1>

        {step === 1 ? (
          <form onSubmit={handleEmailCheck} className={styles.formGroup}>
            <div className={styles.inputGroup}>
              <label htmlFor="email" className={styles.label}>
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className={styles.input}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className={styles.primaryButton}
            >
              {loading ? "Checking..." : "Continue"}
            </button>
          </form>
        ) : (
          <div className={styles.formGroup}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Email Address</label>
              <div className={styles.emailDisplay}>
                <span>{email}</span>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className={styles.emailEditBtn}
                >
                  Edit
                </button>
              </div>
            </div>

            <form onSubmit={handlePasswordLogin} className={styles.formGroup}>
              <div className={styles.inputGroup}>
                <label htmlFor="password" className={styles.label}>
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className={styles.input}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className={styles.primaryButton}
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          </div>
        )}

        <div className={styles.authFooter}>
          Don&apos;t have an account?{" "}
          <Link href="/register" className={styles.authFooterLink}>
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
}
