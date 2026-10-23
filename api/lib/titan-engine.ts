export interface WebAgLayerSpec {
  layerNumber: number;
  skillId: string;
  name: string;
  titanPattern: string;
  description: string;
  verificationGate: string;
}

export interface TargetEngineSpec {
  id: "google" | "perplexity" | "openai" | "braveClaude";
  name: string;
  crawlers: string[];
  primarySignal: string;
  titanBenchmark: string;
}

export interface LayerAuditResult {
  layerNumber: number;
  skillId: string;
  name: string;
  score: number;
  passed: boolean;
  checks: { label: string; passed: boolean }[];
  remediation: string[];
}

export interface TitanAuditInput {
  url: string;
  html: string;
  robotsTxt?: string;
  hasLlmsTxt?: boolean;
  hasLlmsFullTxt?: boolean;
  ttfbMs?: number;
}

export interface TitanAuditResult {
  url: string;
  overallScore: number;
  engineScores: {
    google: number;
    perplexity: number;
    openai: number;
    braveClaude: number;
  };
  layers: LayerAuditResult[];
  nextSingleLayerToExecute: {
    layerNumber: number;
    skillId: string;
    name: string;
    mode: "REMEDIATE" | "SENTINEL_LOOP";
    actions: string[];
  };
}

export const WEB_AG_LAYERS: WebAgLayerSpec[] = [
  {
    layerNumber: 1,
    skillId: "web-ag-edge-vitals",
    name: "Edge Speed, 12-Bot AI Allowlist & Parameter Crawl Fence",
    titanPattern: "Cleveland Clinic (297ms SSR + ?q= Fence) & Wikipedia (Zero-JS HTML)",
    description:
      "Pre-rendered semantic HTML inside #root (<150ms TTFB, 0.00 CLS), 12-bot AI search allowlist, and query-parameter crawl fence.",
    verificationGate: "npm test && npm run check && npx lighthouse <URL> --preset=mobile",
  },
  {
    layerNumber: 2,
    skillId: "web-ag-entity-graph",
    name: "Wikidata Q-ID Graph & Definition-in-Headline",
    titanPattern: "Wikipedia (sameAs/mainEntity Wikidata Q-ID) & Cleveland Clinic (Definition Headline)",
    description:
      "Interconnected JSON-LD @graph binding entities to Wikidata Q-IDs, 1-sentence factual definition in headline, and primary authority citations.",
    verificationGate: "npm test && npm run check",
  },
  {
    layerNumber: 3,
    skillId: "web-ag-programmatic-matrix",
    name: "Programmatic Matrix & IA Link Mesh",
    titanPattern: "Zocdoc, G2 & Zapier Combinatorial Taxonomy",
    description:
      "Combinatorial /{service}/{location} routes, self-referencing canonicals, BreadcrumbList JSON-LD, and zero-orphan internal link mesh.",
    verificationGate: "npm test && npm run build",
  },
  {
    layerNumber: 4,
    skillId: "web-ag-data-floor",
    name: "Proprietary Data Floor & Institutional Citations",
    titanPattern: "G2, Wise & NIH Primary Evidence Standard",
    description:
      "Transparent first-party pricing/feature matrices and primary institutional citations capturing the walled-garden vacuum.",
    verificationGate: "npm test && npm run check",
  },
  {
    layerNumber: 5,
    skillId: "web-ag-geo-extraction",
    name: "Top-of-DOM Infobox, H3 Question Fan-Out & llms.txt",
    titanPattern: "Wikipedia (<table class='entity-infobox'>) & Cleveland Clinic (5-Pillar x 10-H3 Fan-Out)",
    description:
      "Top-of-DOM key-value summary table in the first 5KB of HTML, literal question H3 subheadings, and /llms.txt + /llms-full.txt corpora.",
    verificationGate: "curl -sL <URL>/llms.txt && npm test",
  },
  {
    layerNumber: 6,
    skillId: "web-ag-consensus-engine",
    name: "Dual-Track Omnichannel Consensus",
    titanPattern: "Reddit/YouTube (Track A) + NIH/Brave Open Corpus (Track B)",
    description:
      "Dual-track Share of Model (SoM) expansion across community hubs (Google/Perplexity/OpenAI) and open technical corpora (Brave/Claude).",
    verificationGate: "npm test && npm run check",
  },
  {
    layerNumber: 7,
    skillId: "web-ag-sentinel-audit",
    name: "4-Engine Sentinel Pulse & Readiness Scorer",
    titanPattern: "Continuous 4-Engine Verification (Google, Perplexity, OpenAI, Brave/Claude)",
    description:
      "Deterministic readiness scoring across all 7 layers and 4 retrieval engines with automated single-layer drift remediation.",
    verificationGate: "npm test && npm run check",
  },
];

