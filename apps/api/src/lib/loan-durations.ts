/** Loan lengths members can pick, in chat or on the My loans page. */
export const LOAN_DURATION_DAYS = {
  "1 week": 7,
  "2 weeks": 14,
  "1 month": 30,
} as const;
export type LoanDuration = keyof typeof LOAN_DURATION_DAYS;
export const LOAN_DURATIONS = Object.keys(LOAN_DURATION_DAYS) as [LoanDuration, ...LoanDuration[]];

export function dueDateFor(duration: LoanDuration, from = new Date()): string {
  const due = new Date(from);
  due.setUTCDate(due.getUTCDate() + LOAN_DURATION_DAYS[duration]);
  return due.toISOString().slice(0, 10);
}
