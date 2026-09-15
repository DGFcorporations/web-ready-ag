import { describe, it, expect, vi } from "vitest";
import { isAiCrawler, buildAeoPayload } from "./aeo-payload";
import { getDb } from "../queries/connection";

vi.mock("../queries/connection", () => ({
  getDb: vi.fn(),
}));

describe("isAiCrawler", () => {
  it("detects ChatGPT crawler", () => {
    expect(isAiCrawler("ChatGPT-User/1.0")).toBe(true);
  });

  it("detects Perplexity bot", () => {
    expect(isAiCrawler("PerplexityBot/1.0")).toBe(true);
  });

  it("detects Claude bot", () => {
    expect(isAiCrawler("ClaudeBot/1.0")).toBe(true);
  });

  it("detects OAI search bot", () => {
    expect(isAiCrawler("OAI-SearchBot/1.0")).toBe(true);
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

describe("buildAeoPayload", () => {
  it("returns knowledge graph for home route", async () => {
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
  });

  it("returns location payload for /locations/:slug", async () => {
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
  });

  it("returns null for unknown routes", async () => {
    const payload = await buildAeoPayload("/nonexistent");
    expect(payload).toBeNull();
  });
});
