import { describe, it, expect, vi } from "vitest";

let mockDbShouldThrow = false;

vi.mock("../queries/connection", () => ({
  getDb: () => {
    if (mockDbShouldThrow) {
      throw new Error("DB unreachable");
    }
    return {
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
    };
  },
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

  it("serves segmented <sitemapindex> at /sitemap.xml and child sitemaps with ISO <lastmod>", async () => {
    const indexRes = await aeoRouter.request("/sitemap.xml");
    expect(indexRes.status).toBe(200);
    const indexXml = await indexRes.text();
    expect(indexXml).toContain("<sitemapindex");
    expect(indexXml).toContain("https://web-ready.ag/sitemap-core.xml");
    expect(indexXml).toContain("https://web-ready.ag/sitemap-services.xml");
    expect(indexXml).toContain("https://web-ready.ag/sitemap-locations.xml");
    expect(indexXml).toContain("https://web-ready.ag/sitemap-guides.xml");
    expect(indexXml).toContain("https://web-ready.ag/sitemap-compare.xml");
    expect(indexXml).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);

    const locRes = await aeoRouter.request("/sitemap-locations.xml");
    expect(locRes.status).toBe(200);
    const locXml = await locRes.text();
    expect(locXml).toContain("<urlset");
    expect(locXml).toContain("https://web-ready.ag/locations/miami");
    expect(locXml).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);

    const guidesRes = await aeoRouter.request("/sitemap-guides.xml");
    expect(guidesRes.status).toBe(200);
    expect(await guidesRes.text()).toContain("https://web-ready.ag/blog/aeo-guide");

    const compareRes = await aeoRouter.request("/sitemap-compare.xml");
    expect(compareRes.status).toBe(200);
    expect(await compareRes.text()).toContain("https://web-ready.ag/compare/enterprise-aeo");
  });

  it("/llms-full.txt omits placeholder 555 phone numbers and documents separated training allow policy", async () => {
    const res = await aeoRouter.request("/llms-full.txt");
    const body = await res.text();
    expect(body).not.toContain("555-0147");
    expect(body).toContain("OAI-SearchBot");
    expect(body).toContain("GPTBot");
  });

  it("degrades gracefully with 200 OK XML/Markdown when DB is unreachable", async () => {
    mockDbShouldThrow = true;
    try {
      const smRes = await aeoRouter.request("/sitemap.xml");
      expect(smRes.status).toBe(200);
      expect(await smRes.text()).toContain("https://web-ready.ag/sitemap-compare.xml");

      const llmsRes = await aeoRouter.request("/llms.txt");
      expect(llmsRes.status).toBe(200);
      expect(await llmsRes.text()).toContain("# WEB-READY/AG");
    } finally {
      mockDbShouldThrow = false;
    }
  });
});
