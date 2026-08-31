import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const columns = [
  {
    offset: "translateZ(-200px)",
    scale: "scale(1.2)",
    scrollY: 120,
    cards: [
      { metric: "147%", label: "Lead Increase", desc: "After deploying AI voice agents and local SEO optimization", client: "PLUMBING COMPANY, TAMPA" },
      { metric: "3.2x", label: "Faster Response", desc: "Average call answer time dropped from 8 minutes to 15 seconds", client: "DENTAL PRACTICE, MIAMI" },
      { metric: "89%", label: "Customer Satisfaction", desc: "Clients report improved experience with instant response times", client: "DENTAL PRACTICE, MIAMI" },
    ],
  },
  {
    offset: "translateZ(0px)",
    scale: "scale(1)",
    scrollY: -60,
    cards: [
      { metric: "< 1 Week", label: "Deploy Time", desc: "From contract to live system in under 7 days", client: "AVERAGE ACROSS ALL CLIENTS" },
      { metric: "$47K", label: "Annual Savings", desc: "Eliminated need for full-time receptionist and reduced admin overhead", client: "LAW FIRM, JACKSONVILLE" },
      { metric: "24/7", label: "Coverage", desc: "AI agents answer every call — no missed opportunities", client: "AVAILABLE ON ALL PLANS" },
    ],
  },
  {
    offset: "translateZ(100px)",
    scale: "scale(0.9)",
    scrollY: -180,
    cards: [
      { metric: "312%", label: "ROI", desc: "First-year return on automation investment", client: "HVAC COMPANY, ORLANDO" },
      { metric: "6", label: "Industries Served", desc: "HVAC, dental, legal, plumbing, electrical, and more", client: "FLORIDA SERVICE BUSINESSES" },
    ],
  },
];

export default function Results() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to(".column-left", {
        y: 120,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      });
      gsap.to(".column-center", {
        y: -60,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      });
      gsap.to(".column-right", {
        y: -180,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="bg-[#F1F0EA] py-24 md:py-32 overflow-hidden">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
        <div className="text-center mb-16">
          <span className="font-mono text-[12px] text-[#4C4841] uppercase tracking-[0.08em]">
            Proven Results
          </span>
          <h2
            className="text-[#0A0A0A] font-bold mt-4"
            style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)", lineHeight: 1.0 }}
          >
            Real Businesses. Real Outcomes.
          </h2>
        </div>

        <div
          className="flex gap-6"
          style={{ perspective: "1000px" }}
        >
          {columns.map((col, colIdx) => (
            <div
              key={colIdx}
              className={`flex-1 flex flex-col gap-6 ${
                colIdx === 0 ? "column-left" : colIdx === 1 ? "column-center" : "column-right"
              }`}
              style={{
                transform: `${col.offset} ${col.scale}`,
                transformStyle: "preserve-3d",
              }}
            >
              {col.cards.map((card, cardIdx) => (
                <div
                  key={cardIdx}
                  className="bg-white p-8 md:p-10"
                  style={{ boxShadow: "0 2px 20px rgba(0,0,0,0.06)" }}
                >
                  <div className="text-[#234524] text-[40px] md:text-[48px] font-black leading-none">
                    {card.metric}
                  </div>
                  <div className="text-[#0A0A0A] text-[14px] font-semibold mt-2 mb-3">
                    {card.label}
                  </div>
                  <p className="text-[#4C4841] text-[14px] leading-[1.5]">
                    {card.desc}
                  </p>
                  <div className="font-mono text-[11px] text-[#8A8A8A] uppercase tracking-[0.06em] mt-4">
                    {card.client}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
