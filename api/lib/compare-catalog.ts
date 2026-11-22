import { WIKIDATA_ENTITIES } from "./json-ld";

export interface ComparisonRow {
  capability: string;
  enterprise4Layer: string;
  legacyAgency: string;
  edgeGain: string;
}

export interface ComparisonSpec {
  key: string;
  path: string;
  canonical: string;
  title: string;
  subtitle: string;
  questionHeading: string;
  lastUpdated: string;
  wikidataUri: string;
  answerCapsule: string;
  rows: ComparisonRow[];
}

export const SITE_RELEASE_DATE = "2026-11-13";
export const BASE_SITE_URL = "https://web-ready.ag";

export const COMPARISON_SPECS: Record<string, ComparisonSpec> = {
  index: {
    key: "index",
    path: "/compare",
    canonical: `${BASE_SITE_URL}/compare`,
    title: "Enterprise Search Visibility Comparison Hub",
    subtitle:
      "Compare WEB-READY/AG Enterprise 4-Layer execution against legacy SEO retainers, client-side SPAs, and unmeasured AI optimization.",
    questionHeading: "Why evaluate Search Visibility across SEO, AEO, GEO, and AIO together?",
    lastUpdated: SITE_RELEASE_DATE,
    wikidataUri: WIKIDATA_ENTITIES.knowledgeGraph,
    answerCapsule:
      "Enterprise Search Visibility combines four interdependent operational layers: Technical SEO server rendering, AEO 40-to-60-word answer capsules with connected JSON-LD knowledge graphs, GEO multi-LLM buyer prompt benchmarking, and AIO retrieval-plus-training bot governance. Evaluating all four layers eliminates isolated agency blind spots across organic and AI search.",
    rows: [
      {
        capability: "Layer 1 — Technical & SSR SEO",
        enterprise4Layer: "Server-rendered HTML parity, segmented sitemaps, sub-1.8s mobile LCP, log orphans",
        legacyAgency: "SPA shells, unsegmented sitemaps, zero server-log orphan detection",
        edgeGain: "Complete indexable DOM parity",
      },
      {
        capability: "Layer 2 — AEO Answer Extraction",
        enterprise4Layer: "40–60 word pronoun-free capsules under H2/H3 + connected @graph JSON-LD",
        legacyAgency: "Thin blog filler with disconnected JSON-LD snippets",
        edgeGain: "0 dangling @id graph errors",
      },
      {
        capability: "Layer 3 — GEO Prompt Benchmarking",
        enterprise4Layer: "Multi-LLM Share of Model across 5+ engines, citation provenance, Person E-E-A-T",
        legacyAgency: "Classic keyword rank tracking without AI citation attribution",
        edgeGain: "Verified Reference Rate & provenance",
      },
      {
        capability: "Layer 4 — AIO Bot & Entity Consensus",
        enterprise4Layer: "Separated Retrieval & Training bots with Allow: /, Entity Conflict Count = 0",
        legacyAgency: "Blanket bot blocks penalizing AI model visibility and conflicting NAP listings",
        edgeGain: "Full crawl + model training coverage",
      },
    ],
  },
  "enterprise-aeo": {
    key: "enterprise-aeo",
    path: "/compare/enterprise-aeo",
    canonical: `${BASE_SITE_URL}/compare/enterprise-aeo`,
    title: "WEB-READY/AG Enterprise 4-Layer vs. Legacy Agency SEO",
    subtitle: "Side-by-side verification across SEO, AEO, GEO, and AIO execution standards.",
    questionHeading: "How does WEB-READY/AG compare to legacy SEO agencies?",
    lastUpdated: SITE_RELEASE_DATE,
    wikidataUri: WIKIDATA_ENTITIES.searchEngineOptimization,
    answerCapsule:
      "WEB-READY/AG outperforms legacy SEO agencies across AI retrieval and classic organic search by delivering server-rendered HTML parity, sub-1.8 second mobile Largest Contentful Paint, 40-to-60-word pronoun-free answer capsules, connected @id Wikidata schemas, multi-LLM prompt benchmarks, and explicit search plus training bot governance.",
    rows: [
      {
        capability: "SSR vs. Hydrated DOM Parity",
        enterprise4Layer: "Verified >= 85% raw HTML word parity & zero client-only schema",
        legacyAgency: "Unchecked React CSR shells with delayed metadata injection",
        edgeGain: "+100% immediate crawl extractability",
      },
      {
        capability: "AI Crawler Governance",
        enterprise4Layer: "Allow retrieval crawlers; configure training policy independently",
        legacyAgency: "Blanket Disallow rules blocking GPTBot & Google-Extended",
        edgeGain: "Zero AI ranking/training penalties",
      },
      {
        capability: "Answer Capsules & RAG Chunks",
        enterprise4Layer: "40–60 word pronoun-free standalone blocks with #anchor links",
        legacyAgency: "Dense ToF glossary prose reliant on ambiguous pronouns",
        edgeGain: "Deterministic LLM snippet citation",
      },
      {
        capability: "Knowledge Graph Schema",
        enterprise4Layer: "Connected Organization -> WebSite -> WebPage -> Service/Person @id graph",
        legacyAgency: "Disconnected JSON-LD snippets missing Person credentials",
        edgeGain: "0 dangling @id reference errors",
      },
      {
        capability: "Telemetry & Attribution",
        enterprise4Layer: "Server log orphans, GA4 AI referral grouping, GSC BigQuery & 25+ prompt matrix",
        legacyAgency: "Monthly vanity rank PDFs without AI citation attribution",
        edgeGain: "Verified Reference Rate & Share of Model",
      },
    ],
  },
  "traditional-seo-vs-4layer": {
    key: "traditional-seo-vs-4layer",
    path: "/compare/traditional-seo-vs-4layer",
    canonical: `${BASE_SITE_URL}/compare/traditional-seo-vs-4layer`,
    title: "Traditional Single-Layer SEO vs. 4-Layer Search Visibility",
    subtitle:
      "Technical comparison showing why backlinks and meta tags alone fail inside Google AI Overviews, ChatGPT Search, and Perplexity.",
    questionHeading: "Why does traditional SEO fail without AEO, GEO, and AIO layers?",
    lastUpdated: SITE_RELEASE_DATE,
    wikidataUri: WIKIDATA_ENTITIES.informationRetrieval,
    answerCapsule:
      "Traditional SEO optimizes pages only for ten blue links through keyword density and backlinks. 4-Layer Search Visibility preserves server-rendered technical foundations while adding pronoun-free answer capsules for AEO, multi-LLM citation telemetry for GEO, and unblocked search plus training crawler governance for AIO.",
    rows: [
      {
        capability: "Primary Output Unit",
        enterprise4Layer: "Self-contained 40–60 word RAG blocks + structured HTML tables",
        legacyAgency: "2,500-word narrative posts dependent on prior-paragraph pronouns",
        edgeGain: "Direct passage extraction without context loss",
      },
      {
        capability: "Canonical & Redirect Hygiene",
        enterprise4Layer: "Strict 1-to-1 self-referencing canonicals & max 1 redirect hop",
        legacyAgency: "301 -> 301 chains and wildcard canonical collapse across clusters",
        edgeGain: "Zero crawl-budget leakage",
      },
      {
        capability: "XML Sitemap Segmentation",
        enterprise4Layer: "Typed <sitemapindex> (core, services, locations, guides, compare) + <lastmod>",
        legacyAgency: "Single flat sitemap lacking entity typing or reliable modified dates",
        edgeGain: "Priority crawl scheduling by entity type",
      },
      {
        capability: "Trust & Authorship Graph",
        enterprise4Layer: "Person E-E-A-T with hasCredential, worksFor, NPI/LinkedIn sameAs + dateModified",
        legacyAgency: "Generic 'Admin' bylines without verifiable institutional authority",
        edgeGain: "Machine-verifiable authority signals",
      },
    ],
  },
  "geo-prompt-benchmarking": {
    key: "geo-prompt-benchmarking",
    path: "/compare/geo-prompt-benchmarking",
    canonical: `${BASE_SITE_URL}/compare/geo-prompt-benchmarking`,
    title: "GEO Multi-LLM Prompt Benchmarking vs. Classic Rank Tracking",
    subtitle:
      "Measuring Reference Rate, Share of Model, and Citation Provenance across ChatGPT, Perplexity, Google AI Mode, Claude, and Copilot.",
    questionHeading: "How does GEO prompt benchmarking measure AI search performance?",
    lastUpdated: SITE_RELEASE_DATE,
    wikidataUri: WIKIDATA_ENTITIES.artificialIntelligence,
    answerCapsule:
      "GEO prompt benchmarking evaluates 25 to 100 real buyer prompts segmented by Awareness, Consideration, and Decision across five or more language models. Instead of relying solely on organic click-through rate, teams track Reference Rate, Share of Model, and Owned versus Earned citation provenance.",
    rows: [
      {
        capability: "North-Star Metric",
        enterprise4Layer: "Reference Rate (%) & Share of Model alongside organic CTR",
        legacyAgency: "SERP rank position 1–10 and aggregate session guesses",
        edgeGain: "Visibility tracking for zero-click AI answers",
      },
      {
        capability: "LLM Engine Coverage",
        enterprise4Layer: "ChatGPT, Google AI Overviews, Google AI Mode, Perplexity, Claude, Copilot",
        legacyAgency: "Single-engine desktop Google rank scrape",
        edgeGain: "5x answer-engine coverage parity",
      },
      {
        capability: "Citation Provenance Bucketing",
        enterprise4Layer: "Tracks Owned vs. Earned Third-Party vs. Competitor sources per prompt",
        legacyAgency: "No distinction between brand domain and third-party corroboration",
        edgeGain: "Targeted PR & corroboration roadmap",
      },
      {
        capability: "AI Referral Attribution",
        enterprise4Layer: "GA4 custom AI referral channel + GSC BigQuery export schema",
        legacyAgency: "AI assistant clicks misclassified under Direct / Unassigned traffic",
        edgeGain: "Accurate revenue attribution from AI search",
      },
    ],
  },
};

export function resolveComparisonSpec(slug?: string): ComparisonSpec {
  if (!slug) {
    return COMPARISON_SPECS.index;
  }
  return COMPARISON_SPECS[slug] ?? COMPARISON_SPECS.index;
}

export const ALL_COMPARISON_SPECS: ComparisonSpec[] = [
  COMPARISON_SPECS.index,
  COMPARISON_SPECS["enterprise-aeo"],
  COMPARISON_SPECS["traditional-seo-vs-4layer"],
  COMPARISON_SPECS["geo-prompt-benchmarking"],
];
