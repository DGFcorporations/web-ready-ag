import {
  WIKIDATA_ENTITIES,
  PRIMARY_AUTHORITY_CITATIONS,
  resolveCityWikidataUri,
  buildUnifiedGraphJsonLd,
} from "./json-ld";
import { buildCanonicalRobotsTxt, WEB_AG_LAYERS } from "./titan-engine";
import { mdLink } from "./llms-txt";

export interface ArtifactGeneratorInput {
  domain: string;
  brandName: string;
  niche: string;
  city?: string;
  state?: string;
  services?: string[];
  startingPrice?: string;
  /** ISO date (YYYY-MM-DD…) for WebPage.dateModified; defaults to today (UTC). */
  dateModified?: string;
}

export interface GeneratedLayerArtifact {
  layerNumber: number;
  skillId: string;
  title: string;
  fileName: string;
  language: "txt" | "json" | "html" | "markdown";
  code: string;
  verificationGate: string;
}

export interface TitanArtifactBundle {
  normalizedDomain: string;
  brandName: string;
  niche: string;
  city: string;
  state: string;
  robotsTxt: string;
  jsonLdGraph: string;
  programmaticRoutes: string;
  dataFloorHtml: string;
  infoboxAndFanOutHtml: string;
  llmsTxt: string;
  consensusBlueprint: string;
  indexNowPayload: string;
  fullHtmlPreview: string;
  layerArtifacts: GeneratedLayerArtifact[];
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function toSlug(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "service"
  );
}

function normalizeOrigin(rawDomain: string): { origin: string; host: string } {
  const trimmed = (rawDomain || "").trim() || "https://web-ready.ag";
  const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const parsed = new URL(withScheme);
    return { origin: parsed.origin, host: parsed.hostname };
  } catch {
    return { origin: "https://web-ready.ag", host: "web-ready.ag" };
  }
}

function buildLayer2JsonLdGraph(params: {
  origin: string;
  brandName: string;
  niche: string;
  city: string;
  state: string;
  cityWikidata: string;
  services: string[];
  startingPrice: string;
  dateModified: string;
}): string {
  const { origin, brandName, niche, city, state, cityWikidata, services, startingPrice, dateModified } = params;
  const definitionHeadline = `${brandName} is an Agent-Grade ${niche} provider serving ${city}, ${state} with verified pricing starting at ${startingPrice}.`;

  const graph = buildUnifiedGraphJsonLd([
    {
      "@type": "Organization",
      "@id": `${origin}/#organization`,
      name: brandName,
      url: origin,
      description: definitionHeadline,
      sameAs: [
        WIKIDATA_ENTITIES.searchEngineOptimization,
        WIKIDATA_ENTITIES.knowledgeGraph,
        cityWikidata,
      ],
      areaServed: {
        "@type": "City",
        name: city,
        sameAs: cityWikidata,
      },
    },
    {
      "@type": "LocalBusiness",
      "@id": `${origin}/#localbusiness`,
      name: brandName,
      headline: definitionHeadline,
      description: definitionHeadline,
      url: origin,
      priceRange: startingPrice,
      sameAs: cityWikidata,
      address: {
        "@type": "PostalAddress",
        addressLocality: city,
        addressRegion: state,
        addressCountry: "US",
      },
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: `${brandName} Service Catalog`,
        itemListElement: services.map((svc) => ({
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: svc,
          },
        })),
      },
    },
    {
      "@type": "WebSite",
      "@id": `${origin}/#website`,
      url: origin,
      name: brandName,
      publisher: { "@id": `${origin}/#organization` },
    },
    {
      "@type": "WebPage",
      "@id": `${origin}/#webpage`,
      url: `${origin}/`,
      dateModified,
      name: `${brandName} | ${niche} in ${city}, ${state}`,
      headline: definitionHeadline,
      description: definitionHeadline,
      sameAs: cityWikidata,
      mainEntity: WIKIDATA_ENTITIES.searchEngineOptimization,
      isPartOf: { "@id": `${origin}/#website` },
      about: { "@id": `${origin}/#organization` },
      citation: PRIMARY_AUTHORITY_CITATIONS,
    },
  ]);

  return JSON.stringify(graph, null, 2);
}

