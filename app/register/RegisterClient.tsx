"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { registerUser } from "@/app/actions/auth";
import { signIn } from "next-auth/react";
import toast from "react-hot-toast";
import styles from "@/components/Auth.module.css";
import Link from "next/link";

export default function RegisterClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("email", email);
      formData.append("password", password);

      const res = await registerUser(formData);

      if (res.error) {
        toast.error(res.error);
      } else if (res.success) {
        // Automatically sign in after successful registration
        const signInRes = await signIn("credentials", {
          redirect: false,
          email,
          password,
        });

        if (signInRes?.error) {
          toast.error("Registered successfully, but failed to log in.");
        } else {
          toast.success("Account created successfully!");
          router.push("/profile");
          router.refresh();
        }
      }
    } catch (err) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.loginCard}>
        <h1 className={styles.title}>Create Account</h1>
        
        <form onSubmit={handleRegister} className={styles.formGroup}>
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
              minLength={6}
              className={styles.input}
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className={styles.primaryButton}
          >
            {loading ? "Creating account..." : "Register"}
          </button>
        </form>

        <div className={styles.authFooter}>
          Already have an account?{" "}
          <Link href="/login" className={styles.authFooterLink}>
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
}
