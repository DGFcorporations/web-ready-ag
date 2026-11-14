import type {
  HydrationParityResult,
  RedirectCanonicalHygieneResult,
  RedirectHop,
} from "./types";

function stripNonVisibleHtml(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function countWords(text: string): number {
  const clean = text.trim();
  if (!clean) return 0;
  return clean.split(/\s+/).length;
}

function extractHeadings(html: string): string[] {
  const withoutComments = html.replace(/<!--[\s\S]*?-->/g, " ");
  const out: string[] = [];
  const re = /<(h[1-3])\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(withoutComments)) !== null) {
    const clean = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (clean) out.push(clean);
  }
  return out;
}

function extractCanonicalHref(html: string): string | null {
  const re = /<link\b([^>]*)>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const attrs = m[1];
    if (/\brel\s*=\s*["']?canonical["']?/i.test(attrs)) {
      const hrefMatch = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs);
      if (hrefMatch) return (hrefMatch[1] ?? hrefMatch[2] ?? hrefMatch[3] ?? "").trim();
    }
  }
  return null;
}

function collectJsonLdTypes(node: unknown, out: Set<string>): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) collectJsonLdTypes(item, out);
    return;
  }
  const obj = node as Record<string, unknown>;
  if (typeof obj["@type"] === "string") out.add(obj["@type"]);
  else if (Array.isArray(obj["@type"])) {
    for (const t of obj["@type"]) if (typeof t === "string") out.add(t);
  }
  if (Array.isArray(obj["@graph"])) {
    for (const g of obj["@graph"]) collectJsonLdTypes(g, out);
  }
  for (const v of Object.values(obj)) {
    if (v && typeof v === "object") collectJsonLdTypes(v, out);
  }
}

function extractSchemaTypesFromHtml(html: string): string[] {
  const out = new Set<string>();
  const re = /<script\b[^>]*type=["']application\/ld\+json[^"']*["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(m[1].trim()) as unknown;
      collectJsonLdTypes(parsed, out);
    } catch {
      // Ignore parse error here; dedicated JSON-LD graph validator handles parse reporting
    }
  }
  return Array.from(out);
}

export function analyzeHydrationParity(
  rawHtml: string,
  renderedHtml: string,
): HydrationParityResult {
  const rawWordCount = countWords(stripNonVisibleHtml(rawHtml));
  const renderedWordCount = countWords(stripNonVisibleHtml(renderedHtml));
  const parityRatio =
    renderedWordCount === 0
      ? 1
      : Math.round(Math.min(1, rawWordCount / renderedWordCount) * 1000) / 1000;

  const rawHeadings = extractHeadings(rawHtml);
  const renderedHeadings = extractHeadings(renderedHtml);
  const rawHeadingSet = new Set(rawHeadings.map((h) => h.toLowerCase()));
  const missingInRawHeadings = renderedHeadings.filter(
    (h) => !rawHeadingSet.has(h.toLowerCase()),
  );

  const rawSchemaTypes = extractSchemaTypesFromHtml(rawHtml);
  const renderedSchemaTypes = extractSchemaTypesFromHtml(renderedHtml);
  const rawSchemaSet = new Set(rawSchemaTypes);
  const clientOnlyJsonLd = renderedSchemaTypes.filter((t) => !rawSchemaSet.has(t));

  const rawCanonical = extractCanonicalHref(rawHtml);
  const renderedCanonical = extractCanonicalHref(renderedHtml);

  const emptyRootDetected =
    /<div\b[^>]*id=["'](?:root|app|__next)["'][^>]*>\s*<\/div>/i.test(rawHtml) ||
    (rawWordCount < 25 && renderedWordCount > 60);

  let score = 100;
  const findings: string[] = [];

  if (emptyRootDetected) {
    score -= 40;
    findings.push("Empty root mount container detected in raw SSR HTML (<div id=\"root\"></div>).");
  }
  if (parityRatio < 0.85) {
    const gapPenalty = Math.round((0.85 - parityRatio) * 50);
    score -= Math.max(10, gapPenalty);
    findings.push(
      `SSR-vs-hydrated word parity is ${Math.round(parityRatio * 100)}% (target >= 85%).`,
    );
  }
  if (missingInRawHeadings.length > 0) {
    score -= Math.min(20, missingInRawHeadings.length * 5);
    findings.push(
      `Client-only headings absent from raw HTML: ${missingInRawHeadings.slice(0, 3).join("; ")}`,
    );
  }
  if (clientOnlyJsonLd.length > 0) {
    score -= Math.min(20, clientOnlyJsonLd.length * 7);
    findings.push(
      `JSON-LD types injected only after JS hydration: ${clientOnlyJsonLd.join(", ")}`,
    );
  }
  if (rawCanonical && renderedCanonical && rawCanonical !== renderedCanonical) {
    score -= 10;
    findings.push(
      `Canonical tag mutated during hydration (${rawCanonical} -> ${renderedCanonical}).`,
    );
  }

  score = Math.max(0, Math.min(100, score));
  const passed =
    !emptyRootDetected &&
    parityRatio >= 0.85 &&
    missingInRawHeadings.length === 0 &&
    clientOnlyJsonLd.length === 0;

  return {
    score,
    passed,
    rawWordCount,
    renderedWordCount,
    parityRatio,
    rawHeadings,
    renderedHeadings,
    missingInRawHeadings,
    rawSchemaTypes,
    renderedSchemaTypes,
    clientOnlyJsonLd,
    rawCanonical,
    renderedCanonical,
    emptyRootDetected,
    findings,
  };
}

function normalizeUrlForCanonical(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    const origin = parsed.origin.toLowerCase();
    const path = parsed.pathname === "/" ? "/" : parsed.pathname.replace(/\/+$/, "");
    return `${origin}${path}${parsed.search}`;
  } catch {
    return rawUrl.trim();
  }
}

