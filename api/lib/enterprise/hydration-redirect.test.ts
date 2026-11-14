import { describe, it, expect } from "vitest";
import {
  analyzeHydrationParity,
  analyzeRedirectAndCanonicalHygiene,
} from "./hydration-redirect";

describe("Enterprise SEO Hydration Parity & Redirect/Canonical Hygiene", () => {
  it("detects client-side-only CSR hydration gaps and client-injected JSON-LD", () => {
    const rawSpa = `<!doctype html><html><head><title>App</title><link rel="canonical" href="https://example.com/" /></head><body><div id="root"></div></body></html>`;
    const renderedDom = `<!doctype html><html><head><title>Enterprise SEO Platform</title><link rel="canonical" href="https://example.com/" /><script type="application/ld+json">{"@type":"Organization"}</script></head><body><div id="root"><main><h1>Enterprise Search Architecture</h1><h2>Why Hydration Parity Matters?</h2><p>${"word ".repeat(80)}</p></main></div></body></html>`;

    const parity = analyzeHydrationParity(rawSpa, renderedDom);
    expect(parity.passed).toBe(false);
    expect(parity.emptyRootDetected).toBe(true);
    expect(parity.parityRatio).toBeLessThan(0.2);
    expect(parity.missingInRawHeadings).toContain("Enterprise Search Architecture");
    expect(parity.clientOnlyJsonLd).toContain("Organization");
  });

  it("passes when SSR raw HTML matches rendered DOM parity >= 85% with server-rendered schema", () => {
    const html = `<!doctype html><html><head><title>Agent-Grade SEO</title><link rel="canonical" href="https://example.com/services" /><script type="application/ld+json">{"@type":"Service"}</script></head><body><main><h1>Agent-Grade Services</h1><h2>How does SSR preserve citation rates?</h2><p>${"content ".repeat(60)}</p></main></body></html>`;
    const parity = analyzeHydrationParity(html, html);
    expect(parity.passed).toBe(true);
    expect(parity.parityRatio).toBe(1);
    expect(parity.emptyRootDetected).toBe(false);
    expect(parity.clientOnlyJsonLd).toEqual([]);
  });

  it("flags 301->301->200 multi-hop chains, mismatched canonicals, URL fragments, and missing <lastmod>", () => {
    const html = `<!doctype html><html><head><link rel="canonical" href="https://example.com/Services" /></head><body><h1>Services</h1></body></html>`;
    const badSitemap = `<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://example.com/services</loc></url></urlset>`;

    const hygiene = analyzeRedirectAndCanonicalHygiene({
      requestedUrl: "http://example.com/Services#hero",
      finalUrl: "https://example.com/services",
      redirectChain: [
        { url: "http://example.com/Services", status: 301, location: "https://example.com/Services" },
        { url: "https://example.com/Services", status: 301, location: "https://example.com/services" },
        { url: "https://example.com/services", status: 200 },
      ],
      html,
      sitemapXml: badSitemap,
    });

    expect(hygiene.passed).toBe(false);
    expect(hygiene.hopCount).toBe(2);
    expect(hygiene.hasMultiHopChain).toBe(true);
    expect(hygiene.hasUrlFragments).toBe(true);
    expect(hygiene.hasUppercasePath).toBe(true);
    expect(hygiene.selfReferencingCanonicalOk).toBe(false);
    expect(hygiene.usesSitemapIndex).toBe(false);
    expect(hygiene.sitemapUrlsMissingLastmod).toBe(1);
  });

  it("passes clean 1-to-1 self-referencing canonicals, <=1 hop, and segmented <sitemapindex> with ISO <lastmod>", () => {
    const html = `<!doctype html><html><head><link rel="canonical" href="https://web-ready.ag/services" /></head><body></body></html>`;
    const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://web-ready.ag/sitemap-core.xml</loc><lastmod>2026-11-13</lastmod></sitemap>
  <sitemap><loc>https://web-ready.ag/sitemap-services.xml</loc><lastmod>2026-11-13</lastmod></sitemap>
</sitemapindex>`;

    const hygiene = analyzeRedirectAndCanonicalHygiene({
      requestedUrl: "https://web-ready.ag/services",
      finalUrl: "https://web-ready.ag/services",
      redirectChain: [{ url: "https://web-ready.ag/services", status: 200 }],
      html,
      sitemapXml: sitemapIndex,
    });

    expect(hygiene.passed).toBe(true);
    expect(hygiene.hopCount).toBe(0);
    expect(hygiene.selfReferencingCanonicalOk).toBe(true);
    expect(hygiene.usesSitemapIndex).toBe(true);
    expect(hygiene.sitemapLastmodValid).toBe(true);
    expect(hygiene.score).toBe(100);
  });
});
