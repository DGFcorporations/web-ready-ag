import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function TrustedBy() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        sectionRef.current,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  const logos = [
    "Coastal Plumbing",
    "Bright Smile Dental",
    "Whitfield Law",
    "Orlando HVAC",
    "Park Electrical",
    "Sunrise Roofing",
  ];

  return (
    <section ref={sectionRef} className="bg-[#F1F0EA] py-12 opacity-0">
      <div className="max-w-[900px] mx-auto px-6">
        <p className="font-mono text-[12px] text-[#4C4841] uppercase tracking-[0.08em] text-center mb-8">
          Trusted by Florida service businesses
        </p>
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
          {logos.map((logo) => (
            <span
              key={logo}
              className="text-[#4C4841]/40 text-[14px] md:text-[16px] font-semibold tracking-wide uppercase whitespace-nowrap"
            >
              {logo}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
