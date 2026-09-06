import { listPublicStores } from "@/lib/actions/stores";
import { LandingHero } from "@/components/marketing/landing-hero";
import { HowItWorksSection } from "@/components/marketing/how-it-works-section";
import { PlatformFeatures } from "@/components/marketing/platform-features";
import { PricingSection } from "@/components/marketing/pricing-section";
import { StoresSection } from "@/components/marketing/stores-section";
import { LandingFinalCta } from "@/components/marketing/landing-final-cta";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const stores = await listPublicStores();

  return (
    <>
      <LandingHero storeCount={stores.length} />
      <HowItWorksSection />
      <PlatformFeatures />
      <PricingSection />
      <StoresSection stores={stores} limit={6} showViewAll />
      <LandingFinalCta />
    </>
  );
}
