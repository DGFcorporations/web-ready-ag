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
  metaTitle?: string | null;
  metaDescription?: string | null;
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
  shortDesc?: string | null;
  fullDesc?: string | null;
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
