"use client";

import { type FormEvent, useState } from "react";

export type MemberInput = {
  name: string;
  email: string;
  phone?: string;
  membershipDate: string;
  status: "active" | "inactive";
};

type MemberFormProps = {
  initialValues?: MemberInput;
  onCancel: () => void;
  onSubmit: (values: MemberInput) => Promise<void>;
};

const fieldClass =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

export function MemberForm({
  initialValues,
  onCancel,
  onSubmit,
}: MemberFormProps) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [email, setEmail] = useState(initialValues?.email ?? "");
  const [phone, setPhone] = useState(initialValues?.phone ?? "");
  const [membershipDate, setMembershipDate] = useState(
    initialValues?.membershipDate ?? new Date().toISOString().slice(0, 10),
  );
  const [status, setStatus] = useState<"active" | "inactive">(
    initialValues?.status ?? "active",
  );
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await onSubmit({
        name: name.trim(),
        email: email.trim(),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        membershipDate,
        status,
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to save member",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <label className="block text-sm font-medium text-slate-700">
        Name
        <input
          autoFocus
          className={fieldClass}
          onChange={(event) => setName(event.target.value)}
          required
          value={name}
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Email
        <input
          className={fieldClass}
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Phone
        <input
          className={fieldClass}
          onChange={(event) => setPhone(event.target.value)}
          type="tel"
          value={phone}
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Membership date
          <input
            className={fieldClass}
            onChange={(event) => setMembershipDate(event.target.value)}
            required
            type="date"
            value={membershipDate}
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Status
          <select
            className={fieldClass}
            onChange={(event) =>
              setStatus(event.target.value as "active" | "inactive")
            }
            value={status}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
      </div>
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end gap-3 pt-2">
        <button
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
        <button
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
          disabled={submitting}
          type="submit"
        >
          {submitting ? "Saving…" : "Save member"}
        </button>
      </div>
    </form>
  );
}
