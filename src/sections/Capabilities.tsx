import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const capabilities = [
  { name: "AI Voice Agents", desc: "24/7 call handling with natural language" },
  { name: "Email Automation", desc: "Personalized outreach at scale" },
  { name: "CRM Integration", desc: "Google Sheets, HubSpot, Salesforce" },
  { name: "Calendar Sync", desc: "Automated scheduling and booking" },
  { name: "Review Management", desc: "Google, Yelp, industry platforms" },
  { name: "Local SEO", desc: "Geographic search optimization" },
  { name: "Lead Scoring", desc: "AI-powered qualification" },
  { name: "Analytics Dashboard", desc: "Real-time performance tracking" },
  { name: "SMS Automation", desc: "Text-based follow-up sequences" },
  { name: "Workflow Builder", desc: "Visual automation designer" },
  { name: "API Integrations", desc: "Connect any third-party tool" },
  { name: "Custom Training", desc: "AI models trained on your data" },
];

export default function Capabilities() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const items = gridRef.current?.querySelectorAll(".grid-item");
      if (!items) return;

      gsap.fromTo(
        items,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: "power3.out",
          stagger: 0.04,
          scrollTrigger: {
            trigger: gridRef.current,
            start: "top 80%",
            toggleActions: "play none none none",
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="bg-[#0A0A0A] py-24 md:py-32">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
        <span className="font-mono text-[12px] text-[#C8A45C] uppercase tracking-[0.1em]">
          Capabilities
        </span>
        <h2
          className="text-white font-bold mt-4"
          style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)", lineHeight: 1.0 }}
        >
          Built for Florida Service Businesses
        </h2>
        <p className="text-[#8A8A8A] text-[16px] md:text-[18px] leading-relaxed mt-4 max-w-[600px]">
          Every tool and integration your business needs to operate at maximum
          efficiency.
        </p>

        <div
          ref={gridRef}
          className="mt-12 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4"
        >
          {capabilities.map((cap) => (
            <div
              key={cap.name}
              className="grid-item bg-[#1A1A1A] border border-[#2A2A2A] p-5 hover:bg-[#234524] hover:border-[#234524] transition-all duration-300 group cursor-default opacity-0"
            >
              <h4 className="text-white text-[15px] font-semibold mb-1.5 group-hover:translate-x-1 transition-transform duration-300">
                {cap.name}
              </h4>
              <p className="text-[#8A8A8A] text-[12px] leading-[1.5] group-hover:text-white/80 transition-colors duration-300">
                {cap.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
