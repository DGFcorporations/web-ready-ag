import { describe, it, expect } from "vitest";
import {
  WEB_AG_LAYERS,
  TARGET_ENGINES,
  auditHtmlAgainstTitanStandard,
  buildCanonicalRobotsTxt,
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
