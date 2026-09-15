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
import { isAiCrawler, buildAeoPayload } from "./lib/aeo-payload";
import { securityHeaders } from "./lib/headers";

const app = new Hono<{ Bindings: HttpBindings }>();

// Security headers on all responses
app.use("*", securityHeaders);

// Mount Dynamic AEO Routes (sitemap.xml, llms.txt)
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

// AEO Crawler Interception — serves path-aware structured JSON to AI crawlers.
// Runs in all environments and before static file serving so AI bots receive
// route-specific structured data instead of a blanket /llms.txt redirect.
app.use("*", async (c, next) => {
  const userAgent = c.req.header("user-agent") || "";
  const isLlmRequest = c.req.header("accept")?.includes("application/llm") ?? false;

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

// Cloudflare Pages handler — assigned when running on Cloudflare Pages (process.env.CF_PAGES).
// Declared at module top level because `export` cannot appear inside a conditional block.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export let handler: any;

if (env.isProduction) {
  const { serveStaticFiles } = await import("./lib/vite");

  serveStaticFiles(app);

  // If running on Cloudflare Pages, export the handler. Otherwise, start the server.
  if (process.env.CF_PAGES) {
    const { handle } = await import("hono/cloudflare-pages");
    handler = handle(app);
  } else {
    const { serve } = await import("@hono/node-server");
    const port = parseInt(process.env.PORT || "3000");
    serve({ fetch: app.fetch, port }, () => {
      console.log(`Server running on http://localhost:${port}/`);
    });
  }
}
