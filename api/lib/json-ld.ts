const BASE_URL = "https://web-ready.ag";

/**
 * Canonical Wikidata Knowledge Graph Q-IDs (Wikipedia & Cleveland Clinic Titan Pattern).
 * Binding sameAs, mainEntity, about, and areaServed to Wikidata Q-IDs disambiguates
 * entities across Google Knowledge Graph, Perplexity Sonar, OpenAI Search, and Brave/Claude.
 */
export const WIKIDATA_ENTITIES: Record<string, string> = {
  artificialIntelligence: "http://www.wikidata.org/entity/Q11660",
  searchEngineOptimization: "http://www.wikidata.org/entity/Q180711",
  softwareAgent: "http://www.wikidata.org/entity/Q2297769",
  knowledgeGraph: "http://www.wikidata.org/entity/Q33002955",
  informationRetrieval: "http://www.wikidata.org/entity/Q816826",
  florida: "http://www.wikidata.org/entity/Q812",
  miami: "http://www.wikidata.org/entity/Q8652",
  tampa: "http://www.wikidata.org/entity/Q49255",
  orlando: "http://www.wikidata.org/entity/Q49233",
  jacksonville: "http://www.wikidata.org/entity/Q49191",
  "fort-lauderdale": "http://www.wikidata.org/entity/Q487989",
  "st-petersburg": "http://www.wikidata.org/entity/Q49229",
  naples: "http://www.wikidata.org/entity/Q124197",
  sarasota: "http://www.wikidata.org/entity/Q49260",
};

export const PRIMARY_AUTHORITY_CITATIONS = [
  "https://schema.org/docs/schemas.html",
  "https://www.w3.org/TR/json-ld11/",
  "https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data",
  "https://www.wikidata.org/entity/Q180711",
];

export function resolveCityWikidataUri(cityOrSlug: string): string {
  const key = cityOrSlug.toLowerCase().trim().replace(/\s+/g, "-");
  return WIKIDATA_ENTITIES[key] || WIKIDATA_ENTITIES.florida;
}

export function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${BASE_URL}/#organization`,
    name: "WEB-READY/AG",
    url: BASE_URL,
    logo: `${BASE_URL}/hero-bg.jpg`,
    description:
      "Veteran-owned AI automation and Agent-Grade (AIO/AEO/GEO) dominance platform engineered for Google, Perplexity, OpenAI Search, and Brave Search.",
    address: {
      "@type": "PostalAddress",
      addressRegion: "FL",
      addressCountry: "US",
    },
    areaServed: {
      "@type": "State",
      name: "Florida",
      sameAs: WIKIDATA_ENTITIES.florida,
    },
    sameAs: [
      WIKIDATA_ENTITIES.searchEngineOptimization,
      WIKIDATA_ENTITIES.softwareAgent,
      WIKIDATA_ENTITIES.knowledgeGraph,
    ],
    knowsAbout: [
      {
        "@type": "Thing",
        name: "Search Engine Optimization",
        sameAs: WIKIDATA_ENTITIES.searchEngineOptimization,
      },
      {
        "@type": "Thing",
        name: "Software Agent",
        sameAs: WIKIDATA_ENTITIES.softwareAgent,
      },
      {
        "@type": "Thing",
        name: "Knowledge Graph",
        sameAs: WIKIDATA_ENTITIES.knowledgeGraph,
      },
    ],
  };
}

