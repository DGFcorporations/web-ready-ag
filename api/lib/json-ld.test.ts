import { describe, it, expect } from "vitest";
import {
  buildOrganizationJsonLd,
  buildLocalBusinessJsonLd,
  buildServiceJsonLd,
  buildBlogPostingJsonLd,
  buildBreadcrumbJsonLd,
  buildWebsiteJsonLd,
} from "./json-ld";

describe("JSON-LD generators", () => {
  it("buildOrganizationJsonLd returns valid Organization schema", () => {
    const result = buildOrganizationJsonLd();
    expect(result["@context"]).toBe("https://schema.org");
    expect(result["@type"]).toBe("Organization");
    expect(result.name).toBe("WEB-READY/AG");
    expect(result.url).toBe("https://web-ready.ag");
  });

  it("buildLocalBusinessJsonLd returns LocalBusiness with city address", () => {
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
  });

  it("buildServiceJsonLd returns Service schema", () => {
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
    expect(result.url).toBe("https://web-ready.ag/services");
  });

  it("buildBlogPostingJsonLd returns BlogPosting with datePublished", () => {
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

  it("buildWebsiteJsonLd returns WebSite with SearchAction", () => {
    const result = buildWebsiteJsonLd();
    expect(result["@type"]).toBe("WebSite");
    expect(result.url).toBe("https://web-ready.ag");
    expect(result.potentialAction["@type"]).toBe("SearchAction");
    expect(result.potentialAction.target).toContain("/blog?search=");
  });
});
