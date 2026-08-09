"use client";

import { useCallback, useEffect, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { MemberForm, type MemberInput } from "@/components/MemberForm";
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
    if (!window.confirm(`Delete ${member.name}?`)) return;

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

  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Members</h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage library memberships and contact details.
          </p>
        </div>
        <button
          className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
          onClick={() => {
            setEditingMember(null);
            setFormOpen(true);
          }}
          type="button"
        >
          Add member
        </button>
      </div>

      {error ? (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="px-5 py-3 font-semibold">Email</th>
                <th className="px-5 py-3 font-semibold">Phone</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Member since</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.map((member) => (
                <tr className="text-slate-700" key={member.id}>
                  <td className="px-5 py-4 font-medium text-slate-900">
                    {member.name}
                  </td>
                  <td className="px-5 py-4">{member.email}</td>
                  <td className="px-5 py-4">{member.phone || "—"}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        member.status === "active"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {member.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">{member.membershipDate}</td>
                  <td className="px-5 py-4 text-right">
                    <button
                      className="mr-3 font-medium text-indigo-600 hover:text-indigo-800"
                      onClick={() => {
                        setEditingMember(member);
                        setFormOpen(true);
                      }}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      className="font-medium text-red-600 hover:text-red-800"
                      onClick={() => void deleteMember(member)}
                      type="button"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">Loading…</p>
        ) : members.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">
            No members found.
          </p>
        ) : null}
      </div>

      {formOpen ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          role="dialog"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-5 text-xl font-bold text-slate-900">
              {editingMember ? "Edit member" : "Add member"}
            </h2>
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
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
