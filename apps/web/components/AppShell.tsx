"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { clearToken } from "@/lib/auth";

const links = [
  { href: "/books", label: "Books" },
  { href: "/members", label: "Members" },
  { href: "/loans", label: "Loans" },
];

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  function logout() {
    clearToken();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link className="text-xl font-bold text-slate-900" href="/books">
            Libra
          </Link>
          <nav aria-label="Main navigation" className="flex items-center gap-2">
            {links.map((link) => {
              const active = pathname.startsWith(link.href);

              return (
                <Link
                  className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                  href={link.href}
                  key={link.href}
                >
                  {link.label}
                </Link>
              );
            })}
            <button
              className="ml-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              onClick={logout}
              type="button"
            >
              Logout
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
