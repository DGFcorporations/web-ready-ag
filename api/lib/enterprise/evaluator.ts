import { auditAeoRagArchitecture } from "./aeo-rag-auditor";
import { auditBotGovernance } from "./bot-governance";
import { analyzeCrawlLogs } from "./crawl-log-analyzer";
import { corroborateCrossSourceEntities } from "./cross-source-corroborator";
import {
  auditGeoFreshnessAndDensity,
  evaluateGeoPromptBenchmark,
} from "./geo-benchmark";
import {
  analyzeHydrationParity,
  analyzeRedirectAndCanonicalHygiene,
} from "./hydration-redirect";
import { validateJsonLdKnowledgeGraph } from "./json-ld-graph-validator";
import type {
  BotHttpProbeResult,
  CanonicalEntityProfile,
  CrawlLogEntry,
  Enterprise4LayerReport,
  ExternalEntitySnapshot,
  GeoPromptRunInput,
  RedirectHop,
} from "./types";

export interface Enterprise4LayerEvaluationInput {
  url: string;
  finalUrl?: string;
  html: string;
  renderedHtml?: string;
  robotsTxt?: string;
  sitemapXml?: string;
  knownSitemapUrls?: string[];
  redirectChain?: RedirectHop[];
  botProbes?: BotHttpProbeResult[];
  crawlLogs?: string | CrawlLogEntry[];
  geoPromptRuns?: GeoPromptRunInput[];
  canonicalEntity?: CanonicalEntityProfile;
  externalSources?: ExternalEntitySnapshot[];
  thirdPartyCitations90d?: number;
  favorableSentimentPct?: number;
  lcpMs?: number;
  inpMs?: number;
  cls?: number;
  referenceNowIso?: string;
}

