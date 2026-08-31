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

export default function Home() {
  return (
    <div className="bg-[#0A0A0A]">
      <Navigation />
      <Hero />
      <TrustedBy />
      <ServicesShowcase />
      <Process />
      <Capabilities />
      <Results />
      <PricingSection />
      <Values />
      <CTASection />
      <Footer />
    </div>
  );
}
