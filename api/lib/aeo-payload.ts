import { getDb } from "../queries/connection";
import {
  buildOrganizationJsonLd,
  buildLocalBusinessJsonLd,
  buildBlogPostingJsonLd,
  resolveCityWikidataUri,
  WIKIDATA_ENTITIES,
} from "./json-ld";

const BASE_URL = "https://web-ready.ag";

export const AI_CRAWLER_PATTERNS = [
  "gptbot",
  "chatgpt-user",
  "oai-searchbot",
  "perplexitybot",
  "perplexity-user",
  "claudebot",
  "claude-searchbot",
  "claude-user",
  "claude-web",
  "claude",
  "anthropic-ai",
  "google-extended",
  "googlebot-image",
  "bravebot",
  "applebot-extended",
  "duckassistbot",
  "bytespider",
  "cohere-ai",
  "meta-externalagent",
  "ai2bot",
];

export function isAiCrawler(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return AI_CRAWLER_PATTERNS.some((pattern) => ua.includes(pattern));
}

export async function buildAeoPayload(pathname: string): Promise<object | null> {
  // Home: full knowledge graph
  if (pathname === "/") {
    try {
      const db = getDb();
      const services = await db.query.services.findMany({
        where: (s, { eq }) => eq(s.isActive, true),
        orderBy: (s, { asc }) => [asc(s.sortOrder)],
      });
      const geoPages = await db.query.geoPages.findMany({
        where: (g, { eq }) => eq(g.isActive, true),
      });

      return {
        type: "knowledge_graph",
        url: `${BASE_URL}/`,
        wikidataEntity: WIKIDATA_ENTITIES.searchEngineOptimization,
        targetEngines: ["Google", "Perplexity", "OpenAI", "Brave Search (Claude)"],
        architecture: "WebReady-AG 7-Layer Single-Layer Engine",
        organization: buildOrganizationJsonLd(),
        infobox: [
          { label: "Platform", value: "WEB-READY/AG" },
          { label: "Architecture", value: "7-Layer Autonomous Single-Layer Engine" },
          { label: "Wikidata Entity Q-ID", value: WIKIDATA_ENTITIES.searchEngineOptimization },
          { label: "Target Engines", value: "Google, Perplexity, OpenAI, Brave Search (Claude)" },
        ],
        services: services.map((s) => ({
          name: s.name,
          description: s.shortDesc || s.fullDesc,
          slug: s.slug,
        })),
        serviceAreas: geoPages.map((g) => ({
          city: g.city,
          state: g.state,
          wikidataEntity: resolveCityWikidataUri(g.slug || g.city),
          url: `${BASE_URL}/locations/${g.slug}`,
        })),
      };
    } catch {
      return null;
    }
  }

  // /locations/:slug
  const locMatch = pathname.match(/^\/locations\/([^/]+)$/);
  if (locMatch) {
    try {
      const db = getDb();
      const page = await db.query.geoPages.findFirst({
        where: (g, { eq, and }) => and(eq(g.slug, locMatch[1]), eq(g.isActive, true)),
      });
      if (!page) return null;
      const cityWikidata = resolveCityWikidataUri(page.slug || page.city);
      return {
        type: "local_business",
        url: `${BASE_URL}/locations/${page.slug}`,
        city: page.city,
        state: page.state,
        wikidataEntity: cityWikidata,
        targetEngines: ["Google", "Perplexity", "OpenAI", "Brave Search (Claude)"],
        schema: buildLocalBusinessJsonLd(page),
        description:
          page.metaDescription || `AI automation services in ${page.city}, ${page.state}.`,
        content: page.bodyContent || "",
      };
    } catch {
      return null;
    }
  }

  // /blog/:slug
  const blogMatch = pathname.match(/^\/blog\/([^/]+)$/);
  if (blogMatch) {
    try {
      const db = getDb();
      const post = await db.query.blogPosts.findFirst({
        where: (b, { eq, and }) => and(eq(b.slug, blogMatch[1]), eq(b.isPublished, true)),
      });
      if (!post) return null;
      return {
        type: "blog_posting",
        url: `${BASE_URL}/blog/${post.slug}`,
        wikidataEntity: WIKIDATA_ENTITIES.knowledgeGraph,
        targetEngines: ["Google", "Perplexity", "OpenAI", "Brave Search (Claude)"],
        schema: buildBlogPostingJsonLd(post),
        title: post.title,
        excerpt: post.excerpt || "",
        content: post.content,
        author: post.author || "WEB-READY/AG",
        publishedAt: post.publishedAt ? new Date(post.publishedAt).toISOString() : null,
      };
    } catch {
      return null;
    }
  }

  // Static routes: return basic info
  const staticRoutes: Record<string, { title: string; description: string; wikidataEntity: string }> = {
    "/services": {
      title: "AI Automation Services",
      description: "Voice AI, outreach, CRM, reviews, 7-layer SEO/AEO/GEO, and AI assistants.",
      wikidataEntity: WIKIDATA_ENTITIES.softwareAgent,
    },
    "/pricing": {
      title: "Pricing",
      description: "Transparent pricing for AI automation and 7-layer search dominance.",
      wikidataEntity: WIKIDATA_ENTITIES.searchEngineOptimization,
    },
    "/locations": {
      title: "Service Areas",
      description: "Florida service areas.",
      wikidataEntity: WIKIDATA_ENTITIES.florida,
    },
    "/blog": {
      title: "Blog",
      description: "AI automation insights.",
      wikidataEntity: WIKIDATA_ENTITIES.knowledgeGraph,
    },
  };
  if (staticRoutes[pathname]) {
    return {
      type: "page",
      url: `${BASE_URL}${pathname}`,
      title: staticRoutes[pathname].title,
      description: staticRoutes[pathname].description,
      wikidataEntity: staticRoutes[pathname].wikidataEntity,
      targetEngines: ["Google", "Perplexity", "OpenAI", "Brave Search (Claude)"],
    };
  }

  return null;
}

