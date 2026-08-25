"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Logo } from "@/components/Logo";
import { getToken } from "@/lib/auth";

export function LandingNav() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    setSignedIn(Boolean(getToken()));
  }, []);

  return (
    <header className="landing-animate relative z-20">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <Logo href="/" priority size="sm" />

        <nav
          aria-label="Marketing"
          className="hidden items-center gap-7 text-sm font-medium text-[#4b5563] sm:flex"
        >
          <a className="transition-colors hover:text-ink" href="#features">
            Features
          </a>
          <a className="transition-colors hover:text-ink" href="#pricing">
            Pricing
          </a>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {signedIn ? (
            <Link className="btn-primary text-sm" href="/overview">
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link
                className="hidden text-sm font-semibold text-[#4b5563] transition-colors hover:text-ink sm:inline"
                href="/login"
              >
                Sign in
              </Link>
              <Link className="btn-primary text-sm" href="/signup">
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
