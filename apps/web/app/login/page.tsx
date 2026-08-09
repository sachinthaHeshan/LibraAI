"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Logo } from "@/components/Logo";
import { publicApiFetch } from "@/lib/api";
import { setToken } from "@/lib/auth";

type LoginResponse = {
  token: string;
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const { token } = await publicApiFetch<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(token);
      router.push("/overview");
    } catch (loginError) {
      setError(
        loginError instanceof Error ? loginError.message : "Unable to sign in",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-canvas px-6 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-accent/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-[#a3e3ff]/35 blur-3xl"
      />

      <div className="card relative w-full max-w-md p-8 sm:p-9">
        <div className="mb-8">
          <div className="mb-6">
            <Logo className="mx-auto" href={null} priority size="lg" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">
            Welcome back
          </h1>
          <p className="mt-2 text-sm font-medium text-muted">
            Sign in to manage books, members, and loans.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label
              className="mb-2 block text-sm font-semibold text-ink"
              htmlFor="email"
            >
              Email
            </label>
            <input
              autoComplete="email"
              className="field field-box"
              id="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@libra.local"
              required
              type="email"
              value={email}
            />
          </div>

          <div>
            <label
              className="mb-2 block text-sm font-semibold text-ink"
              htmlFor="password"
            >
              Password
            </label>
            <div className="relative">
              <input
                autoComplete="current-password"
                className="field field-box pr-12"
                id="password"
                onChange={(event) => setPassword(event.target.value)}
                required
                type={showPassword ? "text" : "password"}
                value={password}
              />
              <button
                className="absolute inset-y-0 right-2 my-auto rounded-lg px-2 text-xs font-bold text-muted hover:text-ink"
                onClick={() => setShowPassword((value) => !value)}
                type="button"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {error ? (
            <p
              className="rounded-2xl bg-[#ffecea] px-3 py-2 text-sm font-medium text-danger"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <button
            className="btn-primary w-full"
            disabled={submitting}
            type="submit"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
