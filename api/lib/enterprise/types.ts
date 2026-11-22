export type EnterpriseLayerId = "seo" | "aeo" | "geo" | "aio";

export type BotCategory = "search_retrieval" | "model_training" | "other";

export type FunnelIntent =
  | "decision_compare"
  | "decision_pricing"
  | "decision_eligibility"
  | "decision_localized"
  | "consideration_service"
  | "commodity_tof_glossary";

export type CitationProvenance = "owned" | "earned_third_party" | "competitor";

export type LlmEngineId =
  | "chatgpt"
  | "google_aio"
  | "google_ai_mode"
  | "perplexity"
  | "claude"
  | "copilot";

export type PromptStage = "awareness" | "consideration" | "decision";

export type SentimentLabel = "favorable" | "neutral" | "unfavorable";

export type TrainingBotPolicy = "allow" | "block";

export interface RedirectHop {
  url: string;
  status: number;
  location?: string;
}

export interface BotHttpProbeResult {
  bot: string;
  category: BotCategory;
  status: number | null;
  wafBlocked: boolean;
  challengeDetected: boolean;
  ok: boolean;
}

export interface BotRuleEvaluation {
  bot: string;
  category: BotCategory;
  purpose: string;
  explicitlyMentioned: boolean;
  disallowedInRobots: boolean;
  allowedInRobots: boolean;
  conflictingDirective?: boolean;
  httpStatus?: number | null;
  wafBlocked?: boolean;
}

export interface BotGovernanceAuditResult {
  score: number;
  passed: boolean;
  trainingPolicy: TrainingBotPolicy;
  trainingPolicyCompliant: boolean;
  sectionsSeparated: boolean;
  allRetrievalBotsAllowed: boolean;
  allTrainingBotsAllowed: boolean;
  allTrainingBotsBlocked: boolean;
  blockedRetrievalBots: string[];
  blockedTrainingBots: string[];
  conflictingBots: string[];
  missingExplicitTrainingAllow: string[];
  missingExplicitTrainingPolicy: string[];
  missingExplicitRetrievalAllow: string[];
  hasQueryParameterFence: boolean;
  missingFenceRules: string[];
  http200Bots: string[];
  wafBlockedBots: string[];
  bots: BotRuleEvaluation[];
  findings: string[];
}

export interface GscBigQueryMetricInput {
  dataDate: string;
  urlPath: string;
  queryText?: string;
  clicks: number;
  impressions: number;
  ctr: number;
  avgPosition: number;
}

export interface AiReferralMetricInput {
  sourceHost: string;
  landingPath: string;
  sessionsCount: number;
  conversionsCount: number;
  revenueAmount: number;
  recordedDate: string;
}

export interface FirstPartyTelemetryResult {
  score: number;
  passed: boolean;
  gscBigQueryMeasured: boolean;
  aiReferralMeasured: boolean;
  gsc: {
    rowCount: number;
    totalClicks: number;
    totalImpressions: number;
    weightedCtrPct: number;
    weightedAvgPosition: number | null;
    uniqueUrls: number;
    uniqueQueries: number;
    latestDataDate: string | null;
  };
  aiReferrals: {
    eventCount: number;
    sessions: number;
    conversions: number;
    conversionRatePct: number | null;
    revenue: number;
    sources: string[];
    latestRecordedDate: string | null;
  };
  findings: string[];
}

export interface CrawlLogEntry {
  /** Set by the trusted log exporter, never from the request's UA alone. */
  verifiedBot?: boolean;
  timestamp?: string;
  method?: string;
  path: string;
  status: number;
  userAgent: string;
  bytes?: number;
}

