import { describe, it, expect } from "vitest";
import {
  WEB_AG_LAYERS,
  TARGET_ENGINES,
  auditHtmlAgainstTitanStandard,
  buildCanonicalRobotsTxt,
  isBotDisallowed,
} from "./titan-engine";
import { injectMeta, resolveRouteMeta } from "./html-inject";

describe("Titan 7-Layer & 4-Engine Dominance Engine", () => {
  it("defines all 7 single-layer WebReady-AG skills in sequential order", () => {
    expect(WEB_AG_LAYERS).toHaveLength(7);
    expect(WEB_AG_LAYERS.map((l) => l.skillId)).toEqual([
      "web-ag-edge-vitals",
      "web-ag-entity-graph",
      "web-ag-programmatic-matrix",
      "web-ag-data-floor",
      "web-ag-geo-extraction",
      "web-ag-consensus-engine",
      "web-ag-sentinel-audit",
    ]);
  });

  it("defines all 4 target retrieval engines (Google, Perplexity, OpenAI, Brave/Claude)", () => {
    expect(TARGET_ENGINES.map((e) => e.id)).toEqual([
      "google",
      "perplexity",
      "openai",
      "braveClaude",
    ]);
  });

  it("buildCanonicalRobotsTxt includes all 12+ AI bots and Cleveland Clinic query-parameter fence", () => {
    const robots = buildCanonicalRobotsTxt("https://web-ready.ag");
    expect(robots).toContain("User-agent: OAI-SearchBot");
    expect(robots).toContain("User-agent: PerplexityBot");
    expect(robots).toContain("User-agent: Claude-SearchBot");
    expect(robots).toContain("User-agent: BraveBot");
    expect(robots).toContain("Disallow: /*?q=*");
    expect(robots).toContain("Disallow: /*?filter=*");
  });

  it("isBotDisallowed correctly parses RFC 9309 grouped User-agent blocks and wildcard (*) fallbacks", () => {
    const wildcardDisallow = "User-agent: *\nDisallow: /\n";
    expect(isBotDisallowed(wildcardDisallow, "OAI-SearchBot")).toBe(true);
    expect(isBotDisallowed(wildcardDisallow, "PerplexityBot")).toBe(true);
    expect(isBotDisallowed(wildcardDisallow, "BraveBot")).toBe(true);

    const wildcardWithOverride =
      "User-agent: *\nDisallow: /\n\nUser-agent: OAI-SearchBot\nAllow: /\n";
    expect(isBotDisallowed(wildcardWithOverride, "OAI-SearchBot")).toBe(false);
    expect(isBotDisallowed(wildcardWithOverride, "PerplexityBot")).toBe(true);

    const groupedAgentsBlock = [
      "User-agent: GPTBot",
      "User-agent: OAI-SearchBot",
      "User-agent: PerplexityBot",
      "Disallow: /",
    ].join("\n");
    expect(isBotDisallowed(groupedAgentsBlock, "GPTBot")).toBe(true);
    expect(isBotDisallowed(groupedAgentsBlock, "OAI-SearchBot")).toBe(true);
    expect(isBotDisallowed(groupedAgentsBlock, "PerplexityBot")).toBe(true);
    expect(isBotDisallowed(groupedAgentsBlock, "Googlebot")).toBe(false);
  });

  it("recognizes H2 pillars, Question H3 fan-out headers, and canonical links with HTML attributes", () => {
    const htmlWithAttributes = `<!doctype html>
<html lang="en">
<head>
  <title data-rh="true">Attribute Rich Titan Page</title>
  <meta content="Detailed factual description of the page" name="description" />
  <link href="https://example.com/services" rel="canonical" />
  <script type="application/ld+json">
    {"@context":"https://schema.org","@graph":[{"@type":"Organization","headline":"Factual 1-sentence definition of the organization for AI grounding.","sameAs":["http://www.wikidata.org/entity/Q180711"],"citation":["https://www.w3.org/TR/json-ld11/"]}]}
  </script>
</head>
<body>
  <div id="root">
    <main class="ag-prerender-shell">
      <p class="ag-summary-lead">Direct un-hedged summary lead.</p>
      <table class="entity-infobox"><tr><th>Target</th><td>Google, Perplexity, OpenAI, Brave</td></tr></table>
      <h2 class="text-2xl font-bold" id="overview">Core Service Pillars</h2>
      <h3 class="text-lg font-semibold" id="q1"><span>What is Answer Engine Optimization?</span></h3>
    </main>
  </div>
</body>
</html>`;

    const audit = auditHtmlAgainstTitanStandard({
      url: "https://example.com/services",
      html: htmlWithAttributes,
      robotsTxt: buildCanonicalRobotsTxt("https://example.com"),
      hasLlmsTxt: true,
      hasLlmsFullTxt: true,
      ttfbMs: 50,
    });

    expect(audit.layers[2].passed).toBe(true); // Layer 3 canonical + title/desc
    expect(audit.layers[4].passed).toBe(true); // Layer 5 H2 + Question H3 + Infobox
    expect(audit.overallScore).toBe(100);
  });

  it("penalizes an Amazon-style walled-garden page with empty #root and blocked AI bots", () => {
    const emptySpaHtml = `<!doctype html><html><head><title>Empty SPA</title></head><body><div id="root"></div></body></html>`;
    const blockedRobots = `User-agent: OAI-SearchBot\nDisallow: /\nUser-agent: PerplexityBot\nDisallow: /\nUser-agent: Claude-SearchBot\nDisallow: /\n`;

    const audit = auditHtmlAgainstTitanStandard({
      url: "https://example.com/",
      html: emptySpaHtml,
      robotsTxt: blockedRobots,
      hasLlmsTxt: false,
      ttfbMs: 850,
    });

    expect(audit.overallScore).toBeLessThan(35);
    expect(audit.layers[0].passed).toBe(false);
    expect(audit.nextSingleLayerToExecute.layerNumber).toBe(1);
    expect(audit.nextSingleLayerToExecute.skillId).toBe("web-ag-edge-vitals");
    expect(audit.engineScores.perplexity).toBeLessThan(40);
    expect(audit.engineScores.openai).toBeLessThan(40);
    expect(audit.engineScores.braveClaude).toBeLessThan(40);
  });

  it("scores a fully injected WebReady-AG Titan page >= 95 across all 7 layers and all 4 engines", async () => {
    const baseHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Placeholder</title>
</head>
<body><div id="root"></div></body>
</html>`;

    const meta = await resolveRouteMeta("/");
    const injectedHtml = injectMeta(baseHtml, meta!);
    const robotsTxt = buildCanonicalRobotsTxt("https://web-ready.ag");

    const audit = auditHtmlAgainstTitanStandard({
      url: "https://web-ready.ag/",
      html: injectedHtml,
      robotsTxt,
      hasLlmsTxt: true,
      hasLlmsFullTxt: true,
      ttfbMs: 42,
    });

    expect(audit.overallScore).toBeGreaterThanOrEqual(95);
    expect(audit.engineScores.google).toBeGreaterThanOrEqual(95);
    expect(audit.engineScores.perplexity).toBeGreaterThanOrEqual(95);
    expect(audit.engineScores.openai).toBeGreaterThanOrEqual(95);
    expect(audit.engineScores.braveClaude).toBeGreaterThanOrEqual(95);
    expect(audit.layers.every((l) => l.passed)).toBe(true);
    expect(audit.nextSingleLayerToExecute.layerNumber).toBe(7);
  });
});
