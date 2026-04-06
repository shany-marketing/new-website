"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCallback = searchParams.get("callbackUrl") || "/dashboard";
  // Prevent open redirect — only allow relative paths
  const callbackUrl = rawCallback.startsWith("/") && !rawCallback.startsWith("//") ? rawCallback : "/dashboard";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChainManager, setIsChainManager] = useState(false);
  const [chainName, setChainName] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (isChainManager && !chainName.trim()) {
      setError("Chain name is required");
      return;
    }

    if (!agreedToTerms) {
      setError("You must agree to the Terms of Service and Privacy Policy");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, email, password,
          isChainManager,
          chainName: isChainManager ? chainName.trim() : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Signup failed");
        setLoading(false);
        return;
      }

      // Auto sign-in after successful signup
      const signInRes = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      setLoading(false);

      if (signInRes?.error) {
        setError("Account created but sign-in failed. Please log in.");
      } else {
        router.push(callbackUrl);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div
      className="w-full max-w-md rounded-3xl p-8 shadow-2xl"
      style={{
        background: "linear-gradient(135deg, var(--glass-bg) 0%, var(--glass-bg-end) 100%)",
        border: "1px solid var(--glass-border)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="flex flex-col items-center gap-2 mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-gold via-gold-light to-gold-dark bg-clip-text text-transparent">
          Create Account
        </h1>
        <p className="text-muted text-sm">Start analyzing your guest reviews</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-muted mb-1.5">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-foreground placeholder:text-muted focus:outline-none transition-colors"
            style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
            placeholder="Your name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl text-foreground placeholder:text-muted focus:outline-none transition-colors"
            style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted mb-1.5">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl text-foreground placeholder:text-muted focus:outline-none transition-colors"
            style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
            placeholder="At least 8 characters"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted mb-1.5">Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl text-foreground placeholder:text-muted focus:outline-none transition-colors"
            style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
            placeholder="Repeat your password"
          />
        </div>

        <div className="flex items-start gap-2.5">
          <input
            type="checkbox"
            id="chainManager"
            checked={isChainManager}
            onChange={(e) => setIsChainManager(e.target.checked)}
            className="mt-1 h-4 w-4 rounded accent-gold"
          />
          <label htmlFor="chainManager" className="text-muted text-xs leading-relaxed">
            I manage multiple hotels in a chain
          </label>
        </div>

        {isChainManager && (
          <div>
            <label className="block text-sm font-medium text-muted mb-1.5">Chain Name</label>
            <input
              type="text"
              value={chainName}
              onChange={(e) => setChainName(e.target.value)}
              required={isChainManager}
              className="w-full px-4 py-3 rounded-xl text-foreground placeholder:text-muted focus:outline-none transition-colors"
              style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
              placeholder="e.g., IDILIQ, Brown Hotels"
            />
          </div>
        )}

        <div className="flex items-start gap-2.5">
          <input
            type="checkbox"
            id="terms"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="mt-1 h-4 w-4 rounded accent-gold"
          />
          <label htmlFor="terms" className="text-muted text-xs leading-relaxed">
            I agree to the{" "}
            <Link href="/terms" target="_blank" className="text-gold-light hover:text-gold transition-colors underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" target="_blank" className="text-gold-light hover:text-gold transition-colors underline">
              Privacy Policy
            </Link>
            , including the collection and processing of publicly available review data from
            travel platforms for my registered properties.
          </label>
        </div>

        {error && <p className="text-danger text-sm text-center">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl font-semibold text-navy-1 transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{
            background: "linear-gradient(to right, var(--gold-light), var(--gold-dark))",
          }}
        >
          {loading ? "Creating account..." : "Create Account"}
        </button>
      </form>

      <p className="text-center text-muted text-sm mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-gold-light hover:text-gold transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: "var(--page-gradient)",
      }}
    >
      <div className="flex flex-col items-center gap-8">
        <Link href="/">
          <img src="/logo.svg" alt="RatingIQ" style={{ height: "36px", width: "auto" }} />
        </Link>
        <Suspense fallback={<div className="text-muted">Loading...</div>}>
          <SignupForm />
        </Suspense>
      </div>
    </div>
  );
}