export interface CrawlLogAnalysisResult {
  totalHits: number;
  retrievalBotHits: number;
  verifiedRetrievalHits: number;
  trainingBotHits: number;
  humanOrOtherHits: number;
  statusCounts: {
    "2xx": number;
    "3xx": number;
    "4xx": number;
    "5xx": number;
  };
  non200BotRate: number;
  botHitsByAgent: Record<string, number>;
  uncrawledHighValueUrls: string[];
  searchCrawlEfficacyPct: number | null;
  verifiedRetrievalStatuses: Record<string, number[]>;
  logOrphans: string[];
  crawlTrapUrls: string[];
  crawlWastePercent: number;
  crawlToCitationRatio: number | null;
  crawlToCitationStatus: "healthy" | "overcrawled_low_citation" | "under_crawled" | "unmeasured";
  logCoverageDays: number | null;
  passes30DayWindow: boolean;
}

export interface HydrationParityResult {
  score: number;
  passed: boolean;
  rawWordCount: number;
  renderedWordCount: number;
  parityRatio: number;
  rawHeadings: string[];
  renderedHeadings: string[];
  missingInRawHeadings: string[];
  missingInRenderedHeadings: string[];
  clientOnlyInternalLinks: string[];
  clientOnlyTables: number;
  rawSchemaTypes: string[];
  renderedSchemaTypes: string[];
  clientOnlyJsonLd: string[];
  rawCanonical: string | null;
  renderedCanonical: string | null;
  emptyRootDetected: boolean;
  contentReplacedDuringHydration: boolean;
  findings: string[];
}

export interface RedirectCanonicalHygieneResult {
  score: number;
  passed: boolean;
  hopCount: number;
  hasMultiHopChain: boolean;
  hasTemporaryCanonicalRedirect: boolean;
  hasUrlFragments: boolean;
  hasUppercasePath: boolean;
  declaredCanonical: string | null;
  selfReferencingCanonicalOk: boolean;
  usesSitemapIndex: boolean;
  sitemapUrlsMissingLastmod: number;
  sitemapLastmodValid: boolean;
  findings: string[];
}

export interface AnswerCapsuleItem {
  heading: string;
  headingLevel: "h2" | "h3";
  anchorId: string | null;
  wordCount: number;
  inTargetRange: boolean;
  excerpt: string;
}

export interface AeoRagAuditResult {
  score: number;
  passed: boolean;
  questionHeadingCount: number;
  capsulesInRangeCount: number;
  capsuleComplianceRate: number;
  hasSummaryAnchors: boolean;
  capsules: AnswerCapsuleItem[];
  ragChunkCount: number;
  ambiguousPronounChunks: number;
  pronounFreeChunkRate: number;
  flaggedChunks: string[];
  funnelIntent: FunnelIntent;
  isDownFunnelPage: boolean;
  hasComparisonOrPricingMatrix: boolean;
  findings: string[];
}

export interface JsonLdGraphValidationResult {
  score: number;
  passed: boolean;
  blockCount: number;
  parseErrors: string[];
  schemaOrgContextValid: boolean;
  duplicateChildContexts: number;
  nodeCount: number;
  nodeTypes: string[];
  definedIds: string[];
  danglingIdRefs: string[];
  hasConnectedCoreGraph: boolean;
  hasPersonEeat: boolean;
  personCredentialDetails: {
    hasName: boolean;
    hasWorksFor: boolean;
    hasCredential: boolean;
    institutionalSameAs: string[];
  };
  normalizedWikidataUris: string[];
  invalidScholarlyQids: string[];
  schemaErrors: string[];
}

export interface GeoPromptRunInput {
  prompt: string;
  promptSource?: string;
  citations?: { url: string; provenance: CitationProvenance }[];
  stage: PromptStage;
  engine: LlmEngineId;
  citedBrand: boolean;
  competitorCitations: number;
  provenance: CitationProvenance;
  sentiment: SentimentLabel;
}

