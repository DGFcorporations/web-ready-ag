import { classifyBotUserAgent } from "./bot-governance";
import type { CrawlLogAnalysisResult, CrawlLogEntry } from "./types";

const TRAP_QUERY_RE = /[?&](q|search|filter|sort|date|view|utm_[a-z0-9_]+|session)=/i;
const SYSTEM_OR_ASSET_RE =
  /^\/(robots\.txt|llms\.txt|llms-full\.txt|ai\.txt|sitemap[^/]*\.xml|favicon\.ico|manifest\.json|assets\/|static\/)|(\.(css|js|mjs|png|jpe?g|webp|gif|svg|ico|woff2?|ttf|map))(\?.*)?$/i;

const NGINX_COMBINED_RE =
  /^\S+\s+\S+\s+\S+\s+\[([^\]]+)\]\s+"([A-Z]+)\s+(\S+)\s+HTTP\/[0-9.]+"\s+(\d{3})\s+(\d+|-)\s+"[^"]*"\s+"([^"]*)"/;

function normalizeContentPath(rawPath: string): string {
  const pathOnly = rawPath.split("#")[0].split("?")[0].trim();
  if (!pathOnly) return "/";
  return pathOnly.length > 1 ? pathOnly.replace(/\/+$/, "") : pathOnly;
}

export function parseCrawlLogInput(input: string | CrawlLogEntry[]): CrawlLogEntry[] {
  if (Array.isArray(input)) {
    return input.filter(
      (item) =>
        item &&
        typeof item.path === "string" &&
        typeof item.status === "number" &&
        typeof item.userAgent === "string",
    );
  }

  const trimmed = input.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        return parseCrawlLogInput(
          parsed.map((row) => {
            const obj = row as Record<string, unknown>;
            return {
              timestamp: String(obj.EdgeStartTimestamp ?? obj.timestamp ?? ""),
              method: String(obj.ClientRequestMethod ?? obj.method ?? "GET"),
              path: String(obj.ClientRequestPath ?? obj.ClientRequestURI ?? obj.path ?? "/"),
              status: Number(obj.EdgeResponseStatus ?? obj.status ?? 0),
              userAgent: String(obj.ClientRequestUserAgent ?? obj.userAgent ?? ""),
              bytes: Number(obj.EdgeResponseBytes ?? obj.bytes ?? 0),
            };
          }),
        );
      }
    } catch {
      // Fall through to line-by-line parsing
    }
  }

  const entries: CrawlLogEntry[] = [];
  for (const line of trimmed.split(/\r?\n/)) {
    const clean = line.trim();
    if (!clean) continue;

    if (clean.startsWith("{")) {
      try {
        const obj = JSON.parse(clean) as Record<string, unknown>;
        const path = String(obj.ClientRequestPath ?? obj.ClientRequestURI ?? obj.path ?? "");
        const status = Number(obj.EdgeResponseStatus ?? obj.status ?? 0);
        const userAgent = String(obj.ClientRequestUserAgent ?? obj.userAgent ?? "");
        if (path && status > 0) {
          entries.push({
            timestamp: String(obj.EdgeStartTimestamp ?? obj.timestamp ?? ""),
            method: String(obj.ClientRequestMethod ?? obj.method ?? "GET"),
            path,
            status,
            userAgent,
            bytes: Number(obj.EdgeResponseBytes ?? obj.bytes ?? 0),
          });
        }
      } catch {
        // Ignore malformed JSON line
      }
      continue;
    }

    const match = NGINX_COMBINED_RE.exec(clean);
    if (match) {
      entries.push({
        timestamp: match[1],
        method: match[2],
        path: match[3],
        status: Number(match[4]),
        bytes: match[5] === "-" ? 0 : Number(match[5]),
        userAgent: match[6],
      });
    }
  }
  return entries;
}

