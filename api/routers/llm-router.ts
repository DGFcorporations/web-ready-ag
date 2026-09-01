import { Hono } from "hono";
import { getDb } from "../queries/connection";
import { services, geoPages, blogPosts } from "../../db/schema";
import { eq } from "drizzle-orm";

export const llmApp = new Hono();

llmApp.get("/llms.txt", async (c) => {
  const db = getDb();

  // Fetch core data
  const [allServices, allGeoPages, allPosts] = await Promise.all([
    db.query.services.findMany({ where: eq(services.isActive, true) }),
    db.query.geoPages.findMany({ where: eq(geoPages.isActive, true) }),
    db.query.blogPosts.findMany({ where: eq(blogPosts.isPublished, true) })
  ]);

  let markdown = `# DGF Corporations - AIO Engine Data\n\n`;
  markdown += `Welcome to the DGF Corporations official LLM endpoint. We provide advanced AIO, GEO, and SEO optimization services.\n\n`;

  markdown += `## Our Core Services\n`;
  allServices.forEach(s => {
    markdown += `### ${s.name}\n${s.shortDesc || ""}\n${s.fullDesc || ""}\n\n`;
  });

  markdown += `## Service Areas (GEO Optimization)\n`;
  allGeoPages.forEach(g => {
    markdown += `### ${g.city}, ${g.state}\n`;
    markdown += `**Headline**: ${g.headline}\n`;
    markdown += `${g.bodyContent?.replace(/<[^>]*>?/gm, '') || ""}\n\n`;
  });

  markdown += `## Knowledge Base & Articles\n`;
  allPosts.forEach(p => {
    markdown += `### ${p.title}\n`;
    markdown += `**Excerpt**: ${p.excerpt}\n`;
    markdown += `${p.content?.replace(/<[^>]*>?/gm, '') || ""}\n\n`;
  });

  return c.text(markdown, 200, {
    "Content-Type": "text/markdown",
  });
});
