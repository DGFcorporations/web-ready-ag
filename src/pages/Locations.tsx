import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { trpc } from "@/providers/trpc";
import { Link } from "react-router";
import { MapPin, ArrowRight } from "lucide-react";

export default function Locations() {
  const { data: geoPages } = trpc.geo.list.useQuery();

  return (
    <div className="bg-[#0A0A0A] min-h-screen">
      <Navigation />
      <section className="pt-32 pb-16 px-6 lg:px-10">
        <div className="max-w-[1280px] mx-auto">
          <span className="font-mono text-[12px] text-[#C8A45C] uppercase tracking-[0.1em]">
            Service Areas
          </span>
          <h1
            className="text-white font-black mt-4"
            style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)", lineHeight: 0.9 }}
          >
            AI Automation Across Florida
          </h1>
          <p className="text-[#8A8A8A] text-[18px] leading-relaxed mt-6 max-w-[600px]">
            We serve small businesses across Florida with local expertise and
            personalized automation solutions. Find your city to learn more.
          </p>
        </div>
      </section>

      <section className="pb-24 px-6 lg:px-10">
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {geoPages?.map((page) => (
            <Link
              key={page.id}
              to={`/locations/${page.slug}`}
              className="group bg-[#1A1A1A] border border-[#2A2A2A] p-8 hover:bg-[#234524] hover:border-[#234524] transition-all duration-300"
            >
              <MapPin
                size={24}
                className="text-[#C8A45C] mb-4 group-hover:text-white transition-colors"
              />
              <h3 className="text-white text-[20px] font-bold">
                {page.city}
              </h3>
              <p className="text-[#8A8A8A] text-[13px] mt-1 group-hover:text-white/70 transition-colors">
                {page.state}
              </p>
              <div className="mt-4 flex items-center gap-2 text-[#C8A45C] font-mono text-[11px] uppercase tracking-[0.08em]">
                View Services <ArrowRight size={12} />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
