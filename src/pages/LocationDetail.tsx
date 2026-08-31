import { useParams, Link } from "react-router";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { trpc } from "@/providers/trpc";
import { MapPin, Phone, ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect } from "react";

export default function LocationDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data: page } = trpc.geo.getBySlug.useQuery({ slug: slug ?? "" });

  useEffect(() => {
    if (page) {
      document.title = page.metaTitle || `AI Automation in ${page.city} | DGF Corporations`;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute("content", page.metaDescription || "");
    }
  }, [page]);

  if (!page) {
    return (
      <div className="bg-[#0A0A0A] min-h-screen">
        <Navigation />
        <div className="pt-32 pb-24 px-6 text-center">
          <h1 className="text-white text-2xl font-bold">Location not found</h1>
          <Link to="/locations" className="text-[#C8A45C] mt-4 inline-block">
            Back to Locations
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const stats = page.stats ? JSON.parse(page.stats as string) as Record<string, string> : {};
  const services = page.services ? JSON.parse(page.services as string) as string[] : [];

  return (
    <div className="bg-[#0A0A0A] min-h-screen">
      <Navigation />

      {/* SEO Meta (hidden) */}
      <div className="hidden">
        <h1>{page.metaTitle || `AI Automation Services in ${page.city}, ${page.state}`}</h1>
        <p>{page.metaDescription}</p>
      </div>

      <section className="pt-32 pb-16 px-6 lg:px-10">
        <div className="max-w-[900px] mx-auto">
          <Link
            to="/locations"
            className="inline-flex items-center gap-2 text-[#8A8A8A] text-[13px] hover:text-[#C8A45C] transition-colors mb-6"
          >
            <ArrowLeft size={14} /> All Locations
          </Link>

          <div className="flex items-center gap-3 mb-4">
            <MapPin size={20} className="text-[#C8A45C]" />
            <span className="font-mono text-[12px] text-[#C8A45C] uppercase tracking-[0.1em]">
              {page.city}, {page.state}
            </span>
          </div>

          <h1
            className="text-white font-black"
            style={{ fontSize: "clamp(2rem, 5vw, 4rem)", lineHeight: 0.9 }}
          >
            {page.headline || `AI Automation for ${page.city} Businesses`}
          </h1>

          {/* City Stats */}
          {Object.keys(stats).length > 0 && (
            <div className="flex flex-wrap gap-6 mt-8">
              {Object.entries(stats).map(([key, value]) => (
                <div key={key} className="bg-[#1A1A1A] border border-[#2A2A2A] px-6 py-4">
                  <div className="text-white text-[24px] font-black">{value}</div>
                  <div className="font-mono text-[10px] text-[#8A8A8A] uppercase tracking-[0.08em] mt-1">
                    {key}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Body Content */}
          {page.bodyContent && (
            <div
              className="mt-10 text-[#8A8A8A] text-[16px] leading-relaxed prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: page.bodyContent }}
            />
          )}

          {/* Services */}
          {services.length > 0 && (
            <div className="mt-12">
              <h3 className="text-white text-[20px] font-bold mb-4">
                Recommended Services for {page.city}
              </h3>
              <div className="flex flex-wrap gap-3">
                {services.map((svc) => (
                  <Link
                    key={svc}
                    to="/services"
                    className="bg-[#1A1A1A] border border-[#2A2A2A] px-5 py-3 text-[#8A8A8A] text-[14px] hover:bg-[#234524] hover:border-[#234524] hover:text-white transition-all capitalize"
                  >
                    {svc.replace(/-/g, " ")}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="mt-16 bg-[#234524] p-10 text-center">
            <h3 className="text-white text-[24px] font-bold">
              Ready to Automate Your {page.city} Business?
            </h3>
            <p className="text-white/70 text-[15px] mt-2 mb-6">
              Book a free strategy call with our Florida-based team.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 bg-[#C8A45C] text-[#0A0A0A] text-[14px] font-semibold px-8 py-4 hover:bg-[#D4BC7E] transition-colors"
            >
              Book Free Strategy Call <ArrowRight size={14} />
            </Link>
            <div className="mt-4 flex items-center justify-center gap-2 text-white/60 text-[13px]">
              <Phone size={14} /> (904) 555-0147
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
