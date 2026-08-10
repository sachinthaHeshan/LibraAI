const FEATURES = [
  {
    title: "Books",
    body: "Add, search, and update titles from the catalogue screen — or ask AI to do the filing.",
  },
  {
    title: "Members",
    body: "Onboard readers, keep contact details current, and look anyone up in seconds.",
  },
  {
    title: "Loans",
    body: "Issue and return copies with clear due dates, without leaving the desk workflow.",
  },
] as const;

export function LandingPlatform() {
  return (
    <section className="border-t border-line bg-canvas" id="features">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <h2 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Your library platform
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#4b5563] sm:text-lg">
          One workspace for the work that happens at the desk — dashboard tools and AI, side by
          side.
        </p>

        <div className="mt-12 grid gap-10 sm:grid-cols-3 sm:gap-8">
          {FEATURES.map((feature) => (
            <div key={feature.title}>
              <div className="mb-4 h-1 w-10 rounded-full bg-accent" />
              <h3 className="text-xl font-bold tracking-tight text-ink">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#4b5563] sm:text-base">
                {feature.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
