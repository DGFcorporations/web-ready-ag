import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Link } from "react-router";

gsap.registerPlugin(ScrollTrigger);

export default function Process() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const paths = svgRef.current?.querySelectorAll(
        ".process-lines circle, .process-lines line"
      );
      const labels = svgRef.current?.querySelectorAll(".process-labels text");

      if (!paths || !labels) return;

      paths.forEach((path) => {
        const length = (path as SVGGeometryElement).getTotalLength?.() || 100;
        (path as HTMLElement).style.strokeDasharray = `${length}`;
        (path as HTMLElement).style.strokeDashoffset = `${length}`;
      });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 70%",
          toggleActions: "play none none reset",
        },
      });

      tl.to(paths, {
        strokeDashoffset: 0,
        duration: 2,
        ease: "power2.out",
        stagger: 0.08,
      }).fromTo(
        labels,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power2.out", stagger: 0.1 },
        "-=1.2"
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="process"
      ref={sectionRef}
      className="bg-[#F1F0EA] py-24 md:py-32"
    >
      <div className="max-w-[900px] mx-auto px-6 lg:px-10 text-center">
        <span className="font-mono text-[12px] text-[#4C4841] uppercase tracking-[0.08em]">
          How We Work
        </span>
        <h2
          className="text-[#0A0A0A] font-bold mt-4"
          style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)", lineHeight: 1.0 }}
        >
          Precision Deployment in 30 Days
        </h2>
        <p className="text-[#4C4841] text-[18px] md:text-[20px] leading-relaxed mt-4 max-w-[600px] mx-auto">
          Every project follows a battle-tested process refined across dozens of
          deployments. Clear milestones. No surprises.
        </p>

        {/* SVG Process Diagram */}
        <div className="mt-16">
          <svg
            ref={svgRef}
            viewBox="0 0 300 120"
            className="w-full max-w-[700px] mx-auto block"
            preserveAspectRatio="xMidYMid meet"
          >
            <g className="process-lines">
              <circle cx="10" cy="60" r="3" fill="none" stroke="#0A0A0A" strokeWidth="1.5" />
              <line x1="10" y1="60" x2="30" y2="60" stroke="#0A0A0A" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="30" cy="60" r="3" fill="none" stroke="#0A0A0A" strokeWidth="1.5" />
              <line x1="30" y1="60" x2="110" y2="60" stroke="#0A0A0A" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="110" cy="60" r="3" fill="none" stroke="#0A0A0A" strokeWidth="1.5" />
              <line x1="110" y1="60" x2="190" y2="60" stroke="#0A0A0A" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="190" cy="60" r="3" fill="none" stroke="#0A0A0A" strokeWidth="1.5" />
              <line x1="190" y1="60" x2="270" y2="60" stroke="#0A0A0A" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="270" cy="60" r="3" fill="none" stroke="#0A0A0A" strokeWidth="1.5" />
            </g>
            <g className="process-labels">
              <text x="30" y="45" fontFamily="IBM Plex Mono, monospace" fontSize="9" fontWeight="500" fill="#0A0A0A" textAnchor="middle" letterSpacing="0.08em" style={{ opacity: 0 }}>
                DISCOVER
              </text>
              <text x="110" y="45" fontFamily="IBM Plex Mono, monospace" fontSize="9" fontWeight="500" fill="#0A0A0A" textAnchor="middle" letterSpacing="0.08em" style={{ opacity: 0 }}>
                BUILD
              </text>
              <text x="190" y="45" fontFamily="IBM Plex Mono, monospace" fontSize="9" fontWeight="500" fill="#0A0A0A" textAnchor="middle" letterSpacing="0.08em" style={{ opacity: 0 }}>
                DEPLOY
              </text>
              <text x="270" y="45" fontFamily="IBM Plex Mono, monospace" fontSize="9" fontWeight="500" fill="#0A0A0A" textAnchor="middle" letterSpacing="0.08em" style={{ opacity: 0 }}>
                OPTIMIZE
              </text>
            </g>
          </svg>
        </div>

        <Link
          to="/login"
          className="inline-block mt-12 bg-[#234524] text-white text-[14px] font-semibold px-8 py-4 hover:bg-[#143114] transition-colors duration-300"
        >
          Book Your Discovery Call
        </Link>
      </div>
    </section>
  );
}
