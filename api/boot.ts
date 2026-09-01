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

const app = new Hono<{ Bindings: HttpBindings }>();

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

export default app;

if (env.isProduction) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  
  // AEO Crawler Interception Middleware
  app.use("*", async (c, next) => {
    const userAgent = (c.req.header("user-agent") || "").toLowerCase();
    const isBot = ["chatgpt-user", "perplexitybot", "claude", "oai-searchbot", "anthropic-ai"].some(bot => userAgent.includes(bot));
    const isLlmRequest = c.req.header("accept")?.includes("application/llm");
    
    if (isBot || isLlmRequest) {
      // Instead of parsing a 5MB React bundle, we immediately feed the AI the structured knowledge graph.
      // In a full implementation, we'd route based on c.req.path to serve location-specific context.
      console.log(`[AEO Middleware] Intercepted AI Crawler: ${userAgent}. Serving structured Context payload.`);
      return c.redirect("/llms.txt"); 
    }
    await next();
  });

  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
