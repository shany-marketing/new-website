"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const glass = {
  background: "var(--nav-scrolled-bg)",
  backdropFilter: "blur(16px)",
  border: "1px solid var(--glass-border)",
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCallback = searchParams.get("callbackUrl") || "/dashboard";
  const callbackUrl = rawCallback.startsWith("/") && !rawCallback.startsWith("//") ? rawCallback : "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("Wrong email or password.");
    } else {
      router.push(callbackUrl);
    }
  }

  return (
    <div className="w-full max-w-sm rounded-2xl p-8" style={{ ...glass, boxShadow: "0 0 60px rgba(201,168,106,0.08), 0 24px 48px rgba(0,0,0,0.3)" }}>

      {/* Logo */}
      <div className="flex items-center mb-8">
        <img src="/logo.svg" alt="RatingIQ" style={{ height: "32px", width: "auto" }} />
      </div>

      <h1 className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: "var(--font-manrope)" }}>
        Welcome back.
      </h1>
      <p className="text-sm text-muted mb-7">Sign in to your chain&apos;s dashboard.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">Work email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            placeholder="you@yourchain.com"
            className="w-full px-4 py-2.5 rounded-xl text-sm text-foreground placeholder:text-muted outline-none transition-all duration-200"
            style={{ background: "var(--input-bg)", border: "1px solid var(--glass-border)" }}
            onFocus={e => { e.currentTarget.style.borderColor = "rgba(201,168,106,0.5)"; }}
            onBlur={e => { e.currentTarget.style.borderColor = "var(--glass-border)"; }}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            className="w-full px-4 py-2.5 rounded-xl text-sm text-foreground placeholder:text-muted outline-none transition-all duration-200"
            style={{ background: "var(--input-bg)", border: "1px solid var(--glass-border)" }}
            onFocus={e => { e.currentTarget.style.borderColor = "rgba(201,168,106,0.5)"; }}
            onBlur={e => { e.currentTarget.style.borderColor = "var(--glass-border)"; }}
          />
        </div>

        {error && (
          <p className="text-sm text-center" style={{ color: "var(--danger, #e05c5c)" }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:opacity-90 disabled:opacity-50"
          style={{ background: "linear-gradient(to right, var(--gold), var(--gold-dark))", color: "#1C2A39" }}
        >
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>

      <div className="mt-6 pt-5 border-t flex items-center justify-between" style={{ borderColor: "var(--glass-border)" }}>
        <p className="text-xs text-muted">
          No account?{" "}
          <Link href="/signup" className="transition-colors hover:text-foreground" style={{ color: "var(--gold)" }}>
            Get started free
          </Link>
        </p>
        <Link href="/" className="text-xs text-muted hover:text-foreground transition-colors">
          ← Back to site
        </Link>
      </div>

    </div>
  );
}

export default function LoginPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--page-gradient)" }}
      onClick={() => window.history.back()}
    >
      <div onClick={e => e.stopPropagation()}>
        <Suspense fallback={<div className="text-muted text-sm">Loading…</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
