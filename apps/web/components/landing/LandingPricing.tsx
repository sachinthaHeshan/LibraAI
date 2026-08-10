import Link from "next/link";

import { PLANS, formatLkr } from "@/lib/plans";

export function LandingPricing() {
  return (
    <section className="border-t border-line bg-white" id="pricing">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <h2 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Simple LKR pricing
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#4b5563] sm:text-lg">
          Pick a plan when you create your library. No payment collection — just the right size
          for your desk.
        </p>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              className={`flex flex-col rounded-2xl border p-6 sm:p-7 transition-[transform,box-shadow] duration-200 ${
                plan.highlighted
                  ? "landing-animate border-accent bg-white shadow-[0_16px_48px_rgba(47,107,255,0.14)] sm:scale-[1.02]"
                  : "border-line bg-canvas/80 hover:border-[#d5dbe6]"
              }`}
              key={plan.id}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-bold text-ink">{plan.name}</h3>
                {plan.highlighted ? (
                  <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-white">
                    Popular
                  </span>
                ) : null}
              </div>
              <p className="mt-4 text-3xl font-extrabold tracking-tight text-ink">
                {formatLkr(plan.priceLkr)}
                <span className="ml-1 text-base font-semibold text-[#6b7280]">/mo</span>
              </p>
              <ul className="mt-6 flex flex-1 flex-col gap-2.5">
                {plan.features.map((feature) => (
                  <li className="text-sm leading-relaxed text-[#4b5563]" key={feature}>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                className={`mt-8 w-full text-center ${
                  plan.highlighted ? "btn-primary" : "btn-ghost"
                }`}
                href={`/signup?plan=${plan.id}`}
              >
                Choose {plan.name}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
