import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import Compare from "./Compare";
import SEO from "@/components/SEO";

vi.mock("@/components/Navigation", () => ({
  default: () => <nav data-testid="mock-nav" />,
}));

vi.mock("@/components/Footer", () => ({
  default: () => <footer data-testid="mock-footer" />,
}));

describe("Compare 1-to-1 self-referencing canonicals & @graph closure", () => {
  afterEach(() => {
    cleanup();
    document.querySelectorAll("script[data-dynamic-jsonld]").forEach((el) => el.remove());
  });

  it("serves /compare with canonical https://web-ready.ag/compare and full connected @graph", () => {
    render(
      <MemoryRouter initialEntries={["/compare"]}>
        <Routes>
          <Route path="/compare" element={<Compare />} />
          <Route path="/compare/:slug" element={<Compare />} />
        </Routes>
      </MemoryRouter>,
    );

    const canonicalEl = document.querySelector('link[rel="canonical"]');
    expect(canonicalEl?.getAttribute("href")).toBe("https://web-ready.ag/compare");

    const ldScripts = document.querySelectorAll('script[data-dynamic-jsonld="true"]');
    expect(ldScripts.length).toBe(1);
    const graphObj = JSON.parse(ldScripts[0].textContent || "{}") as { "@graph": Array<Record<string, unknown>> };
    const types = graphObj["@graph"].map((n) => n["@type"]);
    expect(types).toContain("Organization");
    expect(types).toContain("WebSite");
    expect(types).toContain("Person");
    expect(types).toContain("WebPage");
    expect(types).toContain("FAQPage");
    expect(types).toContain("BreadcrumbList");

    const ids = new Set(graphObj["@graph"].map((n) => n["@id"]).filter(Boolean));
    expect(ids.has("https://web-ready.ag/#website")).toBe(true);
    expect(ids.has("https://web-ready.ag/#organization")).toBe(true);
    expect(ids.has("https://web-ready.ag/compare#webpage")).toBe(true);
  });

  it("serves unique canonicals for /compare/traditional-seo-vs-4layer and /compare/geo-prompt-benchmarking", () => {
    render(
      <MemoryRouter initialEntries={["/compare/traditional-seo-vs-4layer"]}>
        <Routes>
          <Route path="/compare/:slug" element={<Compare />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(
      "https://web-ready.ag/compare/traditional-seo-vs-4layer",
    );
    cleanup();

    render(
      <MemoryRouter initialEntries={["/compare/geo-prompt-benchmarking"]}>
        <Routes>
          <Route path="/compare/:slug" element={<Compare />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(
      "https://web-ready.ag/compare/geo-prompt-benchmarking",
    );
  });

  it("SEO removes stale dynamic JSON-LD when transitioning to a route without jsonLd", () => {
    const { rerender } = render(
      <SEO
        title="Compare"
        description="desc"
        canonical="https://web-ready.ag/compare"
        jsonLd={[{ "@context": "https://schema.org", "@type": "WebPage", name: "Compare" }]}
      />,
    );
    expect(document.querySelectorAll('script[data-dynamic-jsonld="true"]').length).toBe(1);

    rerender(
      <SEO title="Dashboard" description="desc" canonical="https://web-ready.ag/dashboard" />,
    );
    expect(document.querySelectorAll('script[data-dynamic-jsonld="true"]').length).toBe(0);
  });
});
