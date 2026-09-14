import { getDb } from "../queries/connection";
import {
  buildOrganizationJsonLd,
  buildLocalBusinessJsonLd,
  buildBlogPostingJsonLd,
} from "./json-ld";

const BASE_URL = "https://web-ready.ag";

const AI_CRAWLER_PATTERNS = [
  "chatgpt-user",
  "perplexitybot",
  "claudebot",
  "claude",
  "oai-searchbot",
  "anthropic-ai",
  "google-extended",
  "googlebot-image",
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
        organization: buildOrganizationJsonLd(),
        services: services.map((s: any) => ({
          name: s.name,
          description: s.shortDesc || s.fullDesc,
          slug: s.slug,
        })),
        serviceAreas: geoPages.map((g: any) => ({
          city: g.city,
          state: g.state,
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
      return {
        type: "local_business",
        url: `${BASE_URL}/locations/${page.slug}`,
        city: page.city,
        state: page.state,
        schema: buildLocalBusinessJsonLd(page),
        description: page.metaDescription || `AI automation services in ${page.city}, ${page.state}.`,
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
  const staticRoutes: Record<string, { title: string; description: string }> = {
    "/services": { title: "AI Automation Services", description: "Voice AI, outreach, CRM, reviews, SEO, assistants." },
    "/pricing": { title: "Pricing", description: "Transparent pricing for AI automation." },
    "/locations": { title: "Service Areas", description: "Florida service areas." },
    "/blog": { title: "Blog", description: "AI automation insights." },
  };
  if (staticRoutes[pathname]) {
    return {
      type: "page",
      url: `${BASE_URL}${pathname}`,
      title: staticRoutes[pathname].title,
      description: staticRoutes[pathname].description,
    };
  }

  return null;
}
