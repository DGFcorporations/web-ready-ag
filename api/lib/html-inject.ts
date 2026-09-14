import { getDb } from "../queries/connection";

export interface PageMeta {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string;
  jsonLd?: object[];
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceOrInsert(
  html: string,
  selector: { tag: string; attr: string; value: string },
  content: string,
): string {
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

const BASE_URL = "https://web-ready.ag";

const STATIC_ROUTES: Record<string, { title: string; description: string }> = {
  "/": {
    title: "WEB-READY/AG | AI Automation for Florida Service Businesses",
    description:
      "WEB-READY/AG optimizes your website for the AI era. We build Agent-Grade structured data and Answer Engine visibility for Florida service businesses.",
  },
  "/services": {
    title: "AI Automation Services | WEB-READY/AG",
    description:
      "Voice AI, outreach automation, CRM, review management, SEO, and AI assistants for Florida service businesses.",
  },
  "/pricing": {
    title: "Pricing | WEB-READY/AG",
    description:
      "Transparent pricing for AI automation services. Monthly and yearly plans for Florida service businesses.",
  },
  "/locations": {
    title: "Service Areas | WEB-READY/AG",
    description:
      "WEB-READY/AG serves Florida service businesses across multiple markets. Find your city.",
  },
  "/blog": {
    title: "Blog | WEB-READY/AG",
    description:
      "Insights on AI automation, Answer Engine Optimization, and growing Florida service businesses.",
  },
};

export async function resolveRouteMeta(pathname: string): Promise<PageMeta | null> {
  // Static routes
  if (STATIC_ROUTES[pathname]) {
    const r = STATIC_ROUTES[pathname];
    return {
      title: r.title,
      description: r.description,
      canonical: `${BASE_URL}${pathname === "/" ? "/" : pathname}`,
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
        description:
          page.metaDescription ||
          `Veteran-owned AI automation agency serving ${page.city}, ${page.state}.`,
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
        description:
          post.metaDescription || post.excerpt || `${post.title} — WEB-READY/AG blog`,
        canonical: `${BASE_URL}/blog/${post.slug}`,
        ogImage: post.featuredImage || undefined,
      };
    } catch {
      return null;
    }
  }

  return null;
}
