"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useEffect, useState } from "react";

import { Logo } from "@/components/Logo";
import { publicApiFetch } from "@/lib/api";
import { type AccountRole, setToken } from "@/lib/auth";
import { PLANS, formatLkr, parsePlanId, type PlanId } from "@/lib/plans";

type SignupResponse = {
  token: string;
};

type Library = {
  id: string;
  name: string;
};

const ACCOUNT_TABS: { id: AccountRole; label: string }[] = [
  { id: "owner", label: "Library owner" },
  { id: "member", label: "Library member" },
];

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accountType, setAccountType] = useState<AccountRole>(() =>
    searchParams.get("account") === "member" ? "member" : "owner",
  );
  const [libraries, setLibraries] = useState<Library[] | null>(null);
  const [organizationId, setOrganizationId] = useState("");
  const [plan, setPlan] = useState<PlanId>(() =>
    parsePlanId(searchParams.get("plan")),
  );
  const [orgName, setOrgName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isOwner = accountType === "owner";

  useEffect(() => {
    if (accountType !== "member" || libraries) return;
    let active = true;
    publicApiFetch<Library[]>("/auth/libraries")
      .then((rows) => {
        if (active) setLibraries(rows);
      })
      .catch(() => {
        if (active) setError("Unable to load libraries");
      });
    return () => {
      active = false;
    };
  }, [accountType, libraries]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const body = isOwner
        ? {
            accountType,
            plan,
            organization: {
              name: orgName,
              address: address || null,
              phone: phone || null,
            },
            admin: {
              firstName,
              lastName,
              email,
              password,
            },
          }
        : {
            accountType,
            organizationId,
            member: {
              firstName,
              lastName,
              email,
              phone: phone || null,
              password,
            },
          };
      const { token } = await publicApiFetch<SignupResponse>("/auth/signup", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setToken(token);
      router.push(isOwner ? "/overview" : "/preferences");
    } catch (signupError) {
      setError(
        signupError instanceof Error
          ? signupError.message
          : "Unable to create account",
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

      <div className="card relative w-full max-w-lg p-8 sm:p-9">
        <div className="mb-8">
          <div className="mb-6">
            <Logo className="mx-auto" href="/" priority size="lg" />
          </div>
          <div
            aria-label="Account type"
            className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-[#f3f4f6] p-1"
            role="tablist"
          >
            {ACCOUNT_TABS.map((tab) => {
              const selected = accountType === tab.id;
              return (
                <button
                  aria-selected={selected}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    selected
                      ? "bg-white text-ink shadow-sm"
                      : "text-muted hover:text-ink"
                  }`}
                  key={tab.id}
                  onClick={() => {
                    setAccountType(tab.id);
                    setError("");
                  }}
                  role="tab"
                  type="button"
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">
            {isOwner ? "Create your library" : "Join your library"}
          </h1>
          <p className="mt-2 text-sm font-medium text-muted">
            {isOwner
              ? "Start managing books, members, and loans in minutes."
              : "Find books and borrow them from your library with LibraAI."}
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          {isOwner ? (
            <>
              <fieldset>
                <legend className="mb-2 block text-sm font-semibold text-ink">
                  Plan
                </legend>
                <div className="grid gap-2 sm:grid-cols-3">
                  {PLANS.map((option) => {
                    const selected = plan === option.id;
                    return (
                      <button
                        aria-pressed={selected}
                        className={`rounded-xl border px-3 py-3 text-left transition ${
                          selected
                            ? "border-accent bg-accent-soft shadow-sm"
                            : "border-line bg-[#f3f4f6] hover:bg-[#eef0f4]"
                        }`}
                        key={option.id}
                        onClick={() => setPlan(option.id)}
                        type="button"
                      >
                        <span className="block text-sm font-bold text-ink">
                          {option.name}
                        </span>
                        <span className="mt-1 block text-xs font-medium text-muted">
                          {formatLkr(option.priceLkr)}/mo
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <div>
                <label
                  className="mb-2 block text-sm font-semibold text-ink"
                  htmlFor="orgName"
                >
                  Library name
                </label>
                <input
                  autoComplete="organization"
                  className="field field-box"
                  id="orgName"
                  onChange={(event) => setOrgName(event.target.value)}
                  placeholder="City Central Library"
                  required
                  type="text"
                  value={orgName}
                />
              </div>

              <div>
                <label
                  className="mb-2 block text-sm font-semibold text-ink"
                  htmlFor="address"
                >
                  Address
                </label>
                <input
                  autoComplete="street-address"
                  className="field field-box"
                  id="address"
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="Optional"
                  type="text"
                  value={address}
                />
              </div>
            </>
          ) : (
            <div>
              <label
                className="mb-2 block text-sm font-semibold text-ink"
                htmlFor="library"
              >
                Library
              </label>
              <select
                className="field field-box field-select disabled:bg-[#f1f4fb] disabled:text-muted"
                disabled={!libraries || libraries.length === 0}
                id="library"
                onChange={(event) => setOrganizationId(event.target.value)}
                required
                value={organizationId}
              >
                <option disabled value="">
                  {!libraries
                    ? "Loading libraries…"
                    : libraries.length === 0
                      ? "No libraries yet"
                      : "Select your library"}
                </option>
                {libraries?.map((library) => (
                  <option key={library.id} value={library.id}>
                    {library.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label
              className="mb-2 block text-sm font-semibold text-ink"
              htmlFor="phone"
            >
              Phone
            </label>
            <input
              autoComplete="tel"
              className="field field-box"
              id="phone"
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Optional"
              type="tel"
              value={phone}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                className="mb-2 block text-sm font-semibold text-ink"
                htmlFor="firstName"
              >
                First name
              </label>
              <input
                autoComplete="given-name"
                className="field field-box"
                id="firstName"
                onChange={(event) => setFirstName(event.target.value)}
                required
                type="text"
                value={firstName}
              />
            </div>
            <div>
              <label
                className="mb-2 block text-sm font-semibold text-ink"
                htmlFor="lastName"
              >
                Last name
              </label>
              <input
                autoComplete="family-name"
                className="field field-box"
                id="lastName"
                onChange={(event) => setLastName(event.target.value)}
                required
                type="text"
                value={lastName}
              />
            </div>
          </div>

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
              placeholder={isOwner ? "admin@library.lk" : "you@example.com"}
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
                autoComplete="new-password"
                className="field field-box pr-12"
                id="password"
                minLength={8}
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
            {submitting ? "Creating account…" : "Create account"}
          </button>

          <p className="text-center text-sm font-medium text-muted">
            Already have an account?{" "}
            <Link className="font-semibold text-accent hover:underline" href="/login">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-canvas">
          <p className="text-sm font-medium text-muted">Loading…</p>
        </main>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
