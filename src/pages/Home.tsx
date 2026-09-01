import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import Hero from "@/sections/Hero";
import TrustedBy from "@/sections/TrustedBy";
import ServicesShowcase from "@/sections/ServicesShowcase";
import Process from "@/sections/Process";
import Capabilities from "@/sections/Capabilities";
import Results from "@/sections/Results";
import PricingSection from "@/sections/PricingSection";
import Values from "@/sections/Values";
import CTASection from "@/sections/CTASection";
import AEOFAQSection from "@/sections/AEOFAQSection";
import SEO from "@/components/SEO";

export default function Home() {
  return (
    <div className="bg-[#0A0A0A]">
      <SEO 
        title="WEB-READY/AG | AI Automation for Florida Service Businesses"
        description="WEB-READY/AG optimizes your website for the AI era. We build Agent-Grade structured data and Answer Engine visibility for Florida service businesses."
        canonical="https://web-ready.ag/"
      />
      <Navigation />
      <Hero />
      <TrustedBy />
      <ServicesShowcase />
      <Process />
      <Capabilities />
      <Results />
      <PricingSection />
      <AEOFAQSection />
      <Values />
      <CTASection />
      <Footer />
    </div>
  );
}
