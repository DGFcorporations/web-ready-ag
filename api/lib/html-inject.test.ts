import { describe, it, expect, vi } from "vitest";
import { injectMeta, resolveRouteMeta, buildPrerenderedBodyShell, type PageMeta } from "./html-inject";
import { getDb } from "../queries/connection";

vi.mock("../queries/connection", () => ({
  getDb: vi.fn(),
}));

const baseHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>WEB-READY/AG | AI Automation for Florida Service Businesses</title>
  <meta name="description" content="Old description" />
  <link rel="canonical" href="https://web-ready.ag" />
  <meta property="og:title" content="Old OG title" />
  <meta property="og:description" content="Old OG desc" />
  <meta property="twitter:title" content="Old Twitter title" />
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "WEB-READY/AG"
  }
  </script>
</head>
<body><div id="root"></div></body>
</html>`;

describe("injectMeta (Titan-Upgraded)", () => {
  it("replaces title tag", () => {
    const meta: PageMeta = {
      title: "AI Automation in Miami, FL | WEB-READY/AG",
      description: "Veteran-owned AI automation serving Miami.",
      canonical: "https://web-ready.ag/locations/miami",
    };
    const result = injectMeta(baseHtml, meta);
    expect(result).toContain("<title>AI Automation in Miami, FL | WEB-READY/AG</title>");
    expect(result).not.toContain("Old description");
  });

  it("replaces description, canonical, OG, and Twitter tags", () => {
    const meta: PageMeta = {
      title: "Test Title",
      description: "Test Description",
      canonical: "https://web-ready.ag/test",
      ogImage: "https://web-ready.ag/img/test.jpg",
    };
    const result = injectMeta(baseHtml, meta);
    expect(result).toContain('content="Test Description"');
    expect(result).toContain('href="https://web-ready.ag/test"');
    expect(result).toContain('content="Test Title"');
    expect(result).toContain('content="https://web-ready.ag/img/test.jpg"');
  });

  it("injects JSON-LD script blocks before </head>", () => {
    const meta: PageMeta = {
      title: "T",
      description: "D",
      canonical: "https://web-ready.ag/t",
      jsonLd: [{ "@type": "LocalBusiness", name: "Test Biz" }],
    };
    const result = injectMeta(baseHtml, meta);
    expect(result).toContain('type="application/ld+json"');
    expect(result).toContain('"@type":"LocalBusiness"');
    const headEnd = result.indexOf("</head>");
    const jsonLdPos = result.indexOf("application/ld+json");
    expect(jsonLdPos).toBeLessThan(headEnd);
  });

  it("does not duplicate JSON-LD if called once", () => {
    const meta: PageMeta = {
      title: "T",
      description: "D",
      canonical: "https://web-ready.ag/t",
      jsonLd: [{ "@type": "Organization", name: "WEB-READY/AG" }],
    };
    const result = injectMeta(baseHtml, meta);
    const matches = result.match(/application\/ld\+json/g);
    expect(matches?.length).toBe(1);
  });

  it("injects Wikipedia Top-of-DOM entity-infobox table and Cleveland Clinic H3 Question Fan-Out inside empty #root", () => {
    const meta: PageMeta = {
      title: "AI Automation in Miami, FL | WEB-READY/AG",
      description: "Veteran-owned AI automation serving Miami.",
      canonical: "https://web-ready.ag/locations/miami",
    };
    const result = injectMeta(baseHtml, meta);
    expect(result).toContain('class="ag-prerender-shell min-h-screen"');
    expect(result).toContain('class="entity-infobox"');
    expect(result).toContain("Wikidata Entity Q-ID");
    expect(result).toContain("Google, Perplexity, OpenAI, Brave Search (Claude)");
    expect(result).toContain('class="query-fanout-tree"');
    expect(result).toContain("<h3>What is AI Automation in Miami, FL and how does it work?</h3>");
  });

  it("buildPrerenderedBodyShell renders custom infobox rows and question fan-out items", () => {
    const shell = buildPrerenderedBodyShell({
      title: "Naples Service Area",
      description: "Serving Naples, FL.",
      canonical: "https://web-ready.ag/locations/naples",
      infobox: [{ label: "Market", value: "Naples, FL" }],
      fanOutQuestions: [
        {
          question: "How much does WebReady-AG cost in Naples?",
          answer: "Plans start with transparent monthly tiers.",
        },
      ],
    });
    expect(shell).toContain("<th scope=\"row\">Market</th><td>Naples, FL</td>");
    expect(shell).toContain("<h3>How much does WebReady-AG cost in Naples?</h3>");
  });
});

describe("resolveRouteMeta", () => {
  it("returns home page meta for / with WebPage definition headline", async () => {
    const meta = await resolveRouteMeta("/");
    expect(meta).not.toBeNull();
    expect(meta!.canonical).toBe("https://web-ready.ag/");
    expect(meta!.title).toContain("WEB-READY/AG");
    expect(meta!.jsonLd?.some((n: any) => n["@type"] === "WebPage")).toBe(true);
  });

  it("returns location meta for /locations/:slug with Wikidata Q-ID and infobox", async () => {
    const mockPage = {
      slug: "miami",
      city: "Miami",
      state: "FL",
      metaTitle: "AI Automation Miami",
      metaDescription: "Serving Miami businesses.",
      isActive: true,
    };
    vi.mocked(getDb).mockReturnValue({
      query: {
        geoPages: {
          findFirst: vi.fn().mockResolvedValue(mockPage),
        },
      },
    } as any);

    const meta = await resolveRouteMeta("/locations/miami");
    expect(meta).not.toBeNull();
    expect(meta!.title).toBe("AI Automation Miami");
    expect(meta!.canonical).toBe("https://web-ready.ag/locations/miami");
    expect(meta!.wikidataUri).toBe("http://www.wikidata.org/entity/Q8652");
    expect(meta!.infobox?.length).toBeGreaterThan(0);
    expect(meta!.fanOutQuestions?.length).toBeGreaterThan(0);
  });

  it("returns null for unknown routes", async () => {
    const meta = await resolveRouteMeta("/this-does-not-exist");
    expect(meta).toBeNull();
  });
});