export function evaluateEnterprise4Layers(
  input: Enterprise4LayerEvaluationInput,
): Enterprise4LayerReport {
  const botGovernance = auditBotGovernance(input.robotsTxt ?? "", input.botProbes ?? []);
  const hydrationParity = input.renderedHtml
    ? analyzeHydrationParity(input.html, input.renderedHtml)
    : null;
  const redirectHygiene = analyzeRedirectAndCanonicalHygiene({
    requestedUrl: input.url,
    finalUrl: input.finalUrl ?? input.url,
    redirectChain: input.redirectChain,
    html: input.html,
    sitemapXml: input.sitemapXml,
  });

  const geoBenchmark =
    input.geoPromptRuns && input.geoPromptRuns.length > 0
      ? evaluateGeoPromptBenchmark(input.geoPromptRuns)
      : null;

  const crawlLogs = input.crawlLogs
    ? analyzeCrawlLogs(input.crawlLogs, {
        knownSitemapUrls: input.knownSitemapUrls,
        citationsCount:
          geoBenchmark !== null
            ? Math.round((geoBenchmark.referenceRatePct / 100) * geoBenchmark.totalRuns)
            : undefined,
      })
    : null;

  const aeoRag = auditAeoRagArchitecture(input.finalUrl ?? input.url, input.html);
  const jsonLdGraph = validateJsonLdKnowledgeGraph(input.html);
  const geoFreshnessDensity = auditGeoFreshnessAndDensity(input.html, {
    referenceNowIso: input.referenceNowIso,
  });

  const inferredHostname = (() => {
    try {
      return new URL(input.url).hostname;
    } catch {
      return input.url;
    }
  })();

  const crossSourceCorroboration = corroborateCrossSourceEntities(
    input.canonicalEntity ?? {
      name: inferredHostname,
      domain: input.url,
    },
    input.externalSources ?? [],
    input.thirdPartyCitations90d !== undefined || input.favorableSentimentPct !== undefined
      ? {
          thirdPartyCitations90d: input.thirdPartyCitations90d,
          favorableSentimentPct: input.favorableSentimentPct,
        }
      : undefined,
  );

  // Layer 1: SEO (Hydration parity, Redirect & Canonical hygiene, Log orphan/waste, Mobile CWV < 1.8s)
  let cwvScore = 100;
  const seoRemediations: string[] = [...redirectHygiene.findings];
  if (hydrationParity) seoRemediations.push(...hydrationParity.findings);
  if (typeof input.lcpMs === "number" && input.lcpMs >= 1800) {
    cwvScore -= input.lcpMs > 2500 ? 35 : 20;
    seoRemediations.push(`Mobile LCP is ${input.lcpMs}ms (enterprise target < 1,800ms).`);
  }
  if (typeof input.inpMs === "number" && input.inpMs > 200) {
    cwvScore -= 20;
    seoRemediations.push(`Mobile INP is ${input.inpMs}ms (target <= 200ms).`);
  }
  if (typeof input.cls === "number" && input.cls > 0.1) {
    cwvScore -= 15;
    seoRemediations.push(`Mobile CLS is ${input.cls} (target <= 0.10).`);
  }
  if (crawlLogs && (crawlLogs.logOrphans.length > 0 || crawlLogs.crawlWastePercent > 15)) {
    seoRemediations.push(
      `Crawl logs show ${crawlLogs.logOrphans.length} orphan path(s) and ${crawlLogs.crawlWastePercent}% parameterized crawl waste.`,
    );
  }
  const seoParts = [
    redirectHygiene.score,
    hydrationParity ? hydrationParity.score : redirectHygiene.score,
    Math.max(0, cwvScore),
  ];
  const seoScore = Math.round(seoParts.reduce((a, b) => a + b, 0) / seoParts.length);

  // Layer 2: AEO (40-60w Answer Capsules, Pronoun-Free RAG, Down-Funnel Intent, Connected @id Graph)
  const aeoScore = Math.round(aeoRag.score * 0.5 + jsonLdGraph.score * 0.5);
  const aeoRemediations = [...aeoRag.findings, ...jsonLdGraph.schemaErrors];

  // Layer 3: GEO (Freshness Parity, Stat Density, Multi-LLM Prompt Benchmarks)
  let geoScore = geoFreshnessDensity.score;
  const geoRemediations = [...geoFreshnessDensity.findings];
  if (geoBenchmark) {
    const benchScore = Math.round(
      Math.min(100, geoBenchmark.referenceRatePct * 0.6 + geoBenchmark.sentimentBreakdown.favorablePct * 0.4),
    );
    geoScore = Math.round(geoFreshnessDensity.score * 0.45 + benchScore * 0.55);
    if (!geoBenchmark.passes25PromptMinimum) {
      geoRemediations.push(
        `Expand GEO prompt matrix from ${geoBenchmark.uniquePromptsCount} to >= 25 real buyer prompts.`,
      );
    }
    if (!geoBenchmark.passes5EngineMinimum) {
      geoRemediations.push(
        `Expand LLM coverage from ${geoBenchmark.enginesCovered.length} to >= 5 AI engines.`,
      );
    }
    if (!geoBenchmark.passesSentimentTarget) {
      geoRemediations.push(
        `Favorable AI sentiment is ${geoBenchmark.sentimentBreakdown.favorablePct}% (target >= 90%).`,
      );
    }
  }

  // Layer 4: AIO (Retrieval vs Training Bot Governance + Cross-Source Corroboration & Consensus)
  const aioScore = Math.round(
    botGovernance.score * 0.6 + crossSourceCorroboration.score * 0.4,
  );
  const aioRemediations = [...botGovernance.findings];
  if (!crossSourceCorroboration.passesZeroConflictTarget) {
    aioRemediations.push(
      `Resolve ${crossSourceCorroboration.entityConflictCount} cross-source NAP/domain/credential conflict(s).`,
    );
  }
  if (
    (input.thirdPartyCitations90d !== undefined || input.favorableSentimentPct !== undefined) &&
    !crossSourceCorroboration.passesConsensusVelocity
  ) {
    aioRemediations.push(
      `Increase 90-day third-party citations to >= 20 and favorable sentiment to >= 90%.`,
    );
  }

  const overallScore = Math.round((seoScore + aeoScore + geoScore + aioScore) / 4);

  return {
    overallScore,
    passed: seoScore >= 85 && aeoScore >= 85 && geoScore >= 80 && aioScore >= 85,
    layers: {
      seo: {
        id: "seo",
        name: "Layer 1: Enterprise Technical SEO & Crawl Telemetry",
        score: seoScore,
        passed: seoScore >= 85,
        summary: `Canonical ${redirectHygiene.selfReferencingCanonicalOk ? "1:1" : "mismatch"}, ${redirectHygiene.hopCount} redirect hop(s), hydration ${hydrationParity ? `${Math.round(hydrationParity.parityRatio * 100)}%` : "unmeasured"}.`,
        remediations: seoRemediations,
      },
      aeo: {
        id: "aeo",
        name: "Layer 2: Answer Engine Optimization (RAG & Connected @graph)",
        score: aeoScore,
        passed: aeoScore >= 85,
        summary: `${aeoRag.capsulesInRangeCount}/${aeoRag.questionHeadingCount} capsules (40-60w), ${aeoRag.pronounFreeChunkRate}% pronoun-free RAG, ${jsonLdGraph.schemaErrors.length} schema error(s).`,
        remediations: aeoRemediations,
      },
      geo: {
        id: "geo",
        name: "Layer 3: Generative Engine Optimization (Freshness, Stats & Share of Model)",
        score: geoScore,
        passed: geoScore >= 80,
        summary: `Freshness parity ${geoFreshnessDensity.freshnessParityPassed ? "aligned" : "drifted"}, ${geoFreshnessDensity.statsPerThousandWords} stats/1k words${geoBenchmark ? `, Reference Rate ${geoBenchmark.referenceRatePct}%` : ""}.`,
        remediations: geoRemediations,
      },
      aio: {
        id: "aio",
        name: "Layer 4: AI Infrastructure & Authority Governance (Bots & Consensus)",
        score: aioScore,
        passed: aioScore >= 85,
        summary: `Retrieval allowed=${botGovernance.allRetrievalBotsAllowed}, Training allowed=${botGovernance.allTrainingBotsAllowed}, Entity conflicts=${crossSourceCorroboration.entityConflictCount}.`,
        remediations: aioRemediations,
      },
    },
    botGovernance,
    hydrationParity,
    redirectHygiene,
    crawlLogs,
    aeoRag,
    jsonLdGraph,
    geoFreshnessDensity,
    geoBenchmark,
    crossSourceCorroboration,
    telemetryCoverage: {
      liveCwvMeasured:
        typeof input.lcpMs === "number" ||
        typeof input.inpMs === "number" ||
        typeof input.cls === "number",
      hydrationDiffMeasured: hydrationParity !== null,
      serverLogsIngested: crawlLogs !== null && crawlLogs.totalHits > 0,
      geoPromptRunsCount: input.geoPromptRuns?.length ?? 0,
      externalSourcesCount: input.externalSources?.length ?? 0,
    },
  };
}