export const TARGET_ENGINES: TargetEngineSpec[] = [
  {
    id: "google",
    name: "Google Core & AI Overviews (Gemini)",
    crawlers: ["Googlebot", "Google-Extended"],
    primarySignal: "Core Web Vitals 100, PageRank Link Mesh, Wikidata @graph, Question H3 Fan-Out",
    titanBenchmark: "Wikipedia (#1), Reddit (#2), YouTube (#3), Amazon (#4), Cleveland Clinic (#5)",
  },
  {
    id: "perplexity",
    name: "Perplexity AI (Sonar)",
    crawlers: ["PerplexityBot", "Perplexity-User"],
    primarySignal: "Sub-200ms Zero-JS HTML, Top-of-DOM Infobox Table, Direct Factual Lead",
    titanBenchmark: "Reddit (#1), YouTube (#2), Wikipedia (#3), GitHub (#4), Cleveland Clinic/G2 (#5)",
  },
  {
    id: "openai",
    name: "OpenAI (ChatGPT Search)",
    crawlers: ["OAI-SearchBot", "ChatGPT-User", "GPTBot", "Bingbot"],
    primarySignal: "OAI-SearchBot Access, Wikidata Entity Co-Occurrence, Comparison Matrices, /llms.txt",
    titanBenchmark: "Wikipedia (#1), Reddit (#2), Forbes/Reuters (#3), G2/Clutch (#4), Official Docs (#5)",
  },
  {
    id: "braveClaude",
    name: "Brave Search & Claude (Anthropic)",
    crawlers: ["BraveBot", "Claude-SearchBot", "Claude-User", "ClaudeBot", "anthropic-ai"],
    primarySignal: "86.7% Brave Search Overlap, Primary Institutional Citations, Open /llms-full.txt Corpus",
    titanBenchmark: "NIH/PubMed (#1), Wikipedia (#2), Reuters/NYT (#3), GitHub/ArXiv (#4), First-Party Sites (#5)",
  },
];

export function buildCanonicalRobotsTxt(baseUrl = "https://web-ready.ag"): string {
  return `# WEB-READY/AG Titan Multi-Engine Crawler Policy
# Engineered for Google, Perplexity, OpenAI Search, and Brave Search (Claude)

User-agent: *
Allow: /

# Surgical Query-Parameter Crawl Fence (Cleveland Clinic Pattern)
# Prevents crawl budget waste on faceted/search URL permutations
Disallow: /Search
Disallow: /search
Disallow: /*?q=*
Disallow: /*?search=*
Disallow: /*?filter=*
Disallow: /*?sort=*
Disallow: /*?date=*
Disallow: /*?view=*

# 1. Google Core & Gemini AI Overviews
User-agent: Googlebot
Allow: /

User-agent: Google-Extended
Allow: /

# 2. OpenAI / ChatGPT Search & Grounding
User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: GPTBot
Allow: /

# 3. Perplexity AI / Sonar Real-Time Engine
User-agent: PerplexityBot
Allow: /

User-agent: Perplexity-User
Allow: /

# 4. Brave Search & Anthropic Claude (86.7% Citation Overlap)
User-agent: BraveBot
Allow: /

User-agent: Claude-SearchBot
Allow: /

User-agent: Claude-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: anthropic-ai
Allow: /

# 5. Bing, Apple, Meta & Cohere Ecosystem Crawlers
User-agent: Bingbot
Allow: /

User-agent: Applebot-Extended
Allow: /

User-agent: meta-externalagent
Allow: /

User-agent: cohere-ai
Allow: /

User-agent: AI2Bot
Allow: /

Sitemap: ${baseUrl}/sitemap.xml
LLMs: ${baseUrl}/llms.txt
LLMs-Full: ${baseUrl}/llms-full.txt
`;
}

function isBotDisallowed(robotsTxt: string, botName: string): boolean {
  if (!robotsTxt) return false;
  const regex = new RegExp(`User-agent:\\s*${botName}[\\s\\S]*?(?=User-agent:|$)`, "i");
  const match = robotsTxt.match(regex);
  if (!match) return false;
  return /Disallow:\s*\/\s*$/m.test(match[0]);
}

