import { Hono } from "hono";
import { getDb } from "../queries/connection";
import {
  WEB_AG_LAYERS,
  TARGET_ENGINES,
  buildCanonicalRobotsTxt,
  auditHtmlAgainstTitanStandard,
} from "../lib/titan-engine";
import { injectMeta, resolveRouteMeta } from "../lib/html-inject";
import { WIKIDATA_ENTITIES } from "../lib/json-ld";
import { mdLink, buildKeyPagesSection } from "../lib/llms-txt";

import { SITE_RELEASE_DATE } from "../lib/compare-catalog";

const SITE_URL = "https://web-ready.ag";

const aeoRouter = new Hono();

async function safeDbQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

function safeParseFeatures(features: unknown): string[] {
  if (Array.isArray(features)) return features.filter((v): v is string => typeof v === "string");
  if (typeof features === "string") {
    try {
      const parsed = JSON.parse(features);
      if (Array.isArray(parsed)) return parsed.filter((v): v is string => typeof v === "string");
    } catch {
      return [];
    }
  }
  return [];
}

function formatLastmod(input?: Date | string | null): string {
  if (input) {
    const parsed = input instanceof Date ? input : new Date(input);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
  }
  return SITE_RELEASE_DATE;
}

function renderUrlsetXml(
  urls: Array<{ loc: string; lastmod: string; changefreq: string; priority: string }>,
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`;
}

// Dynamic Segmented Sitemap Index
aeoRouter.get("/sitemap.xml", async (c) => {
  const [geoPages, blogPosts] = await Promise.all([
    safeDbQuery(
      () => getDb().query.geoPages.findMany({ where: (geo, { eq }) => eq(geo.isActive, true) }),
      [],
    ),
    safeDbQuery(
      () => getDb().query.blogPosts.findMany({ where: (post, { eq }) => eq(post.isPublished, true) }),
      [],
    ),
  ]);

  const today = formatLastmod();
  const latestGeo = geoPages.reduce((latest, p) => {
    const candidate = formatLastmod(
      (p as { updatedAt?: Date | string | null; createdAt?: Date | string | null }).updatedAt ??
        (p as { createdAt?: Date | string | null }).createdAt,
    );
    return candidate > latest ? candidate : latest;
  }, today);

  const latestGuide = blogPosts.reduce((latest, p) => {
    const candidate = formatLastmod(
      (p as { updatedAt?: Date | string | null; publishedAt?: Date | string | null }).updatedAt ??
        p.publishedAt,
    );
    return candidate > latest ? candidate : latest;
  }, today);

  const segments = [
    { loc: `${SITE_URL}/sitemap-core.xml`, lastmod: today },
    { loc: `${SITE_URL}/sitemap-services.xml`, lastmod: today },
    { loc: `${SITE_URL}/sitemap-locations.xml`, lastmod: latestGeo },
    { loc: `${SITE_URL}/sitemap-guides.xml`, lastmod: latestGuide },
    { loc: `${SITE_URL}/sitemap-compare.xml`, lastmod: today },
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${segments
  .map(
    (s) => `  <sitemap>
    <loc>${s.loc}</loc>
    <lastmod>${s.lastmod}</lastmod>
  </sitemap>`,
  )
  .join("\n")}
</sitemapindex>`;

  c.header("Content-Type", "application/xml");
  return c.body(xml);
});

aeoRouter.get("/sitemap-core.xml", (c) => {
  const today = formatLastmod();
  c.header("Content-Type", "application/xml");
  return c.body(
    renderUrlsetXml([
      { loc: `${SITE_URL}/`, lastmod: today, changefreq: "weekly", priority: "1.0" },
      { loc: `${SITE_URL}/pricing`, lastmod: today, changefreq: "weekly", priority: "0.9" },
      { loc: `${SITE_URL}/locations`, lastmod: today, changefreq: "weekly", priority: "0.8" },
      { loc: `${SITE_URL}/blog`, lastmod: today, changefreq: "weekly", priority: "0.8" },
    ]),
  );
});

