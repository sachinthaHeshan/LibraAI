"use client";

import { useEffect, useState } from "react";

import { Alert } from "@/components/Alert";
import { AppShell } from "@/components/AppShell";
import { PreferenceTagPicker } from "@/components/PreferenceTagPicker";
import { getTokenRole } from "@/lib/auth";
import { type CurrentUser, getCurrentUser, userDisplayName } from "@/lib/current-user";
import {
  type PreferenceCategory,
  fetchPreferences,
  sameTags,
  savePreferences,
  tagLabel,
  toggleTag,
} from "@/lib/preferences";
import { useAccountRole } from "@/lib/use-account-role";

function ReadingPreferences() {
  const [categories, setCategories] = useState<PreferenceCategory[] | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (getTokenRole() !== "member") return;
    let active = true;
    fetchPreferences()
      .then((preferences) => {
        if (!active) return;
        setCategories(preferences.categories);
        setSaved(preferences.selected);
        setSelected(preferences.selected);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setCategories([]);
        setError(loadError instanceof Error ? loadError.message : "Unable to load preferences");
      });
    return () => {
      active = false;
    };
  }, []);

  const changed = !sameTags(selected, saved);

  function toggle(tag: string) {
    setNotice("");
    setSelected((current) => toggleTag(current, tag));
  }

  async function save() {
    setError("");
    setNotice("");
    setSaving(true);
    try {
      const next = await savePreferences(selected);
      setSaved(next);
      setSelected(next);
      setNotice("Preferences saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save preferences");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card px-5 py-5 sm:px-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-ink">Reading preferences</h2>
          <p className="mt-1 text-sm text-muted">
            LibraAI uses these tags to suggest books for you.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {changed ? (
            <button
              className="btn-ghost text-sm"
              disabled={saving}
              onClick={() => {
                setSelected(saved);
                setNotice("");
              }}
              type="button"
            >
              Discard
            </button>
          ) : null}
          <button
            className="btn-primary text-sm"
            disabled={saving || !changed}
            onClick={() => void save()}
            type="button"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      {error ? <Alert message={error} onDismiss={() => setError("")} /> : null}
      {notice ? (
        <div
          className="mb-4 rounded-xl border border-[#bbf7d0] bg-success-soft px-4 py-3 text-sm font-medium text-[#15803d]"
          role="status"
        >
          {notice}
        </div>
      ) : null}

      {categories === null ? (
        <div className="space-y-4">
          <div className="skeleton h-10 rounded-xl" />
          <div className="skeleton h-24 rounded-xl" />
          <div className="skeleton h-24 rounded-xl" />
        </div>
      ) : (
        <>
          <div className="mb-6 rounded-xl border border-line bg-[#f8fafc] px-4 py-4">
            <h3 className="mb-3 text-sm font-semibold text-ink">
              Your tags{" "}
              <span className="font-medium text-muted">({selected.length})</span>
            </h3>
            {selected.length === 0 ? (
              <p className="text-sm text-muted">No tags yet. Add some from the list below.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {selected.map((tag) => {
                  const label = tagLabel(categories, tag);
                  return (
                    <li
                      className="inline-flex items-center gap-1 rounded-full border border-accent bg-accent-soft py-1 pl-3.5 pr-1.5 text-sm font-semibold text-accent"
                      key={tag}
                    >
                      {label}
                      <button
                        aria-label={`Remove ${label}`}
                        className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-white"
                        onClick={() => toggle(tag)}
                        type="button"
                      >
                        <svg aria-hidden className="h-3 w-3" fill="none" viewBox="0 0 24 24">
                          <path
                            d="M6 6l12 12M18 6 6 18"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeWidth="2.4"
                          />
                        </svg>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <h3 className="mb-4 text-sm font-semibold text-ink">Add or remove tags</h3>
          <PreferenceTagPicker categories={categories} onToggle={toggle} selected={selected} />
        </>
      )}
    </section>
  );
}

export default function SettingsPage() {
  const isMember = useAccountRole() === "member";
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

  return (
    <AppShell title="Settings">
      <div className="space-y-5 pb-28 lg:pb-8">
        <section className="card px-5 py-5 sm:px-6">
          <h2 className="mb-4 text-base font-bold text-ink">Account</h2>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-muted">Name</dt>
              <dd className="mt-1 font-semibold text-ink">{user ? userDisplayName(user) : "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted">Email</dt>
              <dd className="mt-1 break-all font-semibold text-ink">{user?.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted">Library</dt>
              <dd className="mt-1 font-semibold text-ink">{user?.organization.name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted">Account type</dt>
              <dd className="mt-1 font-semibold text-ink">
                {isMember ? "Library member" : "Library owner"}
              </dd>
            </div>
          </dl>
        </section>

        {isMember ? <ReadingPreferences /> : null}
      </div>
    </AppShell>
  );
}
