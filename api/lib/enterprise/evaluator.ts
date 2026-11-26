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
import { analyzeFirstPartyTelemetry } from "./first-party-telemetry";
import type {
  AiReferralMetricInput,
  BotHttpProbeResult,
  CanonicalEntityProfile,
  CrawlLogEntry,
  Enterprise4LayerReport,
  ExternalEntitySnapshot,
  ExternalSearchEvidence,
  GeoPromptRunInput,
  GscBigQueryMetricInput,
  RedirectHop,
  TrainingBotPolicy,
} from "./types";

export interface Enterprise4LayerEvaluationInput {
  url: string;
  finalUrl?: string;
  html: string;
  renderedHtml?: string;
  robotsTxt?: string;
  sitemapXml?: string;
  searchEvidence?: ExternalSearchEvidence;
  knownSitemapUrls?: string[];
  redirectChain?: RedirectHop[];
  botProbes?: BotHttpProbeResult[];
  trainingBotPolicy?: TrainingBotPolicy;
  crawlLogs?: string | CrawlLogEntry[];
  geoPromptRuns?: GeoPromptRunInput[];
  canonicalEntity?: CanonicalEntityProfile;
  externalSources?: ExternalEntitySnapshot[];
  thirdPartyCitations90d?: number;
  favorableSentimentPct?: number;
  lcpMs?: number;
  inpMs?: number;
  cls?: number;
  gscBigQueryRows?: GscBigQueryMetricInput[];
  aiReferralEvents?: AiReferralMetricInput[];
  referenceNowIso?: string;
}

