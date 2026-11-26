import { describe, it, expect } from "vitest";
import {
  auditGeoFreshnessAndDensity,
  classifyAiReferralSource,
  evaluateGeoPromptBenchmark,
  GA4_AI_REFERRAL_DOMAINS,
} from "./geo-benchmark";
import type { GeoPromptRunInput, LlmEngineId, PromptStage } from "./types";

describe("Enterprise GEO Prompt Benchmarks, Statistical Density & Freshness Parity", () => {
  it("evaluates visible Last Updated freshness parity with schema dateModified and quantitative claim density", () => {
    const html = `<!doctype html><html><head>
      <script type="application/ld+json">{"@context":"https://schema.org","@type":"WebPage","dateModified":"2026-11-10"}</script>
    </head><body><main>
      <p class="freshness">Last Updated: <time datetime="2026-11-10">November 10, 2026</time></p>
      <p>Across 142 medical deployments (n=142), median mobile LCP dropped from 3,900ms to 1,240ms while AI Reference Rate rose 44% to 68.5% at $950/mo baseline pricing.</p>
    </main></body></html>`;

    const res = auditGeoFreshnessAndDensity(html, { referenceNowIso: "2026-11-13" });
    expect(res.visibleLastUpdated).toBe("2026-11-10");
    expect(res.schemaDateModified).toBe("2026-11-10");
    expect(res.freshnessParityPassed).toBe(true);
    expect(res.ageDays).toBe(3);
    expect(res.quantitativeClaimsCount).toBeGreaterThanOrEqual(4);
    expect(res.statsPerThousandWords).toBeGreaterThan(10);
    expect(res.passed).toBe(true);
  });

  it("flags mismatched visible Last Updated vs schema dateModified", () => {
    const html = `<!doctype html><html><head>
      <script type="application/ld+json">{"@context":"https://schema.org","@type":"WebPage","dateModified":"2026-01-01"}</script>
    </head><body><main><p>Last Updated: 2026-11-12</p><p>No stats here.</p></main></body></html>`;

    const res = auditGeoFreshnessAndDensity(html, { referenceNowIso: "2026-11-13" });
    expect(res.freshnessParityPassed).toBe(false);
    expect(res.passed).toBe(false);
  });

  it("computes 25+ prompt x 5+ LLM Reference Rate, Share of Model, Provenance, and Sentiment accurately", () => {
    const engines: LlmEngineId[] = [
      "chatgpt",
      "google_aio",
      "google_ai_mode",
      "perplexity",
      "claude",
    ];
    const stages: PromptStage[] = ["awareness", "consideration", "decision"];
    const runs: GeoPromptRunInput[] = [];

    for (let i = 0; i < 25; i++) {
      const stage = stages[i % 3];
      for (const engine of engines) {
        runs.push({
          prompt: `buyer prompt ${i + 1}`,
          stage,
          engine,
          citedBrand: i < 20, // 80% reference rate
          competitorCitations: 1,
          provenance: i % 2 === 0 ? "earned_third_party" : "owned",
          sentiment: "favorable",
        });
      }
    }

    const bench = evaluateGeoPromptBenchmark(runs);
    expect(bench.totalRuns).toBe(125);
    expect(bench.uniquePromptsCount).toBe(25);
    expect(bench.enginesCovered).toHaveLength(5);
    expect(bench.referenceRatePct).toBe(80);
    // 100 brand citations / (100 + 125 competitor citations) = 44.4%
    expect(bench.shareOfModelPct).toBe(44.4);
    expect(bench.provenanceBreakdown.earnedThirdParty).toBe(65);
    expect(bench.provenanceBreakdown.owned).toBe(60);
    expect(bench.sentimentBreakdown.favorablePct).toBe(100);
    expect(bench.passes25PromptMinimum).toBe(true);
    expect(bench.passes5EngineMinimum).toBe(true);
    expect(bench.passesSentimentTarget).toBe(true);
  });

  it("classifies GA4 AI referral referrers cleanly", () => {
    expect(GA4_AI_REFERRAL_DOMAINS).toContain("chatgpt.com");
    expect(GA4_AI_REFERRAL_DOMAINS).toContain("perplexity.ai");
    expect(GA4_AI_REFERRAL_DOMAINS).toContain("gemini.google.com");
    expect(GA4_AI_REFERRAL_DOMAINS).toContain("copilot.microsoft.com");
    expect(classifyAiReferralSource("https://chatgpt.com/?utm_source=chatgpt.com")).toBe("chatgpt.com");
    expect(classifyAiReferralSource("https://www.google.com/")).toBeNull();
  });

  it("counts documented prompts only across distinct engines, including uncited responses", () => {
    const run: GeoPromptRunInput = {
      prompt: "Which vendor?", promptSource: "Support: anonymized ticket",
      stage: "decision", engine: "chatgpt", citedBrand: false, competitorCitations: 0,
      provenance: "owned", sentiment: "neutral", citations: [],
    };
    const engines = ["chatgpt", "perplexity", "claude", "copilot", "google_aio"] as const;
    const rows = engines.map(engine => ({ ...run, engine }));
    const url = { url: "https://example.com/pricing", provenance: "owned" as const };
    rows[0].citations = [url, url];
    expect(evaluateGeoPromptBenchmark(rows)).toMatchObject({
      documentedMatrixPrompts: 1, documentedStages: ["decision"], referenceRatePct: 20, brandCitationCount: 1,
      provenanceBreakdown: { owned: 1, earnedThirdParty: 0, competitor: 0 },
    });
    expect(evaluateGeoPromptBenchmark(rows.map(r => ({ ...r, engine: "chatgpt" }))).documentedMatrixPrompts).toBe(0);
  });
});
