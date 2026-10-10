"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Logo } from "@/components/Logo";
import { PreferenceTagPicker } from "@/components/PreferenceTagPicker";
import { getTokenRole } from "@/lib/auth";
import {
  type PreferenceCategory,
  fetchPreferences,
  savePreferences,
  toggleTag,
} from "@/lib/preferences";

export default function PreferencesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<PreferenceCategory[] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (getTokenRole() !== "member") {
      router.replace("/overview");
      return;
    }

    let active = true;
    fetchPreferences()
      .then((preferences) => {
        if (!active) return;
        setCategories(preferences.categories);
        setSelected(preferences.selected);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setCategories([]);
        setError(
          loadError instanceof Error ? loadError.message : "Unable to load preferences",
        );
      });
    return () => {
      active = false;
    };
  }, [router]);

  async function save() {
    setError("");
    setSaving(true);
    try {
      await savePreferences(selected);
      router.push("/overview");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save preferences");
      setSaving(false);
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

      <div className="card relative w-full max-w-2xl p-8 sm:p-9">
        <div className="mb-8">
          <div className="mb-6">
            <Logo className="mx-auto" href="/overview" priority size="lg" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">
            What do you like to read?
          </h1>
          <p className="mt-2 text-sm font-medium text-muted">
            Pick as many as you like. LibraAI uses these to suggest books for you.
          </p>
        </div>

        {categories === null ? (
          <div className="space-y-6">
            <div className="skeleton h-24 rounded-xl" />
            <div className="skeleton h-24 rounded-xl" />
            <div className="skeleton h-20 rounded-xl" />
          </div>
        ) : (
          <PreferenceTagPicker
            categories={categories}
            onToggle={(tag) => setSelected((current) => toggleTag(current, tag))}
            selected={selected}
          />
        )}

        {error ? (
          <p
            className="mt-6 rounded-2xl bg-[#ffecea] px-3 py-2 text-sm font-medium text-danger"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-8 flex flex-col-reverse items-center gap-3 sm:flex-row sm:justify-between">
          <Link className="text-sm font-semibold text-muted hover:text-ink" href="/overview">
            Skip for now
          </Link>
          <button
            className="btn-primary w-full sm:w-auto"
            disabled={saving || selected.length === 0}
            onClick={() => void save()}
            type="button"
          >
            {saving
              ? "Saving…"
              : selected.length === 0
                ? "Select at least one"
                : `Save ${selected.length} ${selected.length === 1 ? "preference" : "preferences"}`}
          </button>
        </div>
      </div>
    </main>
  );
}
