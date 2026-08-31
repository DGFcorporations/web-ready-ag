import { useEffect, useRef } from "react";
import { Link } from "react-router";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Phone } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

export default function CTASection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".cta-content",
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 75%",
            toggleActions: "play none none none",
          },
        }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section id="cta" ref={sectionRef} className="bg-[#0A0A0A] py-24 md:py-32">
      <div className="cta-content max-w-[600px] mx-auto px-6 text-center opacity-0">
        <h2
          className="text-white font-black"
          style={{ fontSize: "clamp(2rem, 5vw, 4rem)", lineHeight: 0.9 }}
        >
          Ready to Get Your Time Back?
        </h2>
        <p className="text-[#8A8A8A] text-[16px] md:text-[18px] leading-relaxed mt-6">
          Book a free 15-minute strategy call. We'll assess your business,
          identify automation opportunities, and recommend a deployment plan.
        </p>
        <Link
          to="/login"
          className="inline-block mt-8 bg-[#C8A45C] text-[#0A0A0A] text-[16px] font-semibold px-10 py-5 hover:bg-[#D4BC7E] transition-colors duration-300"
        >
          Book Free Strategy Call
        </Link>
        <div className="mt-4 flex items-center justify-center gap-2 text-[#8A8A8A] text-[14px]">
          <Phone size={14} />
          <span>Or call us at (904) 555-0147</span>
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-6">
          {["No commitment required", "15-minute call", "Florida-based team"].map(
            (item) => (
              <span
                key={item}
                className="font-mono text-[11px] text-[#8A8A8A] uppercase tracking-[0.06em]"
              >
                {item}
              </span>
            )
          )}
        </div>
      </div>
    </section>
  );
}
