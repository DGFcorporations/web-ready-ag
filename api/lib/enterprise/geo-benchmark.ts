import type {
  GeoPageFreshnessAndDensityResult,
  GeoPromptBenchmarkResult,
  GeoPromptRunInput,
  LlmEngineId,
  PromptStage,
} from "./types";

export const GA4_AI_REFERRAL_DOMAINS = [
  "chatgpt.com",
  "chat.openai.com",
  "perplexity.ai",
  "gemini.google.com",
  "claude.ai",
  "copilot.microsoft.com",
  "you.com",
  "phind.com",
] as const;

export const GSC_BIGQUERY_EXPORT_TABLES = [
  "searchdata_site_impression",
  "searchdata_url_impression",
  "ExportLog",
] as const;

export function classifyAiReferralSource(referrerOrHost: string): string | null {
  const clean = referrerOrHost.trim().toLowerCase();
  if (!clean) return null;
  let host = clean;
  try {
    if (/^https?:\/\//i.test(clean)) {
      host = new URL(clean).hostname.toLowerCase();
    } else {
      host = clean.split("/")[0];
    }
  } catch {
    // keep clean
  }
  for (const domain of GA4_AI_REFERRAL_DOMAINS) {
    if (host === domain || host.endsWith(`.${domain}`)) {
      return domain;
    }
  }
  return null;
}

function normalizeIsoDate(raw: string): string | null {
  const isoMatch = /(\d{4})-(\d{2})-(\d{2})/.exec(raw.trim());
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  const parsed = Date.parse(raw.trim());
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString().slice(0, 10);
  }
  return null;
}

function extractSchemaDateModified(html: string): string | null {
  const scriptRe =
    /<script\b[^>]*type=["']application\/ld\+json[^"']*["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  const searchObj = (node: unknown): string | null => {
    if (!node || typeof node !== "object") return null;
    if (Array.isArray(node)) {
      for (const x of node) {
        const found = searchObj(x);
        if (found) return found;
      }
      return null;
    }
    const obj = node as Record<string, unknown>;
    if (typeof obj.dateModified === "string") {
      const norm = normalizeIsoDate(obj.dateModified);
      if (norm) return norm;
    }
    for (const v of Object.values(obj)) {
      const found = searchObj(v);
      if (found) return found;
    }
    return null;
  };

  while ((m = scriptRe.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(m[1].trim()) as unknown;
      const found = searchObj(parsed);
      if (found) return found;
    } catch {
      // ignore invalid JSON
    }
  }
  return null;
}

function extractVisibleLastUpdated(html: string): string | null {
  const withoutScripts = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ");

  const timeAfterUpdated =
    /Last\s+Updated\s*:?\s*(?:<[^>]+>\s*)*<time\b[^>]*datetime=["']([^"']+)["'][^>]*>/i.exec(
      withoutScripts,
    );
  if (timeAfterUpdated) {
    const norm = normalizeIsoDate(timeAfterUpdated[1]);
    if (norm) return norm;
  }

  const plainText = withoutScripts.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const textMatch =
    /Last\s+Updated\s*:?\s*([A-Za-z]+\s+\d{1,2},\s+\d{4}|\d{4}-\d{2}-\d{2})/i.exec(plainText);
  if (textMatch) {
    return normalizeIsoDate(textMatch[1]);
  }
  return null;
}

export function auditGeoFreshnessAndDensity(
  html: string,
  options?: { referenceNowIso?: string },
): GeoPageFreshnessAndDensityResult {
  const visibleText = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = visibleText ? visibleText.split(/\s+/) : [];
  const wordCount = words.length;

  const quantMatches =
    visibleText.match(
      /(?:\$[0-9,]+(?:\.\d+)?(?:\s*\/?\s*(?:mo|month|yr|year))?|\b\d+(?:\.\d+)?\s*(?:%|ms|s\b|x\b|kb|mb|citations?|deployments?|clinics?|prompts?)|\bn\s*=\s*\d+\b)/gi,
    ) ?? [];
  const quantitativeClaimsCount = quantMatches.length;
  const statsPerThousandWords =
    wordCount > 0 ? Math.round((quantitativeClaimsCount / wordCount) * 1000 * 10) / 10 : 0;

  const visibleLastUpdated = extractVisibleLastUpdated(html);
  const schemaDateModified = extractSchemaDateModified(html);

  const freshnessParityPassed =
    Boolean(visibleLastUpdated) &&
    Boolean(schemaDateModified) &&
    visibleLastUpdated === schemaDateModified;

  let ageDays: number | null = null;
  const refDateStr = schemaDateModified ?? visibleLastUpdated;
  if (refDateStr) {
    const refMs = Date.parse(`${refDateStr}T00:00:00Z`);
    const nowMs = options?.referenceNowIso
      ? Date.parse(
          options.referenceNowIso.length === 10
            ? `${options.referenceNowIso}T00:00:00Z`
            : options.referenceNowIso,
        )
      : Date.now();
    if (!Number.isNaN(refMs) && !Number.isNaN(nowMs)) {
      ageDays = Math.max(0, Math.round((nowMs - refMs) / (1000 * 60 * 60 * 24)));
    }
  }

  let score = 100;
  const findings: string[] = [];

  if (!visibleLastUpdated) {
    score -= 25;
    findings.push("Missing visible 'Last Updated' freshness timestamp in rendered page body.");
  }
  if (!schemaDateModified) {
    score -= 25;
    findings.push("Missing JSON-LD dateModified property on WebPage/Article schema.");
  }
  if (visibleLastUpdated && schemaDateModified && visibleLastUpdated !== schemaDateModified) {
    score -= 25;
    findings.push(
      `Freshness mismatch: visible Last Updated (${visibleLastUpdated}) != schema dateModified (${schemaDateModified}).`,
    );
  }
  if (quantitativeClaimsCount < 3 || statsPerThousandWords < 5) {
    score -= 25;
    findings.push(
      `Low proprietary statistical density (${quantitativeClaimsCount} quantitative claims, ${statsPerThousandWords}/1k words; target >= 3 claims & >= 5/1k words).`,
    );
  }

  score = Math.max(0, Math.min(100, score));
  const passed = freshnessParityPassed && quantitativeClaimsCount >= 3 && statsPerThousandWords >= 5;

  return {
    score,
    passed,
    wordCount,
    quantitativeClaimsCount,
    statsPerThousandWords,
    visibleLastUpdated,
    schemaDateModified,
    freshnessParityPassed,
    ageDays,
    findings,
  };
}

