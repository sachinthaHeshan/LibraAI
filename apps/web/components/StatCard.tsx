type StatCardProps = {
  label: string;
  value: number | string;
  hint?: string;
};

export function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div className="card px-5 py-5">
      <p className="text-3xl font-bold tracking-tight text-ink">{value}</p>
      <p className="mt-2 text-sm font-semibold text-ink">{label}</p>
      {hint ? <p className="mt-1 text-xs font-medium text-muted">{hint}</p> : null}
    </div>
  );
}
