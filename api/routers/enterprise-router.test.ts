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
  it("requires admin access for the cross-stream period report", async () => {
    await expect(createPublicCaller().enterprise.periodReport({
      domain: "example.org", start: "2026-10-01", end: "2026-10-31",
    })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
  it("getGovernancePolicy returns independently governed retrieval and training bots plus telemetry specs", async () => {
    const caller = createPublicCaller();
    const policy = await caller.enterprise.getGovernancePolicy();

    expect(policy.retrievalBots.some((b) => b.id === "OAI-SearchBot")).toBe(true);
    expect(policy.trainingBots.some((b) => b.id === "GPTBot")).toBe(true);
    expect(policy.trainingPolicy).toBe("CONFIGURE_INDEPENDENTLY");
    expect(policy.trainingBots.every((bot) => bot.policy === "CONFIGURABLE")).toBe(true);
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
    expect(result.uncrawledHighValueUrls).toEqual(["/pricing", "/services"]);
    expect(result.crawlToCitationRatio).toBeNull();
  });

  it("treats public log uploads as observations, not verified crawler evidence", async () => {
    const caller = createPublicCaller();
    const log = JSON.stringify({ timestamp: "2026-11-12T12:00:00Z", path: "/pricing",
      status: 200, userAgent: "Googlebot/2.1", verifiedBot: true });
    const knownSitemapUrls = ["/pricing"];
    const result = await caller.enterprise.analyzeCrawlLogs({ rawLogs: log, knownSitemapUrls });
    expect(result.searchCrawlEfficacyPct).toBe(0);
    const audit = await caller.enterprise.auditEnterprisePage({
      url: "https://example.com/pricing", html: "<h1>Pricing</h1>", crawlLogs: log, knownSitemapUrls,
    });
    expect(audit.crawlLogs?.verifiedRetrievalStatuses).toEqual({});
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
    expect(report.telemetryCoverage.liveCwvMeasured).toBe(false);
  });
});
