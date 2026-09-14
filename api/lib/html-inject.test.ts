import { describe, it, expect, vi } from "vitest";
import { injectMeta, resolveRouteMeta, type PageMeta } from "./html-inject";
import { getDb } from "../queries/connection";

// Mock the DB
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

describe("injectMeta", () => {
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
    expect(result).toContain('content="Test Title"'); // OG title
    expect(result).toContain('content="https://web-ready.ag/img/test.jpg"'); // OG image
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
    // JSON-LD should be inside <head>, before </head>
    const headEnd = result.indexOf("</head>");
    const jsonLdPos = result.indexOf('application/ld+json');
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
    // The base HTML already has one JSON-LD block (Organization/FAQ).
    // We inject a new one, so there should be 2 total.
    expect(matches?.length).toBe(2);
  });
});

describe("resolveRouteMeta", () => {
  it("returns home page meta for /", async () => {
    const meta = await resolveRouteMeta("/");
    expect(meta).not.toBeNull();
    expect(meta!.canonical).toBe("https://web-ready.ag");
    expect(meta!.title).toContain("WEB-READY/AG");
  });

  it("returns location meta for /locations/:slug", async () => {
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
  });

  it("returns null for unknown routes", async () => {
    const meta = await resolveRouteMeta("/this-does-not-exist");
    expect(meta).toBeNull();
  });
});
