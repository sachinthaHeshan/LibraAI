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
      <label className="block text-sm font-semibold text-ink">
        Name
        <input
          autoFocus
          className="field field-box mt-1.5"
          onChange={(event) => setName(event.target.value)}
          required
          value={name}
        />
      </label>
      <label className="block text-sm font-semibold text-ink">
        Email
        <input
          className="field field-box mt-1.5"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </label>
      <label className="block text-sm font-semibold text-ink">
        Phone
        <input
          className="field field-box mt-1.5"
          onChange={(event) => setPhone(event.target.value)}
          type="tel"
          value={phone}
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-ink">
          Membership date
          <input
            className="field field-box mt-1.5"
            onChange={(event) => setMembershipDate(event.target.value)}
            required
            type="date"
            value={membershipDate}
          />
        </label>
        <label className="block text-sm font-semibold text-ink">
          Status
          <select
            className="field field-box field-select mt-1.5"
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
        <p className="rounded-2xl bg-[#ffecea] px-3 py-2 text-sm font-medium text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end gap-3 pt-2">
        <button className="btn-ghost text-sm" onClick={onCancel} type="button">
          Cancel
        </button>
        <button className="btn-primary text-sm" disabled={submitting} type="submit">
          {submitting ? "Saving…" : "Save member"}
        </button>
      </div>
    </form>
  );
}