export function analyzeRedirectAndCanonicalHygiene(input: {
  requestedUrl: string;
  finalUrl: string;
  redirectChain?: RedirectHop[];
  html: string;
  sitemapXml?: string;
}): RedirectCanonicalHygieneResult {
  const hops = (input.redirectChain ?? []).filter((h) => h.status >= 300 && h.status < 400);
  const hopCount = hops.length;
  const hasMultiHopChain = hopCount >= 2;
  const hasTemporaryCanonicalRedirect = hops.some((h) => h.status === 302 || h.status === 307);

  let hasUrlFragments = input.requestedUrl.includes("#") || input.finalUrl.includes("#");
  let hasUppercasePath = false;
  try {
    const reqParsed = new URL(input.requestedUrl);
    const finParsed = new URL(input.finalUrl);
    if (reqParsed.hash || finParsed.hash) hasUrlFragments = true;
    if (/[A-Z]/.test(reqParsed.pathname) || /[A-Z]/.test(finParsed.pathname)) {
      hasUppercasePath = true;
    }
  } catch {
    // non-URL fallback
  }

  const declaredCanonical = extractCanonicalHref(input.html);
  const normalizedFinal = normalizeUrlForCanonical(input.finalUrl);
  const selfReferencingCanonicalOk =
    Boolean(declaredCanonical) &&
    /^https?:\/\//i.test(declaredCanonical ?? "") &&
    normalizeUrlForCanonical(declaredCanonical ?? "") === normalizedFinal;

  const sitemapXml = input.sitemapXml ?? "";
  const usesSitemapIndex = /<sitemapindex\b/i.test(sitemapXml);

  let sitemapUrlsMissingLastmod = 0;
  let sitemapLastmodValid = true;
  if (sitemapXml.trim()) {
    const entries = sitemapXml.match(/<(?:url|sitemap)\b[\s\S]*?<\/(?:url|sitemap)>/gi) ?? [];
    for (const block of entries) {
      const lastmodMatch = /<lastmod>\s*([^<]+?)\s*<\/lastmod>/i.exec(block);
      if (!lastmodMatch) {
        sitemapUrlsMissingLastmod += 1;
        sitemapLastmodValid = false;
      } else if (!/^\d{4}-\d{2}-\d{2}/.test(lastmodMatch[1])) {
        sitemapUrlsMissingLastmod += 1;
        sitemapLastmodValid = false;
      }
    }
    if (entries.length === 0) {
      sitemapLastmodValid = false;
    }
  } else {
    sitemapLastmodValid = false;
  }

  let score = 100;
  const findings: string[] = [];

  if (hasMultiHopChain) {
    score -= 25;
    findings.push(`Multi-hop redirect chain detected (${hopCount} hops; keep <= 1 hop).`);
  }
  if (hasTemporaryCanonicalRedirect) {
    score -= 10;
    findings.push("Temporary 302/307 redirect used instead of permanent 301/308.");
  }
  if (hasUrlFragments) {
    score -= 10;
    findings.push("URL contains fragment (#) identifier which crawlers drop from canonical signals.");
  }
  if (hasUppercasePath) {
    score -= 10;
    findings.push("Uppercase characters detected in URL path (enforce lowercase canonical URLs).");
  }
  if (!selfReferencingCanonicalOk) {
    score -= 25;
    findings.push(
      `1-to-1 self-referencing canonical check failed (declared=${declaredCanonical ?? "none"}, final=${normalizedFinal}).`,
    );
  }
  if (sitemapXml.trim()) {
    if (!usesSitemapIndex) {
      score -= 10;
      findings.push(
        "Sitemap is monolithic (<urlset>); segment into <sitemapindex> by entity type.",
      );
    }
    if (!sitemapLastmodValid || sitemapUrlsMissingLastmod > 0) {
      score -= 10;
      findings.push(
        `XML sitemap has ${sitemapUrlsMissingLastmod} entries missing valid ISO-8601 <lastmod>.`,
      );
    }
  }

  score = Math.max(0, Math.min(100, score));
  const passed =
    !hasMultiHopChain &&
    !hasUrlFragments &&
    !hasUppercasePath &&
    selfReferencingCanonicalOk &&
    (!sitemapXml.trim() || (usesSitemapIndex && sitemapLastmodValid));

  return {
    score,
    passed,
    hopCount,
    hasMultiHopChain,
    hasTemporaryCanonicalRedirect,
    hasUrlFragments,
    hasUppercasePath,
    declaredCanonical,
    selfReferencingCanonicalOk,
    usesSitemapIndex,
    sitemapUrlsMissingLastmod,
    sitemapLastmodValid,
    findings,
  };
}