export function buildLocalBusinessJsonLd(geoPage: {
  slug: string;
  city: string;
  state: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
}) {
  const cityWikidata = resolveCityWikidataUri(geoPage.slug || geoPage.city);
  const definitionHeadline =
    geoPage.metaDescription ||
    `WEB-READY/AG provides Agent-Grade SEO, Answer Engine Optimization (AEO), and AI automation for service businesses in ${geoPage.city}, ${geoPage.state}.`;

  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${BASE_URL}/locations/${geoPage.slug}#localbusiness`,
    name: "WEB-READY/AG",
    headline: definitionHeadline,
    description: definitionHeadline,
    url: `${BASE_URL}/locations/${geoPage.slug}`,
    sameAs: cityWikidata,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${BASE_URL}/locations/${geoPage.slug}`,
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: geoPage.city,
      addressRegion: geoPage.state,
      addressCountry: "US",
    },
    areaServed: {
      "@type": "City",
      name: geoPage.city,
      sameAs: cityWikidata,
    },
  };
}

export function buildServiceJsonLd(service: {
  slug: string;
  name: string;
  shortDesc?: string | null;
  fullDesc?: string | null;
}) {
  const description = service.fullDesc || service.shortDesc || "";
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${BASE_URL}/services#${service.slug}`,
    name: service.name,
    headline:
      description ||
      `${service.name} is an Agent-Grade AI automation and search optimization system provided by WEB-READY/AG.`,
    description,
    url: `${BASE_URL}/services`,
    sameAs: WIKIDATA_ENTITIES.softwareAgent,
    mainEntity: WIKIDATA_ENTITIES.searchEngineOptimization,
    provider: {
      "@type": "Organization",
      "@id": `${BASE_URL}/#organization`,
      name: "WEB-READY/AG",
      url: BASE_URL,
    },
  };
}

export function buildBlogPostingJsonLd(post: {
  slug: string;
  title: string;
  excerpt?: string | null;
  content?: string | null;
  author?: string | null;
  publishedAt?: Date | string | null;
  featuredImage?: string | null;
}) {
  const datePublished = post.publishedAt
    ? new Date(post.publishedAt).toISOString()
    : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${BASE_URL}/blog/${post.slug}#article`,
    headline: post.title,
    description: post.excerpt || "",
    sameAs: WIKIDATA_ENTITIES.searchEngineOptimization,
    mainEntity: WIKIDATA_ENTITIES.knowledgeGraph,
    citation: PRIMARY_AUTHORITY_CITATIONS,
    author: {
      "@type": "Person",
      name: post.author || "WEB-READY/AG",
    },
    publisher: {
      "@type": "Organization",
      "@id": `${BASE_URL}/#organization`,
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
    "@id": `${BASE_URL}/#website`,
    url: BASE_URL,
    name: "WEB-READY/AG",
    sameAs: WIKIDATA_ENTITIES.knowledgeGraph,
    publisher: {
      "@type": "Organization",
      "@id": `${BASE_URL}/#organization`,
      name: "WEB-READY/AG",
    },
    potentialAction: {
      "@type": "SearchAction",
      target: `${BASE_URL}/blog?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * Cleveland Clinic + Wikipedia Titan Pattern:
 * Builds a WebPage schema node with a 1-sentence factual definition in `headline`,
 * Wikidata Q-ID binding in `sameAs` & `mainEntity`, and primary authority citations.
 */
export function buildWebPageJsonLd(input: {
  url: string;
  name: string;
  definitionHeadline: string;
  wikidataUri?: string;
  citations?: string[];
  dateModified?: string;
}) {
  const wikidata = input.wikidataUri || WIKIDATA_ENTITIES.searchEngineOptimization;
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${input.url}#webpage`,
    url: input.url,
    name: input.name,
    headline: input.definitionHeadline,
    description: input.definitionHeadline,
    sameAs: wikidata,
    mainEntity: wikidata,
    isPartOf: {
      "@id": `${BASE_URL}/#website`,
    },
    about: {
      "@id": `${BASE_URL}/#organization`,
    },
    citation: input.citations || PRIMARY_AUTHORITY_CITATIONS,
    dateModified: input.dateModified || new Date().toISOString().split("T")[0],
  };
}

/**
 * Consolidates multiple schema nodes into a single interconnected @graph JSON-LD block.
 */
export function buildUnifiedGraphJsonLd(nodes: Record<string, unknown>[]) {
  const cleanedNodes = nodes.map((node) => {
    const copy = { ...node };
    delete copy["@context"];
    return copy;
  });

  return {
    "@context": "https://schema.org",
    "@graph": cleanedNodes,
  };
}
