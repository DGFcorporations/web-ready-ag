import type {
  BotCategory,
  BotGovernanceAuditResult,
  BotHttpProbeResult,
  BotRuleEvaluation,
} from "./types";

export interface KnownBotSpec {
  id: string;
  category: BotCategory;
  purpose: string;
  matchPattern: RegExp;
}

export const SEARCH_RETRIEVAL_BOTS: KnownBotSpec[] = [
  {
    id: "Googlebot",
    category: "search_retrieval",
    purpose: "Google Search, AI Overviews & AI Mode retrieval",
    matchPattern: /\bGooglebot\b/i,
  },
  {
    id: "Bingbot",
    category: "search_retrieval",
    purpose: "Microsoft Bing & Copilot search grounding",
    matchPattern: /\bBingbot\b/i,
  },
  {
    id: "OAI-SearchBot",
    category: "search_retrieval",
    purpose: "OpenAI ChatGPT Search retrieval & live citations",
    matchPattern: /\bOAI-SearchBot\b/i,
  },
  {
    id: "ChatGPT-User",
    category: "search_retrieval",
    purpose: "ChatGPT real-time user browsing & citation fetch",
    matchPattern: /\bChatGPT-User\b/i,
  },
  {
    id: "PerplexityBot",
    category: "search_retrieval",
    purpose: "Perplexity live search index & RAG retrieval",
    matchPattern: /\bPerplexityBot\b/i,
  },
  {
    id: "Perplexity-User",
    category: "search_retrieval",
    purpose: "Perplexity user-triggered real-time page fetch",
    matchPattern: /\bPerplexity-User\b/i,
  },
  {
    id: "Claude-SearchBot",
    category: "search_retrieval",
    purpose: "Anthropic Claude web search & citation retrieval",
    matchPattern: /\bClaude-SearchBot\b/i,
  },
  {
    id: "Claude-User",
    category: "search_retrieval",
    purpose: "Claude real-time user browsing & citation fetch",
    matchPattern: /\bClaude-User\b/i,
  },
  {
    id: "BraveBot",
    category: "search_retrieval",
    purpose: "Brave Search & Leo answer grounding",
    matchPattern: /\bBraveBot\b/i,
  },
  {
    id: "Applebot",
    category: "search_retrieval",
    purpose: "Apple Search, Siri & Spotlight retrieval",
    matchPattern: /\bApplebot\b(?!-Extended)/i,
  },
  {
    id: "DuckAssistBot",
    category: "search_retrieval",
    purpose: "DuckDuckGo DuckAssist answer grounding",
    matchPattern: /\bDuckAssistBot\b/i,
  },
];

export const TRAINING_CRAWLER_BOTS: KnownBotSpec[] = [
  {
    id: "GPTBot",
    category: "model_training",
    purpose: "OpenAI foundation model training (explicitly allowed — zero penalty policy)",
    matchPattern: /\bGPTBot\b/i,
  },
  {
    id: "Google-Extended",
    category: "model_training",
    purpose: "Gemini model training & grounding control (explicitly allowed — zero penalty policy)",
    matchPattern: /\bGoogle-Extended\b/i,
  },
  {
    id: "CCBot",
    category: "model_training",
    purpose: "Common Crawl pre-training corpus (explicitly allowed — zero penalty policy)",
    matchPattern: /\bCCBot\b/i,
  },
  {
    id: "anthropic-ai",
    category: "model_training",
    purpose: "Anthropic model training corpus (explicitly allowed — zero penalty policy)",
    matchPattern: /\banthropic-ai\b/i,
  },
  {
    id: "ClaudeBot",
    category: "model_training",
    purpose: "Anthropic Claude model crawler (explicitly allowed — zero penalty policy)",
    matchPattern: /\bClaudeBot\b/i,
  },
  {
    id: "Applebot-Extended",
    category: "model_training",
    purpose: "Apple Intelligence foundation model training (explicitly allowed — zero penalty policy)",
    matchPattern: /\bApplebot-Extended\b/i,
  },
  {
    id: "Amazonbot",
    category: "model_training",
    purpose: "Amazon Alexa / Rufus AI crawler (explicitly allowed)",
    matchPattern: /\bAmazonbot\b/i,
  },
  {
    id: "Claude-Web",
    category: "model_training",
    purpose: "Anthropic web ingestion crawler (explicitly allowed)",
    matchPattern: /\bClaude-Web\b/i,
  },
  {
    id: "meta-externalagent",
    category: "model_training",
    purpose: "Meta AI external indexing & training crawler (explicitly allowed)",
    matchPattern: /\bmeta-externalagent\b/i,
  },
  {
    id: "cohere-ai",
    category: "model_training",
    purpose: "Cohere enterprise retrieval & training crawler (explicitly allowed)",
    matchPattern: /\bcohere-ai\b/i,
  },
  {
    id: "AI2Bot",
    category: "model_training",
    purpose: "Allen Institute AI2 open corpus crawler (explicitly allowed)",
    matchPattern: /\bAI2Bot\b/i,
  },
];

