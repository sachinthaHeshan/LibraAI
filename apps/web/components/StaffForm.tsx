"use client";

import { type FormEvent, useState } from "react";

export type StaffInput = {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
};

type StaffFormProps = {
  initialValues?: Omit<StaffInput, "password">;
  onCancel: () => void;
  onSubmit: (values: StaffInput) => Promise<void>;
};

export function StaffForm({
  initialValues,
  onCancel,
  onSubmit,
}: StaffFormProps) {
  const isEdit = Boolean(initialValues);
  const [firstName, setFirstName] = useState(initialValues?.firstName ?? "");
  const [lastName, setLastName] = useState(initialValues?.lastName ?? "");
  const [email, setEmail] = useState(initialValues?.email ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const trimmedPassword = password.trim();
      await onSubmit({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        ...(trimmedPassword ? { password: trimmedPassword } : {}),
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to save staff",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-ink">
          First name
          <input
            autoFocus
            className="field field-box mt-1.5"
            onChange={(event) => setFirstName(event.target.value)}
            required
            value={firstName}
          />
        </label>
        <label className="block text-sm font-semibold text-ink">
          Last name
          <input
            className="field field-box mt-1.5"
            onChange={(event) => setLastName(event.target.value)}
            required
            value={lastName}
          />
        </label>
      </div>
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
        Password
        <input
          className="field field-box mt-1.5"
          minLength={8}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={isEdit ? "Leave blank to keep" : undefined}
          required={!isEdit}
          type="password"
          value={password}
        />
      </label>
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
          {submitting ? "Saving…" : "Save staff"}
        </button>
      </div>
    </form>
  );
}
