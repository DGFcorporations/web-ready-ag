import type { Hono } from "hono";
import type { HttpBindings } from "@hono/node-server";
import { injectMeta, resolveRouteMeta } from "./html-inject";

type App = Hono<{ Bindings: HttpBindings & { ASSETS?: { fetch: (req: Request) => Promise<Response> } } }>;

export async function serveStaticFiles(app: App) {
  const isCloudflare = typeof (globalThis as any).caches !== "undefined" && !(typeof process !== "undefined" && process.versions?.node);

  if (!isCloudflare) {
    // Node.js only: dynamic import to avoid bundling Node-only deps on Cloudflare
    const { serveStatic } = await import("@hono/node-server/serve-static");
    app.use("*", serveStatic({ root: "./dist/public" }));
  }

  app.notFound(async (c) => {
    const accept = c.req.header("accept") ?? "";
    if (!accept.includes("text/html")) {
      return c.json({ error: "Not Found" }, 404);
    }

    let content: string;

    if (isCloudflare && c.env.ASSETS) {
      // Cloudflare Pages: fetch index.html via ASSETS binding
      const assetResponse = await c.env.ASSETS.fetch(new Request("https://placeholder/index.html"));
      content = await assetResponse.text();
    } else {
      // Node.js: read from filesystem (dynamic import to avoid Cloudflare bundling)
      const fs = (await import("fs")).default;
      const path = (await import("path")).default;
      const distPath = path.resolve(import.meta.dirname, "../dist/public");
      const indexPath = path.resolve(distPath, "index.html");
      content = fs.readFileSync(indexPath, "utf-8");
    }

    // Server-side meta injection
    const meta = await resolveRouteMeta(c.req.path);
    if (meta) {
      content = injectMeta(content, meta);
    }

    return c.html(content);
  });
}