export function analyzeCrawlLogs(
  input: string | CrawlLogEntry[],
  options?: {
    knownSitemapUrls?: string[];
    citationsCount?: number;
  },
): CrawlLogAnalysisResult {
  const entries = parseCrawlLogInput(input);
  const sitemapSet = new Set(
    (options?.knownSitemapUrls ?? []).map((u) => {
      try {
        if (/^https?:\/\//i.test(u)) return normalizeContentPath(new URL(u).pathname);
      } catch {
        // fallback below
      }
      return normalizeContentPath(u);
    }),
  );

  let retrievalBotHits = 0;
  let trainingBotHits = 0;
  let humanOrOtherHits = 0;
  let botErrorHits = 0;

  const statusCounts = {
    "2xx": 0,
    "3xx": 0,
    "4xx": 0,
    "5xx": 0,
  };

  const botHitsByAgent: Record<string, number> = {};
  const crawledCleanPaths = new Set<string>();
  const orphanSet = new Set<string>();
  const trapSet = new Set<string>();
  let trapHits = 0;

  for (const entry of entries) {
    const bucket = Math.floor(entry.status / 100);
    if (bucket === 2) statusCounts["2xx"] += 1;
    else if (bucket === 3) statusCounts["3xx"] += 1;
    else if (bucket === 4) statusCounts["4xx"] += 1;
    else if (bucket >= 5) statusCounts["5xx"] += 1;

    const classification = classifyBotUserAgent(entry.userAgent);
    const isBot = classification.category !== "other";

    if (classification.category === "search_retrieval") {
      retrievalBotHits += 1;
      botHitsByAgent[classification.bot] = (botHitsByAgent[classification.bot] ?? 0) + 1;
    } else if (classification.category === "model_training") {
      trainingBotHits += 1;
      botHitsByAgent[classification.bot] = (botHitsByAgent[classification.bot] ?? 0) + 1;
    } else {
      humanOrOtherHits += 1;
    }

    if (isBot && entry.status >= 400) {
      botErrorHits += 1;
    }

    const cleanPath = normalizeContentPath(entry.path);
    crawledCleanPaths.add(cleanPath);

    if (TRAP_QUERY_RE.test(entry.path)) {
      trapSet.add(entry.path);
      trapHits += 1;
    } else if (
      sitemapSet.size > 0 &&
      !SYSTEM_OR_ASSET_RE.test(entry.path) &&
      !sitemapSet.has(cleanPath)
    ) {
      orphanSet.add(cleanPath);
    }
  }

  const totalHits = entries.length;
  const totalBotHits = retrievalBotHits + trainingBotHits;
  const non200BotRate =
    totalBotHits > 0 ? Math.round((botErrorHits / totalBotHits) * 1000) / 10 : 0;

  const uncrawledHighValueUrls = Array.from(sitemapSet).filter(
    (path) => !crawledCleanPaths.has(path),
  );

  const crawlWastePercent =
    totalHits > 0 ? Math.round((trapHits / totalHits) * 1000) / 10 : 0;

  let crawlToCitationRatio: number | null = null;
  let crawlToCitationStatus: CrawlLogAnalysisResult["crawlToCitationStatus"] = "unmeasured";
  if (typeof options?.citationsCount === "number" && retrievalBotHits > 0) {
    crawlToCitationRatio =
      Math.round((retrievalBotHits / Math.max(1, options.citationsCount)) * 100) / 100;
    if (options.citationsCount === 0 || crawlToCitationRatio > 25) {
      crawlToCitationStatus = "overcrawled_low_citation";
    } else if (crawlToCitationRatio < 0.25) {
      crawlToCitationStatus = "under_crawled";
    } else {
      crawlToCitationStatus = "healthy";
    }
  }

  return {
    totalHits,
    retrievalBotHits,
    trainingBotHits,
    humanOrOtherHits,
    statusCounts,
    non200BotRate,
    botHitsByAgent,
    uncrawledHighValueUrls,
    logOrphans: Array.from(orphanSet),
    crawlTrapUrls: Array.from(trapSet),
    crawlWastePercent,
    crawlToCitationRatio,
    crawlToCitationStatus,
  };
}
