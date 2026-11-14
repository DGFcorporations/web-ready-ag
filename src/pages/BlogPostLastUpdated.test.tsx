import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import BlogPost from "./BlogPost";

vi.mock("@/providers/trpc", () => ({
  trpc: {
    blog: {
      getBySlug: {
        useQuery: () => ({
          isLoading: false,
          data: {
            id: 42,
            slug: "enterprise-aeo-guide",
            title: "Enterprise AEO Architecture Guide",
            excerpt: "How connected JSON-LD graphs and 40-60 word capsules improve AI citations.",
            content:
              "<h2>What makes a page citation-ready?</h2><p>A 40-60 word self-contained capsule provides deterministic extraction.</p>",
            category: "AEO",
            author: "DGF Research Engineering",
            imageUrl: null,
            published: true,
            publishedAt: "2026-10-01T12:00:00.000Z",
            updatedAt: "2026-11-12T15:30:00.000Z",
          },
        }),
      },
    },
  },
}));

vi.mock("@/components/Navigation", () => ({
  default: () => <nav data-testid="mock-nav" />,
}));

vi.mock("@/components/Footer", () => ({
  default: () => <footer data-testid="mock-footer" />,
}));

describe("BlogPost Enterprise Freshness Parity", () => {
  it("renders visible Last Updated timestamp and matching BlogPosting dateModified JSON-LD", () => {
    render(
      <MemoryRouter initialEntries={["/blog/enterprise-aeo-guide"]}>
        <Routes>
          <Route path="/blog/:slug" element={<BlogPost />} />
        </Routes>
      </MemoryRouter>,
    );

    const lastUpdated = screen.getByText(/Last Updated:/i);
    expect(lastUpdated).toBeTruthy();
    const timeEl = document.querySelector("time[datetime]");
    expect(timeEl?.getAttribute("datetime")).toBe("2026-11-12");

    const ldScript = document.querySelector('script[type="application/ld+json"]');
    expect(ldScript).not.toBeNull();
    const parsed = JSON.parse(ldScript!.textContent || "{}") as Record<string, unknown>;
    expect(parsed["@type"]).toBe("BlogPosting");
    expect(parsed.dateModified).toBe("2026-11-12");
  });
});
