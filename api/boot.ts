import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { createOAuthCallbackHandler } from "./kimi/auth";
import { Paths } from "@contracts/constants";
import { aeoRouter } from "./routers/aeo";
import { isAiCrawler, buildAeoPayload, buildAeoMarkdownPayload } from "./lib/aeo-payload";
import { securityHeaders } from "./lib/headers";

const app = new Hono<{ Bindings: HttpBindings & { ASSETS?: { fetch: (req: Request) => Promise<Response> } } }>();

// Security headers on all responses
app.use("*", securityHeaders);

// Mount Dynamic AEO Routes (sitemap.xml, llms.txt, llms-full.txt, ai.txt, /api/titan-audit)
app.route("/", aeoRouter);

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));
app.get(Paths.oauthCallback, createOAuthCallbackHandler());
app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

// AEO Crawler & Content Negotiation Interception:
// - `Accept: text/markdown` serves clean Markdown with Top-of-DOM Infobox table + H3 Fan-Out.
// - AI crawlers or `Accept: application/llm` receive structured JSON knowledge graphs.
app.use("*", async (c, next) => {
  const userAgent = c.req.header("user-agent") || "";
  const accept = c.req.header("accept") || "";
  const isLlmRequest = accept.includes("application/llm");
  const isMarkdownRequest = accept.includes("text/markdown");

  if (isMarkdownRequest) {
    const md = await buildAeoMarkdownPayload(c.req.path);
    if (md) {
      c.header("Content-Type", "text/markdown; charset=utf-8");
      return c.body(md);
    }
  }

  if (isAiCrawler(userAgent) || isLlmRequest) {
    const payload = await buildAeoPayload(c.req.path);
    if (payload) {
      console.log(`[AEO] Serving structured payload for ${c.req.path} to ${userAgent}`);
      return c.json(payload);
    }
  }
  await next();
});

export default app;

if (env.isProduction) {
  const { serveStaticFiles } = await import("./lib/vite");
  await serveStaticFiles(app);

  // On Cloudflare Pages, the handler is created by functions/[[routes]].ts
  // via handle(app). On Node.js, start the standalone server.
  if (!process.env.CF_PAGES) {
    const { serve } = await import("@hono/node-server");
    const port = parseInt(process.env.PORT || "3000");
    serve({ fetch: app.fetch, port }, () => {
      console.log(`Server running on http://localhost:${port}/`);
    });
  }
}
