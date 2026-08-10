"use client";

import { useCallback, useEffect, useState } from "react";

import { Alert } from "@/components/Alert";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { Modal } from "@/components/Modal";
import { StaffForm, type StaffInput } from "@/components/StaffForm";
import { StatCard } from "@/components/StatCard";
import { TableSkeleton } from "@/components/TableSkeleton";
import { apiFetch } from "@/lib/api";

type Staff = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
};

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadStaff = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setStaff(await apiFetch<Staff[]>("/staff"));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load staff",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStaff();
  }, [loadStaff]);

  async function saveStaff(values: StaffInput) {
    if (!editingStaff && !values.password) {
      throw new Error("Password is required");
    }

    await apiFetch(editingStaff ? `/staff/${editingStaff.id}` : "/staff", {
      method: editingStaff ? "PATCH" : "POST",
      body: JSON.stringify(values),
    });
    setFormOpen(false);
    setEditingStaff(null);
    await loadStaff();
  }

  async function deleteStaff(member: Staff) {
    const name = `${member.firstName} ${member.lastName}`.trim();
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;

    setError("");
    try {
      await apiFetch(`/staff/${member.id}`, { method: "DELETE" });
      await loadStaff();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete staff",
      );
    }
  }

  return (
    <AppShell
      actions={
        <button
          className="btn-primary text-sm"
          onClick={() => {
            setEditingStaff(null);
            setFormOpen(true);
          }}
          type="button"
        >
          <span aria-hidden>+</span>
          Add staff
        </button>
      }
      subtitle="Team"
      title="Staff"
    >
      <div className="mb-5 grid gap-4 sm:grid-cols-2">
        <StatCard hint="Library administrators" label="Total staff" value={staff.length} />
      </div>

      {error ? <Alert message={error} onDismiss={() => setError("")} /> : null}

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="text-base font-bold text-ink">Staff directory</h2>
        </div>

        {loading ? (
          <TableSkeleton cols={4} rows={5} />
        ) : staff.length === 0 ? (
          <EmptyState
            actionLabel="Add staff"
            description="Invite a teammate who can manage this library."
            onAction={() => {
              setEditingStaff(null);
              setFormOpen(true);
            }}
            title="No staff yet"
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Joined</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((member) => {
                  const name = `${member.firstName} ${member.lastName}`.trim();
                  return (
                    <tr key={member.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent">
                            {name.slice(0, 1).toUpperCase()}
                          </span>
                          <span className="font-semibold text-ink">{name}</span>
                        </div>
                      </td>
                      <td>{member.email}</td>
                      <td>
                        {member.createdAt
                          ? new Date(member.createdAt).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            aria-label={`Edit ${name}`}
                            className="btn-icon"
                            onClick={() => {
                              setEditingStaff(member);
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
                            aria-label={`Delete ${name}`}
                            className="btn-icon btn-icon-danger"
                            onClick={() => void deleteStaff(member)}
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {formOpen ? (
        <Modal
          onClose={() => {
            setFormOpen(false);
            setEditingStaff(null);
          }}
          title={editingStaff ? "Edit staff" : "Add staff"}
        >
          <StaffForm
            initialValues={
              editingStaff
                ? {
                    firstName: editingStaff.firstName,
                    lastName: editingStaff.lastName,
                    email: editingStaff.email,
                  }
                : undefined
            }
            onCancel={() => {
              setFormOpen(false);
              setEditingStaff(null);
            }}
            onSubmit={saveStaff}
          />
        </Modal>
      ) : null}
    </AppShell>
  );
}
