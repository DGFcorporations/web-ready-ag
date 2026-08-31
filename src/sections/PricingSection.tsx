import { useEffect, useRef } from "react";
import { Link } from "react-router";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Check, X } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const plans = [
  {
    name: "Starter",
    price: "$397",
    period: "/month",
    description: "Best for solopreneurs and small teams just getting started with AI automation.",
    popular: false,
    features: [
      { text: "AI Voice Agent (1 number)", included: true },
      { text: "100 minutes/month", included: true },
      { text: "Basic CRM integration", included: true },
      { text: "Email notifications", included: true },
      { text: "Google Calendar sync", included: true },
      { text: "Standard support", included: true },
      { text: "Cold outreach system", included: false },
      { text: "Review generation", included: false },
    ],
    cta: "Get Started",
    ctaStyle: "outline",
  },
  {
    name: "Professional",
    price: "$897",
    period: "/month",
    description: "For growing businesses ready to automate their entire customer communication pipeline.",
    popular: true,
    features: [
      { text: "AI Voice Agent (3 numbers)", included: true },
      { text: "500 minutes/month", included: true },
      { text: "Advanced CRM + Sheets", included: true },
      { text: "Cold outreach system", included: true },
      { text: "Review generation", included: true },
      { text: "Local SEO basics", included: true },
      { text: "Priority support", included: true },
      { text: "Custom workflow builder", included: false },
    ],
    cta: "Get Started",
    ctaStyle: "gold",
  },
  {
    name: "Enterprise",
    price: "$1,897",
    period: "/month",
    description: "Complete automation infrastructure for multi-location businesses and high-volume operations.",
    popular: false,
    features: [
      { text: "Unlimited AI Voice Agents", included: true },
      { text: "Unlimited minutes", included: true },
      { text: "Full CRM suite", included: true },
      { text: "Multi-location SEO", included: true },
      { text: "Custom workflow builder", included: true },
      { text: "Dedicated account manager", included: true },
      { text: "24/7 priority support", included: true },
      { text: "API access", included: true },
    ],
    cta: "Contact Us",
    ctaStyle: "outline",
  },
];

export default function PricingSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".pricing-card",
        { opacity: 0, y: 60 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out",
          stagger: 0.15,
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
    <section id="pricing" ref={sectionRef} className="bg-[#0A0A0A] py-24 md:py-32">
      <div className="max-w-[1100px] mx-auto px-6 lg:px-10">
        <div className="text-center mb-16">
          <span className="font-mono text-[12px] text-[#C8A45C] uppercase tracking-[0.1em]">
            Transparent Pricing
          </span>
          <h2
            className="text-white font-black mt-4"
            style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)", lineHeight: 0.9 }}
          >
            Flat Rates. No Surprises.
          </h2>
          <p className="text-[#8A8A8A] text-[16px] md:text-[18px] leading-relaxed mt-4 max-w-[600px] mx-auto">
            Choose the plan that fits your business. Every plan includes full
            setup, training, and 30 days of support.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`pricing-card bg-[#1A1A1A] p-10 md:p-12 border ${
                plan.popular
                  ? "border-[#C8A45C]"
                  : "border-[#2A2A2A]"
              } opacity-0`}
              style={
                plan.popular
                  ? { boxShadow: "0 0 40px rgba(200,164,92,0.1)" }
                  : {}
              }
            >
              {plan.popular && (
                <span className="inline-block font-mono text-[10px] text-[#0A0A0A] bg-[#C8A45C] px-3 py-1 uppercase tracking-[0.08em] mb-4">
                  Most Popular
                </span>
              )}
              <h3 className="text-white text-[20px] font-bold">{plan.name}</h3>
              <div className="flex items-baseline mt-3">
                <span className="text-white text-[48px] md:text-[56px] font-black leading-none">
                  {plan.price}
                </span>
                <span className="text-[#8A8A8A] text-[16px] ml-1">
                  {plan.period}
                </span>
              </div>
              <p className="text-[#8A8A8A] text-[14px] leading-relaxed mt-4">
                {plan.description}
              </p>

              <ul className="mt-8 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature.text} className="flex items-start gap-3">
                    {feature.included ? (
                      <Check size={16} className="text-[#C8A45C] mt-0.5 shrink-0" />
                    ) : (
                      <X size={16} className="text-[#3A3A3A] mt-0.5 shrink-0" />
                    )}
                    <span
                      className={`text-[14px] ${
                        feature.included ? "text-[#8A8A8A]" : "text-[#4A4A4A]"
                      }`}
                    >
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                to="/checkout"
                className={`block text-center mt-10 text-[14px] font-semibold py-4 transition-colors duration-300 ${
                  plan.ctaStyle === "gold"
                    ? "bg-[#C8A45C] text-[#0A0A0A] hover:bg-[#D4BC7E]"
                    : "border border-[#3A3A3A] text-white hover:border-[#C8A45C] hover:text-[#C8A45C]"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