export interface GeoPromptBenchmarkResult {
  totalRuns: number;
  uniquePromptsCount: number;
  enginesCovered: LlmEngineId[];
  referenceRatePct: number;
  shareOfModelPct: number;
  provenanceBreakdown: {
    owned: number;
    earnedThirdParty: number;
    competitor: number;
  };
  sentimentBreakdown: {
    favorable: number;
    neutral: number;
    unfavorable: number;
    favorablePct: number;
  };
  byStage: Record<PromptStage, { runs: number; referenceRatePct: number }>;
  byEngine: Record<string, { runs: number; referenceRatePct: number }>;
  passes25PromptMinimum: boolean;
  passes5EngineMinimum: boolean;
  documentedMatrixPrompts: number;
  documentedStages: PromptStage[];
  brandCitationCount: number;
  earnedCitationDomains: Record<string, number>;
  passesSentimentTarget: boolean;
}

export interface GeoPageFreshnessAndDensityResult {
  score: number;
  passed: boolean;
  wordCount: number;
  quantitativeClaimsCount: number;
  statsPerThousandWords: number;
  visibleLastUpdated: string | null;
  schemaDateModified: string | null;
  freshnessParityPassed: boolean;
  ageDays: number | null;
  findings: string[];
}

export type ExternalEntitySourceType =
  | "gbp"
  | "wikidata"
  | "wikipedia"
  | "crunchbase"
  | "bbb"
  | "apple_business_connect"
  | "aggregator";

export interface CanonicalEntityProfile {
  name: string;
  domain: string;
  phone?: string;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  services?: string[];
  credentials?: string[];
}

export interface ExternalEntitySnapshot {
  source: ExternalEntitySourceType;
  name?: string;
  domain?: string;
  phone?: string;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  services?: string[];
  credentials?: string[];
}

export interface EntityConflict {
  source: ExternalEntitySourceType;
  field: string;
  expected: string;
  actual: string;
  severity: "critical" | "warning";
}

export interface CrossSourceCorroborationResult {
  score: number;
  passed: boolean;
  sourcesChecked: ExternalEntitySourceType[];
  entityConflictCount: number;
  conflicts: EntityConflict[];
  thirdPartyCitations90d: number;
  favorableSentimentPct: number;
  passesZeroConflictTarget: boolean;
  passesConsensusVelocity: boolean;
}

export interface EnterpriseLayerSummary {
  id: EnterpriseLayerId;
  name: string;
  score: number;
  passed: boolean;
  summary: string;
  remediations: string[];
}

export interface ExternalSearchEvidence {
  richResults?: { reference: string; errors: number };
  schemaOrg?: { reference: string; errors: number };
  searchFeatures?: { reference: string; opportunities: number; owned: number };
}

export interface Enterprise4LayerReport {
  searchEvidence: ExternalSearchEvidence | null;
  snippetPaaOwnershipPct: number | null;
  overallScore: number;
  passed: boolean;
  evidenceComplete: boolean;
  layers: {
    seo: EnterpriseLayerSummary;
    aeo: EnterpriseLayerSummary;
    geo: EnterpriseLayerSummary;
    aio: EnterpriseLayerSummary;
  };
  botGovernance: BotGovernanceAuditResult;
  hydrationParity: HydrationParityResult | null;
  redirectHygiene: RedirectCanonicalHygieneResult;
  crawlLogs: CrawlLogAnalysisResult | null;
  aeoRag: AeoRagAuditResult;
  jsonLdGraph: JsonLdGraphValidationResult;
  geoFreshnessDensity: GeoPageFreshnessAndDensityResult;
  geoBenchmark: GeoPromptBenchmarkResult | null;
  crossSourceCorroboration: CrossSourceCorroborationResult;
  firstPartyTelemetry: FirstPartyTelemetryResult;
  telemetryCoverage: {
    liveCwvMeasured: boolean;
    hydrationDiffMeasured: boolean;
    serverLogsIngested: boolean;
    geoPromptRunsCount: number;
    externalSourcesCount: number;
    botProbesCount: number;
    gscBigQueryRowsCount: number;
    aiReferralEventsCount: number;
    missingEnterpriseInputs: string[];
  };
}
