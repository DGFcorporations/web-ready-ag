import { describe, it, expect } from "vitest";
import { auditAeoRagArchitecture } from "./aeo-rag-auditor";

function makeWords(n: number, prefix = "Enterprise"): string {
  const words = [prefix];
  for (let i = 1; i < n; i++) {
    words.push(`signal${i}`);
  }
  return words.join(" ");
}

describe("Enterprise AEO 40-60w Answer Capsules, Pronoun-Free RAG & Down-Funnel Clusters", () => {
  it("passes 40-60 word self-contained answer capsules under question H2/H3 with summary anchors and pronoun-free blocks", () => {
    const capsule1 =
      "WEB-READY/AG engineers deterministic 7-layer JSON-LD schemas and server-rendered edge architecture for commercial operators across regulated healthcare and software verticals. Every deployment separates retrieval crawlers from training rules, validates entity graphs at zero errors, and anchors factual pricing tables inside the top fifteen kilobytes of clean HTML.";
    const capsule2 =
      "Server-rendered hydration eliminates JavaScript execution delays for OpenAI SearchBot, PerplexityBot, and Claude-SearchBot by delivering semantic answer capsules inside initial document bytes. Teams verify sub-1.8 second Largest Contentful Paint budgets alongside automated cross-source directory corroboration so language models extract verified facts without guessing.";

    const html = `<!doctype html><html><body>
      <nav aria-label="On this page"><a href="#q-aeo">Answer Architecture</a><a href="#q-ssr">SSR Hydration</a></nav>
      <main>
        <h2 id="q-aeo">What is Enterprise Answer Engine Optimization?</h2>
        <p>${capsule1}</p>
        <h3 id="q-ssr">How does SSR improve AI retrieval visibility?</h3>
        <p>${capsule2}</p>
        <table class="comparison-matrix"><tr><th>Capability</th><th>WEB-READY/AG</th></tr><tr><td>Pricing</td><td>$950/mo</td></tr></table>
      </main>
    </body></html>`;

    const res = auditAeoRagArchitecture("https://web-ready.ag/compare/enterprise-aeo", html);
    expect(res.questionHeadingCount).toBe(2);
    expect(res.capsulesInRangeCount).toBe(2);
    expect(res.capsuleComplianceRate).toBe(100);
    expect(res.hasSummaryAnchors).toBe(true);
    expect(res.ambiguousPronounChunks).toBe(0);
    expect(res.pronounFreeChunkRate).toBe(100);
    expect(res.funnelIntent).toBe("decision_compare");
    expect(res.isDownFunnelPage).toBe(true);
    expect(res.passed).toBe(true);
    expect(res.score).toBeGreaterThanOrEqual(90);
  });

  it("flags short capsules (<40w), bloated capsules (>60w), ambiguous pronouns, and commodity ToF pages", () => {
    const html = `<!doctype html><html><body><main>
      <h2>What is SEO?</h2>
      <p>It helps you rank higher. This works well for everyone.</p>
      <h3>How does pricing work?</h3>
      <p>${makeWords(75, "They")}</p>
    </main></body></html>`;

    const res = auditAeoRagArchitecture("https://example.com/glossary/what-is-seo", html);
    expect(res.capsulesInRangeCount).toBe(0);
    expect(res.capsuleComplianceRate).toBe(0);
    expect(res.ambiguousPronounChunks).toBeGreaterThan(0);
    expect(res.pronounFreeChunkRate).toBeLessThan(50);
    expect(res.funnelIntent).toBe("commodity_tof_glossary");
    expect(res.isDownFunnelPage).toBe(false);
    expect(res.passed).toBe(false);
  });
});
