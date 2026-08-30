export type LandingAuroraVariant = "hero" | "section";

const HERO_BLOBS = ["a", "b", "c", "d", "e"] as const;
const SECTION_BLOBS = ["s1", "s2"] as const;

export function LandingAurora({
  variant = "hero",
}: {
  variant?: LandingAuroraVariant;
} = {}) {
  const blobs = variant === "section" ? SECTION_BLOBS : HERO_BLOBS;
  const rootClass =
    variant === "section" ? "landing-aurora landing-aurora-section" : "landing-aurora";

  return (
    <div aria-hidden="true" className={rootClass}>
      {blobs.map((id) => (
        <div className={`landing-aurora-blob-${id}`} key={id} />
      ))}
    </div>
  );
}
