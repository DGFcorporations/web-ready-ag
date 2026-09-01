import { useEffect, useRef } from "react";
import { Link } from "react-router";
import gsap from "gsap";
// import { ChevronDown } from "lucide-react";

export default function Hero() {
  const heroRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.3 });

      tl.fromTo(
        labelRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }
      )
        .fromTo(
          headlineRef.current,
          { opacity: 0, y: 60 },
          { opacity: 1, y: 0, duration: 1, ease: "power3.out" },
          "-=0.4"
        )
        .fromTo(
          bodyRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" },
          "-=0.5"
        )
        .fromTo(
          ctaRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.6, ease: "power3.out" },
          "-=0.3"
        )
        .fromTo(
          statsRef.current?.children ?? [],
          { opacity: 0, y: 40 },
          { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.1 },
          "-=0.3"
        );
    }, heroRef);

    return () => ctx.revert();
  }, []);

  const stats = [
    { value: "24/7", label: "AI Voice Coverage" },
    { value: "FL", label: "Service Businesses" },
    { value: "< 1 Week", label: "Average Deploy" },
    { value: "V", label: "Veteran-Owned" },
  ];

  return (
    <section
      ref={heroRef}
      className="relative w-full min-h-[100dvh] flex items-end overflow-hidden"
    >
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src="/hero-bg.jpg"
          alt=""
          className="w-full h-full object-cover opacity-60"
        />
        {/* Grid Overlay */}
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        {/* Bottom Gradient */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[40%]"
          style={{
            background: "linear-gradient(to top, #0A0A0A 0%, transparent 100%)",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-[1280px] mx-auto px-6 lg:px-10 pb-32 md:pb-36">
        <div ref={labelRef} className="opacity-0">
          <span className="font-mono text-[12px] text-[#C8A45C] uppercase tracking-[0.1em]">
            Veteran-Owned AI Automation
          </span>
        </div>

        <h1
          ref={headlineRef}
          className="display-heading text-white uppercase mt-4 max-w-[900px] opacity-0"
          style={{ fontSize: "clamp(3rem, 8vw, 7rem)" }}
        >
          AI That Gives You Your Time Back.
        </h1>

        <p
          ref={bodyRef}
          className="text-[#8A8A8A] text-[18px] leading-relaxed mt-6 max-w-[520px] opacity-0"
        >
          WEB-READY/AG optimizes your website for the AI era. We build Agent-Grade structured data and Answer Engine visibility for
          Florida service businesses. No fluff. No bloated proposals. We build
          things that actually work.
        </p>

        <div ref={ctaRef} className="flex flex-wrap gap-4 mt-8 opacity-0">
          <Link
            to="/login"
            className="bg-[#C8A45C] text-[#0A0A0A] text-[14px] font-semibold px-8 py-4 hover:bg-[#D4BC7E] transition-colors duration-300"
          >
            Book Free Strategy Call
          </Link>
          <Link
            to="/services"
            className="border border-[#3A3A3A] text-white text-[14px] font-semibold px-8 py-4 hover:border-[#C8A45C] hover:text-[#C8A45C] transition-all duration-300"
          >
            Explore Services
          </Link>
        </div>
      </div>

      {/* Stats Bar */}
      <div
        ref={statsRef}
        className="absolute bottom-0 left-0 right-0 z-10 border-t border-[#2A2A2A] bg-[#0A0A0A]/80 backdrop-blur-sm"
      >
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 grid grid-cols-2 md:grid-cols-4">
          {stats.map((stat, i) => (
            <div
              key={i}
              className="py-5 px-4 flex flex-col items-center border-r border-[#2A2A2A] last:border-r-0 opacity-0"
            >
              <span className="text-white text-[36px] md:text-[48px] font-black leading-none">
                {stat.value}
              </span>
              <span className="font-mono text-[11px] text-[#8A8A8A] uppercase mt-1">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-28 md:bottom-32 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
        <div className="w-[1px] h-[40px] bg-[#8A8A8A] relative overflow-hidden">
          <div className="absolute w-full h-3 bg-[#C8A45C] animate-bounce" />
        </div>
        <span className="font-mono text-[10px] text-[#8A8A8A] uppercase tracking-[0.1em]">
          Scroll
        </span>
      </div>
    </section>
  );
}
