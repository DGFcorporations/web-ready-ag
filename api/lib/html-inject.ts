import { getDb } from "../queries/connection";
import {
  buildOrganizationJsonLd,
  buildLocalBusinessJsonLd,
  buildBlogPostingJsonLd,
  buildBreadcrumbJsonLd,
  buildWebsiteJsonLd,
  buildWebPageJsonLd,
  resolveCityWikidataUri,
  WIKIDATA_ENTITIES,
} from "./json-ld";

export interface InfoboxRow {
  label: string;
  value: string;
}

export interface FanOutQuestion {
  pillar?: string;
  question: string;
  answer: string;
}

export interface PageMeta {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string;
  jsonLd?: object[];
  summaryLead?: string;
  wikidataUri?: string;
  infobox?: InfoboxRow[];
  fanOutQuestions?: FanOutQuestion[];
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Escape a value for safe use inside a double-quoted HTML attribute or text node. */
function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function replaceOrInsert(
  html: string,
  selector: { tag: string; attr: string; value: string },
  content: string,
): string {
  const { tag, attr, value } = selector;
  const pattern = attr
    ? new RegExp(`<${tag}[^>]*${attr}=["']${escapeRegex(value)}["'][^>]*>`, "i")
    : new RegExp(`<${tag}[^>]*>`, "i");

  if (pattern.test(html)) {
    return html.replace(pattern, content);
  }
  return html.replace("</head>", `  ${content}\n</head>`);
}

/**
 * Builds the Wikipedia Top-of-DOM <table class="entity-infobox"> and
 * Cleveland Clinic H2 Pillar x Question H3 Fan-Out semantic shell inside #root.
 * Guarantees 0.00 CLS and immediate 0-JS extractability for Googlebot, BraveBot,
 * PerplexityBot, and OAI-SearchBot.
 */
export function buildPrerenderedBodyShell(meta: PageMeta): string {
  const wikidataUri = meta.wikidataUri || WIKIDATA_ENTITIES.searchEngineOptimization;
  const summaryLead = meta.summaryLead || meta.description;

  const infoboxRows: InfoboxRow[] = meta.infobox && meta.infobox.length > 0
    ? meta.infobox
    : [
        { label: "Entity", value: meta.title.split("|")[0].trim() || "WEB-READY/AG" },
        { label: "Canonical URL", value: meta.canonical },
        { label: "Wikidata Entity Q-ID", value: wikidataUri },
        { label: "Target Retrieval Engines", value: "Google, Perplexity, OpenAI, Brave Search (Claude)" },
        { label: "Architecture Standard", value: "WebReady-AG 7-Layer Single-Layer Engine" },
      ];

  const questions: FanOutQuestion[] = meta.fanOutQuestions && meta.fanOutQuestions.length > 0
    ? meta.fanOutQuestions
    : [
        {
          pillar: "Overview & Architecture",
          question: `What is ${meta.title.split("|")[0].trim()} and how does it work?`,
          answer: summaryLead,
        },
        {
          pillar: "Multi-Engine Optimization",
          question: "How does WebReady-AG optimize for Google, Perplexity, OpenAI Search, and Brave Search?",
          answer:
            "WebReady-AG executes a 7-layer single-layer architecture combining sub-second pre-rendered HTML, Wikidata Q-ID @graph schemas, Top-of-DOM entity infoboxes, and H3 question fan-out trees.",
        },
      ];

  const infoboxHtml = infoboxRows
    .map(
      (r) =>
        `        <tr><th scope="row">${escapeAttr(r.label)}</th><td>${escapeAttr(r.value)}</td></tr>`,
    )
    .join("\n");

  const fanOutHtml = questions
    .map(
      (q) =>
        `      <div class="fanout-item">\n        <h3>${escapeAttr(q.question)}</h3>\n        <p>${escapeAttr(q.answer)}</p>\n      </div>`,
    )
    .join("\n");

  return [
    `<main class="ag-prerender-shell min-h-screen">`,
    `  <article class="ag-entity-article">`,
    `    <header class="ag-entity-header">`,
    `      <h1>${escapeAttr(meta.title)}</h1>`,
    `      <p class="ag-summary-lead">${escapeAttr(summaryLead)}</p>`,
    `    </header>`,
    `    <table class="entity-infobox" aria-label="Entity Summary Infobox">`,
    `      <tbody>`,
    infoboxHtml,
    `      </tbody>`,
    `    </table>`,
    `    <section class="query-fanout-tree">`,
    `      <h2>Overview &amp; Common Questions</h2>`,
    fanOutHtml,
    `    </section>`,
    `  </article>`,
    `</main>`,
  ].join("\n");
}

export function injectMeta(html: string, meta: PageMeta): string {
  let result = html;

  // Title
  result = result.replace(/<title>[^<]*<\/title>/i, `<title>${escapeAttr(meta.title)}</title>`);

  // Description
  result = replaceOrInsert(
    result,
    { tag: "meta", attr: "name", value: "description" },
    `<meta name="description" content="${escapeAttr(meta.description)}" />`,
  );

  // Canonical
  result = replaceOrInsert(
    result,
    { tag: "link", attr: "rel", value: "canonical" },
    `<link rel="canonical" href="${escapeAttr(meta.canonical)}" />`,
  );

  // OG title
  result = replaceOrInsert(
    result,
    { tag: "meta", attr: "property", value: "og:title" },
    `<meta property="og:title" content="${escapeAttr(meta.title)}" />`,
  );

  // OG description
  result = replaceOrInsert(
    result,
    { tag: "meta", attr: "property", value: "og:description" },
    `<meta property="og:description" content="${escapeAttr(meta.description)}" />`,
  );

  // OG url
  result = replaceOrInsert(
    result,
    { tag: "meta", attr: "property", value: "og:url" },
    `<meta property="og:url" content="${escapeAttr(meta.canonical)}" />`,
  );

  // OG image
  if (meta.ogImage) {
    result = replaceOrInsert(
      result,
      { tag: "meta", attr: "property", value: "og:image" },
      `<meta property="og:image" content="${escapeAttr(meta.ogImage)}" />`,
    );
  }

  // Twitter title
  result = replaceOrInsert(
    result,
    { tag: "meta", attr: "property", value: "twitter:title" },
    `<meta property="twitter:title" content="${escapeAttr(meta.title)}" />`,
  );

  // Twitter description
  result = replaceOrInsert(
    result,
    { tag: "meta", attr: "property", value: "twitter:description" },
    `<meta property="twitter:description" content="${escapeAttr(meta.description)}" />`,
  );

  // JSON-LD
  if (meta.jsonLd && meta.jsonLd.length > 0) {
    result = result.replace(/<script\s+type="application\/ld\+json">[\s\S]*?<\/script>\s*/gi, "");

    const blocks = meta.jsonLd
      .map((obj) => `  <script type="application/ld+json">\n${JSON.stringify(obj).replace(/</g, "\\u003c")}\n  </script>`)
      .join("\n");
    result = result.replace("</head>", `${blocks}\n</head>`);
  }

  // Pre-rendered Top-of-DOM Infobox + Question H3 Fan-Out inside empty #root (Titan Upgrade)
  if (/<div\s+id=["']root["']\s*><\/div>/i.test(result)) {
    const bodyShell = buildPrerenderedBodyShell(meta);
    result = result.replace(
      /<div\s+id=["']root["']\s*><\/div>/i,
      `<div id="root">\n${bodyShell}\n</div>`,
    );
  }

  return result;
}

const BASE_URL = "https://web-ready.ag";

const STATIC_ROUTES: Record<string, { title: string; description: string; wikidataUri: string }> = {
  "/": {
    title: "WEB-READY/AG | 7-Layer AI & Search Dominance Platform",
    description:
      "WEB-READY/AG engineers Agent-Grade websites that rank #1 across Google, Perplexity, OpenAI Search, and Brave Search via a 7-layer autonomous optimization engine.",
    wikidataUri: WIKIDATA_ENTITIES.searchEngineOptimization,
  },
  "/services": {
    title: "AI Automation & 7-Layer Web AG Services | WEB-READY/AG",
    description:
      "Voice AI, outreach automation, CRM, review management, 7-layer SEO/AEO/GEO, and AI assistants engineered for Florida service businesses.",
    wikidataUri: WIKIDATA_ENTITIES.softwareAgent,
  },
  "/pricing": {
    title: "Transparent Pricing & Data Floor | WEB-READY/AG",
    description:
      "Transparent monthly and annual pricing for Agent-Grade website optimization and AI automation services.",
    wikidataUri: WIKIDATA_ENTITIES.searchEngineOptimization,
  },
  "/locations": {
    title: "Florida Service Areas & Geo Matrix | WEB-READY/AG",
    description:
      "WEB-READY/AG serves Florida service businesses across Miami, Tampa, Orlando, Jacksonville, Naples, and Fort Lauderdale.",
    wikidataUri: WIKIDATA_ENTITIES.florida,
  },
  "/blog": {
    title: "AI Search, AEO & GEO Engineering Blog | WEB-READY/AG",
    description:
      "Technical research on Google AI Overviews, Perplexity Sonar, OpenAI Search, Brave Search, and 7-layer website dominance.",
    wikidataUri: WIKIDATA_ENTITIES.knowledgeGraph,
  },
};

export async function resolveRouteMeta(pathname: string): Promise<PageMeta | null> {
  // Static routes
  if (STATIC_ROUTES[pathname]) {
    const r = STATIC_ROUTES[pathname];
    const canonical = `${BASE_URL}${pathname === "/" ? "/" : pathname}`;
    const jsonLd: object[] = [
      buildOrganizationJsonLd(),
      buildWebsiteJsonLd(),
      buildWebPageJsonLd({
        url: canonical,
        name: r.title,
        definitionHeadline: r.description,
        wikidataUri: r.wikidataUri,
      }),
    ];
    if (pathname !== "/") {
      jsonLd.push(
        buildBreadcrumbJsonLd([
          { name: "Home", url: BASE_URL },
          { name: r.title.split("|")[0].trim(), url: canonical },
        ]),
      );
    }
    return {
      title: r.title,
      description: r.description,
      canonical,
      wikidataUri: r.wikidataUri,
      summaryLead: r.description,
      jsonLd,
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
      const canonical = `${BASE_URL}/locations/${page.slug}`;
      const description =
        page.metaDescription ||
        `Veteran-owned AI automation and Agent-Grade SEO/AEO agency serving ${page.city}, ${page.state}.`;
      const cityWikidata = resolveCityWikidataUri(page.slug || page.city);

      return {
        title: page.metaTitle || `AI Automation Services in ${page.city}, ${page.state}`,
        description,
        canonical,
        wikidataUri: cityWikidata,
        summaryLead: description,
        infobox: [
          { label: "Service Market", value: `${page.city}, ${page.state}` },
          { label: "Canonical URL", value: canonical },
          { label: "Wikidata Location Q-ID", value: cityWikidata },
          { label: "Target Retrieval Engines", value: "Google, Perplexity, OpenAI, Brave Search (Claude)" },
          { label: "Optimization Standard", value: "WebReady-AG 7-Layer Single-Layer Engine" },
        ],
        fanOutQuestions: [
          {
            question: `What AI automation and SEO services are available in ${page.city}, ${page.state}?`,
            answer: description,
          },
          {
            question: `How does WEB-READY/AG rank ${page.city} businesses across Google, Perplexity, OpenAI, and Brave Search?`,
            answer: `We deploy our 7-layer Agent-Grade architecture—including pre-rendered edge HTML, Wikidata Q-ID @graph schemas, Top-of-DOM infoboxes, and transparent pricing tables—tailored for ${page.city}, ${page.state}.`,
          },
        ],
        jsonLd: [
          buildLocalBusinessJsonLd(page),
          buildWebPageJsonLd({
            url: canonical,
            name: page.metaTitle || `AI Automation Services in ${page.city}, ${page.state}`,
            definitionHeadline: description,
            wikidataUri: cityWikidata,
          }),
          buildBreadcrumbJsonLd([
            { name: "Home", url: BASE_URL },
            { name: "Locations", url: `${BASE_URL}/locations` },
            { name: page.city, url: canonical },
          ]),
        ],
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
      const canonical = `${BASE_URL}/blog/${post.slug}`;
      const description =
        post.excerpt ||
        (post.content ? post.content.replace(/<[^>]+>/g, "").slice(0, 155) : post.title);
      return {
        title: `${post.title} | WEB-READY/AG Blog`,
        description,
        canonical,
        ogImage: post.featuredImage || undefined,
        wikidataUri: WIKIDATA_ENTITIES.knowledgeGraph,
        summaryLead: description,
        jsonLd: [
          buildBlogPostingJsonLd(post),
          buildBreadcrumbJsonLd([
            { name: "Home", url: BASE_URL },
            { name: "Blog", url: `${BASE_URL}/blog` },
            { name: post.title, url: canonical },
          ]),
        ],
      };
    } catch {
      return null;
    }
  }

  return null;
}
