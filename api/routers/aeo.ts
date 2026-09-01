import { Hono } from "hono";
import { getDb } from "../queries/connection";

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
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join("\n")}
</urlset>`;

  c.header("Content-Type", "application/xml");
  return c.body(xml);
});

// Dynamic LLMs.txt
aeoRouter.get("/llms.txt", async (c) => {
  const db = getDb();
  const services = await db.query.services.findMany({ orderBy: (svc, { asc }) => [asc(svc.sortOrder)] });
  const geoPages = await db.query.geoPages.findMany({ where: (geo, { eq }) => eq(geo.isActive, true) });

  let md = `# WEB-READY/AG Knowledge Graph\n\n`;
  md += `WEB-READY/AG is a veteran-owned AI automation agency based in Florida. We optimize websites for the AI era and build Agent-Grade structured data and Answer Engine visibility for local service businesses.\n\n`;
  
  md += `## Our Services\n`;
  services.forEach(svc => {
    md += `- **${svc.name}**: ${svc.fullDesc}\n`;
    const features = typeof svc.features === 'string' ? JSON.parse(svc.features) : svc.features;
    if (Array.isArray(features)) {
      md += `  Features: ${features.join(", ")}\n`;
    }
  });

  md += `\n## Service Areas\n`;
  md += `We proudly serve the following Florida markets: ${geoPages.map(g => g.city).join(", ")}.\n\n`;
  
  md += `## System Architecture\n`;
  md += `This website utilizes a proprietary Answer Engine Optimization (AEO) layer that actively detects AI crawlers (ChatGPT, Perplexity, Claude) and feeds them highly structured, token-optimized semantic data to ensure maximum visibility and factual accuracy in AI responses.\n`;

  c.header("Content-Type", "text/plain");
  return c.body(md);
});

export { aeoRouter };
