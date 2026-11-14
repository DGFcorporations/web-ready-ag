import { describe, it, expect } from "vitest";
import { appRouter } from "../router";
import type { TrpcContext } from "../context";
import { buildEnterpriseRobotsTxt } from "../lib/enterprise";

function createPublicCaller() {
  const ctx: TrpcContext = {
    req: new Request("https://web-ready.ag/api/trpc"),
    resHeaders: new Headers(),
  };
  return appRouter.createCaller(ctx);
}

describe("tRPC Enterprise 4-Layer Router (enterprise-router)", () => {
  it("getGovernancePolicy returns separated retrieval vs training bots (training allowed) and telemetry specs", async () => {
    const caller = createPublicCaller();
    const policy = await caller.enterprise.getGovernancePolicy();

    expect(policy.retrievalBots.some((b) => b.id === "OAI-SearchBot")).toBe(true);
    expect(policy.trainingBots.some((b) => b.id === "GPTBot")).toBe(true);
    expect(policy.trainingAllowPolicy).toBe("ALLOW_EXPLICIT_ZERO_PENALTY");
    expect(policy.ga4AiReferralDomains).toContain("chatgpt.com");
    expect(policy.gscBigQueryTables).toContain("searchdata_url_impression");
  });

  it("analyzeCrawlLogs parses NDJSON logs cleanly via tRPC", async () => {
    const caller = createPublicCaller();
    const log = JSON.stringify({
      ClientRequestPath: "/pricing",
      EdgeResponseStatus: 200,
      ClientRequestUserAgent: "Mozilla/5.0 (compatible; PerplexityBot/1.0)",
    });

    const result = await caller.enterprise.analyzeCrawlLogs({
      rawLogs: log,
      knownSitemapUrls: ["/pricing", "/services"],
      citationsCount: 1,
    });

    expect(result.retrievalBotHits).toBe(1);
    expect(result.uncrawledHighValueUrls).toEqual(["/services"]);
    expect(result.crawlToCitationRatio).toBe(1);
  });

  it("corroborateEntity validates NAP & domain consistency across external snapshots", async () => {
    const caller = createPublicCaller();
    const result = await caller.enterprise.corroborateEntity({
      canonical: {
        name: "WEB-READY/AG",
        domain: "https://web-ready.ag",
        city: "Tampa",
        state: "FL",
      },
      externalSources: [
        { source: "gbp", name: "WEB-READY/AG", domain: "https://www.web-ready.ag", city: "Tampa", state: "FL" },
      ],
      thirdPartyCitations90d: 22,
      favorableSentimentPct: 92,
    });

    expect(result.entityConflictCount).toBe(0);
    expect(result.passed).toBe(true);
  });

  it("auditEnterprisePage evaluates raw HTML + robots.txt across all 4 enterprise layers", async () => {
    const caller = createPublicCaller();
    const report = await caller.enterprise.auditEnterprisePage({
      url: "https://web-ready.ag/pricing",
      html: `<!doctype html><html><head><link rel="canonical" href="https://web-ready.ag/pricing" /><title>Pricing</title></head><body><main><h1>Pricing</h1><p>Last Updated: 2026-11-12</p></main></body></html>`,
      robotsTxt: buildEnterpriseRobotsTxt("https://web-ready.ag"),
      lcpMs: 1100,
    });

    expect(report.botGovernance.allTrainingBotsAllowed).toBe(true);
    expect(report.layers.seo).toBeDefined();
    expect(report.layers.aeo).toBeDefined();
    expect(report.layers.geo).toBeDefined();
    expect(report.layers.aio).toBeDefined();
  });
});
