import { describe, it, expect } from "vitest";
import { analyzeCrawlLogs } from "./crawl-log-analyzer";

describe("Enterprise SEO/AIO Server-Log Crawl Telemetry & Orphan Analyzer", () => {
  it("buckets combined-log timestamps by UTC day, not server-local date", () => {
    const logs = ["12/Nov/2026:00:30:00 +0200", "12/Nov/2026:12:00:00 +0200"]
      .map(date => `192.0.2.1 - - [${date}] "GET /pricing HTTP/1.1" 200 10 "-" "Googlebot"`)
      .join("\n");
    expect(analyzeCrawlLogs(logs).logCoverageDays).toBe(2);
  });
  it("parses Cloudflare NDJSON logs and computes retrieval vs training hits, orphans, traps, and uncrawled URLs", () => {
    const ndjson = [
      JSON.stringify({
        ClientRequestPath: "/",
        EdgeResponseStatus: 200,
        ClientRequestUserAgent: "Mozilla/5.0 (compatible; OAI-SearchBot/1.0)",
        EdgeStartTimestamp: "2026-10-12T10:00:00Z",
      }),
      JSON.stringify({
        ClientRequestPath: "/services",
        EdgeResponseStatus: 200,
        ClientRequestUserAgent: "Mozilla/5.0 (compatible; GPTBot/1.0)",
        EdgeStartTimestamp: "2026-11-12T10:01:00Z",
      }),
      JSON.stringify({
        ClientRequestPath: "/legacy-orphan-page",
        EdgeResponseStatus: 404,
        ClientRequestUserAgent: "Mozilla/5.0 (compatible; PerplexityBot/1.0)",
        EdgeStartTimestamp: "2026-11-12T10:02:00Z",
      }),
      JSON.stringify({
        ClientRequestPath: "/blog?filter=seo&sort=desc",
        EdgeResponseStatus: 200,
        ClientRequestUserAgent: "Mozilla/5.0 (compatible; Googlebot/2.1)",
        EdgeStartTimestamp: "2026-11-12T10:03:00Z",
      }),
    ].join("\n");

    const result = analyzeCrawlLogs(ndjson, {
      knownSitemapUrls: ["/", "/services", "/pricing", "/compare/aeo-platforms"],
      citationsCount: 2,
    });

    expect(result.totalHits).toBe(4);
    expect(result.retrievalBotHits).toBe(3);
    expect(result.trainingBotHits).toBe(1);
    expect(result.statusCounts["2xx"]).toBe(3);
    expect(result.statusCounts["4xx"]).toBe(1);
    expect(result.non200BotRate).toBe(25);
    expect(result.logOrphans).toContain("/legacy-orphan-page");
    expect(result.uncrawledHighValueUrls).toEqual(["/", "/services", "/pricing", "/compare/aeo-platforms"]);
    expect(result.searchCrawlEfficacyPct).toBe(0);
    expect(result.crawlTrapUrls).toContain("/blog?filter=seo&sort=desc");
    expect(result.crawlWastePercent).toBe(25);
    expect(result.crawlToCitationRatio).toBeNull();
    expect(result.crawlToCitationStatus).toBe("unmeasured");
    expect(result.logCoverageDays).toBe(1);
    expect(result.passes30DayWindow).toBe(false);
  });

  it("parses Nginx/Apache combined logs and flags empty or malformed inputs cleanly", () => {
    const nginxLog = [
      '66.249.66.1 - - [12/Nov/2026:12:00:00 +0000] "GET /pricing HTTP/2.0" 200 1842 "-" "Mozilla/5.0 (compatible; Claude-SearchBot/1.0)"',
      '104.28.1.2 - - [12/Nov/2026:12:05:00 +0000] "GET / HTTP/2.0" 200 4100 "-" "Mozilla/5.0 (Windows NT 10.0) Chrome/131.0"',
      "not-a-valid-log-line",
    ].join("\n");

    const res = analyzeCrawlLogs(nginxLog, {
      knownSitemapUrls: ["/", "/pricing"],
      citationsCount: 0,
    });

    expect(res.totalHits).toBe(2);
    expect(res.retrievalBotHits).toBe(1);
    expect(res.humanOrOtherHits).toBe(1);
    expect(res.uncrawledHighValueUrls).toEqual(["/", "/pricing"]);
    expect(res.crawlToCitationRatio).toBeNull();
    expect(res.crawlToCitationStatus).toBe("unmeasured");

    const emptyRes = analyzeCrawlLogs("");
    expect(emptyRes.totalHits).toBe(0);
    expect(emptyRes.crawlToCitationRatio).toBeNull();
    expect(emptyRes.crawlToCitationStatus).toBe("unmeasured");
    expect(emptyRes.passes30DayWindow).toBe(false);
  });

  it("counts verified commercial search traffic separately from self-declared agents", () => {
    const record = { path: "/pricing", status: 200, userAgent: "Googlebot/2.1", timestamp: "2026-11-12T10:00:00Z" };
    const options = { knownSitemapUrls: ["/pricing"], auditedPath: "/pricing", citationsCount: 2 };
    expect(analyzeCrawlLogs([record], options).searchCrawlEfficacyPct).toBe(0);
    const result = analyzeCrawlLogs(JSON.stringify([
      { ...record, verifiedBot: true },
      { ...record, userAgent: "PerplexityBot/1.0", verifiedBot: true, status: 403 },
      { ...record, userAgent: "OAI-SearchBot/1.0", verifiedBot: true, path: "/other" },
    ]), options);
    expect(result.searchCrawlEfficacyPct).toBe(100);
    expect(result.crawlToCitationRatio).toBe(1.5);
    expect(result.verifiedRetrievalStatuses).toEqual({ Googlebot: [200], PerplexityBot: [403] });
  });
});
