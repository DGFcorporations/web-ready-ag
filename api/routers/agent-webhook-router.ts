import { Hono } from "hono";
import { getDb } from "../queries/connection";
import { geoPages, blogPosts } from "../../db/schema";
import { eq } from "drizzle-orm";
import { env } from "../lib/env";

export const agentWebhookApp = new Hono();

// Authorization middleware for agents (e.g. Captain Snow / Hermes)
agentWebhookApp.use("/*", async (c, next) => {
  const authHeader = c.req.header("Authorization");
  // Expected format: Bearer <APP_SECRET>
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.split(" ")[1];
  if (token !== env.appSecret) {
    return c.json({ error: "Forbidden: Invalid Agent Token" }, 403);
  }

  await next();
});

// Endpoint to create or update a GEO page
agentWebhookApp.post("/geo", async (c) => {
  try {
    const body = await c.req.json();
    const { slug, city, state, metaTitle, metaDescription, headline, bodyContent } = body;

    if (!slug || !city || !state) {
      return c.json({ error: "Missing required fields: slug, city, state" }, 400);
    }

    const db = getDb();

    // Check if geo page exists
    const existing = await db.query.geoPages.findFirst({
      where: eq(geoPages.slug, slug)
    });

    if (existing) {
      await db.update(geoPages).set({
        city, state, metaTitle, metaDescription, headline, bodyContent,
        updatedAt: new Date()
      }).where(eq(geoPages.slug, slug));
      return c.json({ message: "GEO Page updated successfully", slug }, 200);
    } else {
      await db.insert(geoPages).values({
        slug, city, state, metaTitle, metaDescription, headline, bodyContent
      });
      return c.json({ message: "GEO Page created successfully", slug }, 201);
    }
  } catch (error) {
    console.error("Error processing GEO webhook:", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

// Endpoint to create or update an SEO Blog Post
agentWebhookApp.post("/blog", async (c) => {
  try {
    const body = await c.req.json();
    const { slug, title, content, excerpt, category, metaTitle, metaDescription } = body;

    if (!slug || !title || !content) {
      return c.json({ error: "Missing required fields: slug, title, content" }, 400);
    }

    const db = getDb();

    const existing = await db.query.blogPosts.findFirst({
      where: eq(blogPosts.slug, slug)
    });

    if (existing) {
      await db.update(blogPosts).set({
        title, content, excerpt, category, metaTitle, metaDescription,
        updatedAt: new Date()
      }).where(eq(blogPosts.slug, slug));
      return c.json({ message: "Blog Post updated successfully", slug }, 200);
    } else {
      await db.insert(blogPosts).values({
        slug, title, content, excerpt, category, metaTitle, metaDescription,
        isPublished: true,
        publishedAt: new Date()
      });
      return c.json({ message: "Blog Post created successfully", slug }, 201);
    }
  } catch (error) {
    console.error("Error processing Blog webhook:", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});
