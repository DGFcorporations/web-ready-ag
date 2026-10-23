import { describe, it, expect } from "vitest";
import {
  buildOrganizationJsonLd,
  buildLocalBusinessJsonLd,
  buildServiceJsonLd,
  buildBlogPostingJsonLd,
  buildBreadcrumbJsonLd,
  buildWebsiteJsonLd,
  buildWebPageJsonLd,
  buildUnifiedGraphJsonLd,
  WIKIDATA_ENTITIES,
} from "./json-ld";

describe("JSON-LD generators (Titan-Upgraded)", () => {
  it("buildOrganizationJsonLd returns valid Organization schema with Wikidata Q-ID sameAs", () => {
    const result = buildOrganizationJsonLd();
    expect(result["@context"]).toBe("https://schema.org");
    expect(result["@type"]).toBe("Organization");
    expect(result["@id"]).toBe("https://web-ready.ag/#organization");
    expect(result.name).toBe("WEB-READY/AG");
    expect(result.url).toBe("https://web-ready.ag");
    expect(result.sameAs).toContain(WIKIDATA_ENTITIES.searchEngineOptimization);
    expect(result.areaServed.sameAs).toBe(WIKIDATA_ENTITIES.florida);
  });

  it("buildLocalBusinessJsonLd returns LocalBusiness with city Wikidata Q-ID and definition headline", () => {
    const geoPage = {
      slug: "miami",
      city: "Miami",
      state: "FL",
      metaTitle: "AI Automation Miami",
      metaDescription: "Serving Miami.",
    };
    const result = buildLocalBusinessJsonLd(geoPage as any);
    expect(result["@type"]).toBe("LocalBusiness");
    expect(result.name).toContain("WEB-READY/AG");
    expect(result.address.addressLocality).toBe("Miami");
    expect(result.address.addressRegion).toBe("FL");
    expect(result.url).toBe("https://web-ready.ag/locations/miami");
    expect(result.sameAs).toBe(WIKIDATA_ENTITIES.miami);
    expect(result.areaServed.sameAs).toBe(WIKIDATA_ENTITIES.miami);
    expect(result.headline).toBe("Serving Miami.");
  });

  it("buildServiceJsonLd returns Service schema with Wikidata mainEntity and headline", () => {
    const service = {
      slug: "voice-ai",
      name: "Voice AI Receptionist",
      shortDesc: "AI-powered phone receptionist",
      fullDesc: "Full description here",
    };
    const result = buildServiceJsonLd(service as any);
    expect(result["@type"]).toBe("Service");
    expect(result.name).toBe("Voice AI Receptionist");
    expect(result.description).toBe("Full description here");
    expect(result.headline).toBe("Full description here");
    expect(result.mainEntity).toBe(WIKIDATA_ENTITIES.searchEngineOptimization);
    expect(result.url).toBe("https://web-ready.ag/services");
  });

  it("buildBlogPostingJsonLd returns BlogPosting with datePublished, Wikidata, and primary citations", () => {
    const post = {
      slug: "test-post",
      title: "Test Post",
      excerpt: "Excerpt",
      content: "<p>Content</p>",
      author: "Josh",
      publishedAt: new Date("2026-09-01T00:00:00Z"),
      featuredImage: "https://web-ready.ag/img/test.jpg",
    };
    const result = buildBlogPostingJsonLd(post as any);
    expect(result["@type"]).toBe("BlogPosting");
    expect(result.headline).toBe("Test Post");
    expect(result.author.name).toBe("Josh");
    expect(result.datePublished).toBe("2026-09-01T00:00:00.000Z");
    expect(result.image).toBe("https://web-ready.ag/img/test.jpg");
    expect(result.url).toBe("https://web-ready.ag/blog/test-post");
    expect(result.sameAs).toBe(WIKIDATA_ENTITIES.searchEngineOptimization);
    expect(Array.isArray(result.citation)).toBe(true);
    expect(result.citation.length).toBeGreaterThan(0);
  });

  it("buildBreadcrumbJsonLd returns BreadcrumbList", () => {
    const items = [
      { name: "Home", url: "https://web-ready.ag/" },
      { name: "Locations", url: "https://web-ready.ag/locations" },
      { name: "Miami", url: "https://web-ready.ag/locations/miami" },
    ];
    const result = buildBreadcrumbJsonLd(items);
    expect(result["@type"]).toBe("BreadcrumbList");
    expect(result.itemListElement).toHaveLength(3);
    expect(result.itemListElement[0].position).toBe(1);
    expect(result.itemListElement[2].name).toBe("Miami");
  });

  it("buildWebsiteJsonLd returns WebSite with SearchAction and @id", () => {
    const result = buildWebsiteJsonLd();
    expect(result["@type"]).toBe("WebSite");
    expect(result["@id"]).toBe("https://web-ready.ag/#website");
    expect(result.url).toBe("https://web-ready.ag");
    expect(result.potentialAction["@type"]).toBe("SearchAction");
    expect(result.potentialAction.target).toContain("/blog?search=");
  });

  it("buildWebPageJsonLd embeds Cleveland Clinic definition-in-headline and Wikipedia Wikidata Q-ID", () => {
    const result = buildWebPageJsonLd({
      url: "https://web-ready.ag/services",
      name: "AI Automation Services",
      definitionHeadline:
        "WEB-READY/AG engineers 7-layer Agent-Grade websites that rank #1 across Google, Perplexity, OpenAI Search, and Brave Search.",
    });
    expect(result["@type"]).toBe("WebPage");
    expect(result.headline).toContain("7-layer Agent-Grade websites");
    expect(result.sameAs).toContain("wikidata.org/entity/Q");
    expect(result.mainEntity).toContain("wikidata.org/entity/Q");
    expect(result.citation.length).toBeGreaterThan(0);
  });

  it("buildUnifiedGraphJsonLd wraps schema nodes into a single @graph without duplicate @context", () => {
    const graph = buildUnifiedGraphJsonLd([
      buildOrganizationJsonLd(),
      buildWebsiteJsonLd(),
    ]);
    expect(graph["@context"]).toBe("https://schema.org");
    expect(Array.isArray(graph["@graph"])).toBe(true);
    expect(graph["@graph"]).toHaveLength(2);
    expect(graph["@graph"][0]["@context"]).toBeUndefined();
    expect(graph["@graph"][0]["@type"]).toBe("Organization");
  });
});
