import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";

// Mock react-router so useParams/Link work without a <Router> context
vi.mock("react-router", () => ({
  useParams: () => ({ slug: "test-post" }),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

// Mock heavy presentational components that aren't relevant to SEO
vi.mock("@/components/Navigation", () => ({
  default: () => null,
}));
vi.mock("@/components/Footer", () => ({
  default: () => null,
}));

// Mock the trpc provider so we can inject test data
vi.mock("@/providers/trpc", () => ({
  trpc: {
    blog: {
      getBySlug: {
        useQuery: vi.fn(),
      },
    },
  },
}));

import { trpc } from "@/providers/trpc";
import BlogPost from "@/pages/BlogPost";

describe("BlogPost SEO", () => {
  beforeEach(() => {
    // SEO component updates existing meta tags via querySelector, so ensure
    // the description meta tag exists in the jsdom document head.
    document.head.innerHTML = '<meta name="description" content="" />';
    document.title = "";
  });

  it("uses the post's metaTitle and metaDescription for SEO, not a placeholder", async () => {
    const mockPost = {
      id: 1,
      slug: "test-post",
      title: "How to Automate Your Business",
      excerpt: "A guide to AI automation.",
      content: "<p>Content</p>",
      metaTitle: "Custom Meta Title | WEB-READY/AG",
      metaDescription: "Custom meta description for search engines.",
      author: "Josh",
      publishedAt: new Date("2026-09-01"),
      isPublished: true,
    };

    vi.mocked(trpc.blog.getBySlug.useQuery).mockReturnValue({
      data: mockPost,
      isLoading: false,
      isError: false,
    } as any);

    render(<BlogPost />);

    await waitFor(() => {
      expect(document.title).toBe("Custom Meta Title | WEB-READY/AG");
    });

    const descTag = document.querySelector('meta[name="description"]');
    expect(descTag?.getAttribute("content")).toBe("Custom meta description for search engines.");
  });

  it("falls back to post title + excerpt when metaTitle/metaDescription are absent", async () => {
    const mockPost = {
      id: 2,
      slug: "no-meta",
      title: "Post Without Meta Fields",
      excerpt: "This is the excerpt.",
      content: "<p>Content</p>",
      metaTitle: null,
      metaDescription: null,
      author: null,
      publishedAt: new Date("2026-09-02"),
      isPublished: true,
    };

    vi.mocked(trpc.blog.getBySlug.useQuery).mockReturnValue({
      data: mockPost,
      isLoading: false,
      isError: false,
    } as any);

    render(<BlogPost />);

    await waitFor(() => {
      expect(document.title).toBe("Post Without Meta Fields | WEB-READY/AG");
    });

    const descTag = document.querySelector('meta[name="description"]');
    expect(descTag?.getAttribute("content")).toBe("This is the excerpt.");
  });
});