export function evaluateGeoPromptBenchmark(
  runs: GeoPromptRunInput[],
): GeoPromptBenchmarkResult {
  const uniquePrompts = new Set<string>();
  const enginesSet = new Set<LlmEngineId>();

  let citedRuns = 0;
  let totalBrandCitations = 0;
  let totalCompetitorCitations = 0;

  const provenanceBreakdown = {
    owned: 0,
    earnedThirdParty: 0,
    competitor: 0,
  };

  const sentimentBreakdown = {
    favorable: 0,
    neutral: 0,
    unfavorable: 0,
    favorablePct: 0,
  };

  const stageTotals: Record<PromptStage, { total: number; cited: number }> = {
    awareness: { total: 0, cited: 0 },
    consideration: { total: 0, cited: 0 },
    decision: { total: 0, cited: 0 },
  };

  const engineTotals: Record<string, { total: number; cited: number }> = {};

  for (const run of runs) {
    uniquePrompts.add(run.prompt.trim().toLowerCase());
    enginesSet.add(run.engine);

    if (run.citedBrand) {
      citedRuns += 1;
      totalBrandCitations += 1;
    }
    totalCompetitorCitations += Math.max(0, run.competitorCitations);

    if (run.provenance === "owned") provenanceBreakdown.owned += 1;
    else if (run.provenance === "earned_third_party") provenanceBreakdown.earnedThirdParty += 1;
    else if (run.provenance === "competitor") provenanceBreakdown.competitor += 1;

    if (run.sentiment === "favorable") sentimentBreakdown.favorable += 1;
    else if (run.sentiment === "neutral") sentimentBreakdown.neutral += 1;
    else if (run.sentiment === "unfavorable") sentimentBreakdown.unfavorable += 1;

    stageTotals[run.stage].total += 1;
    if (run.citedBrand) stageTotals[run.stage].cited += 1;

    if (!engineTotals[run.engine]) engineTotals[run.engine] = { total: 0, cited: 0 };
    engineTotals[run.engine].total += 1;
    if (run.citedBrand) engineTotals[run.engine].cited += 1;
  }

  const totalRuns = runs.length;
  const referenceRatePct =
    totalRuns > 0 ? Math.round((citedRuns / totalRuns) * 1000) / 10 : 0;

  const totalModelCitations = totalBrandCitations + totalCompetitorCitations;
  const shareOfModelPct =
    totalModelCitations > 0
      ? Math.round((totalBrandCitations / totalModelCitations) * 1000) / 10
      : 0;

  sentimentBreakdown.favorablePct =
    totalRuns > 0 ? Math.round((sentimentBreakdown.favorable / totalRuns) * 1000) / 10 : 0;

  const byStage: Record<PromptStage, { runs: number; referenceRatePct: number }> = {
    awareness: {
      runs: stageTotals.awareness.total,
      referenceRatePct:
        stageTotals.awareness.total > 0
          ? Math.round((stageTotals.awareness.cited / stageTotals.awareness.total) * 1000) / 10
          : 0,
    },
    consideration: {
      runs: stageTotals.consideration.total,
      referenceRatePct:
        stageTotals.consideration.total > 0
          ? Math.round((stageTotals.consideration.cited / stageTotals.consideration.total) * 1000) /
            10
          : 0,
    },
    decision: {
      runs: stageTotals.decision.total,
      referenceRatePct:
        stageTotals.decision.total > 0
          ? Math.round((stageTotals.decision.cited / stageTotals.decision.total) * 1000) / 10
          : 0,
    },
  };

  const byEngine: Record<string, { runs: number; referenceRatePct: number }> = {};
  for (const [eng, counts] of Object.entries(engineTotals)) {
    byEngine[eng] = {
      runs: counts.total,
      referenceRatePct:
        counts.total > 0 ? Math.round((counts.cited / counts.total) * 1000) / 10 : 0,
    };
  }

  const enginesCovered = Array.from(enginesSet);
  const uniquePromptsCount = uniquePrompts.size;

  return {
    totalRuns,
    uniquePromptsCount,
    enginesCovered,
    referenceRatePct,
    shareOfModelPct,
    provenanceBreakdown,
    sentimentBreakdown,
    byStage,
    byEngine,
    passes25PromptMinimum: uniquePromptsCount >= 25,
    passes5EngineMinimum: enginesCovered.length >= 5,
    passesSentimentTarget: totalRuns > 0 && sentimentBreakdown.favorablePct >= 90,
  };
}