/**
 * Builds a structured Markdown representation of the route with a Wikipedia-style
 * Top-of-DOM Infobox table and Question H3 Fan-Out for `Accept: text/markdown` agents.
 */
export async function buildAeoMarkdownPayload(pathname: string): Promise<string | null> {
  const payload = (await buildAeoPayload(pathname)) as Record<string, unknown> | null;
  if (!payload) return null;

  const title = String(payload.title || payload.city || "WEB-READY/AG Knowledge Node");
  const desc = String(
    payload.description ||
      "WEB-READY/AG engineers 7-layer Agent-Grade websites that rank #1 across Google, Perplexity, OpenAI Search, and Brave Search."
  );
  const wikidata = String(payload.wikidataEntity || WIKIDATA_ENTITIES.searchEngineOptimization);

  const lines: string[] = [
    `# ${title}`,
    ``,
    `> ${desc}`,
    ``,
    `## Entity Summary Infobox`,
    `| Attribute | Value |`,
    `| :--- | :--- |`,
    `| Canonical URL | ${String(payload.url || "")} |`,
    `| Payload Type | ${String(payload.type || "")} |`,
    `| Wikidata Entity Q-ID | ${wikidata} |`,
    `| Target Engines | Google, Perplexity, OpenAI, Brave Search (Claude) |`,
    ``,
    `## Overview & Common Questions`,
    `### What is ${title} and how does it work?`,
    `${desc}`,
    ``,
    `### How does WebReady-AG optimize across Google, Perplexity, OpenAI, and Brave Search?`,
    `WebReady-AG executes a 7-layer single-layer architecture combining sub-second pre-rendered HTML, Wikidata Q-ID @graph schemas, Top-of-DOM entity infoboxes, and H3 question fan-out trees.`,
  ];

  return lines.join("\n");
}
