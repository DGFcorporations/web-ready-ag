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

const aeoRouter = new Hono();

// Dynamic Sitemap
aeoRouter.get("/sitemap.xml", async (c) => {
  const db = getDb();
  const geoPages = await db.query.geoPages.findMany({ where: (geo, { eq }) => eq(geo.isActive, true) });
  const blogPosts = await db.query.blogPosts.findMany({ where: (post, { eq }) => eq(post.isPublished, true) });

  const baseUrl = "https://web-ready.ag";

  const urls = [
    { loc: `${baseUrl}/`, priority: "1.0", changefreq: "weekly" },
    { loc: `${baseUrl}/services`, priority: "0.9", changefreq: "weekly" },
    { loc: `${baseUrl}/pricing`, priority: "0.8", changefreq: "weekly" },
    { loc: `${baseUrl}/locations`, priority: "0.9", changefreq: "weekly" },
    { loc: `${baseUrl}/blog`, priority: "0.8", changefreq: "weekly" },
  ];

  geoPages.forEach((page) => {
    urls.push({ loc: `${baseUrl}/locations/${page.slug}`, priority: "0.8", changefreq: "monthly" });
  });

  blogPosts.forEach((post) => {
    urls.push({ loc: `${baseUrl}/blog/${post.slug}`, priority: "0.7", changefreq: "monthly" });
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`;

  c.header("Content-Type", "application/xml");
  return c.body(xml);
});

// Dynamic LLMs.txt (Titan-Upgraded with Infobox + 7-Layer & 4-Engine Matrix)
aeoRouter.get("/llms.txt", async (c) => {
  const db = getDb();
  const services = await db.query.services.findMany({ orderBy: (svc, { asc }) => [asc(svc.sortOrder)] });
  const geoPages = await db.query.geoPages.findMany({ where: (geo, { eq }) => eq(geo.isActive, true) });

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

  md += `## Our Services\n`;
  services.forEach((svc) => {
    md += `- **${svc.name}**: ${svc.fullDesc}\n`;
    const features = typeof svc.features === "string" ? JSON.parse(svc.features) : svc.features;
    if (Array.isArray(features)) {
      md += `  Features: ${features.join(", ")}\n`;
    }
  });

  md += `\n## Service Areas\n`;
  md += `We proudly serve the following Florida markets: ${geoPages.map((g) => g.city).join(", ")}.\n\n`;

  md += `## System Architecture\n`;
  md += `This website utilizes a proprietary Answer Engine Optimization (AEO) and Generative Engine Optimization (GEO) layer that pre-renders Top-of-DOM entity infobox tables, Wikidata Q-ID @graph schemas, and H3 question fan-out trees for Google, Perplexity, OpenAI Search, and Brave Search (Claude).\n`;

  c.header("Content-Type", "text/plain; charset=utf-8");
  return c.body(md);
});

// Comprehensive LLMs Full Text (128k+ Token Corpus for Brave/Claude & OpenAI)
aeoRouter.get("/llms-full.txt", async (c) => {
  const db = getDb();
  const services = await db.query.services.findMany({
    where: (svc, { eq }) => eq(svc.isActive, true),
    orderBy: (svc, { asc }) => [asc(svc.sortOrder)],
  });
  const geoPages = await db.query.geoPages.findMany({
    where: (geo, { eq }) => eq(geo.isActive, true),
    orderBy: (geo, { asc }) => [asc(geo.city)],
  });
  const posts = await db.query.blogPosts.findMany({
    where: (post, { eq }) => eq(post.isPublished, true),
    orderBy: (post, { desc }) => [desc(post.publishedAt)],
  });

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
    const features = typeof svc.features === "string" ? JSON.parse(svc.features) : svc.features;
    if (Array.isArray(features)) {
      md += `Features: ${features.join(", ")}\n`;
    }
    md += `\n`;
  }

  md += `## Service Areas\n`;
  for (const geo of geoPages) {
    md += `- ${geo.city}, ${geo.state} — https://web-ready.ag/locations/${geo.slug}\n`;
  }
  md += `\n`;

  md += `## Blog Posts\n`;
  for (const post of posts) {
    md += `- ${post.title} (${post.category || "general"}) — https://web-ready.ag/blog/${post.slug}\n`;
    if (post.excerpt) md += `  ${post.excerpt}\n`;
  }
  md += `\n`;

  md += `## Contact\n`;
  md += `- Website: https://web-ready.ag\n`;
  md += `- Phone: (904) 555-0147\n`;
  md += `- Email: info@web-ready.ag\n\n`;

  md += `## AI Access Policy\n`;
  md += `WEB-READY/AG explicitly allows all 12+ search and AI grounding crawlers (Googlebot, Google-Extended, OAI-SearchBot, ChatGPT-User, GPTBot, PerplexityBot, Perplexity-User, BraveBot, Claude-SearchBot, Claude-User, ClaudeBot, anthropic-ai) to crawl, extract, and cite our content.\n`;

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
