import { describe, it, expect, vi } from "vitest";

vi.mock("../queries/connection", () => ({
  getDb: () => ({
    query: {
      services: {
        findMany: async () => [
          { name: "Voice AI", slug: "voice-ai", fullDesc: "Answers calls", shortDesc: "calls", features: ["24/7"] },
        ],
      },
      geoPages: {
        findMany: async () => [{ city: "Miami", state: "FL", slug: "miami" }],
      },
      blogPosts: {
        findMany: async () => [
          { title: "AEO [Guide]", slug: "aeo-guide", category: "seo", excerpt: "x", publishedAt: new Date() },
        ],
      },
    },
  }),
}));

import { aeoRouter } from "./aeo";
import { lintLlmsTxt, mdLink } from "../lib/llms-txt";

describe("llms.txt standard Markdown links (Lighthouse llms-txt audit)", () => {
  it("mdLink escapes brackets and whitespace in URLs", () => {
    expect(mdLink("A [b]", "https://x.com/a b(1)")).toBe("[A \\[b\\]](https://x.com/a%20b%281%29)");
  });

  it("lintLlmsTxt flags bare-URL documents", () => {
    const findings = lintLlmsTxt("# T\n\n> s\n\n## S\n- Svc — https://x.com/a\n");
    expect(findings.map((f) => f.rule)).toEqual(["link"]);
  });

  it("/llms.txt passes the lint and uses [label](url) links", async () => {
    const res = await aeoRouter.request("/llms.txt");
    const body = await res.text();
    expect(lintLlmsTxt(body)).toEqual([]);
    expect(body).toContain("[Services](https://web-ready.ag/services)");
    expect(body).toContain("[Miami](https://web-ready.ag/locations/miami)");
    expect(body).toContain("[Voice AI](https://web-ready.ag/services)");
  });

  it("/llms-full.txt passes the lint and links locations and posts", async () => {
    const res = await aeoRouter.request("/llms-full.txt");
    const body = await res.text();
    expect(lintLlmsTxt(body)).toEqual([]);
    expect(body).toContain("[Miami, FL](https://web-ready.ag/locations/miami)");
    expect(body).toContain("[AEO \\[Guide\\]](https://web-ready.ag/blog/aeo-guide)");
    expect(body).not.toMatch(/— https:\/\/web-ready\.ag/);
  });
});
