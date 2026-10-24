import { describe, it, expect, vi } from "vitest";
import { Hono } from "hono";
import { chooseRepresentation, createNegotiationMiddleware } from "./content-negotiation";

const CRAWLERS = [
  "Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)",
  "OAI-SearchBot/1.0",
  "Mozilla/5.0 AppleWebKit/537.36 (compatible; GPTBot/1.1)",
  "Claude-SearchBot",
  "BraveBot/1.0",
];

describe("chooseRepresentation", () => {
  it.each(CRAWLERS)("serves HTML to %s when it asks for text/html", () => {
    expect(chooseRepresentation("text/html,application/xhtml+xml;q=0.9,*/*;q=0.8")).toBe("html");
  });

  it("serves HTML for missing or wildcard Accept headers (UA is irrelevant)", () => {
    expect(chooseRepresentation("")).toBe("html");
    expect(chooseRepresentation("*/*")).toBe("html");
  });

  it("serves markdown only on explicit text/markdown", () => {
    expect(chooseRepresentation("text/markdown")).toBe("markdown");
  });

  it("serves JSON only on explicit application/json or application/llm+json", () => {
    expect(chooseRepresentation("application/json")).toBe("json");
    expect(chooseRepresentation("application/llm+json")).toBe("json");
    expect(chooseRepresentation("application/llm")).toBe("json");
  });

  it("does not treat application/jsonp-like or lookalike tokens as JSON", () => {
    expect(chooseRepresentation("text/html;x=application/jsonx")).toBe("html");
  });

  it("prioritizes text/html over application/json when HTML has equal or higher q-factor", () => {
    expect(chooseRepresentation("text/html, application/json;q=0.5")).toBe("html");
    expect(chooseRepresentation("text/html, application/json")).toBe("html");
    expect(chooseRepresentation("text/html;q=0.9, application/json;q=0.8")).toBe("html");
  });

  it("prioritizes text/html over text/markdown when HTML has equal or higher q-factor", () => {
    expect(chooseRepresentation("text/html, text/markdown")).toBe("html");
    expect(chooseRepresentation("text/markdown, text/html")).toBe("html");
    expect(chooseRepresentation("text/html;q=0.9, text/markdown;q=0.8")).toBe("html");
  });

  it("prioritizes text/html when HTML, markdown, and JSON all tie", () => {
    expect(chooseRepresentation("text/html, text/markdown, application/json")).toBe("html");
    expect(chooseRepresentation("text/markdown;q=0.8, application/json;q=0.8, text/html;q=0.8")).toBe("html");
  });

  it("serves markdown when text/markdown has strictly higher q-factor than HTML", () => {
    expect(chooseRepresentation("text/markdown, text/html;q=0.5")).toBe("markdown");
    expect(chooseRepresentation("text/markdown;q=0.9, text/html;q=0.8")).toBe("markdown");
  });

  it("serves JSON when application/json has strictly higher q-factor than HTML", () => {
    expect(chooseRepresentation("application/json, text/html;q=0.5")).toBe("json");
    expect(chooseRepresentation("application/llm+json, text/html;q=0.1")).toBe("json");
  });
});

describe("createNegotiationMiddleware", () => {
  function makeApp() {
    const deps = {
      buildJson: vi.fn(async () => ({ type: "knowledge_graph" })),
      buildMarkdown: vi.fn(async () => "# md"),
    };
    const app = new Hono();
    app.use("*", createNegotiationMiddleware(deps));
    app.get("*", (c) => c.html("<html><body><table class=\"entity-infobox\"></table></body></html>"));
    return { app, deps };
  }

  it.each(CRAWLERS)("returns pre-rendered HTML (not JSON) to %s requesting text/html", async (ua) => {
    const { app, deps } = makeApp();
    const res = await app.request("/", { headers: { "user-agent": ua, accept: "text/html" } });
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(await res.text()).toContain("entity-infobox");
    expect(deps.buildJson).not.toHaveBeenCalled();
    expect(res.headers.get("vary")?.toLowerCase()).toContain("accept");
  });

  it("returns JSON on explicit application/json with Vary: Accept", async () => {
    const { app } = makeApp();
    const res = await app.request("/", { headers: { accept: "application/llm+json" } });
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(await res.json()).toEqual({ type: "knowledge_graph" });
    expect(res.headers.get("vary")?.toLowerCase()).toContain("accept");
  });

  it("returns markdown on text/markdown with Vary: Accept", async () => {
    const { app } = makeApp();
    const res = await app.request("/", { headers: { accept: "text/markdown" } });
    expect(res.headers.get("content-type")).toContain("text/markdown");
    expect(await res.text()).toBe("# md");
    expect(res.headers.get("vary")?.toLowerCase()).toContain("accept");
  });

  it("falls through to HTML when the JSON builder has no payload for the path", async () => {
    const { app, deps } = makeApp();
    deps.buildJson.mockResolvedValueOnce(null as never);
    const res = await app.request("/unknown", { headers: { accept: "application/json" } });
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(res.headers.get("vary")?.toLowerCase()).toContain("accept");
  });

  it("does not duplicate an existing Vary header value", async () => {
    const app = new Hono();
    app.use("*", createNegotiationMiddleware({ buildJson: async () => null, buildMarkdown: async () => null }));
    app.get("*", (c) => {
      c.header("Vary", "Accept-Encoding");
      return c.text("ok");
    });
    const res = await app.request("/", { headers: { accept: "text/html" } });
    const vary = (res.headers.get("vary") || "").toLowerCase().split(",").map((s) => s.trim());
    expect(vary).toContain("accept");
    expect(vary).toContain("accept-encoding");
    expect(vary.filter((v) => v === "accept")).toHaveLength(1);
  });

  it("preserves pre-existing Vary headers on JSON responses", async () => {
    const app = new Hono();
    app.use("*", async (c, next) => {
      c.header("Vary", "Accept-Encoding");
      await next();
    });
    app.use("*", createNegotiationMiddleware({
      buildJson: async () => ({ status: "ok" }),
      buildMarkdown: async () => null,
    }));
    const res = await app.request("/", { headers: { accept: "application/json" } });
    const vary = (res.headers.get("vary") || "").toLowerCase().split(",").map((s) => s.trim());
    expect(vary).toContain("accept");
    expect(vary).toContain("accept-encoding");
  });
});