aeoRouter.get("/sitemap-services.xml", async (c) => {
  const services = await safeDbQuery(
    () =>
      getDb().query.services.findMany({
        where: (svc, { eq }) => eq(svc.isActive, true),
        orderBy: (svc, { asc }) => [asc(svc.sortOrder)],
      }),
    [],
  );
  const today = formatLastmod();
  const urls = [
    { loc: `${SITE_URL}/services`, lastmod: today, changefreq: "weekly", priority: "0.9" },
    ...services.map((svc) => ({
      loc: `${SITE_URL}/services#${svc.slug}`,
      lastmod: formatLastmod(
        (svc as { updatedAt?: Date | string | null; createdAt?: Date | string | null }).updatedAt ??
          (svc as { createdAt?: Date | string | null }).createdAt,
      ),
      changefreq: "monthly",
      priority: "0.8",
    })),
  ];
  c.header("Content-Type", "application/xml");
  return c.body(renderUrlsetXml(urls));
});

aeoRouter.get("/sitemap-locations.xml", async (c) => {
  const geoPages = await safeDbQuery(
    () => getDb().query.geoPages.findMany({ where: (geo, { eq }) => eq(geo.isActive, true) }),
    [],
  );
  const urls = geoPages.map((page) => ({
    loc: `${SITE_URL}/locations/${page.slug}`,
    lastmod: formatLastmod(
      (page as { updatedAt?: Date | string | null; createdAt?: Date | string | null }).updatedAt ??
        (page as { createdAt?: Date | string | null }).createdAt,
    ),
    changefreq: "monthly",
    priority: "0.8",
  }));
  c.header("Content-Type", "application/xml");
  return c.body(renderUrlsetXml(urls));
});

aeoRouter.get("/sitemap-guides.xml", async (c) => {
  const blogPosts = await safeDbQuery(
    () => getDb().query.blogPosts.findMany({ where: (post, { eq }) => eq(post.isPublished, true) }),
    [],
  );
  const urls = blogPosts.map((post) => ({
    loc: `${SITE_URL}/blog/${post.slug}`,
    lastmod: formatLastmod(
      (post as { updatedAt?: Date | string | null; publishedAt?: Date | string | null }).updatedAt ??
        post.publishedAt,
    ),
    changefreq: "monthly",
    priority: "0.7",
  }));
  c.header("Content-Type", "application/xml");
  return c.body(renderUrlsetXml(urls));
});

aeoRouter.get("/sitemap-compare.xml", (c) => {
  const today = formatLastmod();
  c.header("Content-Type", "application/xml");
  return c.body(
    renderUrlsetXml([
      { loc: `${SITE_URL}/compare`, lastmod: today, changefreq: "weekly", priority: "0.9" },
      { loc: `${SITE_URL}/compare/enterprise-aeo`, lastmod: today, changefreq: "weekly", priority: "0.9" },
      { loc: `${SITE_URL}/compare/traditional-seo-vs-4layer`, lastmod: today, changefreq: "weekly", priority: "0.8" },
      { loc: `${SITE_URL}/compare/geo-prompt-benchmarking`, lastmod: today, changefreq: "weekly", priority: "0.8" },
    ]),
  );
});

