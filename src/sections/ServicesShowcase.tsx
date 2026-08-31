import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const services = [
  {
    id: 1,
    title: "Voice AI",
    description:
      "Intelligent phone agents that handle inbound calls, qualify leads, and book appointments — 24/7, without a receptionist.",
    image: "/carousel-voice.jpg",
  },
  {
    id: 2,
    title: "Cold Outreach",
    description:
      "Multi-agent infrastructure that researches prospects, writes personalized emails, and manages follow-up cadences automatically.",
    image: "/carousel-outreach.jpg",
  },
  {
    id: 3,
    title: "CRM Auto",
    description:
      "Connected workflows that sync your calls, emails, and calendar — eliminating manual admin so your team does real work.",
    image: "/carousel-crm.jpg",
  },
  {
    id: 4,
    title: "Reviews",
    description:
      "Automated systems that capture customer feedback and distribute positive reviews across Google, Yelp, and industry platforms.",
    image: "/carousel-reviews.jpg",
  },
  {
    id: 5,
    title: "Local SEO",
    description:
      "Data-driven optimization that puts your business at the top of local search results when customers need you most.",
    image: "/carousel-seo.jpg",
  },
  {
    id: 6,
    title: "AI Agents",
    description:
      "Custom-trained chatbots and virtual assistants that handle customer inquiries, scheduling, and support across all channels.",
    image: "/carousel-assistants.jpg",
  },
];

export default function ServicesShowcase() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".services-label",
        { opacity: 0, x: -30 },
        {
          opacity: 1,
          x: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 80%",
            toggleActions: "play none none none",
          },
        }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  const next = () => setActiveIndex((prev) => (prev + 1) % services.length);
  const prev = () =>
    setActiveIndex((prev) => (prev - 1 + services.length) % services.length);

  return (
    <section
      id="services"
      ref={sectionRef}
      className="relative bg-[#0A0A0A] py-24 md:py-32 overflow-hidden"
    >
      <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
        <span className="services-label font-mono text-[12px] text-[#C8A45C] uppercase tracking-[0.1em] opacity-0">
          What We Build
        </span>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Service Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {services.map((service, index) => (
              <button
                key={service.id}
                onClick={() => setActiveIndex(index)}
                className={`group relative aspect-[3/4] overflow-hidden transition-all duration-500 ${
                  index === activeIndex
                    ? "ring-2 ring-[#C8A45C] scale-[1.02]"
                    : "opacity-60 hover:opacity-80"
                }`}
              >
                <img
                  src={service.image}
                  alt={service.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-white font-bold text-[16px] md:text-[20px]">
                    {service.title}
                  </h3>
                </div>
              </button>
            ))}
          </div>

          {/* Active Service Info */}
          <div className="flex flex-col justify-center">
            <h2 className="text-white text-[clamp(1.5rem,3vw,2.5rem)] font-bold leading-tight">
              {services[activeIndex].title}
            </h2>
            <p className="text-[#8A8A8A] text-[16px] md:text-[18px] leading-relaxed mt-4 max-w-[400px]">
              {services[activeIndex].description}
            </p>
            <Link
              to="/services"
              className="inline-flex items-center gap-2 text-[#C8A45C] font-mono text-[12px] uppercase tracking-[0.08em] mt-6 hover:text-[#D4BC7E] transition-colors"
            >
              Learn More <ArrowRight size={14} />
            </Link>

            {/* Navigation Arrows */}
            <div className="flex gap-3 mt-10">
              <button
                onClick={prev}
                className="w-12 h-12 rounded-full border border-[#3A3A3A] flex items-center justify-center text-white hover:border-[#C8A45C] transition-colors duration-300"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={next}
                className="w-12 h-12 rounded-full border border-[#3A3A3A] flex items-center justify-center text-white hover:border-[#C8A45C] transition-colors duration-300"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
