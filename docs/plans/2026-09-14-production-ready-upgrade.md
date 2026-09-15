# web-ready-ag Production-Ready Upgrade Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Take web-ready-ag from a working AEO/SEO prototype to a production-ready system that can upgrade dgfcorp and verifiedantiagingclinics with server-visible structured data, path-aware AI crawler responses, tests, security headers, and a deploy config that matches the existing Netlify stack.

**Architecture:** The app is a React 19 SPA (Vite) with a Hono + tRPC backend (Drizzle/MySQL). The core gap is that all SEO/AEO meta is client-side only — AI crawlers and non-JS bots see a bare `index.html`. The plan adds **server-side meta injection**: the existing `serveStaticFiles` handler in `api/lib/vite.ts` already serves `index.html` for every HTML route. We modify it to look up route data from the DB and inject title, meta tags, canonical, OG/Twitter, and per-page JSON-LD into the HTML *before* sending it. The SPA still hydrates and `SEO.tsx` updates tags on client-side navigation, but the initial server response carries correct meta. The AEO bot interception is upgraded from a blanket `/llms.txt` redirect to path-aware structured payloads.

**Tech Stack:** React 19, Vite 7, Hono, tRPC v11, Drizzle ORM (MySQL), Vitest 4, TypeScript 5.9, Netlify (target deploy).

**Spec:** This plan. The gap analysis was produced by inspecting the repo on 2026-09-14: `npm run check` passes, `npm run build` passes, `npm test` fails (no test files), 632 KB single bundle, 27 npm vulnerabilities, no security headers, no deploy config, BlogPost.tsx has a stale-brand SEO bug, AEO middleware is a production-only stub.

## Global Constraints

- **File placement:** All files stay inside `C:\Dev\repos\web-ready-ag`. No exceptions. See `AGENTS.md`.
- **Secrets:** Credentials go in `C:\Dev\.env` (read via `dotenv`), never committed. The `.env.example` documents required vars.
- **Line endings:** Governed by `.gitattributes`. Do not change it.
- **Commits:** Each task ends with a commit. "Done" without a commit is a false report.
- **Tests:** Vitest. Config lives in `vitest.config.ts`. Test files match `api/**/*.test.ts` and `src/**/*.test.ts` (the current config only matches `api/` — Task 1 fixes this).
- **Existing patterns:** tRPC routers follow the `createRouter` / `publicQuery` / `adminQuery` pattern in `api/middleware.ts`. Hono routes are mounted in `api/boot.ts`. DB access is via `getDb()` from `api/queries/connection.ts`.
- **No new dependencies without justification.** Prefer what's already in `package.json`.

---

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `vitest.config.ts` | Fix test glob to include `src/` and `api/` | 1 |
| `src/lib/meta.test.ts` | Unit tests for meta-tag injection helpers | 1, 3 |
| `src/lib/json-ld.test.ts` | Unit tests for JSON-LD generators | 4 |
| `api/lib/meta.test.ts` | Integration tests for server-side meta injection | 3 |
| `api/lib/html-inject.ts` | Server-side HTML meta injection (title, meta, canonical, OG, Twitter, JSON-LD) | 3 |
| `api/lib/json-ld.ts` | JSON-LD generators: Organization, LocalBusiness, Service, BlogPosting, BreadcrumbList, WebSite | 4 |
| `api/lib/aeo-payload.ts` | Path-aware structured payload generator for AI crawlers | 5 |
| `api/lib/vite.ts` | Modified: calls `injectMeta` before serving index.html | 3 |
| `api/boot.ts` | Modified: path-aware AEO middleware replaces blanket redirect | 5 |
| `api/routers/aeo.ts` | Modified: add `/llms-full.txt` and `/ai.txt` endpoints | 6 |
| `src/pages/BlogPost.tsx` | Fixed: use actual post data for SEO, not placeholder | 2 |
| `src/components/SEO.tsx` | Modified: accept `jsonLd` prop, inject script tags | 3 |
| `vite.config.ts` | Modified: manualChunks for code-splitting | 7 |
| `netlify.toml` | New: deploy config matching the two website repos' stack | 9 |
| `api/lib/headers.ts` | New: security header middleware | 8 |
| `public/robots.txt` | Modified: add AI crawler directives, llms.txt reference | 6 |

---

## Task 1: Fix Vitest config and establish test infrastructure

**Files:**
- Modify: `vitest.config.ts`
- Create: `src/lib/meta.test.ts` (placeholder test to prove the runner works)

**Interfaces:**
- Consumes: nothing
- Produces: a working `npm test` that discovers test files in both `src/` and `api/`

- [ ] **Step 1: Read the current vitest config**

Run: `cat vitest.config.ts`

The current config only matches `api/**/*.test.ts` and `api/**/*.spec.ts`. The `src/` directory is excluded, so any test placed in `src/` will never run.

- [ ] **Step 2: Write a failing test**

Create `src/lib/meta.test.ts`:

```typescript
import { describe, it, expect } from "vitest";

describe("test infrastructure", () => {
  it("runs tests in src/", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 3: Run test to verify it fails (not discovered)**

Run: `npm test`
Expected: FAIL — "No test files found" because `src/` is not in the include glob.

- [ ] **Step 4: Fix the vitest config**

Replace `vitest.config.ts` with:

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

const __dirname = import.meta.dirname;

export default defineConfig({
  test: {
    include: ["api/**/*.test.ts", "api/**/*.spec.ts", "src/**/*.test.ts", "src/**/*.spec.ts"],
    exclude: ["**/node_modules/**", "**/.git/**", "**/dist/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@contracts": path.resolve(__dirname, "./contracts"),
      "@db": path.resolve(__dirname, "./db"),
      "db": path.resolve(__dirname, "./db"),
    },
  },
});
```

Note: the current `vitest.config.ts` does not have path aliases. Without them, any test that imports `@/...` will fail to resolve.

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test`
Expected: PASS — 1 test, "runs tests in src/".

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts src/lib/meta.test.ts
git commit -m "test: fix vitest config to include src/ tests with path aliases"
```

---

## Task 2: Fix BlogPost SEO bug (stale brand + placeholder meta)

**Files:**
- Modify: `src/pages/BlogPost.tsx:35-59`
- Test: `src/pages/BlogPost.test.tsx`

**Interfaces:**
- Consumes: `trpc.blog.getBySlug` query (existing), `SEO` component (existing)
- Produces: BlogPost renders correct title/description/canonical from actual post data

**Bug:** Line 37 sets `document.title` to `"${post.title} | DGF Corporations Blog"` — stale brand from before the WEB-READY/AG rebrand. Line 59 renders `<SEO title="BlogPost | WEB-READY/AG" description="BlogPost page for WEB-READY/AG." />` — a generic placeholder that ignores the actual post's `metaTitle`, `metaDescription`, `title`, and `excerpt`. Both the stale brand and the placeholder are wrong.

- [ ] **Step 1: Write the failing test**

Create `src/pages/BlogPost.test.tsx`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { trpc } from "@/providers/trpc";

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

