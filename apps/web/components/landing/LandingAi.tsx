const PROMPTS = [
  "Add Atomic Habits by James Clear to the catalogue",
  "Register a new member named Nimal Perera",
  "Issue Clean Code to member #42 for 14 days",
] as const;

export function LandingAi() {
  return (
    <section className="border-t border-line bg-white" id="ai">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <h2 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Do everything with AI
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#4b5563] sm:text-lg">
          Type what you need at the desk. LibraAI turns natural language into catalogue, member,
          and loan actions.
        </p>

        <ul className="mt-10 flex flex-col gap-3">
          {PROMPTS.map((prompt, index) => {
            const delayClass =
              index === 0
                ? "landing-animate-delay-1"
                : index === 1
                  ? "landing-animate-delay-2"
                  : "landing-animate-delay-3";

            return (
              <li
                className={`landing-animate ${delayClass} inline-flex w-fit max-w-full rounded-2xl border border-line bg-canvas px-4 py-3 text-sm font-medium text-ink sm:text-base`}
                key={prompt}
              >
                <span className="mr-2 shrink-0 text-accent">“</span>
                <span>{prompt}</span>
                <span className="ml-2 shrink-0 text-accent">”</span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
