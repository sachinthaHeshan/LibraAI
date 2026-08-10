import Link from "next/link";

export function LandingFooterCta() {
  return (
    <section className="border-t border-line bg-canvas">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-5 py-16 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-20">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Ready to run your library with AI?
          </h2>
          <p className="mt-3 max-w-xl text-base text-[#4b5563]">
            Create your library, invite staff, and start cataloguing in minutes.
          </p>
        </div>
        <Link className="btn-primary shrink-0 px-6" href="/signup">
          Create your library
        </Link>
      </div>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 text-sm text-[#6b7280] sm:px-8">
          <span className="font-semibold text-ink">LibraAI</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </footer>
    </section>
  );
}
