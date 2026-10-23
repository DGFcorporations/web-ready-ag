import { describe, it, expect, vi } from "vitest";
import { isAiCrawler, buildAeoPayload, buildAeoMarkdownPayload } from "./aeo-payload";
import { getDb } from "../queries/connection";

vi.mock("../queries/connection", () => ({
  getDb: vi.fn(),
}));

describe("isAiCrawler (Titan 12-Bot Matrix)", () => {
  it("detects ChatGPT crawler and GPTBot", () => {
    expect(isAiCrawler("ChatGPT-User/1.0")).toBe(true);
    expect(isAiCrawler("Mozilla/5.0 (compatible; GPTBot/1.2)")).toBe(true);
  });

  it("detects Perplexity bot and Perplexity-User", () => {
    expect(isAiCrawler("PerplexityBot/1.0")).toBe(true);
    expect(isAiCrawler("Perplexity-User/1.0")).toBe(true);
  });

  it("detects ClaudeBot, Claude-SearchBot, and Claude-User", () => {
    expect(isAiCrawler("ClaudeBot/1.0")).toBe(true);
    expect(isAiCrawler("Claude-SearchBot/1.0")).toBe(true);
    expect(isAiCrawler("Claude-User/1.0")).toBe(true);
  });

  it("detects OAI search bot", () => {
    expect(isAiCrawler("OAI-SearchBot/1.0")).toBe(true);
  });

  it("detects BraveBot (Claude 86.7% retrieval backend)", () => {
    expect(isAiCrawler("Mozilla/5.0 (compatible; BraveBot/1.0)")).toBe(true);
  });

  it("detects Anthropic crawler", () => {
    expect(isAiCrawler("anthropic-ai/1.0")).toBe(true);
  });

  it("detects Google AI crawler", () => {
    expect(isAiCrawler("Google-Extended/1.0")).toBe(true);
  });

  it("does not flag regular browsers", () => {
    expect(isAiCrawler("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(isAiCrawler("CHATGPT-USER/1.0")).toBe(true);
  });
});

describe("buildAeoPayload & buildAeoMarkdownPayload", () => {
  it("returns knowledge graph for home route with Wikidata Q-ID and 4 target engines", async () => {
    vi.mocked(getDb).mockReturnValue({
      query: {
        services: { findMany: vi.fn().mockResolvedValue([]) },
        geoPages: { findMany: vi.fn().mockResolvedValue([]) },
      },
    } as any);

    const payload = (await buildAeoPayload("/")) as any;
    expect(payload).not.toBeNull();
    expect(payload.url).toBe("https://web-ready.ag/");
    expect(payload.type).toBe("knowledge_graph");
    expect(payload.wikidataEntity).toContain("wikidata.org/entity/Q");
    expect(payload.targetEngines).toContain("Brave Search (Claude)");
  });

  it("returns location payload for /locations/:slug with city Wikidata Q-ID", async () => {
    const mockPage = {
      slug: "miami",
      city: "Miami",
      state: "FL",
      metaDescription: "Serving Miami.",
      bodyContent: "We serve Miami businesses.",
      isActive: true,
    };
    vi.mocked(getDb).mockReturnValue({
      query: {
        geoPages: { findFirst: vi.fn().mockResolvedValue(mockPage) },
      },
    } as any);

    const payload = (await buildAeoPayload("/locations/miami")) as any;
    expect(payload).not.toBeNull();
    expect(payload.type).toBe("local_business");
    expect(payload.city).toBe("Miami");
    expect(payload.wikidataEntity).toBe("http://www.wikidata.org/entity/Q8652");
  });

  it("builds Markdown payload with Top-of-DOM Infobox table for /services", async () => {
    const md = await buildAeoMarkdownPayload("/services");
    expect(md).not.toBeNull();
    expect(md).toContain("## Entity Summary Infobox");
    expect(md).toContain("| Wikidata Entity Q-ID |");
    expect(md).toContain("Google, Perplexity, OpenAI, Brave Search (Claude)");
  });

  it("returns null for unknown routes", async () => {
    const payload = await buildAeoPayload("/nonexistent");
    expect(payload).toBeNull();
  });
});
