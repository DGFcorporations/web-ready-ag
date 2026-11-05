import type { LinkGraphNode, LinkGraphResult } from "./human-audit-types";

export interface CrawledPageInput {
  url: string;
  html: string;
}

export interface LinkGraphOptions {
  homepageUrl?: string;
  sitemapUrls?: string[];
  maxDepthLimit?: number;
}

/**
 * Normalizes a URL or href into a clean relative pathname (e.g. "/services/ai-search").
 */
export function normalizePath(href: string, baseOrigin?: string): string | null {
  if (!href) return null;
  const raw = href.trim();

  // Filter non-http protocols and fragment-only
  if (
    raw.startsWith("#") ||
    raw.startsWith("mailto:") ||
    raw.startsWith("tel:") ||
    raw.startsWith("javascript:") ||
    raw.startsWith("data:")
  ) {
    return null;
  }

  try {
    const origin = baseOrigin ? (baseOrigin.startsWith("http") ? baseOrigin : `https://${baseOrigin}`) : "https://example.com";
    const parsed = new URL(raw, origin);

    // If external domain and baseOrigin specified, skip
    if (baseOrigin) {
      const baseParsed = new URL(origin);
      if (parsed.hostname !== baseParsed.hostname) {
        return null;
      }
    }

    let pathname = parsed.pathname || "/";
    // Normalize trailing slash (keep root / as /)
    if (pathname.length > 1 && pathname.endsWith("/")) {
      pathname = pathname.slice(0, -1);
    }
    return pathname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Extracts all internal href paths from an HTML document.
 */
export function extractInternalLinks(html: string, baseOrigin?: string): string[] {
  const links = new Set<string>();
  const linkRegex = /<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];
    const path = normalizePath(href, baseOrigin);
    if (path) {
      links.add(path);
    }
  }

  return Array.from(links);
}

/**
 * Parses sitemap.xml XML content to extract all declared URLs.
 */
export function parseSitemapUrls(sitemapXml: string, baseOrigin?: string): string[] {
  const urls: string[] = [];
  const locRegex = /<loc>([^<]+)<\/loc>/gi;
  let match: RegExpExecArray | null;

  while ((match = locRegex.exec(sitemapXml)) !== null) {
    const loc = match[1].trim();
    if (/\.xml(?:\?.*)?$/i.test(loc)) {
      continue;
    }
    const path = normalizePath(loc, baseOrigin);
    if (path && !urls.includes(path)) {
      urls.push(path);
    }
  }

  return urls;
}

/**
 * Builds the directed internal link graph, calculates homepage-relative click depth,
 * in-degree counts, and reconciles against sitemap.xml to pinpoint true orphan pages.
 */
export function buildLinkGraph(
  pages: CrawledPageInput[],
  options?: LinkGraphOptions,
): LinkGraphResult {
  const baseOrigin = options?.homepageUrl || (pages[0] ? pages[0].url : "https://example.com");
  const sitemapUrls = (options?.sitemapUrls || []).map((u) => normalizePath(u, baseOrigin) || u);
  const entryPath = normalizePath(pages[0]?.url || "/", baseOrigin) || "/";
  const rootPath = options?.homepageUrl ? normalizePath(options.homepageUrl, baseOrigin) || "/" : entryPath;

  // Adjacency map: source path -> set of target paths
  const adjMap = new Map<string, Set<string>>();
  // Reverse adjacency map: target path -> set of source paths
  const revAdjMap = new Map<string, Set<string>>();

  // Initialize nodes for all crawled pages
  for (const page of pages) {
    const path = normalizePath(page.url, baseOrigin) || "/";
    if (!adjMap.has(path)) adjMap.set(path, new Set());
    if (!revAdjMap.has(path)) revAdjMap.set(path, new Set());

    const outbound = extractInternalLinks(page.html, baseOrigin);
    for (const target of outbound) {
      adjMap.get(path)!.add(target);
      if (!revAdjMap.has(target)) revAdjMap.set(target, new Set());
      revAdjMap.get(target)!.add(path);
    }
  }

  // Include any declared sitemap paths not yet in adjacency map
  for (const sPath of sitemapUrls) {
    if (!adjMap.has(sPath)) adjMap.set(sPath, new Set());
    if (!revAdjMap.has(sPath)) revAdjMap.set(sPath, new Set());
  }

  // Calculate Shortest-Path Click Depth from Entry/Homepage (BFS)
  const clickDepthMap: Record<string, number> = {};
  const queue: Array<{ path: string; depth: number }> = [];
  const visited = new Set<string>();

  const startNode = adjMap.has(rootPath) ? rootPath : entryPath;
  if (adjMap.has(startNode)) {
    queue.push({ path: startNode, depth: 0 });
    visited.add(startNode);
    clickDepthMap[startNode] = 0;
  }

  while (queue.length > 0) {
    const { path, depth } = queue.shift()!;
    const targets = adjMap.get(path) || new Set();

    for (const target of targets) {
      if (!visited.has(target)) {
        visited.add(target);
        clickDepthMap[target] = depth + 1;
        queue.push({ path: target, depth: depth + 1 });
      }
    }
  }

  // Identify nodes, orphan pages, and deep pages
  const nodes: Record<string, LinkGraphNode> = {};
  const orphanPages: string[] = [];
  const deepPages: string[] = [];
  const inDegreeMap: Record<string, number> = {};
  let internalLinksCount = 0;
  let maxClickDepth = 0;
  const isMultiPageOrSitemap = pages.length > 1 || sitemapUrls.length > 0;

  for (const [path, outSet] of adjMap.entries()) {
    const inSet = revAdjMap.get(path) || new Set();
    // Exclude self-links from in-degree calculation
    const inLinks = Array.from(inSet).filter((p) => p !== path);
    const inDegree = inLinks.length;
    inDegreeMap[path] = inDegree;
    internalLinksCount += outSet.size;

    const depth = clickDepthMap[path] !== undefined ? clickDepthMap[path] : -1;
    if (depth > maxClickDepth) maxClickDepth = depth;
    if (depth > 3 || depth === -1) {
      if (path !== startNode) {
        deepPages.push(path);
      }
    }

    // A page is an ORPHAN if multi-page/sitemap reconciliation is active,
    // it is not the start node, and either has 0 inbound internal links OR is unreachable from start node
    const isOrphan = isMultiPageOrSitemap && path !== startNode && (inDegree === 0 || depth === -1);
    if (isOrphan) {
      orphanPages.push(path);
    }

    nodes[path] = {
      path,
      inDegree,
      outDegree: outSet.size,
      clickDepth: depth,
      inboundFrom: inLinks,
      outboundTo: Array.from(outSet),
      isOrphan,
    };
  }

  const passed = orphanPages.length === 0 && maxClickDepth <= 3;

  return {
    totalPagesDiscovered: adjMap.size,
    internalLinksCount,
    maxClickDepth,
    deepPages,
    inDegreeMap,
    homepageClickDepth: clickDepthMap,
    orphanPages,
    sitemapReconciled: sitemapUrls.length > 0,
    passed,
    nodes,
  };
}