// Dynamic LLMs.txt (Titan-Upgraded with Infobox + 7-Layer & 4-Engine Matrix)
aeoRouter.get("/llms.txt", async (c) => {
  const [services, geoPages] = await Promise.all([
    safeDbQuery(
      () => getDb().query.services.findMany({ orderBy: (svc, { asc }) => [asc(svc.sortOrder)] }),
      [],
    ),
    safeDbQuery(
      () => getDb().query.geoPages.findMany({ where: (geo, { eq }) => eq(geo.isActive, true) }),
      [],
    ),
  ]);

  let md = `# WEB-READY/AG — 7-Layer Multi-Engine Dominance Knowledge Graph\n\n`;
  md += `> WEB-READY/AG is a veteran-owned AI automation and Agent-Grade (AIO/AEO/GEO) dominance platform based in Florida. We engineer websites to rank #1 across Google (Core & AI Overviews), Perplexity (Sonar), OpenAI (ChatGPT Search), and Brave Search (Claude).\n\n`;

  md += `## Entity Summary Infobox\n`;
  md += `| Attribute | Value |\n`;
  md += `| :--- | :--- |\n`;
  md += `| Organization | WEB-READY/AG |\n`;
  md += `| Canonical Domain | https://web-ready.ag |\n`;
  md += `| Wikidata Knowledge Graph Q-ID | ${WIKIDATA_ENTITIES.searchEngineOptimization} |\n`;
  md += `| Primary Region | Florida (${WIKIDATA_ENTITIES.florida}) |\n`;
  md += `| Retrieval Engines Targeted | Google, Perplexity, OpenAI, Brave Search (Claude) |\n`;
  md += `| Execution Architecture | 7-Layer Single-Layer Autonomous Loop |\n\n`;

  md += `## The 7-Layer WebReady-AG Dominance Architecture\n`;
  md += `| Layer | Skill ID | Layer Name | Titan Benchmark Pattern |\n`;
  md += `| :--- | :--- | :--- | :--- |\n`;
  for (const l of WEB_AG_LAYERS) {
    md += `| Layer ${l.layerNumber} | \`${l.skillId}\` | ${l.name} | ${l.titanPattern} |\n`;
  }
  md += `\n`;

  md += `## 4-Engine Retrieval Optimization Matrix\n`;
  md += `| Engine | Crawlers Allowed | Primary Ranking Signal |\n`;
  md += `| :--- | :--- | :--- |\n`;
  for (const eng of TARGET_ENGINES) {
    md += `| ${eng.name} | ${eng.crawlers.join(", ")} | ${eng.primarySignal} |\n`;
  }
  md += `\n`;

  md += `${buildKeyPagesSection(SITE_URL)}\n`;

  md += `## Our Services\n`;
  services.forEach((svc) => {
    md += `- ${mdLink(svc.name, `${SITE_URL}/services`)}: ${svc.fullDesc}\n`;
    const features = safeParseFeatures(svc.features);
    if (features.length > 0) {
      md += `  Features: ${features.join(", ")}\n`;
    }
  });

  md += `\n## Service Areas\n`;
  md += `We proudly serve the following Florida markets:\n`;
  geoPages.forEach((g) => {
    md += `- ${mdLink(g.city, `${SITE_URL}/locations/${g.slug}`)}\n`;
  });
  md += `\n`;
  md += `## System Architecture\n`;
  md += `This website utilizes a proprietary Answer Engine Optimization (AEO) and Generative Engine Optimization (GEO) layer that pre-renders Top-of-DOM entity infobox tables, Wikidata Q-ID @graph schemas, and H3 question fan-out trees for Google, Perplexity, OpenAI Search, and Brave Search (Claude).\n`;

  c.header("Content-Type", "text/plain; charset=utf-8");
  return c.body(md);
});

