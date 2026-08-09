"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { getToken } from "@/lib/auth";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace(getToken() ? "/overview" : "/login");
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas">
      <div className="flex flex-col items-center gap-3">
        <div className="skeleton h-10 w-10 rounded-xl" />
        <p className="text-sm font-medium text-muted">Loading LibraAI…</p>
      </div>
    </main>
  );
}