function buildLayer3ProgrammaticMatrix(params: {
  origin: string;
  brandName: string;
  city: string;
  services: string[];
}): { code: string; routeUrls: string[] } {
  const { origin, brandName, city, services } = params;
  const citySlug = toSlug(city);
  const routeUrls = services.map((svc) => `${origin}/services/${toSlug(svc)}/${citySlug}`);

  const payload = {
    hubRoute: `${origin}/locations/${citySlug}`,
    combinatorialSpokeRoutes: routeUrls,
    canonicalHeadTags: routeUrls.map(
      (url) => `<link rel="canonical" href="${escapeHtml(url)}" />`,
    ),
    breadcrumbJsonLd: {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: brandName, item: `${origin}/` },
        { "@type": "ListItem", position: 2, name: city, item: `${origin}/locations/${citySlug}` },
        {
          "@type": "ListItem",
          position: 3,
          name: services[0] || "Primary Service",
          item: routeUrls[0] || `${origin}/services`,
        },
      ],
    },
  };

  return {
    code: JSON.stringify(payload, null, 2),
    routeUrls,
  };
}

function buildLayer4DataFloorHtml(params: {
  brandName: string;
  niche: string;
  city: string;
  state: string;
  services: string[];
  startingPrice: string;
}): string {
  const { brandName, niche, city, state, services, startingPrice } = params;
  const rows = services
    .map(
      (svc) =>
        `      <tr><td>${escapeHtml(svc)}</td><td>${escapeHtml(startingPrice)}</td><td>${escapeHtml(city)}, ${escapeHtml(state)}</td><td>Verified First-Party Ledger (OfferCatalog)</td></tr>`,
    )
    .join("\n");

  return [
    `<!-- Layer 4: First-Party Transparent Data Floor (Captures Walled-Garden Vacuum) -->`,
    `<section class="ag-data-floor" aria-label="Verified Service &amp; Pricing Matrix">`,
    `  <h2>${escapeHtml(brandName)} — Verified ${escapeHtml(niche)} Pricing &amp; Specifications</h2>`,
    `  <table class="data-floor-table">`,
    `    <thead>`,
    `      <tr><th>Service</th><th>Starting Price</th><th>Market</th><th>Verification Standard</th></tr>`,
    `    </thead>`,
    `    <tbody>`,
    rows,
    `    </tbody>`,
    `  </table>`,
    `</section>`,
  ].join("\n");
}

function buildLayer5InfoboxAndFanOutHtml(params: {
  origin: string;
  brandName: string;
  niche: string;
  city: string;
  state: string;
  cityWikidata: string;
  services: string[];
  startingPrice: string;
}): string {
  const { origin, brandName, niche, city, state, cityWikidata, services, startingPrice } = params;
  const summaryLead = `${brandName} delivers ${niche} in ${city}, ${state} (${services.join(", ")}) with transparent pricing starting at ${startingPrice}.`;

  return [
    `<main class="ag-prerender-shell min-h-screen">`,
    `  <article class="ag-entity-article">`,
    `    <header class="ag-entity-header">`,
    `      <h1>${escapeHtml(brandName)} | ${escapeHtml(niche)} in ${escapeHtml(city)}, ${escapeHtml(state)}</h1>`,
    `      <p class="ag-summary-lead">${escapeHtml(summaryLead)}</p>`,
    `    </header>`,
    `    <table class="entity-infobox" aria-label="Entity Summary Infobox">`,
    `      <tbody>`,
    `        <tr><th scope="row">Entity</th><td>${escapeHtml(brandName)}</td></tr>`,
    `        <tr><th scope="row">Primary Category</th><td>${escapeHtml(niche)}</td></tr>`,
    `        <tr><th scope="row">Canonical URL</th><td>${escapeHtml(origin)}/</td></tr>`,
    `        <tr><th scope="row">Service Market</th><td>${escapeHtml(city)}, ${escapeHtml(state)}</td></tr>`,
    `        <tr><th scope="row">Wikidata Location Q-ID</th><td>${escapeHtml(cityWikidata)}</td></tr>`,
    `        <tr><th scope="row">Starting Price</th><td>${escapeHtml(startingPrice)}</td></tr>`,
    `        <tr><th scope="row">Target Retrieval Engines</th><td>Google, Perplexity, OpenAI, Brave Search (Claude)</td></tr>`,
    `      </tbody>`,
    `    </table>`,
    `    <section class="query-fanout-tree">`,
    `      <h2>Overview &amp; Common Questions</h2>`,
    `      <div class="fanout-item">`,
    `        <h3>What is ${escapeHtml(brandName)} and what services does it provide in ${escapeHtml(city)}?</h3>`,
    `        <p>${escapeHtml(summaryLead)}</p>`,
    `      </div>`,
    `      <div class="fanout-item">`,
    `        <h3>How much does ${escapeHtml(services[0] || niche)} cost at ${escapeHtml(brandName)}?</h3>`,
    `        <p>Verified first-party pricing for ${escapeHtml(services[0] || niche)} in ${escapeHtml(city)}, ${escapeHtml(state)} starts at ${escapeHtml(startingPrice)} with full deliverables published in our OfferCatalog.</p>`,
    `      </div>`,
    `      <div class="fanout-item">`,
    `        <h3>Why do Google, Perplexity, OpenAI, and Brave Search cite ${escapeHtml(brandName)}?</h3>`,
    `        <p>${escapeHtml(brandName)} publishes pre-rendered Top-of-DOM entity infobox tables, Wikidata Q-ID @graph schemas, and primary authority citations.</p>`,
    `      </div>`,
    `    </section>`,
    `  </article>`,
    `</main>`,
  ].join("\n");
}