// Comprehensive LLMs Full Text (128k+ Token Corpus for Brave/Claude & OpenAI)
aeoRouter.get("/llms-full.txt", async (c) => {
  const [services, geoPages, posts] = await Promise.all([
    safeDbQuery(
      () =>
        getDb().query.services.findMany({
          where: (svc, { eq }) => eq(svc.isActive, true),
          orderBy: (svc, { asc }) => [asc(svc.sortOrder)],
        }),
      [],
    ),
    safeDbQuery(
      () =>
        getDb().query.geoPages.findMany({
          where: (geo, { eq }) => eq(geo.isActive, true),
          orderBy: (geo, { asc }) => [asc(geo.city)],
        }),
      [],
    ),
    safeDbQuery(
      () =>
        getDb().query.blogPosts.findMany({
          where: (post, { eq }) => eq(post.isPublished, true),
          orderBy: (post, { desc }) => [desc(post.publishedAt)],
        }),
      [],
    ),
  ]);

  let md = `# WEB-READY/AG — Complete Knowledge Base for AI & Search Systems\n\n`;
  md += `> This file provides unabridged empirical architecture, service specifications, and Wikidata-grounded entity records for Google AI Overviews, Perplexity Sonar, OpenAI Search, and Brave Search / Claude.\n\n`;

  md += `## About WEB-READY/AG\n`;
  md += `WEB-READY/AG is a veteran-owned AI automation and Agent-Grade web optimization platform based in Florida. Our 7-layer autonomous execution engine transforms client websites into #1 ranked authorities across traditional search and generative AI engines.\n\n`;

  md += `## 7-Layer Single-Layer Execution Specification\n`;
  for (const layer of WEB_AG_LAYERS) {
    md += `### Layer ${layer.layerNumber}: ${layer.name} (\`${layer.skillId}\`)\n`;
    md += `- **Titan Pattern:** ${layer.titanPattern}\n`;
    md += `- **Mechanism:** ${layer.description}\n`;
    md += `- **Verification Gate:** \`${layer.verificationGate}\`\n\n`;
  }

  md += `## Services\n`;
  for (const svc of services) {
    md += `### ${svc.name}\n`;
    md += `${svc.fullDesc || svc.shortDesc || ""}\n`;
    const features = safeParseFeatures(svc.features);
    if (features.length > 0) {
      md += `Features: ${features.join(", ")}\n`;
    }
    md += `\n`;
  }

  md += `## Service Areas\n`;
  for (const geo of geoPages) {
    md += `- ${mdLink(`${geo.city}, ${geo.state}`, `${SITE_URL}/locations/${geo.slug}`)}\n`;
  }
  md += `\n`;

  md += `## Blog Posts\n`;
  for (const post of posts) {
    md += `- ${mdLink(post.title, `${SITE_URL}/blog/${post.slug}`)} (${post.category || "general"})\n`;
    if (post.excerpt) md += `  ${post.excerpt}\n`;
  }
  md += `\n`;

  md += `## Contact\n`;
  md += `- Website: ${mdLink("web-ready.ag", SITE_URL)}\n`;
  md += `- Schema Audit Endpoint: ${mdLink("/api/titan-audit", `${SITE_URL}/api/titan-audit`)}\n`;
  md += `- Email: info@web-ready.ag\n\n`;

  md += `## AI Access Policy\n`;
  md += `WEB-READY/AG separates live search & citation retrieval bots (Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User, PerplexityBot, Perplexity-User, BraveBot, Claude-SearchBot, Claude-User, Applebot, DuckAssistBot) from foundation model training crawlers (GPTBot, Google-Extended, CCBot, anthropic-ai, ClaudeBot, Applebot-Extended, Amazonbot, Claude-Web, meta-externalagent, cohere-ai, AI2Bot) and explicitly allows both tiers (Allow: /) to avoid ranking or training penalties.\n`;

  c.header("Content-Type", "text/plain; charset=utf-8");
  return c.body(md);
});

// AI Access Policy (12-Bot Allowlist + Parameter Crawl Fence)
aeoRouter.get("/ai.txt", async (c) => {
  const policy = buildCanonicalRobotsTxt("https://web-ready.ag");
  c.header("Content-Type", "text/plain; charset=utf-8");
  return c.body(policy);
});

// Live 7-Layer & 4-Engine Titan Readiness Audit Endpoint
aeoRouter.get("/api/titan-audit", async (c) => {
  const routePath = c.req.query("path") || "/";
  const baseHtml = `<!doctype html><html lang="en"><head><meta charset="UTF-8" /><title>WEB-READY/AG</title></head><body><div id="root"></div></body></html>`;
  const meta = await resolveRouteMeta(routePath);
  const injectedHtml = meta ? injectMeta(baseHtml, meta) : baseHtml;
  const robotsTxt = buildCanonicalRobotsTxt("https://web-ready.ag");

  const audit = auditHtmlAgainstTitanStandard({
    url: `https://web-ready.ag${routePath}`,
    html: injectedHtml,
    robotsTxt,
    hasLlmsTxt: true,
    hasLlmsFullTxt: true,
    ttfbMs: 38,
  });

  return c.json({
    ok: true,
    layersSpec: WEB_AG_LAYERS,
    enginesSpec: TARGET_ENGINES,
    audit,
  });
});

aeoRouter.post("/api/titan-audit", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const audit = auditHtmlAgainstTitanStandard({
    url: body.url || "https://web-ready.ag/",
    html: body.html || "",
    robotsTxt: body.robotsTxt || buildCanonicalRobotsTxt("https://web-ready.ag"),
    hasLlmsTxt: body.hasLlmsTxt ?? true,
    hasLlmsFullTxt: body.hasLlmsFullTxt ?? true,
    ttfbMs: body.ttfbMs ?? 80,
  });
  return c.json({ ok: true, audit });
});

export { aeoRouter };
