import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { trpc } from "@/providers/trpc";
import { Link } from "react-router";
import { Phone, Mail, Database, Star, MapPin, Bot, ArrowRight } from "lucide-react";

const iconMap: Record<string, React.ReactNode> = {
  phone: <Phone size={24} />,
  mail: <Mail size={24} />,
  database: <Database size={24} />,
  star: <Star size={24} />,
  "map-pin": <MapPin size={24} />,
  bot: <Bot size={24} />,
  "": <Bot size={24} />,
};

function parseFeatures(features: unknown): string[] {
  if (!features) return [];
  if (typeof features === "string") {
    try { return JSON.parse(features); } catch { return []; }
  }
  if (Array.isArray(features)) return features as string[];
  return [];
}

export default function Services() {
  const { data: services } = trpc.service.list.useQuery();

  return (
    <div className="bg-[#0A0A0A] min-h-screen">
      <Navigation />
      <section className="pt-32 pb-16 px-6 lg:px-10">
        <div className="max-w-[1280px] mx-auto">
          <span className="font-mono text-[12px] text-[#C8A45C] uppercase tracking-[0.1em]">
            What We Build
          </span>
          <h1
            className="text-white font-black mt-4"
            style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)", lineHeight: 0.9 }}
          >
            AI Automation Services
          </h1>
          <p className="text-[#8A8A8A] text-[18px] leading-relaxed mt-6 max-w-[600px]">
            Pre-packaged, ready-to-deploy automation systems designed specifically
            for Florida service businesses. Choose what you need, deploy in under a week.
          </p>
        </div>
      </section>

      <section className="pb-24 px-6 lg:px-10">
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services?.map((service) => (
            <div
              key={service.id}
              className="group bg-[#1A1A1A] border border-[#2A2A2A] p-8 hover:bg-[#234524] hover:border-[#234524] transition-all duration-300"
            >
              <div className="text-[#C8A45C] mb-4">
                {iconMap[service.icon ?? "bot"]}
              </div>
              <h3 className="text-white text-[22px] font-bold mb-3">
                {service.name}
              </h3>
              <p className="text-[#8A8A8A] text-[14px] leading-relaxed mb-6 group-hover:text-white/80 transition-colors">
                {service.shortDesc}
              </p>
              {parseFeatures(service.features).length > 0 && (
                <ul className="space-y-2 mb-6">
                  {parseFeatures(service.features).map(
                    (feature: string, idx: number) => (
                      <li
                        key={idx}
                        className="text-[#8A8A8A] text-[13px] flex items-center gap-2 group-hover:text-white/80 transition-colors"
                      >
                        <span className="w-1 h-1 bg-[#C8A45C] rounded-full" />
                        {feature}
                      </li>
                    )
                  )}
                </ul>
              )}
              <Link
                to="/checkout"
                className="inline-flex items-center gap-2 text-[#C8A45C] font-mono text-[12px] uppercase tracking-[0.08em] hover:text-[#D4BC7E] transition-colors"
              >
                Get Started <ArrowRight size={14} />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-[#234524] py-16 px-6 lg:px-10">
        <div className="max-w-[800px] mx-auto text-center">
          <h2 className="text-white font-bold text-[28px] md:text-[36px]">
            Not Sure What You Need?
          </h2>
          <p className="text-white/70 text-[16px] mt-3 mb-6">
            Book a free strategy call and we'll recommend the right automation stack for your business.
          </p>
          <Link
            to="/login"
            className="inline-block bg-[#C8A45C] text-[#0A0A0A] text-[14px] font-semibold px-8 py-4 hover:bg-[#D4BC7E] transition-colors duration-300"
          >
            Book Free Strategy Call
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