export function evaluateEnterprise4Layers(
  input: Enterprise4LayerEvaluationInput,
): Enterprise4LayerReport {
  const botGovernance = auditBotGovernance(input.robotsTxt ?? "", input.botProbes ?? [], {
    trainingPolicy: input.trainingBotPolicy,
  });
  const hydrationParity = input.renderedHtml
    ? analyzeHydrationParity(input.html, input.renderedHtml, input.finalUrl ?? input.url)
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
        auditedPath: URL.canParse(input.finalUrl ?? input.url)
          ? new URL(input.finalUrl ?? input.url).pathname : undefined,
        citationsCount: geoBenchmark?.brandCitationCount,
      })
    : null;

  const aeoRag = auditAeoRagArchitecture(input.finalUrl ?? input.url, input.html);
  const jsonLdGraph = validateJsonLdKnowledgeGraph(input.html);
  const geoFreshnessDensity = auditGeoFreshnessAndDensity(input.html, {
    referenceNowIso: input.referenceNowIso,
  });
  const firstPartyTelemetry = analyzeFirstPartyTelemetry(
    input.gscBigQueryRows,
    input.aiReferralEvents,
  );

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
  if (crawlLogs && !crawlLogs.passes30DayWindow) {
    seoRemediations.push(
      `Server-log evidence covers ${crawlLogs.logCoverageDays ?? 0} day(s); provide a 30-90 day crawl window.`,
    );
  }
  seoRemediations.push(...firstPartyTelemetry.findings);
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
  if (crossSourceCorroboration.entityConflictCount > 0) {
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

  const missingEnterpriseInputs: string[] = [];
  const validators = [input.searchEvidence?.richResults, input.searchEvidence?.schemaOrg];
  const validatorsMeasured = validators.every(v => v?.reference.trim() && Number.isInteger(v.errors) && v.errors >= 0);
  if (!validatorsMeasured) missingEnterpriseInputs.push("external schema validator results");
  if (validators.some(v => v && v.errors > 0)) aeoRemediations.push("Resolve external validator errors on the audited template.");
  const features = input.searchEvidence?.searchFeatures;
  const featuresMeasured = Boolean(features?.reference.trim() && Number.isInteger(features.opportunities) &&
    Number.isInteger(features.owned) && features.owned >= 0 && features.owned <= features.opportunities);
  if (!featuresMeasured) missingEnterpriseInputs.push("observed snippet/PAA opportunities and ownership");
  const snippetPaaOwnershipPct = featuresMeasured && features && features.opportunities > 0
    ? Math.round(features.owned / features.opportunities * 1000) / 10 : null;
  const hasUrlInventory = Boolean(input.knownSitemapUrls?.length);
  const hasChain = Boolean(input.redirectChain?.length);
  if (!hasUrlInventory) missingEnterpriseInputs.push("commercial URL inventory for log comparison");
  if (!hasChain) missingEnterpriseInputs.push("observed redirect chain and final status");
  if (!input.sitemapXml?.trim()) missingEnterpriseInputs.push("sitemap XML");
  if (!hydrationParity) missingEnterpriseInputs.push("rendered DOM");
  if (!crawlLogs || !crawlLogs.passes30DayWindow) {
    missingEnterpriseInputs.push("30-90 day server logs");
  }
  const requiredRetrievalProbes = [
    "Googlebot",
    "Bingbot",
    "OAI-SearchBot",
    "PerplexityBot",
    "Claude-SearchBot",
  ];
  const probedBots = new Set((input.botProbes ?? []).filter(p => p.status != null).map(p => p.bot.toLowerCase()));
  const probesComplete = requiredRetrievalProbes.every(bot => probedBots.has(bot.toLowerCase()));
  const loggedRetrieval = requiredRetrievalProbes.every(bot => crawlLogs?.verifiedRetrievalStatuses[bot]?.length);
  const logsShowSuccess = loggedRetrieval && requiredRetrievalProbes.every(bot =>
    crawlLogs?.verifiedRetrievalStatuses[bot].every(status => status === 200));
  if (!loggedRetrieval) missingEnterpriseInputs.push("verified retrieval bot log records on audited URL");
  if (loggedRetrieval && !logsShowSuccess) aioRemediations.push("Verified retrieval requests on the audited URL returned non-200 statuses.");
  const retrievalOk = requiredRetrievalProbes.every(bot => (input.botProbes ?? []).some(p =>
    p.bot.toLowerCase() === bot.toLowerCase() && p.ok && p.status === 200 && !p.challengeDetected && !p.wafBlocked));
  if (!probesComplete) {
    missingEnterpriseInputs.push("live Google, Bing, OpenAI, Perplexity, and Anthropic HTTP probes");
  }
  if ((geoBenchmark?.documentedMatrixPrompts ?? 0) < 25) {
    missingEnterpriseInputs.push("25+ buyer prompts across 5+ LLM engines");
  }
  if (geoBenchmark?.documentedStages.length !== 3) {
    missingEnterpriseInputs.push("documented awareness, consideration, and decision prompt coverage");
  }
  const requiredEntitySources = [
    "gbp",
    "wikidata",
    "wikipedia",
    "crunchbase",
    "bbb",
    "apple_business_connect",
  ] as const;
  const suppliedEntitySources = new Set(
    (input.externalSources ?? []).filter(s => s.name?.trim() || s.domain?.trim()).map(s => s.source),
  );
  const hasEntityChecks = requiredEntitySources.every(source => suppliedEntitySources.has(source));
  if (!hasEntityChecks || !input.canonicalEntity) {
    missingEnterpriseInputs.push("GBP, Wikidata, Wikipedia, Crunchbase, BBB, and Apple entity checks");
  }
  if (!firstPartyTelemetry.gscBigQueryMeasured) {
    missingEnterpriseInputs.push("GSC BigQuery rows");
  }
  if (!firstPartyTelemetry.aiReferralMeasured) {
    missingEnterpriseInputs.push("GA4 AI referral conversions");
  }
  if (
    typeof input.lcpMs !== "number" ||
    typeof input.inpMs !== "number" ||
    typeof input.cls !== "number"
  ) {
    missingEnterpriseInputs.push("mobile LCP, INP, and CLS");
  }
  if (
    input.thirdPartyCitations90d === undefined ||
    input.favorableSentimentPct === undefined
  ) {
    missingEnterpriseInputs.push("90-day citation velocity and AI sentiment");
  }
  const evidenceComplete = missingEnterpriseInputs.length === 0;
  const seoEvidenceComplete =
    hydrationParity !== null &&
    Boolean(crawlLogs?.passes30DayWindow) &&
    probesComplete && hasChain && hasUrlInventory && Boolean(input.sitemapXml?.trim()) &&
    firstPartyTelemetry.passed &&
    typeof input.lcpMs === "number" &&
    typeof input.inpMs === "number" &&
    typeof input.cls === "number";
  const geoEvidenceComplete = (geoBenchmark?.documentedMatrixPrompts ?? 0) >= 25 && geoBenchmark?.documentedStages.length === 3;
  const aioEvidenceComplete =
    probesComplete && loggedRetrieval && hasEntityChecks && Boolean(input.canonicalEntity) &&
    input.thirdPartyCitations90d !== undefined &&
    input.favorableSentimentPct !== undefined;
  const seoPassed = seoScore >= 85 && seoEvidenceComplete && retrievalOk && cwvScore === 100 &&
    hydrationParity?.passed === true && redirectHygiene.passed && !redirectHygiene.hasTemporaryCanonicalRedirect &&
    input.redirectChain?.at(-1)?.status === 200 && crawlLogs?.uncrawledHighValueUrls.length === 0;
  const aeoPassed = aeoScore >= 85 && jsonLdGraph.passed && aeoRag.passed &&
    validatorsMeasured && validators.every(v => v?.errors === 0) && featuresMeasured &&
    aeoRag.capsuleComplianceRate === 100 && aeoRag.ambiguousPronounChunks === 0;
  const geoPassed = geoScore >= 80 && geoEvidenceComplete && geoFreshnessDensity.passed &&
    geoBenchmark?.passesSentimentTarget === true && jsonLdGraph.hasPersonEeat;
  const aioPassed = aioScore >= 85 && aioEvidenceComplete && retrievalOk && logsShowSuccess &&
    botGovernance.passed && crossSourceCorroboration.passesZeroConflictTarget && crossSourceCorroboration.passesConsensusVelocity;
  const scoredOverall = Math.round((seoScore + aeoScore + geoScore + aioScore) / 4);
  const overallScore = evidenceComplete ? scoredOverall : Math.min(79, scoredOverall);

  return {
    searchEvidence: input.searchEvidence ?? null,
    snippetPaaOwnershipPct,
    overallScore,
    passed:
      evidenceComplete &&
      seoPassed &&
      aeoPassed &&
      geoPassed &&
      aioPassed,
    evidenceComplete,
    layers: {
      seo: {
        id: "seo",
        name: "Layer 1: Enterprise Technical SEO & Crawl Telemetry",
        score: seoScore,
        passed: seoPassed,
        summary: `Canonical ${redirectHygiene.selfReferencingCanonicalOk ? "1:1" : "mismatch"}, ${redirectHygiene.hopCount} redirect hop(s), hydration ${hydrationParity ? `${Math.round(hydrationParity.parityRatio * 100)}%` : "unmeasured"}.`,
        remediations: seoRemediations,
      },
      aeo: {
        id: "aeo",
        name: "Layer 2: Answer Engine Optimization (RAG & Connected @graph)",
        score: aeoScore,
        passed: aeoPassed,
        summary: `${aeoRag.capsulesInRangeCount}/${aeoRag.questionHeadingCount} capsules (40-60w), ${aeoRag.pronounFreeChunkRate}% pronoun-free RAG, ${jsonLdGraph.schemaErrors.length} schema error(s).`,
        remediations: aeoRemediations,
      },
      geo: {
        id: "geo",
        name: "Layer 3: Generative Engine Optimization (Freshness, Stats & Share of Model)",
        score: geoScore,
        passed: geoPassed,
        summary: `Freshness parity ${geoFreshnessDensity.freshnessParityPassed ? "aligned" : "drifted"}, ${geoFreshnessDensity.statsPerThousandWords} stats/1k words${geoBenchmark ? `, Reference Rate ${geoBenchmark.referenceRatePct}%` : ""}.`,
        remediations: geoRemediations,
      },
      aio: {
        id: "aio",
        name: "Layer 4: AI Infrastructure & Authority Governance (Bots & Consensus)",
        score: aioScore,
        passed: aioPassed,
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
    firstPartyTelemetry,
    telemetryCoverage: {
      liveCwvMeasured:
        typeof input.lcpMs === "number" &&
        typeof input.inpMs === "number" &&
        typeof input.cls === "number",
      hydrationDiffMeasured: hydrationParity !== null,
      serverLogsIngested: crawlLogs !== null && crawlLogs.totalHits > 0,
      geoPromptRunsCount: input.geoPromptRuns?.length ?? 0,
      externalSourcesCount: input.externalSources?.length ?? 0,
      botProbesCount: input.botProbes?.length ?? 0,
      gscBigQueryRowsCount: input.gscBigQueryRows?.length ?? 0,
      aiReferralEventsCount: input.aiReferralEvents?.length ?? 0,
      missingEnterpriseInputs,
    },
  };
}
