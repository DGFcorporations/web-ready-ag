import { describe, expect, it } from "vitest";
import { analyzeFirstPartyTelemetry } from "../api/lib/enterprise/first-party-telemetry";

describe("enterprise first-party telemetry", () => {
  it("calculates GSC BigQuery and AI referral conversion KPIs", () => {
    const result = analyzeFirstPartyTelemetry(
      [
        {
          dataDate: "2026-11-10",
          urlPath: "/pricing",
          queryText: "agent grade pricing",
          clicks: 10,
          impressions: 100,
          ctr: 0.1,
          avgPosition: 4,
        },
        {
          dataDate: "2026-11-12",
          urlPath: "/compare",
          queryText: "aeo comparison",
          clicks: 5,
          impressions: 50,
          ctr: 0.1,
          avgPosition: 2,
        },
      ],
      [
        {
          sourceHost: "chatgpt.com",
          landingPath: "/pricing",
          sessionsCount: 20,
          conversionsCount: 4,
          revenueAmount: 3800,
          recordedDate: "2026-11-12",
        },
        {
          sourceHost: "google.com",
          landingPath: "/pricing",
          sessionsCount: 100,
          conversionsCount: 8,
          revenueAmount: 7600,
          recordedDate: "2026-11-12",
        },
      ],
    );

    expect(result.passed).toBe(true);
    expect(result.gsc.totalClicks).toBe(15);
    expect(result.gsc.weightedCtrPct).toBe(10);
    expect(result.gsc.weightedAvgPosition).toBe(3.33);
    expect(result.aiReferrals.sessions).toBe(20);
    expect(result.aiReferrals.conversionRatePct).toBe(20);
    expect(result.aiReferrals.revenue).toBe(3800);
    expect(result.aiReferrals.sources).toEqual(["chatgpt.com"]);
  });

  it("marks both first-party evidence streams unmeasured when absent", () => {
    const result = analyzeFirstPartyTelemetry();
    expect(result.passed).toBe(false);
    expect(result.score).toBe(0);
    expect(result.findings).toHaveLength(2);
  });
});
