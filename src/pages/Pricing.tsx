import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { trpc } from "@/providers/trpc";
import { Link } from "react-router";
import { Check, X } from "lucide-react";

export default function Pricing() {
  const { data: plans } = trpc.pricing.list.useQuery();

  return (
    <div className="bg-[#0A0A0A] min-h-screen">
      <Navigation />
      <section className="pt-32 pb-16 px-6 lg:px-10">
        <div className="max-w-[1100px] mx-auto text-center">
          <span className="font-mono text-[12px] text-[#C8A45C] uppercase tracking-[0.1em]">
            Transparent Pricing
          </span>
          <h1
            className="text-white font-black mt-4"
            style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)", lineHeight: 0.9 }}
          >
            Flat Rates. No Surprises.
          </h1>
          <p className="text-[#8A8A8A] text-[18px] leading-relaxed mt-6 max-w-[600px] mx-auto">
            Choose the plan that fits your business. Every plan includes full
            setup, training, and 30 days of support. Deploy in under a week.
          </p>
        </div>
      </section>

      <section className="pb-24 px-6 lg:px-10">
        <div className="max-w-[1100px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans?.map((plan) => (
            <div
              key={plan.id}
              className={`bg-[#1A1A1A] p-10 md:p-12 border ${
                plan.isPopular ? "border-[#C8A45C]" : "border-[#2A2A2A]"
              }`}
              style={plan.isPopular ? { boxShadow: "0 0 40px rgba(200,164,92,0.1)" } : {}}
            >
              {plan.isPopular && (
                <span className="inline-block font-mono text-[10px] text-[#0A0A0A] bg-[#C8A45C] px-3 py-1 uppercase tracking-[0.08em] mb-4">
                  Most Popular
                </span>
              )}
              <h3 className="text-white text-[20px] font-bold">{plan.name}</h3>
              <div className="flex items-baseline mt-3">
                <span className="text-white text-[48px] md:text-[56px] font-black leading-none">
                  ${Number(plan.price).toLocaleString()}
                </span>
                <span className="text-[#8A8A8A] text-[16px] ml-1">/month</span>
              </div>
              {plan.yearlyPrice && (
                <p className="text-[#8A8A8A] text-[13px] mt-1">
                  or ${Number(plan.yearlyPrice).toLocaleString()}/year (save 2 months)
                </p>
              )}
              <p className="text-[#8A8A8A] text-[14px] leading-relaxed mt-4">
                {plan.description}
              </p>

              <ul className="mt-8 space-y-3">
                {plan.features?.map((feature) => (
                  <li key={feature.id} className="flex items-start gap-3">
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
                      {feature.feature}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                to={`/checkout?plan=${plan.slug}`}
                className={`block text-center mt-10 text-[14px] font-semibold py-4 transition-colors duration-300 ${
                  plan.isPopular
                    ? "bg-[#C8A45C] text-[#0A0A0A] hover:bg-[#D4BC7E]"
                    : "border border-[#3A3A3A] text-white hover:border-[#C8A45C] hover:text-[#C8A45C]"
                }`}
              >
                {plan.slug === "enterprise" ? "Contact Us" : "Get Started"}
              </Link>
            </div>
          ))}
        </div>

        {/* FAQ / Trust Section */}
        <div className="max-w-[800px] mx-auto mt-20">
          <h3 className="text-white text-[24px] font-bold text-center mb-10">
            What's Included in Every Plan
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              "Full system setup & configuration",
              "Staff training session (1 hour)",
              "30 days of post-launch support",
              "Dedicated deployment manager",
              "Performance monitoring dashboard",
              "Monthly optimization check-in",
              "No long-term contracts",
              "Cancel anytime with 30 days notice",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 bg-[#1A1A1A] border border-[#2A2A2A] p-4">
                <Check size={16} className="text-[#C8A45C] shrink-0" />
                <span className="text-[#8A8A8A] text-[14px]">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
