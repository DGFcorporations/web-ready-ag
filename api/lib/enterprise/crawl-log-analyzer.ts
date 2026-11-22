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

function parseLogTimestamp(value?: string): number | null {
  if (!value) return null;
  const apache = /^(\d{1,2})\/([A-Za-z]{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2})/.exec(value);
  if (apache) {
    const parsed = Date.parse(
      `${apache[2]} ${apache[1]}, ${apache[3]} ${apache[4]}:${apache[5]}:${apache[6]} UTC`,
    );
    return Number.isNaN(parsed) ? null : parsed;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
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
              path: String(obj.ClientRequestURI ?? obj.ClientRequestPath ?? obj.path ?? ""),
              verifiedBot: obj.verifiedBot === true,
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
        const path = String(obj.ClientRequestURI ?? obj.ClientRequestPath ?? obj.path ?? "");
        const status = Number(obj.EdgeResponseStatus ?? obj.status ?? 0);
        const userAgent = String(obj.ClientRequestUserAgent ?? obj.userAgent ?? "");
        if (path && status > 0) {
          entries.push({
            timestamp: String(obj.EdgeStartTimestamp ?? obj.timestamp ?? ""),
            method: String(obj.ClientRequestMethod ?? obj.method ?? "GET"),
            path,
            status,
            userAgent,
            verifiedBot: obj.verifiedBot === true,
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
    auditedPath?: string;
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
  let verifiedRetrievalHits = 0;
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
  const days = new Set<number>();
  const verifiedRetrievalStatuses: Record<string, number[]> = {};

  for (const entry of entries) {
    const parsedTimestamp = parseLogTimestamp(entry.timestamp);
    if (parsedTimestamp !== null) days.add(Math.floor(parsedTimestamp / 86400000));
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

    if (isBot && entry.status !== 200) {
      botErrorHits += 1;
    }

    const cleanPath = normalizeContentPath(entry.path);
    const verified = entry.verifiedBot === true && parsedTimestamp !== null;
    if (verified && classification.category === "search_retrieval") verifiedRetrievalHits += 1;
    if (verified && classification.category === "search_retrieval" &&
        !TRAP_QUERY_RE.test(entry.path) && options?.auditedPath && normalizeContentPath(options.auditedPath) === cleanPath) {
      const statuses = verifiedRetrievalStatuses[classification.bot] ??= [];
      if (!statuses.includes(entry.status)) statuses.push(entry.status);
    }
    if (verified && !TRAP_QUERY_RE.test(entry.path) && entry.status === 200 && (classification.bot === "Googlebot" || classification.bot === "Bingbot")) {
      crawledCleanPaths.add(cleanPath);
    }
    if (!isBot) continue;

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
    totalBotHits > 0 ? Math.round((trapHits / totalBotHits) * 1000) / 10 : 0;
  let longest = 0;
  let consecutive = 0;
  let previous: number | undefined;
  for (const day of [...days].sort((a, b) => a - b)) {
    consecutive = previous === day - 1 ? consecutive + 1 : 1;
    longest = Math.max(longest, consecutive);
    previous = day;
  }
  const logCoverageDays = longest || null;
  const passes30DayWindow = logCoverageDays !== null && logCoverageDays >= 30;

  let crawlToCitationRatio: number | null = null;
  let crawlToCitationStatus: CrawlLogAnalysisResult["crawlToCitationStatus"] = "unmeasured";
  if (typeof options?.citationsCount === "number" && verifiedRetrievalHits > 0) {
    crawlToCitationRatio = options.citationsCount > 0
      ? Math.round((verifiedRetrievalHits / options.citationsCount) * 100) / 100 : null;
    if (crawlToCitationRatio === null || crawlToCitationRatio > 25) {
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
    verifiedRetrievalHits,
    trainingBotHits,
    humanOrOtherHits,
    statusCounts,
    non200BotRate,
    botHitsByAgent,
    verifiedRetrievalStatuses,
    uncrawledHighValueUrls,
    searchCrawlEfficacyPct: sitemapSet.size ? Math.round(1000 * (1 - uncrawledHighValueUrls.length / sitemapSet.size)) / 10 : null,
    logOrphans: Array.from(orphanSet),
    crawlTrapUrls: Array.from(trapSet),
    crawlWastePercent,
    crawlToCitationRatio,
    crawlToCitationStatus,
    logCoverageDays,
    passes30DayWindow,
  };
}