import BlogPost from "@/pages/BlogPost";

describe("BlogPost SEO", () => {
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/BlogPost.test.tsx`
Expected: FAIL — `document.title` is "BlogPost | WEB-READY/AG" (placeholder), not the post's metaTitle. Also, `@testing-library/react` is not installed yet.

- [ ] **Step 3: Install test dependencies**

Run: `npm install -D @testing-library/react @testing-library/jest-dom jsdom`

Update `vitest.config.ts` to add the jsdom environment:

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

const __dirname = import.meta.dirname;

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["api/**/*.test.ts", "api/**/*.spec.ts", "src/**/*.test.ts", "src/**/*.spec.ts"],
    exclude: ["**/node_modules/**", "**/.git/**", "**/dist/**"],
    setupFiles: [],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@contracts": path.resolve(__dirname, "./contracts"),
      "@db": path.resolve(__dirname, "./db"),
      "db": path.resolve(__dirname, "./db"),
    },
  },
});
```

- [ ] **Step 4: Fix BlogPost.tsx**

Replace lines 35-59 in `src/pages/BlogPost.tsx`. Remove the stale `useEffect` that sets `document.title` to the old brand. Replace the placeholder `<SEO>` tag with one that uses actual post data.

Delete lines 35-39 (the useEffect block):

```typescript
  useEffect(() => {
    if (post) {
      document.title = `${post.title} | DGF Corporations Blog`;
    }
  }, [post]);
```

Remove the `useEffect` import from line 7 (it's no longer needed if BlogPost doesn't use it elsewhere — check first; if `useEffect` is used nowhere else in the file, remove it from the import).

Replace line 59 (inside the `return` block, the `<SEO>` tag):

```tsx
      <SEO
        title={post.metaTitle || `${post.title} | WEB-READY/AG`}
        description={post.metaDescription || post.excerpt || `${post.title} — WEB-READY/AG blog`}
        canonical={`https://web-ready.ag/blog/${post.slug}`}
      />
```

Also fix the not-found branch on line 44 — change the placeholder to a real description:

```tsx
      <SEO title="Post Not Found | WEB-READY/AG" description="The requested blog post could not be found." />
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- src/pages/BlogPost.test.tsx`
Expected: PASS — both tests green.

- [ ] **Step 6: Run typecheck and build**

Run: `npm run check && npm run build`
Expected: both pass.

- [ ] **Step 7: Commit**

```bash
git add src/pages/BlogPost.tsx src/pages/BlogPost.test.tsx vitest.config.ts package.json package-lock.json
git commit -m "fix: BlogPost SEO uses actual post meta instead of stale brand and placeholder"
```

---

## Task 3: Server-side meta injection (the core SEO fix)

**Files:**
- Create: `api/lib/html-inject.ts`
- Create: `api/lib/html-inject.test.ts`
- Modify: `api/lib/vite.ts`
- Modify: `src/components/SEO.tsx` (add `jsonLd` prop)

**Interfaces:**
- Consumes: `getDb()` from `api/queries/connection.ts`, the built `dist/public/index.html`
- Produces:
  - `injectMeta(html: string, meta: PageMeta): string` — takes raw index.html, injects `<title>`, `<meta>`, `<link rel="canonical">`, OG/Twitter tags, and `<script type="application/ld+json">` blocks, returns modified HTML
  - `resolveRouteMeta(pathname: string): Promise<PageMeta | null>` — maps a URL path to the right DB record and returns the meta to inject
  - `PageMeta` type: `{ title: string; description: string; canonical: string; ogImage?: string; jsonLd?: object[] }`

**Why this approach:** The server already serves `index.html` for every HTML route in `api/lib/vite.ts:14-22`. Instead of a full SSR rewrite, we inject the correct meta tags into that HTML before sending it. Crawlers and AI bots see correct meta in the initial response. The SPA hydrates and `SEO.tsx` updates tags on client-side navigation (for the JS-capable visitors).

- [ ] **Step 1: Write the failing test for `injectMeta`**

Create `api/lib/html-inject.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { injectMeta, type PageMeta } from "./html-inject";

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- api/lib/html-inject.test.ts`
Expected: FAIL — `injectMeta` is not defined (module doesn't exist).

- [ ] **Step 3: Implement `injectMeta`**

Create `api/lib/html-inject.ts`:

```typescript
export interface PageMeta {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string;
  jsonLd?: object[];
}

function replaceOrInsert(html: string, selector: { tag: string; attr: string; value: string }, content: string): string {
  // Simple regex-based replacement for meta tags and title.
  // For production, this is sufficient because we control the index.html template.
  const { tag, attr, value } = selector;
  const pattern = attr
    ? new RegExp(`<${tag}[^>]*${attr}=["']${escapeRegex(value)}["'][^>]*>`, "i")
    : new RegExp(`<${tag}[^>]*>`, "i");

  if (pattern.test(html)) {
    return html.replace(pattern, content);
  }
  // If not found, insert before </head>
  return html.replace("</head>", `  ${content}\n</head>`);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function injectMeta(html: string, meta: PageMeta): string {
  let result = html;

  // Title
  result = result.replace(/<title>[^<]*<\/title>/i, `<title>${meta.title}</title>`);

  // Description
  result = replaceOrInsert(
    result,
    { tag: "meta", attr: "name", value: "description" },
    `<meta name="description" content="${meta.description}" />`,
  );

  // Canonical
  result = replaceOrInsert(
    result,
    { tag: "link", attr: "rel", value: "canonical" },
    `<link rel="canonical" href="${meta.canonical}" />`,
  );

  // OG title
  result = replaceOrInsert(
    result,
    { tag: "meta", attr: "property", value: "og:title" },
    `<meta property="og:title" content="${meta.title}" />`,
  );

  // OG description
  result = replaceOrInsert(
    result,
    { tag: "meta", attr: "property", value: "og:description" },
    `<meta property="og:description" content="${meta.description}" />`,
  );

  // OG url
  result = replaceOrInsert(
    result,
    { tag: "meta", attr: "property", value: "og:url" },
    `<meta property="og:url" content="${meta.canonical}" />`,
  );

  // OG image
  if (meta.ogImage) {
    result = replaceOrInsert(
      result,
      { tag: "meta", attr: "property", value: "og:image" },
      `<meta property="og:image" content="${meta.ogImage}" />`,
    );
  }

  // Twitter title
  result = replaceOrInsert(
    result,
    { tag: "meta", attr: "property", value: "twitter:title" },
    `<meta property="twitter:title" content="${meta.title}" />`,
  );

  // Twitter description
  result = replaceOrInsert(
    result,
    { tag: "meta", attr: "property", value: "twitter:description" },
    `<meta property="twitter:description" content="${meta.description}" />`,
  );

  // JSON-LD
  if (meta.jsonLd && meta.jsonLd.length > 0) {
    const blocks = meta.jsonLd
      .map((obj) => `  <script type="application/ld+json">\n${JSON.stringify(obj)}\n  </script>`)
      .join("\n");
    result = result.replace("</head>", `${blocks}\n</head>`);
  }

  return result;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- api/lib/html-inject.test.ts`
Expected: PASS — all 4 tests green.

- [ ] **Step 5: Write the failing test for `resolveRouteMeta`**

Add to `api/lib/html-inject.test.ts`:

```typescript
import { resolveRouteMeta } from "./html-inject";
import { getDb } from "../queries/connection";

// Mock the DB
vi.mock("../queries/connection", () => ({
  getDb: vi.fn(),
}));

describe("resolveRouteMeta", () => {
  it("returns home page meta for /", async () => {
    const meta = await resolveRouteMeta("/");
    expect(meta).not.toBeNull();
    expect(meta!.canonical).toBe("https://web-ready.ag/");
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
```

Add `import { vi } from "vitest";` at the top of the file if not already imported.

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- api/lib/html-inject.test.ts`
Expected: FAIL — `resolveRouteMeta` is not exported.

- [ ] **Step 7: Implement `resolveRouteMeta`**

Add to `api/lib/html-inject.ts`:

```typescript
import { getDb } from "../queries/connection";

const BASE_URL = "https://web-ready.ag";

const STATIC_ROUTES: Record<string, { title: string; description: string }> = {
  "/": {
    title: "WEB-READY/AG | AI Automation for Florida Service Businesses",
    description: "WEB-READY/AG optimizes your website for the AI era. We build Agent-Grade structured data and Answer Engine visibility for Florida service businesses.",
  },
  "/services": {
    title: "AI Automation Services | WEB-READY/AG",
    description: "Voice AI, outreach automation, CRM, review management, SEO, and AI assistants for Florida service businesses.",
  },
  "/pricing": {
    title: "Pricing | WEB-READY/AG",
    description: "Transparent pricing for AI automation services. Monthly and yearly plans for Florida service businesses.",
  },
  "/locations": {
    title: "Service Areas | WEB-READY/AG",
    description: "WEB-READY/AG serves Florida service businesses across multiple markets. Find your city.",
  },
  "/blog": {
    title: "Blog | WEB-READY/AG",
    description: "Insights on AI automation, Answer Engine Optimization, and growing Florida service businesses.",
  },
};

export async function resolveRouteMeta(pathname: string): Promise<PageMeta | null> {
  // Static routes
  if (STATIC_ROUTES[pathname]) {
    const r = STATIC_ROUTES[pathname];
    return {
      title: r.title,
      description: r.description,
      canonical: `${BASE_URL}${pathname === "/" ? "" : pathname}`,
    };
  }

  // /locations/:slug
  const locMatch = pathname.match(/^\/locations\/([^/]+)$/);
  if (locMatch) {
    try {
      const db = getDb();
      const page = await db.query.geoPages.findFirst({
        where: (g, { eq, and }) => and(eq(g.slug, locMatch[1]), eq(g.isActive, true)),
      });
      if (!page) return null;
      return {
        title: page.metaTitle || `AI Automation Services in ${page.city}, ${page.state}`,
        description: page.metaDescription || `Veteran-owned AI automation agency serving ${page.city}, ${page.state}.`,
        canonical: `${BASE_URL}/locations/${page.slug}`,
      };
    } catch {
      return null;
    }
  }

  // /blog/:slug
  const blogMatch = pathname.match(/^\/blog\/([^/]+)$/);
  if (blogMatch) {
    try {
      const db = getDb();
      const post = await db.query.blogPosts.findFirst({
        where: (b, { eq, and }) => and(eq(b.slug, blogMatch[1]), eq(b.isPublished, true)),
      });
      if (!post) return null;
      return {
        title: post.metaTitle || `${post.title} | WEB-READY/AG`,
        description: post.metaDescription || post.excerpt || `${post.title} — WEB-READY/AG blog`,
        canonical: `${BASE_URL}/blog/${post.slug}`,
        ogImage: post.featuredImage || undefined,
      };
    } catch {
      return null;
    }
  }

  return null;
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test -- api/lib/html-inject.test.ts`
Expected: PASS — all tests green.

- [ ] **Step 9: Wire `resolveRouteMeta` + `injectMeta` into `serveStaticFiles`**

Modify `api/lib/vite.ts`. Replace the `notFound` handler to inject meta before serving `index.html`:

```typescript
import type { Hono } from "hono";
import type { HttpBindings } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import fs from "fs";
import path from "path";
import { injectMeta, resolveRouteMeta } from "./html-inject";

type App = Hono<{ Bindings: HttpBindings }>;

export function serveStaticFiles(app: App) {
  const distPath = path.resolve(import.meta.dirname, "../dist/public");

  app.use("*", serveStatic({ root: "./dist/public" }));

  app.notFound(async (c) => {
    const accept = c.req.header("accept") ?? "";
    if (!accept.includes("text/html")) {
      return c.json({ error: "Not Found" }, 404);
    }
    const indexPath = path.resolve(distPath, "index.html");
    let content = fs.readFileSync(indexPath, "utf-8");

    // Server-side meta injection: look up route data and inject meta tags + JSON-LD
    const meta = await resolveRouteMeta(c.req.path);
    if (meta) {
      content = injectMeta(content, meta);
    }

    return c.html(content);
  });
}
```

- [ ] **Step 10: Add `jsonLd` prop to `SEO.tsx` for client-side updates**

Modify `src/components/SEO.tsx` to accept and inject JSON-LD on the client side (for SPA navigation):

```typescript
import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  jsonLd?: object[];
}

export default function SEO({ title, description, canonical, ogImage, jsonLd }: SEOProps) {
  useEffect(() => {
    document.title = title;

    const updateMetaTag = (selector: string, attribute: string, value: string) => {
      const tag = document.querySelector(selector);
      if (tag) {
        tag.setAttribute(attribute, value);
      }
    };

    updateMetaTag('meta[name="description"]', 'content', description);

    updateMetaTag('meta[property="og:title"]', 'content', title);
    updateMetaTag('meta[property="og:description"]', 'content', description);
    if (ogImage) {
      updateMetaTag('meta[property="og:image"]', 'content', ogImage);
    }

    updateMetaTag('meta[property="twitter:title"]', 'content', title);
    updateMetaTag('meta[property="twitter:description"]', 'content', description);
    if (ogImage) {
      updateMetaTag('meta[property="twitter:image"]', 'content', ogImage);
    }

    if (canonical) {
      const link = document.querySelector('link[rel="canonical"]');
      if (link) {
        link.setAttribute('href', canonical);
      }
    }

    // Inject JSON-LD: remove old dynamic JSON-LD, add new
    if (jsonLd && jsonLd.length > 0) {
      // Remove previously injected dynamic JSON-LD blocks
      document.querySelectorAll('script[data-dynamic-jsonld]').forEach(el => el.remove());
      jsonLd.forEach(obj => {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.setAttribute('data-dynamic-jsonld', 'true');
        script.textContent = JSON.stringify(obj);
        document.head.appendChild(script);
      });
    }
  }, [title, description, canonical, ogImage, jsonLd]);

  return null;
}
```

- [ ] **Step 11: Run typecheck and build**

Run: `npm run check && npm run build`
Expected: both pass.

- [ ] **Step 12: Commit**

```bash
git add api/lib/html-inject.ts api/lib/html-inject.test.ts api/lib/vite.ts src/components/SEO.tsx
git commit -m "feat: server-side meta injection for SEO/AEO — injects title, meta, canonical, OG, JSON-LD into index.html before serving"
```

---

## Task 4: Per-page JSON-LD generators

**Files:**
- Create: `api/lib/json-ld.ts`
- Create: `api/lib/json-ld.test.ts`
- Modify: `api/lib/html-inject.ts` (wire JSON-LD into `resolveRouteMeta`)

**Interfaces:**
- Consumes: DB records (`geoPages`, `blogPosts`, `services` from `db/schema.ts`)
- Produces:
  - `buildOrganizationJsonLd(): object` — Organization schema (static)
  - `buildLocalBusinessJsonLd(geoPage): object` — LocalBusiness per city
  - `buildServiceJsonLd(service): object` — Service per offering
  - `buildBlogPostingJsonLd(post): object` — BlogPosting per post
  - `buildBreadcrumbJsonLd(items: {name, url}[]): object` — BreadcrumbList
  - `buildWebsiteJsonLd(): object` — WebSite with SearchAction

- [ ] **Step 1: Write the failing tests**

Create `api/lib/json-ld.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- api/lib/json-ld.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement the JSON-LD generators**

Create `api/lib/json-ld.ts`:

```typescript
const BASE_URL = "https://web-ready.ag";

export function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "WEB-READY/AG",
    url: BASE_URL,
    logo: `${BASE_URL}/hero-bg.jpg`,
    description: "Veteran-owned AI automation agency serving Florida service businesses.",
    address: {
      "@type": "PostalAddress",
      addressRegion: "FL",
      addressCountry: "US",
    },
  };
}

export function buildLocalBusinessJsonLd(geoPage: {
  slug: string;
  city: string;
  state: string;
  metaTitle?: string;
  metaDescription?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "WEB-READY/AG",
    description: geoPage.metaDescription || `AI automation services in ${geoPage.city}, ${geoPage.state}.`,
    url: `${BASE_URL}/locations/${geoPage.slug}`,
    address: {
      "@type": "PostalAddress",
      addressLocality: geoPage.city,
      addressRegion: geoPage.state,
      addressCountry: "US",
    },
    areaServed: {
      "@type": "City",
      name: geoPage.city,
    },
  };
}

export function buildServiceJsonLd(service: {
  slug: string;
  name: string;
  shortDesc?: string;
  fullDesc?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.name,
    description: service.fullDesc || service.shortDesc || "",
    url: `${BASE_URL}/services`,
    provider: {
      "@type": "Organization",
      name: "WEB-READY/AG",
      url: BASE_URL,
    },
  };
}

export function buildBlogPostingJsonLd(post: {
  slug: string;
  title: string;
  excerpt?: string;
  content?: string;
  author?: string;
  publishedAt?: Date | string | null;
  featuredImage?: string | null;
}) {
  const datePublished = post.publishedAt
    ? new Date(post.publishedAt).toISOString()
    : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt || "",
    author: {
      "@type": "Person",
      name: post.author || "WEB-READY/AG",
    },
    publisher: {
      "@type": "Organization",
      name: "WEB-READY/AG",
      url: BASE_URL,
    },
    datePublished,
    image: post.featuredImage || undefined,
    url: `${BASE_URL}/blog/${post.slug}`,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${BASE_URL}/blog/${post.slug}`,
    },
  };
}

export function buildBreadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function buildWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    url: BASE_URL,
    name: "WEB-READY/AG",
    publisher: {
      "@type": "Organization",
      name: "WEB-READY/AG",
    },
    potentialAction: {
      "@type": "SearchAction",
      target: `${BASE_URL}/blog?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- api/lib/json-ld.test.ts`
Expected: PASS — all 6 tests green.

- [ ] **Step 5: Wire JSON-LD into `resolveRouteMeta`**

Modify `api/lib/html-inject.ts`. Import the generators and add JSON-LD to each route's meta. Update the `resolveRouteMeta` function:

Add import at top:
```typescript
import {
  buildOrganizationJsonLd,
  buildLocalBusinessJsonLd,
  buildBlogPostingJsonLd,
  buildBreadcrumbJsonLd,
  buildWebsiteJsonLd,
} from "./json-ld";
```

Update the home route (`/`) to include Organization + WebSite + Breadcrumb:
```typescript
  if (STATIC_ROUTES[pathname]) {
    const r = STATIC_ROUTES[pathname];
    const jsonLd: object[] = [buildOrganizationJsonLd(), buildWebsiteJsonLd()];
    if (pathname !== "/") {
      jsonLd.push(buildBreadcrumbJsonLd([
        { name: "Home", url: BASE_URL },
        { name: r.title.split("|")[0].trim(), url: `${BASE_URL}${pathname}` },
      ]));
    }
    return {
      title: r.title,
      description: r.description,
      canonical: `${BASE_URL}${pathname === "/" ? "" : pathname}`,
      jsonLd,
    };
  }
```

Update the location route to include LocalBusiness + Breadcrumb:
```typescript
      if (!page) return null;
      return {
        title: page.metaTitle || `AI Automation Services in ${page.city}, ${page.state}`,
        description: page.metaDescription || `Veteran-owned AI automation agency serving ${page.city}, ${page.state}.`,
        canonical: `${BASE_URL}/locations/${page.slug}`,
        jsonLd: [
          buildLocalBusinessJsonLd(page),
          buildBreadcrumbJsonLd([
            { name: "Home", url: BASE_URL },
            { name: "Locations", url: `${BASE_URL}/locations` },
            { name: page.city, url: `${BASE_URL}/locations/${page.slug}` },
          ]),
        ],
      };
```

Update the blog route to include BlogPosting + Breadcrumb:
```typescript
      if (!post) return null;
      return {
        title: post.metaTitle || `${post.title} | WEB-READY/AG`,
        description: post.metaDescription || post.excerpt || `${post.title} — WEB-READY/AG blog`,
        canonical: `${BASE_URL}/blog/${post.slug}`,
        ogImage: post.featuredImage || undefined,
        jsonLd: [
          buildBlogPostingJsonLd(post),
          buildBreadcrumbJsonLd([
            { name: "Home", url: BASE_URL },
            { name: "Blog", url: `${BASE_URL}/blog` },
            { name: post.title, url: `${BASE_URL}/blog/${post.slug}` },
          ]),
        ],
      };
```

- [ ] **Step 6: Run all tests**

Run: `npm test`
Expected: PASS — all tests green (html-inject, json-ld, BlogPost, meta).

- [ ] **Step 7: Run typecheck and build**

Run: `npm run check && npm run build`
Expected: both pass.

- [ ] **Step 8: Commit**

```bash
git add api/lib/json-ld.ts api/lib/json-ld.test.ts api/lib/html-inject.ts
git commit -m "feat: per-page JSON-LD generators — Organization, LocalBusiness, Service, BlogPosting, BreadcrumbList, WebSite"
```

---

## Task 5: Path-aware AEO bot interception

**Files:**
- Create: `api/lib/aeo-payload.ts`
- Create: `api/lib/aeo-payload.test.ts`
- Modify: `api/boot.ts:36-48`

**Interfaces:**
- Consumes: `getDb()`, `resolveRouteMeta` from `api/lib/html-inject.ts`, JSON-LD generators from `api/lib/json-ld.ts`
- Produces:
  - `buildAeoPayload(pathname: string): Promise<object | null>` — returns a structured, token-optimized payload for the given route, or null if no route matches
  - `isAiCrawler(userAgent: string): boolean` — detects known AI crawlers

**Current behavior:** `api/boot.ts:36-48` redirects ALL AI crawler requests to `/llms.txt` regardless of path. The code comment admits: "In a full implementation, we'd route based on c.req.path to serve location-specific context."

**New behavior:** AI crawlers get a route-specific structured JSON payload (not a redirect). For `/locations/miami`, they get the Miami LocalBusiness data. For `/blog/some-post`, they get the BlogPosting. For `/`, they get the full knowledge graph. Unknown routes fall through to the normal SPA.

- [ ] **Step 1: Write the failing tests**

Create `api/lib/aeo-payload.test.ts`:

```typescript
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

    const payload = await buildAeoPayload("/");
    expect(payload).not.toBeNull();
    expect(payload!.url).toBe("https://web-ready.ag/");
    expect(payload!.type).toBe("knowledge_graph");
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

    const payload = await buildAeoPayload("/locations/miami");
    expect(payload).not.toBeNull();
    expect(payload!.type).toBe("local_business");
    expect(payload!.city).toBe("Miami");
  });

  it("returns null for unknown routes", async () => {
    const payload = await buildAeoPayload("/nonexistent");
    expect(payload).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- api/lib/aeo-payload.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement `aeo-payload.ts`**

Create `api/lib/aeo-payload.ts`:

```typescript
import { getDb } from "../queries/connection";
import {
  buildOrganizationJsonLd,
  buildLocalBusinessJsonLd,
  buildBlogPostingJsonLd,
} from "./json-ld";

const BASE_URL = "https://web-ready.ag";

const AI_CRAWLER_PATTERNS = [
  "chatgpt-user",
  "perplexitybot",
  "claudebot",
  "claude",
  "oai-searchbot",
  "anthropic-ai",
  "google-extended",
  "googlebot-image",
  "bytespider",
  "cohere-ai",
  "meta-externalagent",
  "ai2bot",
];

export function isAiCrawler(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return AI_CRAWLER_PATTERNS.some((pattern) => ua.includes(pattern));
}

export async function buildAeoPayload(pathname: string): Promise<object | null> {
  // Home: full knowledge graph
  if (pathname === "/") {
    try {
      const db = getDb();
      const services = await db.query.services.findMany({
        where: (s, { eq }) => eq(s.isActive, true),
        orderBy: (s, { asc }) => [asc(s.sortOrder)],
      });
      const geoPages = await db.query.geoPages.findMany({
        where: (g, { eq }) => eq(g.isActive, true),
      });

      return {
        type: "knowledge_graph",
        url: `${BASE_URL}/`,
        organization: buildOrganizationJsonLd(),
        services: services.map((s: any) => ({
          name: s.name,
          description: s.shortDesc || s.fullDesc,
          slug: s.slug,
        })),
        serviceAreas: geoPages.map((g: any) => ({
          city: g.city,
          state: g.state,
          url: `${BASE_URL}/locations/${g.slug}`,
        })),
      };
    } catch {
      return null;
    }
  }

  // /locations/:slug
  const locMatch = pathname.match(/^\/locations\/([^/]+)$/);
  if (locMatch) {
    try {
      const db = getDb();
      const page = await db.query.geoPages.findFirst({
        where: (g, { eq, and }) => and(eq(g.slug, locMatch[1]), eq(g.isActive, true)),
      });
      if (!page) return null;
      return {
        type: "local_business",
        url: `${BASE_URL}/locations/${page.slug}`,
        city: page.city,
        state: page.state,
        schema: buildLocalBusinessJsonLd(page),
        description: page.metaDescription || `AI automation services in ${page.city}, ${page.state}.`,
        content: page.bodyContent || "",
      };
    } catch {
      return null;
    }
  }

  // /blog/:slug
  const blogMatch = pathname.match(/^\/blog\/([^/]+)$/);
  if (blogMatch) {
    try {
      const db = getDb();
      const post = await db.query.blogPosts.findFirst({
        where: (b, { eq, and }) => and(eq(b.slug, blogMatch[1]), eq(b.isPublished, true)),
      });
      if (!post) return null;
      return {
        type: "blog_posting",
        url: `${BASE_URL}/blog/${post.slug}`,
        schema: buildBlogPostingJsonLd(post),
        title: post.title,
        excerpt: post.excerpt || "",
        content: post.content,
        author: post.author || "WEB-READY/AG",
        publishedAt: post.publishedAt ? new Date(post.publishedAt).toISOString() : null,
      };
    } catch {
      return null;
    }
  }

  // Static routes: return basic info
  const staticRoutes: Record<string, { title: string; description: string }> = {
    "/services": { title: "AI Automation Services", description: "Voice AI, outreach, CRM, reviews, SEO, assistants." },
    "/pricing": { title: "Pricing", description: "Transparent pricing for AI automation." },
    "/locations": { title: "Service Areas", description: "Florida service areas." },
    "/blog": { title: "Blog", description: "AI automation insights." },
  };
  if (staticRoutes[pathname]) {
    return {
      type: "page",
      url: `${BASE_URL}${pathname}`,
      title: staticRoutes[pathname].title,
      description: staticRoutes[pathname].description,
    };
  }

  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- api/lib/aeo-payload.test.ts`
Expected: PASS — all tests green.

- [ ] **Step 5: Replace the AEO middleware in `boot.ts`**

Modify `api/boot.ts`. Replace the production-only AEO middleware block (lines 36-48) with a version that runs in all environments and serves path-aware JSON instead of redirecting:

Replace this block:
```typescript
  // AEO Crawler Interception Middleware
  app.use("*", async (c, next) => {
    const userAgent = (c.req.header("user-agent") || "").toLowerCase();
    const isBot = ["chatgpt-user", "perplexitybot", "claude", "oai-searchbot", "anthropic-ai"].some(bot => userAgent.includes(bot));
    const isLlmRequest = c.req.header("accept")?.includes("application/llm");
    
    if (isBot || isLlmRequest) {
      // Instead of parsing a 5MB React bundle, we immediately feed the AI the structured knowledge graph.
      // In a full implementation, we'd route based on c.req.path to serve location-specific context.
      console.log(`[AEO Middleware] Intercepted AI Crawler: ${userAgent}. Serving structured Context payload.`);
      return c.redirect("/llms.txt"); 
    }
    await next();
  });
```

With:
```typescript
  // AEO Crawler Interception — serves path-aware structured JSON to AI crawlers
  app.use("*", async (c, next) => {
    const userAgent = c.req.header("user-agent") || "";
    const isLlmRequest = c.req.header("accept")?.includes("application/llm") ?? false;

    if (isAiCrawler(userAgent) || isLlmRequest) {
      const payload = await buildAeoPayload(c.req.path);
      if (payload) {
        console.log(`[AEO] Serving structured payload for ${c.req.path} to ${userAgent}`);
        return c.json(payload);
      }
    }
    await next();
  });
```

Add the imports at the top of `boot.ts`:
```typescript
import { isAiCrawler, buildAeoPayload } from "./lib/aeo-payload";
```

Also move this middleware *above* `serveStaticFiles(app)` so it runs before static file serving. The current order is: middleware → serveStaticFiles. The AEO middleware must intercept before static files are served. Move the `app.use("*", ...)` AEO block to *before* the `serveStaticFiles(app)` call.

- [ ] **Step 6: Run all tests, typecheck, build**

Run: `npm test && npm run check && npm run build`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add api/lib/aeo-payload.ts api/lib/aeo-payload.test.ts api/boot.ts
git commit -m "feat: path-aware AEO bot interception — serves route-specific structured JSON instead of blanket /llms.txt redirect"
```

---

## Task 6: llms-full.txt, ai.txt endpoints, and robots.txt updates

**Files:**
- Modify: `api/routers/aeo.ts`
- Modify: `public/robots.txt`

**Interfaces:**
- Consumes: `getDb()`, existing `aeoRouter`
- Produces: `/llms-full.txt` (comprehensive knowledge base), `/ai.txt` (AI access policy), updated `robots.txt` with AI crawler directives

- [ ] **Step 1: Add `/llms-full.txt` and `/ai.txt` endpoints to `aeo.ts`**

Add to `api/routers/aeo.ts` (after the existing `/llms.txt` handler):

```typescript
// Comprehensive LLMs Full Text
aeoRouter.get("/llms-full.txt", async (c) => {
  const db = getDb();
  const services = await db.query.services.findMany({
    where: (svc, { eq }) => eq(svc.isActive, true),
    orderBy: (svc, { asc }) => [asc(svc.sortOrder)],
  });
  const geoPages = await db.query.geoPages.findMany({
    where: (geo, { eq }) => eq(geo.isActive, true),
    orderBy: (geo, { asc }) => [asc(geo.city)],
  });
  const posts = await db.query.blogPosts.findMany({
    where: (post, { eq }) => eq(post.isPublished, true),
    orderBy: (post, { desc }) => [post.publishedAt],
  });

  let md = `# WEB-READY/AG — Complete Knowledge Base for AI Systems\n\n`;
  md += `> This file provides comprehensive information about WEB-READY/AG for large language models and answer engines.\n\n`;

  md += `## About\n`;
  md += `WEB-READY/AG is a veteran-owned AI automation agency based in Florida. We optimize websites for the AI era by building Agent-Grade structured data and Answer Engine visibility for local service businesses. Our services include voice AI, outreach automation, CRM, review management, SEO, and AI assistants.\n\n`;

  md += `## Services\n`;
  for (const svc of services) {
    md += `### ${svc.name}\n`;
    md += `${svc.fullDesc || svc.shortDesc || ""}\n`;
    const features = typeof svc.features === "string" ? JSON.parse(svc.features) : svc.features;
    if (Array.isArray(features)) {
      md += `Features: ${features.join(", ")}\n`;
    }
    md += `\n`;
  }

  md += `## Service Areas\n`;
  for (const geo of geoPages) {
    md += `- ${geo.city}, ${geo.state} — https://web-ready.ag/locations/${geo.slug}\n`;
  }
  md += `\n`;

  md += `## Blog Posts\n`;
  for (const post of posts) {
    md += `- ${post.title} (${post.category || "general"}) — https://web-ready.ag/blog/${post.slug}\n`;
    if (post.excerpt) md += `  ${post.excerpt}\n`;
  }
  md += `\n`;

  md += `## Contact\n`;
  md += `- Website: https://web-ready.ag\n`;
  md += `- Phone: (904) 555-0147\n`;
  md += `- Email: info@web-ready.ag\n\n`;

  md += `## AI Access Policy\n`;
  md += `WEB-READY/AG explicitly allows AI crawlers, answer engines, and LLM training systems to access and cite our content. We provide structured data via JSON-LD, llms.txt, and this llms-full.txt file to ensure factual accuracy in AI responses.\n`;

  c.header("Content-Type", "text/plain");
  return c.body(md);
});

// AI Access Policy
aeoRouter.get("/ai.txt", async (c) => {
  const policy = `# WEB-READY/AG AI Access Policy
# https://web-ready.ag/ai.txt

User-agent: *
Allow: /

# AI Crawlers and Answer Engines — explicitly allowed
User-agent: ChatGPT-User
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Bytespider
Allow: /

User-agent: cohere-ai
Allow: /

User-agent: meta-externalagent
Allow: /

User-agent: AI2Bot
Allow: /

Sitemap: https://web-ready.ag/sitemap.xml
LLMs: https://web-ready.ag/llms.txt
LLMs-Full: https://web-ready.ag/llms-full.txt
`;

  c.header("Content-Type", "text/plain");
  return c.body(policy);
});
```

- [ ] **Step 2: Update `public/robots.txt`**

Replace `public/robots.txt` with:

```
User-agent: *
Allow: /

# AI Crawlers — explicitly allowed
User-agent: ChatGPT-User
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: Google-Extended
Allow: /

Sitemap: https://web-ready.ag/sitemap.xml
```

- [ ] **Step 3: Run typecheck and build**

Run: `npm run check && npm run build`
Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add api/routers/aeo.ts public/robots.txt
git commit -m "feat: add /llms-full.txt and /ai.txt endpoints, update robots.txt with AI crawler directives"
```

---

## Task 7: Code-splitting and bundle optimization

**Files:**
- Modify: `vite.config.ts`

**Problem:** The build produces a single 632 KB JS bundle (195 KB gzip). Vite warns about chunks > 500 KB. This hurts Core Web Vitals (LCP, TBT). The app has 12 pages — they should be lazy-loaded.

- [ ] **Step 1: Add `manualChunks` to `vite.config.ts`**

Modify `vite.config.ts`. Add a `build.rollupOptions.output.manualChunks` config:

```typescript
export default defineConfig({
  plugins: [
    devServer({ entry: "api/boot.ts", exclude: [/^\/(?!api\/).*$/] }),
    inspectAttr(), react()],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@contracts": path.resolve(__dirname, "./contracts"),
      "@db": path.resolve(__dirname, "./db"),
      "db": path.resolve(__dirname, "./db"),
    },
  },
  envDir: path.resolve(__dirname),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router"],
          "vendor-ui": ["@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu", "@radix-ui/react-select", "@radix-ui/react-tabs", "@radix-ui/react-tooltip"],
          "vendor-data": ["@tanstack/react-query", "@trpc/client", "@trpc/react-query", "@trpc/server", "drizzle-orm", "superjson", "zod"],
          "vendor-charts": ["recharts"],
          "vendor-three": ["three", "gsap"],
        },
      },
    },
  },
});
```

- [ ] **Step 2: Add React.lazy for route-level code splitting**

Modify `src/App.tsx` to lazy-load page components:

```typescript
import { Routes, Route } from "react-router";
import { Toaster } from "@/components/ui/sonner";
import { lazy, Suspense } from "react";

const Home = lazy(() => import("@/pages/Home"));
const Services = lazy(() => import("@/pages/Services"));
const Pricing = lazy(() => import("@/pages/Pricing"));
const Locations = lazy(() => import("@/pages/Locations"));
const LocationDetail = lazy(() => import("@/pages/LocationDetail"));
const Blog = lazy(() => import("@/pages/Blog"));
const BlogPost = lazy(() => import("@/pages/BlogPost"));
const Checkout = lazy(() => import("@/pages/Checkout"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Admin = lazy(() => import("@/pages/Admin"));
const Login = lazy(() => import("@/pages/Login"));
const NotFound = lazy(() => import("@/pages/NotFound"));

function App() {
  return (
    <>
      <Suspense fallback={<div className="min-h-screen bg-[#0A0A0A]" />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/services" element={<Services />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/locations" element={<Locations />} />
          <Route path="/locations/:slug" element={<LocationDetail />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <Toaster />
    </>
  );
}

export default App;
```

- [ ] **Step 3: Run build and verify chunk sizes**

Run: `npm run build`
Expected: Build succeeds. The single 632 KB bundle should now be split into multiple chunks, each under 500 KB. Verify by checking the output — the largest chunk should be the vendor-react bundle (~140 KB) and individual page chunks should be small.

- [ ] **Step 4: Run typecheck**

Run: `npm run check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add vite.config.ts src/App.tsx
git commit -m "perf: code-split routes with React.lazy and manualChunks — reduces initial bundle from 632KB to vendor chunks"
```

---

## Task 8: Security headers

**Files:**
- Create: `api/lib/headers.ts`
- Modify: `api/boot.ts` (mount the middleware)

**Interfaces:**
- Consumes: Hono app instance
- Produces: `securityHeaders` middleware that sets standard security headers on all responses

- [ ] **Step 1: Create the security headers middleware**

Create `api/lib/headers.ts`:

```typescript
import type { MiddlewareHandler } from "hono";

export const securityHeaders: MiddlewareHandler = async (c, next) => {
  await next();

  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  c.header("Content-Security-Policy", [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
  ].join("; "));
};
```

Note: `'unsafe-inline'` for scripts is needed because the SPA and JSON-LD use inline scripts. A future task could add nonces, but that's out of scope for this plan.

- [ ] **Step 2: Mount the middleware in `boot.ts`**

Add import at top:
```typescript
import { securityHeaders } from "./lib/headers";
```

Add the middleware *before* the AEO middleware (so all responses get headers):

```typescript
const app = new Hono<{ Bindings: HttpBindings }>();

// Security headers on all responses
app.use("*", securityHeaders);
```

- [ ] **Step 3: Run typecheck and build**

Run: `npm run check && npm run build`
Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add api/lib/headers.ts api/boot.ts
git commit -m "feat: security headers — X-Content-Type-Options, X-Frame-Options, HSTS, CSP, Referrer-Policy, Permissions-Policy"
```

---

## Task 9: Netlify deploy config

**Files:**
- Create: `netlify.toml`

**Problem:** The app is a Node server (`node dist/boot.js`) with no deploy config. The two website repos (`dgfcorp`, `verifiedantiagingclinics`) both use Netlify. This app needs a `netlify.toml` that builds the frontend + backend and serves the Hono server as a Netlify Function.

**Architecture decision:** Netlify Functions can run the Hono server. The build produces `dist/public/` (static assets) and `dist/boot.js` (server). We configure Netlify to serve static files from `dist/public/` and route all other requests through the Hono server as a serverless function.

- [ ] **Step 1: Create `netlify.toml`**

Create `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist/public"
  functions = "netlify/functions"

[build.environment]
  NODE_VERSION = "20"

# Static assets served directly by Netlify CDN
[[redirects]]
  from = "/assets/*"
  to = "/assets/:splat"
  status = 200

# API routes go through the Hono serverless function
[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/api"
  status = 200

# AEO routes go through the serverless function
[[redirects]]
  from = "/sitemap.xml"
  to = "/.netlify/functions/api"
  status = 200

[[redirects]]
  from = "/llms.txt"
  to = "/.netlify/functions/api"
  status = 200

[[redirects]]
  from = "/llms-full.txt"
  to = "/.netlify/functions/api"
  status = 200

[[redirects]]
  from = "/ai.txt"
  to = "/.netlify/functions/api"
  status = 200

# SPA fallback — all other routes go through the serverless function
# (which serves index.html with injected meta for HTML requests)
[[redirects]]
  from = "/*"
  to = "/.netlify/functions/api"
  status = 200
```

- [ ] **Step 2: Create the Netlify Function entry point**

Create `netlify/functions/api.ts`:

```typescript
import { handler as honoHandler } from "../../dist/boot.js";

export const handler = honoHandler;
```

Note: this requires the Hono app to export a `handler` compatible with Netlify Functions. The existing `api/boot.ts` uses `@hono/node-server`'s `serve()`. For Netlify, we need to export a handler instead. This requires modifying `boot.ts` to conditionally export a handler when not running as a standalone server.

- [ ] **Step 3: Modify `boot.ts` to support Netlify Functions**

Modify the production block in `api/boot.ts`. Replace the standalone `serve()` block with a conditional:

```typescript
if (env.isProduction) {
  const { serveStaticFiles } = await import("./lib/vite");
  const { isAiCrawler, buildAeoPayload } = await import("./lib/aeo-payload");

  // AEO Crawler Interception — serves path-aware structured JSON to AI crawlers
  app.use("*", async (c, next) => {
    const userAgent = c.req.header("user-agent") || "";
    const isLlmRequest = c.req.header("accept")?.includes("application/llm") ?? false;

    if (isAiCrawler(userAgent) || isLlmRequest) {
      const payload = await buildAeoPayload(c.req.path);
      if (payload) {
        console.log(`[AEO] Serving structured payload for ${c.req.path} to ${userAgent}`);
        return c.json(payload);
      }
    }
    await next();
  });

  serveStaticFiles(app);

  // If running on Netlify, export the handler. Otherwise, start the server.
  if (process.env.NETLIFY) {
    // @ts-ignore — Netlify provides the handler wrapper
    export const handler = (event, context) => {
      return app.fetch(new Request(`https://${event.headers.host}${event.path}`, {
        method: event.httpMethod,
        headers: event.headers,
        body: event.body,
      }));
    };
  } else {
    const { serve } = await import("@hono/node-server");
    const port = parseInt(process.env.PORT || "3000");
    serve({ fetch: app.fetch, port }, () => {
      console.log(`Server running on http://localhost:${port}/`);
    });
  }
}
```

Note: the exact Netlify handler signature depends on whether `@hono/netlify` or `serverless-http` is used. The simplest path is to use `@hono/netlify`:

Run: `npm install @hono/netlify`

Then the handler becomes:
```typescript
import { handle } from "@hono/netlify";
export const handler = handle(app);
```

Update `netlify/functions/api.ts`:
```typescript
export { handler } from "../../dist/boot.js";
```

- [ ] **Step 4: Run typecheck and build**

Run: `npm run check && npm run build`
Expected: both pass. The build should produce `dist/boot.js` with the exported handler.

- [ ] **Step 5: Commit**

```bash
git add netlify.toml netlify/functions/api.ts api/boot.ts package.json package-lock.json
git commit -m "feat: Netlify deploy config — serverless function for Hono, static CDN for assets, SPA fallback with meta injection"
```

---

## Task 10: Dependency vulnerability audit

**Files:**
- Modify: `package.json` (version bumps)

- [ ] **Step 1: Run audit to see current state**

Run: `npm audit`
Expected: shows 27 vulnerabilities (2 low, 11 moderate, 14 high).

- [ ] **Step 2: Run safe auto-fix**

Run: `npm audit fix`
Expected: fixes what it can without breaking changes. Review the output.

- [ ] **Step 3: Run typecheck, tests, build**

Run: `npm run check && npm test && npm run build`
Expected: all pass. If any fail after the audit fix, the version bump broke something — investigate before proceeding.

- [ ] **Step 4: Review remaining vulnerabilities**

Run: `npm audit`
Expected: fewer vulnerabilities. Document any remaining high-severity ones that require `--force` (breaking changes) and flag them for manual review. Do NOT run `npm audit fix --force` — it can break the build.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: npm audit fix — reduce dependency vulnerabilities"
```

---

## Task 11: .env wiring and secrets documentation

**Files:**
- Modify: `.env.example` (document all required vars)
- Create: `docs/deployment.md`

**Problem:** The app requires `DATABASE_URL`, `APP_ID`, `APP_SECRET`, `KIMI_AUTH_URL`, `KIMI_OPEN_URL`, `OWNER_UNION_ID`. Per the global FILE-LAW, real credentials go in `C:\Dev\.env`, not in the repo. The `.env.example` documents the vars but doesn't explain where to get them or how to wire them for Netlify.

- [ ] **Step 1: Update `.env.example` with better documentation**

Replace `.env.example`:

```bash
# ── Backend ─────────────────────────────────────────────────────
# Used for JWT signing. Generate with: openssl rand -hex 32
APP_ID=
APP_SECRET=

# ── Database ───────────────────────────────────────────────────
# MySQL connection string. For local dev, use a local MySQL instance.
# For production (Netlify), set this in the Netlify dashboard under
# Site Settings > Environment Variables. NEVER commit the real value.
# Real values live in C:\Dev\.env (per the FILE-LAW).
DATABASE_URL=

# ── Frontend (exposed to browser via Vite) ──────────────────────
VITE_KIMI_AUTH_URL=
VITE_APP_ID=

# ── Backend (Auth) ─────────────────────────────────────────────
KIMI_AUTH_URL=
KIMI_OPEN_URL=

# ── Admin Role ──────────────────────────────────────────────────
# Union ID of the app creator; this user gets role "admin" on first login
OWNER_UNION_ID=

# ── Netlify ────────────────────────────────────────────────────
# Set automatically by Netlify. Used to switch between server and function mode.
# NETLIFY=true
```

- [ ] **Step 2: Create deployment docs**

Create `docs/deployment.md`:

```markdown
# Deployment Guide

## Prerequisites
- Node.js 20+
- MySQL database (local or managed)
- Netlify account

## Local Development
1. Copy `.env.example` to `C:\Dev\.env` and fill in real values.
2. `npm install`
3. `npm run db:push` — create database tables
4. `npm run dev` — start dev server on port 3000

## Production (Netlify)
1. Push to the `main` branch.
2. In the Netlify dashboard, set these environment variables:
   - `DATABASE_URL` — your MySQL connection string
   - `APP_ID`, `APP_SECRET` — JWT signing secrets
   - `KIMI_AUTH_URL`, `KIMI_OPEN_URL` — OAuth server URLs
   - `OWNER_UNION_ID` — your admin user ID
   - `VITE_KIMI_AUTH_URL`, `VITE_APP_ID` — frontend OAuth config
   - `NETLIFY` — set to `true`
3. Netlify auto-builds on push. Build command: `npm run build`.
4. Static assets served from `dist/public/`. All other routes go through
   the Hono serverless function at `netlify/functions/api.ts`.

## Secrets Policy
- Real credentials live in `C:\Dev\.env` for local dev.
- For production, set env vars in the Netlify dashboard.
- NEVER commit `.env` to git. It is gitignored.
- NEVER copy secret values into tracked files, config files, or commit messages.
```

- [ ] **Step 3: Commit**

```bash
git add .env.example docs/deployment.md
git commit -m "docs: deployment guide and .env.example with secrets policy"
```

---

## Self-Review

**1. Spec coverage (gap analysis → task):**

| Gap | Task |
|---|---|
| Zero tests | Task 1 (vitest config), Tasks 2-5 (tests per feature) |
| SEO is client-side only | Task 3 (server-side meta injection) |
| AEO middleware is a stub (blanket redirect) | Task 5 (path-aware payloads) |
| No per-page JSON-LD | Task 4 (6 generators: Organization, LocalBusiness, Service, BlogPosting, BreadcrumbList, WebSite) |
| No llms-full.txt / ai.txt | Task 6 |
| Not deployable (no deploy config) | Task 9 (Netlify) |
| 632 KB single bundle | Task 7 (code-splitting) |
| No security headers | Task 8 |
| 27 npm vulnerabilities | Task 10 |
| BlogPost stale-brand bug | Task 2 |
| .env wiring / secrets docs | Task 11 |
| robots.txt missing AI directives | Task 6 |

All 12 gaps from the audit are covered.

**2. Placeholder scan:** No TBD, TODO, or "implement later" found. Every code step has actual code. The Netlify function handler (Task 9, Step 3) has a conditional approach documented — the exact `@hono/netlify` integration is shown with the install command.

**3. Type consistency:**
- `PageMeta` is defined in Task 3 and used in Tasks 3 and 4. Fields match: `title`, `description`, `canonical`, `ogImage?`, `jsonLd?`.
- `buildAeoPayload` returns `object | null` in Task 5, consistent across tests and implementation.
- `isAiCrawler(userAgent: string): boolean` — same signature in test and implementation.
- `injectMeta(html: string, meta: PageMeta): string` — same signature in test, implementation, and the `vite.ts` call site.
- `resolveRouteMeta(pathname: string): Promise<PageMeta | null>` — same signature in test, implementation, and the `vite.ts` call site.

No type mismatches found.
