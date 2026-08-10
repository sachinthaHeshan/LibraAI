"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";

import { useChat } from "@/components/ChatProvider";
import { ChatWidget } from "@/components/ChatWidget";
import { Logo } from "@/components/Logo";
import { clearToken } from "@/lib/auth";
import {
  type CurrentUser,
  getCurrentUser,
  userInitials,
} from "@/lib/current-user";

function NavIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      aria-hidden
      className="h-5 w-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      {children}
    </svg>
  );
}

const links = [
  {
    href: "/overview",
    label: "Overview",
    icon: (
      <NavIcon>
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <path d="M9 22V12h6v10" />
      </NavIcon>
    ),
  },
  {
    href: "/chat",
    label: "Chat",
    icon: (
      <NavIcon>
        <path d="M21 12a8 8 0 0 1-8 8H6l-4 2 1.5-4A9 9 0 1 1 21 12Z" />
      </NavIcon>
    ),
  },
  {
    href: "/books",
    label: "Books",
    icon: (
      <NavIcon>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </NavIcon>
    ),
  },
  {
    href: "/members",
    label: "Members",
    icon: (
      <NavIcon>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </NavIcon>
    ),
  },
  {
    href: "/loans",
    label: "Loans",
    icon: (
      <NavIcon>
        <path d="M8 3 4 7l4 4" />
        <path d="M4 7h16" />
        <path d="m16 21 4-4-4-4" />
        <path d="M20 17H4" />
      </NavIcon>
    ),
  },
  {
    href: "/staff",
    label: "Staff",
    icon: (
      <NavIcon>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M19 8v6" />
        <path d="M22 11h-6" />
      </NavIcon>
    ),
  },
];

type AppShellProps = {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  search?: ReactNode;
  aside?: ReactNode;
};

export function AppShell({
  children,
  title,
  subtitle,
  actions,
  search,
  aside,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { reset } = useChat();
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    let active = true;
    void getCurrentUser()
      .then((nextUser) => {
        if (active) setUser(nextUser);
      })
      .catch(() => {
        if (active) setUser(null);
      });
    return () => {
      active = false;
    };
  }, []);

  function logout() {
    reset();
    clearToken();
    router.push("/login");
  }

  const initials = user ? userInitials(user) : "A";
  const ariaLabel = user
    ? `${user.firstName} ${user.lastName}`
    : "Admin";

  return (
    <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="hidden border-r border-line bg-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <div className="flex items-center px-4 py-5">
          <Logo href="/overview" size="md" />
        </div>

        <nav aria-label="Main navigation" className="flex flex-1 flex-col gap-1 px-3 py-2">
          {links.map((link) => {
            const active = pathname.startsWith(link.href);

            return (
              <Link
                className={`relative flex items-center gap-3 rounded-[6px] px-3 py-2.5 text-[13.5px] font-semibold transition ${
                  active
                    ? "bg-accent-soft text-accent"
                    : "text-[#6b7280] hover:bg-[#f8fafc] hover:text-ink"
                }`}
                href={link.href}
                key={link.href}
              >
                {active ? (
                  <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-sm bg-accent" />
                ) : null}
                <span className={`inline-flex ${active ? "text-accent" : "text-[#6b7280]"}`}>
                  {link.icon}
                </span>
                {link.label}
              </Link>
            );
          })}
        </nav>

        <button
          className="mx-3 mb-5 flex items-center gap-3 rounded-[6px] px-3 py-2.5 text-left text-[13.5px] font-semibold text-[#6b7280] transition hover:bg-[#f8fafc] hover:text-ink"
          onClick={logout}
          type="button"
        >
          <NavIcon>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="M16 17l5-5-5-5" />
            <path d="M21 12H9" />
          </NavIcon>
          Logout
        </button>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-line bg-white/90 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Logo className="lg:hidden" href="/overview" size="sm" />

            <div className="mx-auto w-full max-w-xl">
              {search ?? (
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-muted">
                    <svg
                      aria-hidden
                      className="h-4 w-4 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeWidth="1.75"
                      viewBox="0 0 24 24"
                    >
                      <circle cx="11" cy="11" r="6.5" />
                      <path d="m16 16 3.5 3.5" />
                    </svg>
                  </span>
                  <input
                    aria-label="Search"
                    className="field pl-11"
                    placeholder="Search or type a command"
                    readOnly
                  />
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <button aria-label="Settings" className="btn-icon" type="button">
                <svg
                  aria-hidden
                  className="h-5 w-5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.6"
                  viewBox="0 0 24 24"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 5 15.4a1.65 1.65 0 0 0-1.51-1H3.4a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 5 8.6a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9.4 5a1.65 1.65 0 0 0 1-1.51V3.4a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19 8.6a1.65 1.65 0 0 0 1.51 1h.09a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
                </svg>
              </button>
              <button aria-label="Notifications" className="btn-icon relative" type="button">
                <svg
                  aria-hidden
                  className="h-5 w-5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.6"
                  viewBox="0 0 24 24"
                >
                  <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                  <path d="M10.3 21a1.7 1.7 0 0 0 3.4 0" />
                </svg>
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-danger" />
              </button>
              <span
                aria-label={ariaLabel}
                className="ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-[#c7d2fe] text-xs font-bold text-[#3730a3]"
              >
                {initials}
              </span>
            </div>
          </div>
        </header>

        <div
          className={`px-4 py-5 sm:px-6 lg:px-8 lg:py-7 ${
            aside ? "xl:grid xl:grid-cols-[minmax(0,1fr)_280px] xl:gap-6" : ""
          }`}
        >
          <div className="min-w-0">
            <div className="mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[1.75rem]">
                    {title}
                  </h1>
                  {subtitle ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#6b7280] shadow-sm ring-1 ring-line">
                      {subtitle}
                      <svg
                        aria-hidden
                        className="h-3.5 w-3.5 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeWidth="1.8"
                        viewBox="0 0 24 24"
                      >
                        <path d="m7 10 5 5 5-5" />
                      </svg>
                    </span>
                  ) : null}
                </div>
              </div>
              {actions}
            </div>
            {children}
          </div>

          {aside ? <aside className="mt-6 hidden xl:mt-0 xl:block">{aside}</aside> : null}
        </div>
      </div>

      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-6 gap-1 rounded-2xl border border-line bg-white/95 p-1.5 shadow-lg backdrop-blur lg:hidden"
      >
        {links.map((link) => {
          const active = pathname.startsWith(link.href);
          return (
            <Link
              className={`flex flex-col items-center gap-1 rounded-[6px] px-2 py-2 text-[11px] font-semibold ${
                active ? "bg-accent-soft text-accent" : "text-muted"
              }`}
              href={link.href}
              key={link.href}
            >
              {link.icon}
              {link.label}
            </Link>
          );
        })}
      </nav>

      <ChatWidget />
    </div>
  );
}
