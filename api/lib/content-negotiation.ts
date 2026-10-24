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
  let wantsMarkdown = false;
  let wantsJson = false;
  for (const part of accept.slice(0, 2048).split(",")) {
    const [rawType, ...params] = part.split(";");
    const type = rawType.trim().toLowerCase();
    const q = params.map((p) => p.trim().toLowerCase()).find((p) => p.startsWith("q="));
    if (q !== undefined && Number(q.slice(2)) === 0) continue;
    if (type === "text/markdown") wantsMarkdown = true;
    else if (JSON_MEDIA_TYPES.has(type)) wantsJson = true;
  }
  if (wantsMarkdown) return "markdown";
  if (wantsJson) return "json";
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
        c.header("Vary", "Accept");
        return c.body(md);
      }
    } else if (representation === "json") {
      const payload = await deps.buildJson(c.req.path);
      if (payload) {
        c.header("Vary", "Accept");
        return c.json(payload);
      }
    }

    await next();
    appendVaryAccept(c.res.headers);
  };
}