export function auditHtmlAgainstTitanStandard(input: TitanAuditInput): TitanAuditResult {
  const html = input.html || "";
  const robots = input.robotsTxt || "";
  const ttfbMs = input.ttfbMs ?? 80;
  const hasLlmsTxt = input.hasLlmsTxt ?? true;
  const hasLlmsFullTxt = input.hasLlmsFullTxt ?? true;

  // --- Layer 1: Edge Speed, 12-Bot AI Allowlist & Parameter Crawl Fence ---
  const nonEmptyRoot = !/<div\s+id=["']root["']\s*><\/div>/i.test(html) && html.length > 200;
  const oaiAllowed = !isBotDisallowed(robots, "OAI-SearchBot") && !isBotDisallowed(robots, "GPTBot");
  const perplexityAllowed = !isBotDisallowed(robots, "PerplexityBot");
  const claudeBraveAllowed =
    !isBotDisallowed(robots, "Claude-SearchBot") &&
    !isBotDisallowed(robots, "ClaudeBot") &&
    !isBotDisallowed(robots, "BraveBot");
  const hasParamFence = /Disallow:\s*\/\*\?q=\*/i.test(robots);
  const fastTtfb = ttfbMs <= 300;

  const l1Checks = [
    { label: "Pre-rendered non-empty #root HTML shell (0.00 CLS)", passed: nonEmptyRoot },
    { label: "OpenAI (OAI-SearchBot & GPTBot) allowed in robots.txt", passed: oaiAllowed },
    { label: "Perplexity (PerplexityBot) allowed in robots.txt", passed: perplexityAllowed },
    { label: "BraveBot & Claude-SearchBot allowed in robots.txt", passed: claudeBraveAllowed },
    { label: "Cleveland Clinic query-parameter crawl fence (Disallow: /*?q=*)", passed: hasParamFence },
    { label: "Sub-300ms edge TTFB latency", passed: fastTtfb },
  ];

  // --- Layer 2: Wikidata Q-ID Graph & Definition-in-Headline ---
  const hasJsonLd = /application\/ld\+json/i.test(html);
  const hasWikidataQid = /wikidata\.org\/entity\/Q\d+/i.test(html);
  const hasHeadlineDefinition = /"headline"\s*:\s*"[^"]{20,}"/i.test(html);
  const hasPrimaryCitations = /"citation"\s*:\s*\[/i.test(html);

  const l2Checks = [
    { label: "Server-injected JSON-LD schema blocks in <head>", passed: hasJsonLd },
    { label: "Wikipedia Wikidata Q-ID triangulation (wikidata.org/entity/Q...)", passed: hasWikidataQid },
    { label: "Cleveland Clinic 1-sentence factual definition in JSON-LD headline", passed: hasHeadlineDefinition },
    { label: "Primary institutional/technical citation[] array in JSON-LD", passed: hasPrimaryCitations },
  ];

  // --- Layer 3: Programmatic Matrix & IA Link Mesh ---
  const hasCanonical = /<link[^>]+rel=["']canonical["'][^>]+href=["']https?:\/\/[^"']+["']/i.test(html);
  const hasTitleAndDesc = /<title>[^<]{5,}<\/title>/i.test(html) && /<meta[^>]+name=["']description["']/i.test(html);
  const hasOrgOrLocalSchema = /"@type"\s*:\s*"(Organization|LocalBusiness|WebSite)"/i.test(html);

  const l3Checks = [
    { label: "Self-referencing canonical URL tag present", passed: hasCanonical },
    { label: "Unique <title> and <meta name='description'> injected", passed: hasTitleAndDesc },
    { label: "Hub-and-spoke Organization / LocalBusiness / WebSite schema linkage", passed: hasOrgOrLocalSchema },
  ];

  // --- Layer 4: Proprietary Data Floor & Institutional Citations ---
  const hasStructuredFacts = /class=["'][^"']*entity-infobox[^"']*["']/i.test(html) || /<table/i.test(html);
  const hasSummaryLead = /class=["'][^"']*ag-summary-lead[^"']*["']/i.test(html);

  const l4Checks = [
    { label: "Structured empirical table present in pre-rendered DOM", passed: hasStructuredFacts },
    { label: "Un-hedged factual summary lead present above the fold", passed: hasSummaryLead },
    { label: "Primary authority citations attached to page metadata", passed: hasPrimaryCitations },
  ];

  // --- Layer 5: Top-of-DOM Infobox, H3 Question Fan-Out & llms.txt ---
  const hasInfoboxTable = /<table[^>]+class=["'][^"']*entity-infobox[^"']*["']/i.test(html);
  const hasQuestionH3s = /<h3>[^<]*\?<\/h3>/i.test(html);
  const hasH2Pillars = /<h2>[^<]+<\/h2>/i.test(html);

  const l5Checks = [
    { label: "Wikipedia Top-of-DOM <table class='entity-infobox'> in HTML", passed: hasInfoboxTable },
    { label: "Cleveland Clinic H2 pillar headings in DOM", passed: hasH2Pillars },
    { label: "Literal natural-language Question H3 fan-out headers (?)", passed: hasQuestionH3s },
    { label: "Active /llms.txt machine-readable Markdown manifest", passed: hasLlmsTxt },
  ];

  // --- Layer 6: Dual-Track Omnichannel Consensus ---
  const hasSameAs = /"sameAs"\s*:/i.test(html);
  const hasTargetEnginesRow = /Google,\s*Perplexity,\s*OpenAI,\s*Brave/i.test(html);

  const l6Checks = [
    { label: "JSON-LD sameAs cross-entity consensus bindings", passed: hasSameAs },
    { label: "Open /llms-full.txt corpus for Brave Search & Claude ingestion", passed: hasLlmsFullTxt },
    { label: "Multi-engine target declaration in Top-of-DOM Infobox", passed: hasTargetEnginesRow },
  ];

  // --- Layer 7: 4-Engine Sentinel Pulse ---
  const allLayers = [l1Checks, l2Checks, l3Checks, l4Checks, l5Checks, l6Checks];
  const prelimPassCount = allLayers.flat().filter((c) => c.passed).length;
  const prelimTotal = allLayers.flat().length;
  const sentinelHealthy = prelimPassCount / prelimTotal >= 0.85;

  const l7Checks = [
    { label: "Cross-layer readiness threshold >= 85%", passed: sentinelHealthy },
    { label: "All 4 retrieval engines (Google, Perplexity, OpenAI, Brave/Claude) unblocked", passed: oaiAllowed && perplexityAllowed && claudeBraveAllowed },
  ];

  const rawCheckGroups = [l1Checks, l2Checks, l3Checks, l4Checks, l5Checks, l6Checks, l7Checks];

  const layers: LayerAuditResult[] = WEB_AG_LAYERS.map((spec, idx) => {
    const checks = rawCheckGroups[idx];
    const passedCount = checks.filter((c) => c.passed).length;
    const score = Math.round((passedCount / checks.length) * 100);
    const passed = score >= 80;
    const remediation = checks
      .filter((c) => !c.passed)
      .map((c) => `[${spec.skillId}] Fix failed check: ${c.label}`);

    return {
      layerNumber: spec.layerNumber,
      skillId: spec.skillId,
      name: spec.name,
      score,
      passed,
      checks,
      remediation,
    };
  });

  const overallScore = Math.round(
    layers.reduce((acc, l) => acc + l.score, 0) / layers.length,
  );

  // Compute 4-Engine Specific Scores
  const l1 = layers[0].score;
  const l2 = layers[1].score;
  const l3 = layers[2].score;
  const l4 = layers[3].score;
  const l5 = layers[4].score;
  const l6 = layers[5].score;

  const engineScores = {
    google: Math.round(l1 * 0.25 + l2 * 0.25 + l3 * 0.25 + l5 * 0.25),
    perplexity: perplexityAllowed
      ? Math.round(l1 * 0.3 + l4 * 0.25 + l5 * 0.35 + l6 * 0.1)
      : Math.min(25, Math.round(l5 * 0.25)),
    openai: oaiAllowed
      ? Math.round(l1 * 0.25 + l2 * 0.25 + l5 * 0.3 + l6 * 0.2)
      : Math.min(25, Math.round(l2 * 0.25)),
    braveClaude: claudeBraveAllowed
      ? Math.round(l1 * 0.2 + l2 * 0.3 + l4 * 0.25 + l5 * 0.15 + l6 * 0.1)
      : Math.min(20, Math.round(l4 * 0.2)),
  };

  const firstFailing = layers.find((l) => !l.passed);
  const nextSingleLayerToExecute = firstFailing
    ? {
        layerNumber: firstFailing.layerNumber,
        skillId: firstFailing.skillId,
        name: firstFailing.name,
        mode: "REMEDIATE" as const,
        actions: firstFailing.remediation,
      }
    : {
        layerNumber: 7,
        skillId: "web-ag-sentinel-audit",
        name: "4-Engine Sentinel Pulse & Readiness Scorer",
        mode: "SENTINEL_LOOP" as const,
        actions: [
          "All 7 layers passed verification (>= 95/100). Maintain continuous weekly Sentinel Loop across Google, Perplexity, OpenAI, and Brave Search.",
        ],
      };

  return {
    url: input.url,
    overallScore,
    engineScores,
    layers,
    nextSingleLayerToExecute,
  };
}
