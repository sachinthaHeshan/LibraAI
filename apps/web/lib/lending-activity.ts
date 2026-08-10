export type LoanIssuedAt = { issuedAt: string };

export type LendingActivitySeries = {
  points: number[];
  labels: string[];
};

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function monthKey(year: number, monthIndex: number): string {
  return `${year}-${monthIndex}`;
}

export function lendingActivitySeries(
  loans: LoanIssuedAt[],
  now: Date = new Date(),
): LendingActivitySeries {
  const endYear = now.getFullYear();
  const endMonth = now.getMonth(); // 0-11

  const keys: string[] = [];
  const labels: string[] = [];
  const counts = new Map<string, number>();

  for (let i = 0; i < 12; i += 1) {
    const offset = 11 - i;
    const date = new Date(endYear, endMonth - offset, 1);
    const key = monthKey(date.getFullYear(), date.getMonth());
    keys.push(key);
    labels.push(MONTH_LABELS[date.getMonth()]!);
    counts.set(key, 0);
  }

  for (const loan of loans) {
    const issued = new Date(loan.issuedAt);
    if (Number.isNaN(issued.getTime())) {
      continue;
    }
    const key = monthKey(issued.getFullYear(), issued.getMonth());
    if (!counts.has(key)) {
      continue;
    }
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return {
    points: keys.map((key) => counts.get(key) ?? 0),
    labels,
  };
}