export const REQUIRED_QUERY_FENCE_RULES = [
  "/*?q=*",
  "/*?search=*",
  "/*?filter=*",
  "/*?sort=*",
  "/*?date=*",
  "/*?view=*",
  "/*?utm_*=*",
  "/*?session=*",
];

interface RobotsGroup {
  agents: string[];
  allow: string[];
  disallow: string[];
}

function parseRobotsGroups(robotsTxt: string): RobotsGroup[] {
  const groups: RobotsGroup[] = [];
  let currentAgents: string[] = [];
  let currentAllow: string[] = [];
  let currentDisallow: string[] = [];
  let inRules = false;

  const flush = () => {
    if (currentAgents.length > 0) {
      groups.push({
        agents: currentAgents,
        allow: currentAllow,
        disallow: currentDisallow,
      });
    }
    currentAgents = [];
    currentAllow = [];
    currentDisallow = [];
    inRules = false;
  };

  for (const rawLine of robotsTxt.split(/\r?\n/)) {
    const noComment = rawLine.replace(/#.*$/, "").trim();
    if (!noComment) {
      if (currentAgents.length > 0 && inRules) flush();
      continue;
    }
    const colon = noComment.indexOf(":");
    if (colon === -1) continue;
    const key = noComment.slice(0, colon).trim().toLowerCase();
    const val = noComment.slice(colon + 1).trim();

    if (key === "user-agent") {
      if (inRules) flush();
      if (val) currentAgents.push(val.toLowerCase());
    } else if (key === "disallow") {
      inRules = true;
      currentDisallow.push(val);
    } else if (key === "allow") {
      inRules = true;
      currentAllow.push(val);
    }
  }
  flush();
  return groups;
}

export function evaluateBotInRobots(
  robotsTxt: string,
  botName: string,
): { explicitlyMentioned: boolean; disallowed: boolean; allowedRoot: boolean; conflicting: boolean } {
  const groups = parseRobotsGroups(robotsTxt);
  const needle = botName.toLowerCase();
  const specific = groups.filter((g) => g.agents.includes(needle));
  const wildcard = groups.filter((g) => g.agents.includes("*"));
  const applicable = specific.length > 0 ? specific : wildcard;

  const allowAll = applicable.some((g) => g.allow.some((p) => p === "/" || p === "/*"));
  const disallowAll = applicable.some((g) => g.disallow.some((p) => p === "/" || p === "/*"));
  const conflicting = allowAll && disallowAll;

  return {
    explicitlyMentioned: specific.length > 0,
    disallowed: disallowAll && !allowAll,
    allowedRoot: (allowAll || (specific.length > 0 && !disallowAll)) && !conflicting,
    conflicting,
  };
}

export function classifyBotUserAgent(userAgent: string): {
  bot: string;
  category: BotCategory;
} {
  for (const spec of SEARCH_RETRIEVAL_BOTS) {
    if (spec.matchPattern.test(userAgent)) {
      return { bot: spec.id, category: "search_retrieval" };
    }
  }
  for (const spec of TRAINING_CRAWLER_BOTS) {
    if (spec.matchPattern.test(userAgent)) {
      return { bot: spec.id, category: "model_training" };
    }
  }
  return { bot: "human_or_other", category: "other" };
}

export function buildEnterpriseRobotsTxt(
  baseUrl = "https://web-ready.ag",
  options?: { allowTraining?: boolean },
): string {
  const cleanOrigin = baseUrl.replace(/\/+$/, "");
  const allowTraining = options?.allowTraining !== false;
  const lines: string[] = [
    "# Enterprise 4-Layer Search Visibility (SEO, AEO, GEO, AIO) robots.txt",
    "# Generated by WEB-READY/AG — Retrieval & Training Crawlers Separated & Explicitly Allowed",
    "",
    "# Section 1: Live Search & Citation Retrieval Bots (Allowed)",
    ...SEARCH_RETRIEVAL_BOTS.flatMap((bot) => [
      `User-agent: ${bot.id}`,
      "Allow: /",
      "Disallow: /Search",
      "Disallow: /search",
      "",
    ]),
    "# Section 2: Foundation Model Training Crawlers (Explicitly Allowed — Zero Penalty Policy)",
    ...TRAINING_CRAWLER_BOTS.flatMap((bot) => [
      `User-agent: ${bot.id}`,
      allowTraining ? "Allow: /" : "Disallow: /",
      "",
    ]),
    "# Section 3: Wildcard Default & Parameterized Search Crawl Fence",
    "User-agent: *",
    "Allow: /",
    "Disallow: /Search",
    "Disallow: /search",
    ...REQUIRED_QUERY_FENCE_RULES.map((rule) => `Disallow: ${rule}`),
    "Disallow: /admin",
    "Disallow: /checkout",
    "Disallow: /api/",
    "",
    "# Canonical XML Sitemap Index & LLM Ingestion Endpoints",
    `Sitemap: ${cleanOrigin}/sitemap.xml`,
    `# LLMs Corpus: ${cleanOrigin}/llms.txt`,
    `# Full LLMs Corpus: ${cleanOrigin}/llms-full.txt`,
    "",
  ];
  return lines.join("\n");
}

export function auditBotGovernance(
  robotsTxt = "",
  httpProbes: BotHttpProbeResult[] = [],
): BotGovernanceAuditResult {
  const probeMap = new Map<string, BotHttpProbeResult>();
  for (const p of httpProbes) {
    probeMap.set(p.bot.toLowerCase(), p);
  }

  const allSpecs = [...SEARCH_RETRIEVAL_BOTS, ...TRAINING_CRAWLER_BOTS];
  const bots: BotRuleEvaluation[] = allSpecs.map((spec) => {
    const evalRes = evaluateBotInRobots(robotsTxt, spec.id);
    const probe = probeMap.get(spec.id.toLowerCase());
    return {
      bot: spec.id,
      category: spec.category,
      purpose: spec.purpose,
      explicitlyMentioned: evalRes.explicitlyMentioned,
      disallowedInRobots: evalRes.disallowed,
      allowedInRobots: !evalRes.disallowed && !evalRes.conflicting && (evalRes.allowedRoot || evalRes.explicitlyMentioned),
      conflictingDirective: evalRes.conflicting,
      httpStatus: probe?.status,
      wafBlocked: probe?.wafBlocked,
    };
  });

  const blockedRetrievalBots = bots
    .filter((b) => b.category === "search_retrieval" && b.disallowedInRobots)
    .map((b) => b.bot);

  const blockedTrainingBots = bots
    .filter((b) => b.category === "model_training" && b.disallowedInRobots)
    .map((b) => b.bot);

  const conflictingBots = bots
    .filter((b) => b.conflictingDirective)
    .map((b) => b.bot);

  const missingExplicitRetrievalAllow = bots
    .filter((b) => b.category === "search_retrieval" && !b.explicitlyMentioned)
    .map((b) => b.bot);

  const missingExplicitTrainingAllow = bots
    .filter((b) => b.category === "model_training" && !b.explicitlyMentioned)
    .map((b) => b.bot);

  const coreFenceRules = ["/*?q=*", "/*?search=*", "/*?filter=*", "/*?sort=*", "/*?date=*", "/*?view=*"];
  const missingFenceRules = coreFenceRules.filter((rule) => !robotsTxt.includes(rule));
  const hasQueryParameterFence = missingFenceRules.length === 0;

  const retrievalMentionedCount = bots.filter(
    (b) => b.category === "search_retrieval" && b.explicitlyMentioned,
  ).length;
  const trainingMentionedCount = bots.filter(
    (b) => b.category === "model_training" && b.explicitlyMentioned,
  ).length;

  const hasSectionHeaders =
    /Section 1|Search & Citation Retrieval|Retrieval Bots/i.test(robotsTxt) &&
    /Section 2|Training Crawlers|Model Training/i.test(robotsTxt);

  const sectionsSeparated =
    hasSectionHeaders || (retrievalMentionedCount >= 4 && trainingMentionedCount >= 4);

  const http200Bots = httpProbes
    .filter((p) => p.ok && p.status === 200 && !p.wafBlocked)
    .map((p) => p.bot);

  const wafBlockedBots = httpProbes
    .filter((p) => p.wafBlocked || p.challengeDetected || p.status === 403 || p.status === 429)
    .map((p) => p.bot);

  const allRetrievalBotsAllowed =
    blockedRetrievalBots.length === 0 &&
    !conflictingBots.some((bot) => SEARCH_RETRIEVAL_BOTS.some((s) => s.id === bot));
  const allTrainingBotsAllowed =
    blockedTrainingBots.length === 0 &&
    !conflictingBots.some((bot) => TRAINING_CRAWLER_BOTS.some((s) => s.id === bot));

  let score = 100;
  const findings: string[] = [];

  if (!robotsTxt.trim()) {
    score = 0;
    findings.push("Missing /robots.txt governance file.");
  } else {
    if (blockedRetrievalBots.length > 0) {
      score -= Math.min(40, blockedRetrievalBots.length * 10);
      findings.push(
        `Search/retrieval bots blocked in robots.txt: ${blockedRetrievalBots.join(", ")}`,
      );
    }
    if (blockedTrainingBots.length > 0) {
      score -= Math.min(35, blockedTrainingBots.length * 10);
      findings.push(
        `Training bots blocked (${blockedTrainingBots.join(", ")}): violates explicit allow policy against AI ranking penalties.`,
      );
    }
    if (conflictingBots.length > 0) {
      score -= Math.min(35, conflictingBots.length * 8);
      findings.push(
        `Conflicting Disallow: / and Allow: / directives detected in robots.txt (e.g. prepended edge/Cloudflare Managed Content block) for: ${conflictingBots.join(", ")}`,
      );
    }
    if (missingExplicitRetrievalAllow.length > 0) {
      score -= Math.min(12, missingExplicitRetrievalAllow.length * 2);
      findings.push(
        `Retrieval bots lacking explicit Allow rule: ${missingExplicitRetrievalAllow.join(", ")}`,
      );
    }
    if (missingExplicitTrainingAllow.length > 0) {
      score -= Math.min(12, missingExplicitTrainingAllow.length * 2);
      findings.push(
        `Training bots lacking explicit Allow rule: ${missingExplicitTrainingAllow.join(", ")}`,
      );
    }
    if (!sectionsSeparated) {
      score -= 8;
      findings.push(
        "robots.txt does not separate Live Search/Retrieval bots from Foundation Model Training bots.",
      );
    }
    if (!hasQueryParameterFence) {
      score -= 10;
      findings.push(
        `Missing parameterized crawl fence directives: ${missingFenceRules.join(", ")}`,
      );
    }
  }

  if (wafBlockedBots.length > 0) {
    score -= Math.min(35, wafBlockedBots.length * 15);
    findings.push(
      `HTTP 403/429 or WAF challenge blocked AI bot probes: ${wafBlockedBots.join(", ")}`,
    );
  }

  score = Math.max(0, Math.min(100, score));
  const passed =
    Boolean(robotsTxt.trim()) &&
    allRetrievalBotsAllowed &&
    allTrainingBotsAllowed &&
    conflictingBots.length === 0 &&
    sectionsSeparated &&
    hasQueryParameterFence &&
    wafBlockedBots.length === 0;

  return {
    score,
    passed,
    sectionsSeparated,
    allRetrievalBotsAllowed,
    allTrainingBotsAllowed,
    blockedRetrievalBots,
    blockedTrainingBots,
    conflictingBots,
    missingExplicitTrainingAllow,
    missingExplicitRetrievalAllow,
    hasQueryParameterFence,
    missingFenceRules,
    http200Bots,
    wafBlockedBots,
    bots,
    findings,
  };
}
