"use client";

import { LandingAi } from "@/components/landing/LandingAi";
import { LandingFooterCta } from "@/components/landing/LandingFooterCta";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingPlatform } from "@/components/landing/LandingPlatform";
import { LandingPricing } from "@/components/landing/LandingPricing";

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-canvas">
      <div className="landing-hero">
        <LandingNav />
        <LandingHero />
      </div>
      <LandingAi />
      <LandingPlatform />
      <LandingPricing />
      <LandingFooterCta />
    </main>
  );
}
