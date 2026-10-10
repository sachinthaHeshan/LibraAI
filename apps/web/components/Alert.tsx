type AlertProps = {
  message: string;
  onDismiss?: () => void;
};

export function Alert({ message, onDismiss }: AlertProps) {
  return (
    <div
      className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-[#fecaca] bg-danger-soft px-4 py-3 text-sm font-medium text-danger"
      role="alert"
    >
      <p>{message}</p>
      {onDismiss ? (
        <button
          aria-label="Dismiss"
          className="rounded-lg px-2 py-0.5 hover:bg-white/60"
          onClick={onDismiss}
          type="button"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
