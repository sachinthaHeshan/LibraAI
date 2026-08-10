export type PlanId = "starter" | "pro" | "enterprise";

export type Plan = {
  id: PlanId;
  name: string;
  priceLkr: number;
  features: string[];
  highlighted?: boolean;
};

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    priceLkr: 3000,
    features: [
      "1 library organization",
      "Up to 2 staff",
      "Books, members, and loans",
      "AI assistant",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceLkr: 6000,
    highlighted: true,
    features: [
      "Up to 10 staff",
      "Larger catalogue capacity",
      "Priority AI usage",
      "Books, members, and loans",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    priceLkr: 9000,
    features: [
      "Unlimited staff",
      "Dedicated support",
      "Full AI access",
      "Books, members, and loans",
    ],
  },
];

export function parsePlanId(value: string | null | undefined): PlanId {
  if (value === "starter" || value === "pro" || value === "enterprise") return value;
  return "pro";
}

export function formatLkr(amount: number): string {
  return `LKR ${amount.toLocaleString("en-LK")}`;
}
