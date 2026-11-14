import { describe, it, expect } from "vitest";
import { buildEnterpriseRobotsTxt } from "./bot-governance";
import { evaluateEnterprise4Layers } from "./evaluator";

const PERFECT_HTML = `<!doctype html>
<html lang="en">
<head>
  <title>Enterprise Search Visibility Platform | WEB-READY/AG</title>
  <meta name="description" content="Enterprise 4-layer SEO, AEO, GEO, and AIO engineering." />
  <link rel="canonical" href="https://web-ready.ag/compare/enterprise-aeo" />
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://web-ready.ag/#organization",
        "name": "WEB-READY/AG",
        "url": "https://web-ready.ag",
        "sameAs": ["https://www.wikidata.org/entity/Q180711"]
      },
      {
        "@type": "WebSite",
        "@id": "https://web-ready.ag/#website",
        "url": "https://web-ready.ag",
        "publisher": { "@id": "https://web-ready.ag/#organization" }
      },
      {
        "@type": "Person",
        "@id": "https://web-ready.ag/#person-chandler",
        "name": "Josh Chandler",
        "worksFor": { "@id": "https://web-ready.ag/#organization" },
        "hasCredential": { "@type": "EducationalOccupationalCredential", "credentialCategory": "Enterprise Search Architect" },
        "sameAs": ["https://www.linkedin.com/in/joshchandler"]
      },
      {
        "@type": "WebPage",
        "@id": "https://web-ready.ag/compare/enterprise-aeo/#webpage",
        "url": "https://web-ready.ag/compare/enterprise-aeo",
        "isPartOf": { "@id": "https://web-ready.ag/#website" },
        "author": { "@id": "https://web-ready.ag/#person-chandler" },
        "mainEntity": { "@id": "https://web-ready.ag/compare/enterprise-aeo/#service" },
        "dateModified": "2026-11-12"
      },
      {
        "@type": "Service",
        "@id": "https://web-ready.ag/compare/enterprise-aeo/#service",
        "name": "Enterprise Search Architecture",
        "provider": { "@id": "https://web-ready.ag/#organization" }
      }
    ]
  }
  </script>
</head>
<body>
  <main>
    <p>Last Updated: <time datetime="2026-11-12">November 12, 2026</time></p>
    <nav aria-label="Section index"><a href="#aeo-def">AEO Definition</a></nav>
    <h1>Enterprise 4-Layer Search Visibility Architecture</h1>
    <h2 id="aeo-def">What makes search architecture Enterprise Agent-Grade?</h2>
    <p>WEB-READY/AG unifies technical SEO telemetry, 40 to 60 word answer capsules, generative engine prompt benchmarking, and explicit retrieval plus training bot governance into one verified graph. Measured deployments achieve 1,180ms mobile LCP across 142 sites while maintaining 96% citation accuracy at $950/mo.</p>
  </main>
</body>
</html>`;

const SITEMAP_INDEX = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://web-ready.ag/sitemap-core.xml</loc><lastmod>2026-11-12</lastmod></sitemap>
  <sitemap><loc>https://web-ready.ag/sitemap-compare.xml</loc><lastmod>2026-11-12</lastmod></sitemap>
</sitemapindex>`;

describe("evaluateEnterprise4Layers", () => {
  it("scores >= 90 across all 4 enterprise layers on a compliant page", () => {
    const report = evaluateEnterprise4Layers({
      url: "https://web-ready.ag/compare/enterprise-aeo",
      finalUrl: "https://web-ready.ag/compare/enterprise-aeo",
      html: PERFECT_HTML,
      renderedHtml: PERFECT_HTML,
      robotsTxt: buildEnterpriseRobotsTxt("https://web-ready.ag"),
      sitemapXml: SITEMAP_INDEX,
      lcpMs: 1180,
      inpMs: 85,
      cls: 0.02,
      canonicalEntity: { name: "WEB-READY/AG", domain: "https://web-ready.ag" },
      externalSources: [{ source: "wikidata", name: "WEB-READY/AG", domain: "web-ready.ag" }],
      thirdPartyCitations90d: 25,
      favorableSentimentPct: 95,
      referenceNowIso: "2026-11-13",
    });

    expect(report.passed).toBe(true);
    expect(report.overallScore).toBeGreaterThanOrEqual(90);
    expect(report.layers.seo.passed).toBe(true);
    expect(report.layers.aeo.passed).toBe(true);
    expect(report.layers.geo.passed).toBe(true);
    expect(report.layers.aio.passed).toBe(true);
    expect(report.telemetryCoverage.liveCwvMeasured).toBe(true);
    expect(report.telemetryCoverage.hydrationDiffMeasured).toBe(true);
  });

  it("flags blocked training bots and slow mobile CWV LCP >= 1800ms", () => {
    const report = evaluateEnterprise4Layers({
      url: "https://example.com/glossary/seo",
      html: `<!doctype html><html><head><title>Bad</title></head><body><div id="root"></div></body></html>`,
      robotsTxt: `User-agent: GPTBot\nDisallow: /\n`,
      lcpMs: 3200,
      inpMs: 340,
      cls: 0.25,
    });

    expect(report.passed).toBe(false);
    expect(report.layers.aio.passed).toBe(false);
    expect(report.layers.seo.remediations.some((r) => r.includes("1,800ms"))).toBe(true);
  });
});
