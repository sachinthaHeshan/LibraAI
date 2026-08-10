import Link from "next/link";

export function LandingHero() {
  return (
    <section className="relative">
      <div className="mx-auto flex min-h-[calc(100svh-5.5rem)] max-w-6xl flex-col justify-center px-5 pb-20 pt-6 sm:px-8 sm:pb-28 sm:pt-10">
        <p className="landing-animate text-2xl font-extrabold tracking-tight text-accent sm:text-3xl">
          LibraAI
        </p>
        <h1 className="landing-animate landing-animate-delay-1 mt-4 max-w-3xl text-4xl font-extrabold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-6xl">
          AI that runs your library desk.
        </h1>
        <p className="landing-animate landing-animate-delay-2 mt-5 max-w-xl text-base leading-relaxed text-[#4b5563] sm:text-lg">
          Catalogue books, manage members, and issue loans from the dashboard — or ask the AI
          assistant to do it.
        </p>
        <div className="landing-animate landing-animate-delay-3 mt-8 flex flex-wrap items-center gap-3">
          <Link className="btn-primary px-5" href="/signup">
            Start with a plan
          </Link>
          <a className="btn-ghost px-5" href="#pricing">
            See pricing
          </a>
        </div>
      </div>
    </section>
  );
}
