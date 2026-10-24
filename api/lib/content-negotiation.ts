import type { MiddlewareHandler } from "hono";

export type Representation = "html" | "markdown" | "json";

const JSON_MEDIA_TYPES = new Set(["application/json", "application/llm+json", "application/llm"]);

/**
 * Picks the representation for a request from the Accept header ONLY.
 * The User-Agent is deliberately ignored: AI search crawlers (PerplexityBot,
 * OAI-SearchBot, GPTBot, Claude-SearchBot, BraveBot) must receive the pre-rendered
 * HTML (entity-infobox, JSON-LD @graph, Question H3s) unless they explicitly ask
 * for Markdown or JSON. Linear in the header length.
 */
export function chooseRepresentation(accept: string): Representation {
  let qHtml = 0;
  let qMarkdown = 0;
  let qJson = 0;

  for (const part of accept.slice(0, 2048).split(",")) {
    const [rawType, ...params] = part.split(";");
    const type = rawType.trim().toLowerCase();
    let q = 1.0;
    const qParam = params.map((p) => p.trim().toLowerCase()).find((p) => p.startsWith("q="));
    if (qParam !== undefined) {
      const parsed = Number(qParam.slice(2));
      q = Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : 0;
    }
    if (q === 0) continue;

    if (type === "text/markdown") {
      qMarkdown = Math.max(qMarkdown, q);
    } else if (JSON_MEDIA_TYPES.has(type)) {
      qJson = Math.max(qJson, q);
    } else if (type === "text/html" || type === "application/xhtml+xml") {
      qHtml = Math.max(qHtml, q);
    }
  }

  if (qMarkdown > 0 && qMarkdown >= qJson && qMarkdown >= qHtml) return "markdown";
  if (qJson > 0 && qJson > qHtml) return "json";
  return "html";
}

export interface NegotiationDeps {
  buildJson: (pathname: string) => Promise<object | null>;
  buildMarkdown: (pathname: string) => Promise<string | null>;
}

function appendVaryAccept(headers: Headers): void {
  const existing = headers.get("Vary");
  if (!existing) {
    headers.set("Vary", "Accept");
    return;
  }
  const tokens = existing.split(",").map((t) => t.trim().toLowerCase());
  if (tokens.includes("accept") || tokens.includes("*")) return;
  headers.set("Vary", `${existing}, Accept`);
}

function applyVaryAccept(c: { header: (name: string, value: string) => void; res: { headers: Headers } }): void {
  const existing = c.res.headers.get("Vary");
  if (!existing) {
    c.header("Vary", "Accept");
    return;
  }
  const tokens = existing.split(",").map((t) => t.trim().toLowerCase());
  if (tokens.includes("accept") || tokens.includes("*")) return;
  c.header("Vary", `${existing}, Accept`);
}

/**
 * Content-negotiation middleware. Every response that passes through (markdown,
 * JSON, or the HTML fall-through) carries `Vary: Accept` so shared caches/CDNs
 * cannot serve one representation for another.
 */
export function createNegotiationMiddleware(deps: NegotiationDeps): MiddlewareHandler {
  return async (c, next) => {
    const representation = chooseRepresentation(c.req.header("accept") || "");

    if (representation === "markdown") {
      const md = await deps.buildMarkdown(c.req.path);
      if (md) {
        c.header("Content-Type", "text/markdown; charset=utf-8");
        applyVaryAccept(c);
        return c.body(md);
      }
    } else if (representation === "json") {
      const payload = await deps.buildJson(c.req.path);
      if (payload) {
        applyVaryAccept(c);
        return c.json(payload);
      }
    }

    await next();
    appendVaryAccept(c.res.headers);
  };
}