/**
 * Generates a complete, deterministic Layer 1–7 code artifact bundle for any target domain.
 */
export function generateTitanLayerArtifacts(input: ArtifactGeneratorInput): TitanArtifactBundle {
  const { origin, host } = normalizeOrigin(input.domain);
  const brandName = (input.brandName || "").trim() || "Client Brand";
  const niche = (input.niche || "").trim() || "Professional Services";
  const city = (input.city || "").trim() || "Miami";
  const state = (input.state || "").trim() || "FL";
  const startingPrice = (input.startingPrice || "").trim() || "$199/mo";
  const services =
    input.services && input.services.filter((s) => s.trim().length > 0).length > 0
      ? input.services.map((s) => s.trim())
      : ["Primary Consultation", "Managed Implementation", "Priority Support"];

  const cityWikidata = resolveCityWikidataUri(city);
  const robotsTxt = buildCanonicalRobotsTxt(origin);
  const dateModified = /^\d{4}-\d{2}-\d{2}/.test(input.dateModified || "")
    ? (input.dateModified as string)
    : new Date().toISOString().split("T")[0];
  const jsonLdGraph = buildLayer2JsonLdGraph({
    origin,
    brandName,
    niche,
    city,
    state,
    cityWikidata,
    services,
    startingPrice,
    dateModified,
  });
  const { code: programmaticRoutes, routeUrls } = buildLayer3ProgrammaticMatrix({
    origin,
    brandName,
    city,
    services,
  });
  const dataFloorHtml = buildLayer4DataFloorHtml({
    brandName,
    niche,
    city,
    state,
    services,
    startingPrice,
  });
  const infoboxAndFanOutHtml = buildLayer5InfoboxAndFanOutHtml({
    origin,
    brandName,
    niche,
    city,
    state,
    cityWikidata,
    services,
    startingPrice,
  });

  const llmsTxt = [
    `# ${brandName} — 7-Layer Multi-Engine Knowledge Graph`,
    ``,
    `> ${brandName} is an Agent-Grade ${niche} authority serving ${city}, ${state}. Engineered for instant citation across Google (Core & AI Overviews), Perplexity (Sonar), OpenAI (ChatGPT Search), and Brave Search (Claude).`,
    ``,
    `## Entity Summary Infobox`,
    `| Attribute | Value |`,
    `| :--- | :--- |`,
    `| Entity | ${brandName} |`,
    `| Canonical Domain | ${origin} |`,
    `| Niche | ${niche} |`,
    `| Primary Market | ${city}, ${state} (${cityWikidata}) |`,
    `| Starting Price | ${startingPrice} |`,
    `| Target Engines | Google, Perplexity, OpenAI, Brave Search (Claude) |`,
    ``,
    `## Verified Services`,
    ...services.map((s) => `- ${mdLink(s, `${origin}/services/${toSlug(s)}/${toSlug(city)}`)}: ${startingPrice}`),
    ``,
    `## Key Pages`,
    `- ${mdLink("Home", `${origin}/`)}: ${brandName} overview and entity summary`,
    `- ${mdLink("Full knowledge base (llms-full.txt)", `${origin}/llms-full.txt`)}: Unabridged corpus`,
    ``,
  ].join("\n");

  const consensusBlueprint = [
    `# Layer 6: Dual-Track Omnichannel Consensus Blueprint for ${brandName}`,
    ``,
    `## Track A — Google AI Overviews, Perplexity Sonar & ChatGPT Search`,
    `- **Reddit & Community Hubs:** Publish empirical ${niche} comparison checklists for ${city}, ${state} citing ${origin}.`,
    `- **YouTube Spoken-Transcript Grounding:** Publish 3-minute breakdown videos with exact spoken entity mentions ("${brandName} in ${city}").`,
    `- **Third-Party Review Matrices:** Maintain verified category profiles on G2, Clutch, BBB, and Trustpilot linked via JSON-LD \`sameAs\`.`,
    ``,
    `## Track B — Brave Search & Anthropic Claude (86.7% Citation Overlap)`,
    `- **Why Separate Track:** Reddit blocks \`BraveBot\` via \`robots.txt\`, so Claude relies on open web corpora, institutional citations, and first-party structured data.`,
    `- **Open Dataset & Corpus:** Serve \`${origin}/llms.txt\` and \`${origin}/llms-full.txt\` with zero WAF friction for \`BraveBot\` and \`Claude-SearchBot\`.`,
    `- **Institutional Citations:** Anchor claims to primary standards and government registries (${PRIMARY_AUTHORITY_CITATIONS.join(", ")}).`,
  ].join("\n");

  const indexNowPayload = JSON.stringify(
    {
      host,
      key: "web-ready-ag-indexnow-key",
      keyLocation: `${origin}/web-ready-ag-indexnow-key.txt`,
      urlList: [`${origin}/`, `${origin}/llms.txt`, `${origin}/llms-full.txt`, ...routeUrls],
    },
    null,
    2,
  );

  const safeJsonLdForScript = jsonLdGraph.replace(/</g, "\\u003c");
  const titleText = `${brandName} | ${niche} in ${city}, ${state}`;
  const descText = `${brandName} delivers verified ${niche} in ${city}, ${state} starting at ${startingPrice}.`;

  const fullHtmlPreview = [
    `<!doctype html>`,
    `<html lang="en">`,
    `<head>`,
    `  <meta charset="UTF-8" />`,
    `  <title>${escapeHtml(titleText)}</title>`,
    `  <meta name="description" content="${escapeHtml(descText)}" />`,
    `  <link rel="canonical" href="${escapeHtml(origin)}/" />`,
    `  <script type="application/ld+json">`,
    safeJsonLdForScript,
    `  </script>`,
    `</head>`,
    `<body>`,
    `  <div id="root">`,
    infoboxAndFanOutHtml,
    dataFloorHtml,
    `  </div>`,
    `</body>`,
    `</html>`,
  ].join("\n");

  const layerArtifacts: GeneratedLayerArtifact[] = [
    {
      layerNumber: 1,
      skillId: WEB_AG_LAYERS[0].skillId,
      title: WEB_AG_LAYERS[0].name,
      fileName: "public/robots.txt",
      language: "txt",
      code: robotsTxt,
      verificationGate: WEB_AG_LAYERS[0].verificationGate,
    },
    {
      layerNumber: 2,
      skillId: WEB_AG_LAYERS[1].skillId,
      title: WEB_AG_LAYERS[1].name,
      fileName: "schema/entity-graph.jsonld",
      language: "json",
      code: jsonLdGraph,
      verificationGate: WEB_AG_LAYERS[1].verificationGate,
    },
    {
      layerNumber: 3,
      skillId: WEB_AG_LAYERS[2].skillId,
      title: WEB_AG_LAYERS[2].name,
      fileName: "routes/programmatic-matrix.json",
      language: "json",
      code: programmaticRoutes,
      verificationGate: WEB_AG_LAYERS[2].verificationGate,
    },
    {
      layerNumber: 4,
      skillId: WEB_AG_LAYERS[3].skillId,
      title: WEB_AG_LAYERS[3].name,
      fileName: "sections/data-floor-table.html",
      language: "html",
      code: dataFloorHtml,
      verificationGate: WEB_AG_LAYERS[3].verificationGate,
    },
    {
      layerNumber: 5,
      skillId: WEB_AG_LAYERS[4].skillId,
      title: WEB_AG_LAYERS[4].name,
      fileName: "public/llms.txt + prerender-infobox.html",
      language: "html",
      code: `${infoboxAndFanOutHtml}\n\n<!-- /llms.txt -->\n${llmsTxt}`,
      verificationGate: WEB_AG_LAYERS[4].verificationGate,
    },
    {
      layerNumber: 6,
      skillId: WEB_AG_LAYERS[5].skillId,
      title: WEB_AG_LAYERS[5].name,
      fileName: "docs/dual-track-consensus.md",
      language: "markdown",
      code: consensusBlueprint,
      verificationGate: WEB_AG_LAYERS[5].verificationGate,
    },
    {
      layerNumber: 7,
      skillId: WEB_AG_LAYERS[6].skillId,
      title: WEB_AG_LAYERS[6].name,
      fileName: "sentinel/indexnow-ping.json",
      language: "json",
      code: indexNowPayload,
      verificationGate: WEB_AG_LAYERS[6].verificationGate,
    },
  ];

  return {
    normalizedDomain: origin,
    brandName,
    niche,
    city,
    state,
    robotsTxt,
    jsonLdGraph,
    programmaticRoutes,
    dataFloorHtml,
    infoboxAndFanOutHtml,
    llmsTxt,
    consensusBlueprint,
    indexNowPayload,
    fullHtmlPreview,
    layerArtifacts,
  };
}
