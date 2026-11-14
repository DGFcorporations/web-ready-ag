import { useParams, Link } from "react-router";
import Navigation from "@/components/Navigation";
import SEO from "@/components/SEO";
import Footer from "@/components/Footer";
import { Check, X, ArrowRight } from "lucide-react";
import {
  ALL_COMPARISON_SPECS,
  BASE_SITE_URL,
  resolveComparisonSpec,
} from "../../api/lib/compare-catalog";
import {
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildOrganizationJsonLd,
  buildPersonJsonLd,
  buildUnifiedGraphJsonLd,
  buildWebPageJsonLd,
  buildWebsiteJsonLd,
} from "../../api/lib/json-ld";

export default function Compare() {
  const { slug } = useParams<{ slug?: string }>();
  const spec = resolveComparisonSpec(slug);

  const breadcrumbs =
    spec.path === "/compare"
      ? [
          { name: "Home", url: `${BASE_SITE_URL}/` },
          { name: "Compare", url: spec.canonical },
        ]
      : [
          { name: "Home", url: `${BASE_SITE_URL}/` },
          { name: "Compare", url: `${BASE_SITE_URL}/compare` },
          { name: spec.title, url: spec.canonical },
        ];

  const jsonLd = [
    buildUnifiedGraphJsonLd([
      buildOrganizationJsonLd(),
      buildWebsiteJsonLd(),
      buildPersonJsonLd({ origin: BASE_SITE_URL }),
      buildWebPageJsonLd({
        url: spec.canonical,
        name: spec.title,
        definitionHeadline: spec.answerCapsule,
        wikidataUri: spec.wikidataUri,
        dateModified: spec.lastUpdated,
      }),
      buildFaqPageJsonLd(
        [
          {
            question: spec.questionHeading,
            answer: spec.answerCapsule,
          },
        ],
        spec.canonical,
      ),
      buildBreadcrumbJsonLd(breadcrumbs),
    ]),
  ];

  return (
    <div className="bg-[#0A0A0A] min-h-screen">
      <SEO
        title={`${spec.title} | WEB-READY/AG`}
        description={spec.answerCapsule}
        canonical={spec.canonical}
        jsonLd={jsonLd}
      />
      <Navigation />
      <main className="pt-32 pb-24 px-6 lg:px-10">
        <div className="max-w-[1100px] mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <span className="font-mono text-[12px] text-[#C8A45C] uppercase tracking-[0.1em]">
              Down-Funnel Decision Matrix
            </span>
            <p className="font-mono text-[12px] text-[#8A8A8A]">
              Last Updated: <time dateTime={spec.lastUpdated}>{spec.lastUpdated}</time>
            </p>
          </div>

          <h1 className="text-white font-black text-[32px] md:text-[44px] leading-tight">
            {spec.title}
          </h1>
          <p className="text-[#8A8A8A] text-[16px] mt-3 max-w-[780px]">{spec.subtitle}</p>

          <nav aria-label="Comparison guides" className="mt-6 flex flex-wrap gap-2">
            {ALL_COMPARISON_SPECS.map((item) => {
              const isCurrent = item.path === spec.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-current={isCurrent ? "page" : undefined}
                  className={
                    isCurrent
                      ? "px-3 py-1.5 border border-[#C8A45C] bg-[#C8A45C]/15 font-mono text-[11px] text-[#C8A45C]"
                      : "px-3 py-1.5 border border-[#2A2A2A] bg-[#141414] font-mono text-[11px] text-[#A3A3A3] hover:border-[#C8A45C] hover:text-white"
                  }
                >
                  {item.title}
                </Link>
              );
            })}
          </nav>

          <nav aria-label="On this page" className="mt-4 flex flex-wrap gap-4 font-mono text-[12px] text-[#C8A45C]">
            <a href="#capsule-summary" className="hover:underline">Summary Capsule</a>
            <a href="#comparison-matrix" className="hover:underline">4-Layer Comparison Table</a>
          </nav>

          <section id="capsule-summary" className="mt-8 bg-[#141414] border border-[#2A2A2A] p-6">
            <h2 id="q-compare" className="text-white text-[20px] font-bold mb-3">
              {spec.questionHeading}
            </h2>
            <p className="text-[#D4D4D4] text-[15px] leading-relaxed">{spec.answerCapsule}</p>
          </section>

          <section id="comparison-matrix" className="mt-10">
            <div
              tabIndex={0}
              role="region"
              aria-labelledby="matrix-caption"
              className="overflow-x-auto border border-[#2A2A2A] bg-[#141414] focus-visible:outline-2 focus-visible:outline-[#C8A45C]"
            >
              <table className="w-full text-left border-collapse min-w-[680px]">
                <caption id="matrix-caption" className="sr-only">
                  Enterprise 4-Layer Search Architecture vs Legacy SEO Agency Comparison
                </caption>
                <thead className="bg-[#1A1A1A] border-b border-[#2A2A2A]">
                  <tr>
                    <th scope="col" className="p-4 text-[12px] font-mono uppercase text-[#C8A45C]">
                      Capability
                    </th>
                    <th scope="col" className="p-4 text-[12px] font-mono uppercase text-[#22C55E]">
                      WEB-READY/AG (4-Layer)
                    </th>
                    <th scope="col" className="p-4 text-[12px] font-mono uppercase text-[#8A8A8A]">
                      Legacy Agency Setup
                    </th>
                    <th scope="col" className="p-4 text-[12px] font-mono uppercase text-white">
                      Measured Gain
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {spec.rows.map((row) => (
                    <tr key={row.capability} className="border-b border-[#222222] last:border-0">
                      <th scope="row" className="p-4 text-white text-[14px] font-semibold">
                        {row.capability}
                      </th>
                      <td className="p-4 text-[#E5E5E5] text-[13px]">
                        <span className="inline-flex items-start gap-2">
                          <Check size={14} className="text-[#22C55E] mt-0.5 shrink-0" />
                          {row.enterprise4Layer}
                        </span>
                      </td>
                      <td className="p-4 text-[#8A8A8A] text-[13px]">
                        <span className="inline-flex items-start gap-2">
                          <X size={14} className="text-[#EF4444] mt-0.5 shrink-0" />
                          {row.legacyAgency}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-[12px] text-[#C8A45C]">{row.edgeGain}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 bg-[#C8A45C] text-[#0A0A0A] px-6 py-3 font-semibold hover:bg-[#D4BC7E]"
            >
              Inspect Transparent Pricing <ArrowRight size={15} />
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 border border-[#2A2A2A] text-white px-6 py-3 font-mono text-[13px] hover:border-[#C8A45C]"
            >
              Run Live 4-Layer Schema Audit
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
