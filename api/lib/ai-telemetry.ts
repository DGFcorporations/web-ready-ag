import { Hono } from "hono";
import { getDb } from "../queries/connection";
import { aiCrawlersLog } from "../../db/schema";

// Known AI bot user-agent patterns
const AI_BOT_PATTERNS = [
  "ChatGPT-User",
  "GPTBot",
  "OAI-SearchBot",
  "PerplexityBot",
  "ClaudeBot",
  "Anthropic-ai",
  "Google-Extended",
  "Applebot-Extended"
];

export const aiTelemetryMiddleware = async (c: any, next: any) => {
  const userAgent = c.req.header("User-Agent") || "";

  const botName = AI_BOT_PATTERNS.find(pattern =>
    userAgent.toLowerCase().includes(pattern.toLowerCase())
  );

  if (botName) {
    try {
      const db = getDb();
      await db.insert(aiCrawlersLog).values({
        botName,
        userAgent,
        pathAccessed: c.req.path,
        ipAddress: c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown",
      });
    } catch (error) {
      console.error("Failed to log AI crawler visit:", error);
    }
  }

  await next();
};
