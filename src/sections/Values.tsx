import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Shield, Clock, CheckCircle, Users } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const values = [
  {
    icon: Shield,
    title: "Unwavering Dedication",
    description:
      "Full effort on every deliverable. No half-measures, no generic templates dressed up as strategy.",
  },
  {
    icon: Clock,
    title: "Time Is Sacred",
    description:
      "Everything we build exists to give time back. No fluff, no bloated decks. That's the product.",
  },
  {
    icon: CheckCircle,
    title: "No-Nonsense Honesty",
    description:
      "If it won't work, we say so. If it's not a fit, we say so. Values over profit — always.",
  },
  {
    icon: Users,
    title: "Collective Identity",
    description:
      "A group of like-minded people united by mission. Not a top-down hierarchy. Not an ego.",
  },
];

export default function Values() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".value-card",
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: "power3.out",
          stagger: 0.1,
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
    <section id="values" ref={sectionRef} className="bg-[#234524] py-24 md:py-32">
      <div className="max-w-[1000px] mx-auto px-6 lg:px-10">
        <span className="font-mono text-[12px] text-[#C8A45C] uppercase tracking-[0.1em]">
          Our Values
        </span>
        <h2
          className="text-white font-black mt-4"
          style={{ fontSize: "clamp(2rem, 5vw, 4rem)", lineHeight: 0.9 }}
        >
          Built Different. Built to Last.
        </h2>
        <p className="text-white/70 text-[18px] md:text-[20px] leading-relaxed mt-4 max-w-[600px]">
          Four principles that guide every decision we make and every system we
          build.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
          {values.map((val) => {
            const Icon = val.icon;
            return (
              <div
                key={val.title}
                className="value-card bg-white/[0.06] border border-white/10 p-10 hover:bg-white/10 hover:border-white/20 hover:-translate-y-1 transition-all duration-300 opacity-0"
              >
                <Icon size={48} className="text-[#C8A45C] mb-4" />
                <h3 className="text-white text-[20px] font-semibold mb-2">
                  {val.title}
                </h3>
                <p className="text-white/70 text-[15px] leading-relaxed">
                  {val.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
