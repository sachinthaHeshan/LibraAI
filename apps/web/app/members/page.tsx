"use client";

import { useCallback, useEffect, useState } from "react";

import { Alert } from "@/components/Alert";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { MemberForm, type MemberInput } from "@/components/MemberForm";
import { Modal } from "@/components/Modal";
import { StatCard } from "@/components/StatCard";
import { TableSkeleton } from "@/components/TableSkeleton";
import { apiFetch } from "@/lib/api";

type Member = MemberInput & {
  id: string;
  phone?: string | null;
};

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setMembers(await apiFetch<Member[]>("/members"));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load members",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  async function saveMember(values: MemberInput) {
    await apiFetch(
      editingMember ? `/members/${editingMember.id}` : "/members",
      {
        method: editingMember ? "PATCH" : "POST",
        body: JSON.stringify(values),
      },
    );
    setFormOpen(false);
    setEditingMember(null);
    await loadMembers();
  }

  async function deleteMember(member: Member) {
    if (!window.confirm(`Delete ${member.name}? This cannot be undone.`)) return;

    setError("");
    try {
      await apiFetch(`/members/${member.id}`, { method: "DELETE" });
      await loadMembers();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete member",
      );
    }
  }

  const activeCount = members.filter((member) => member.status === "active").length;

  return (
    <AppShell
      actions={
        <button
          className="btn-primary text-sm"
          onClick={() => {
            setEditingMember(null);
            setFormOpen(true);
          }}
          type="button"
        >
          <span aria-hidden>+</span>
          Add member
        </button>
      }
      title="Members"
    >
      <div className="mb-5 grid gap-4 sm:grid-cols-2">
        <StatCard hint="All registered patrons" label="Total members" value={members.length} />
        <StatCard hint="Can borrow books" label="Active" value={activeCount} />
      </div>

      {error ? <Alert message={error} onDismiss={() => setError("")} /> : null}

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="text-base font-bold text-ink">Member directory</h2>
        </div>

        {loading ? (
          <TableSkeleton cols={5} rows={5} />
        ) : members.length === 0 ? (
          <EmptyState
            actionLabel="Add member"
            description="Create a member profile before issuing a loan."
            onAction={() => {
              setEditingMember(null);
              setFormOpen(true);
            }}
            title="No members yet"
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Member since</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent">
                          {member.name.slice(0, 1).toUpperCase()}
                        </span>
                        <span className="font-semibold text-ink">{member.name}</span>
                      </div>
                    </td>
                    <td>{member.email}</td>
                    <td>{member.phone || "—"}</td>
                    <td>
                      <span className="badge">
                        <span
                          className={`dot ${
                            member.status === "active" ? "dot-ok" : "dot-warn"
                          }`}
                        />
                        {member.status}
                      </span>
                    </td>
                    <td>{member.membershipDate}</td>
                    <td className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          aria-label={`Edit ${member.name}`}
                          className="btn-icon"
                          onClick={() => {
                            setEditingMember(member);
                            setFormOpen(true);
                          }}
                          type="button"
                        >
                          <svg aria-hidden className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <path
                              d="m5 16.5 9.8-9.8a1.5 1.5 0 0 1 2.1 0l1.4 1.4a1.5 1.5 0 0 1 0 2.1L8.5 20H5v-3.5Z"
                              stroke="currentColor"
                              strokeWidth="1.6"
                            />
                          </svg>
                        </button>
                        <button
                          aria-label={`Delete ${member.name}`}
                          className="btn-icon btn-icon-danger"
                          onClick={() => void deleteMember(member)}
                          type="button"
                        >
                          <svg aria-hidden className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <path
                              d="M5 7h14M10 11v5M14 11v5M9 7l.6-1.5A1 1 0 0 1 10.5 5h3a1 1 0 0 1 .9.5L15 7m-8 0 1 11a2 2 0 0 0 2 1.8h4a2 2 0 0 0 2-1.8l1-11"
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeWidth="1.6"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {formOpen ? (
        <Modal
          onClose={() => {
            setFormOpen(false);
            setEditingMember(null);
          }}
          title={editingMember ? "Edit member" : "Add member"}
        >
          <MemberForm
            initialValues={
              editingMember
                ? {
                    ...editingMember,
                    phone: editingMember.phone ?? undefined,
                  }
                : undefined
            }
            onCancel={() => {
              setFormOpen(false);
              setEditingMember(null);
            }}
            onSubmit={saveMember}
          />
        </Modal>
      ) : null}
    </AppShell>
  );
}
