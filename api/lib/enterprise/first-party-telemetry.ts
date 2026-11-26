import { classifyAiReferralSource } from "./geo-benchmark";
import type {
  AiReferralMetricInput,
  FirstPartyTelemetryResult,
  GscBigQueryMetricInput,
} from "./types";

function latestIsoDate(values: string[]): string | null {
  const valid = values.filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value)).sort();
  return valid.length > 0 ? valid[valid.length - 1] : null;
}

export function analyzeFirstPartyTelemetry(
  gscRows: GscBigQueryMetricInput[] = [],
  aiReferralEvents: AiReferralMetricInput[] = [],
): FirstPartyTelemetryResult {
  const totalClicks = gscRows.reduce((sum, row) => sum + Math.max(0, row.clicks), 0);
  const totalImpressions = gscRows.reduce(
    (sum, row) => sum + Math.max(0, row.impressions),
    0,
  );
  const weightedCtrPct =
    totalImpressions > 0
      ? Math.round((totalClicks / totalImpressions) * 100_000) / 1_000
      : 0;
  const weightedAvgPosition =
    totalImpressions > 0
      ? Math.round(
          (gscRows.reduce(
            (sum, row) =>
              sum + Math.max(0, row.avgPosition) * Math.max(0, row.impressions),
            0,
          ) /
            totalImpressions) *
            100,
        ) / 100
      : null;

  let aiSessions = 0;
  let aiConversions = 0;
  let aiRevenue = 0;
  const aiSources = new Set<string>();
  const aiDates: string[] = [];
  for (const event of aiReferralEvents) {
    const source = classifyAiReferralSource(event.sourceHost);
    if (!source) continue;
    aiDates.push(event.recordedDate);
    aiSources.add(source);
    aiSessions += Math.max(0, event.sessionsCount);
    aiConversions += Math.max(0, event.conversionsCount);
    aiRevenue += Math.max(0, event.revenueAmount);
  }
  const conversionRatePct =
    aiSessions > 0 ? Math.round((aiConversions / aiSessions) * 10_000) / 100 : null;

  const gscBigQueryMeasured = gscRows.length > 0;
  const aiReferralMeasured = aiDates.length > 0;
  const findings: string[] = [];
  if (!gscBigQueryMeasured) {
    findings.push(
      "Google Search Console BigQuery rows are missing; enterprise organic telemetry is unverified.",
    );
  }
  if (!aiReferralMeasured) {
    findings.push(
      "GA4 AI referral sessions, conversions, and revenue are missing; AI Referral Conversion Rate is unmeasured.",
    );
  } else if (aiSessions === 0) {
    findings.push(
      "AI referral events were supplied, but no recognized AI-referral sessions were measured.",
    );
  }

  const score = Number(gscBigQueryMeasured) * 50 + Number(aiReferralMeasured) * 50;
  return {
    score,
    passed: gscBigQueryMeasured && aiReferralMeasured,
    gscBigQueryMeasured,
    aiReferralMeasured,
    gsc: {
      rowCount: gscRows.length,
      totalClicks,
      totalImpressions,
      weightedCtrPct,
      weightedAvgPosition,
      uniqueUrls: new Set(gscRows.map((row) => row.urlPath)).size,
      uniqueQueries: new Set(
        gscRows.map((row) => row.queryText?.trim()).filter(Boolean),
      ).size,
      latestDataDate: latestIsoDate(gscRows.map((row) => row.dataDate)),
    },
    aiReferrals: {
      eventCount: aiDates.length,
      sessions: aiSessions,
      conversions: aiConversions,
      conversionRatePct,
      revenue: Math.round(aiRevenue * 100) / 100,
      sources: Array.from(aiSources).sort(),
      latestRecordedDate: latestIsoDate(aiDates),
    },
    findings,
  };
}
