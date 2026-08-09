export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3 px-6 py-5" aria-hidden>
      {Array.from({ length: rows }).map((_, row) => (
        <div className="grid gap-3" key={row} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {Array.from({ length: cols }).map((__, col) => (
            <div className="skeleton h-4 w-full" key={col} />
          ))}
        </div>
      ))}
    </div>
  );
}
