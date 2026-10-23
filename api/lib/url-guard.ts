import { lookup } from "node:dns/promises";
import { auditHtmlAgainstTitanStandard, type TitanAuditResult } from "./titan-engine";

export const DEFAULT_FETCH_TIMEOUT_MS = 8_000;
export const MAX_HTML_BYTES = 1_048_576; // 1 MiB max HTML read buffer
export const MAX_ROBOTS_BYTES = 131_072; // 128 KiB max robots/llms buffer
export const MAX_REDIRECT_HOPS = 3;

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "0.0.0.0",
  "metadata",
  "metadata.google.internal",
  "instance-data",
  "broadcasthost",
  "localtest.me",
  "lvh.me",
  "vcap.me",
  "1u.ms",
]);

const BLOCKED_HOSTNAME_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".intranet",
  ".corp",
  ".home",
  ".lan",
  ".arpa",
  ".nip.io",
  ".sslip.io",
  ".xip.io",
  ".localtest.me",
  ".lvh.me",
  ".vcap.me",
  ".1u.ms",
];

export interface DnsAddressRecord {
  address: string;
  family: number;
}

export type DnsLookupFn = (hostname: string) => Promise<DnsAddressRecord[]>;

export interface UrlValidationResult {
  ok: boolean;
  url?: URL;
  origin?: string;
  reason?: string;
}

export interface SafeFetchOptions {
  timeoutMs?: number;
  maxBytes?: number;
  fetchImpl?: typeof fetch;
  dnsLookup?: DnsLookupFn;
}

export interface SafeFetchResult {
  ok: boolean;
  status: number | null;
  text: string;
  finalUrl: string;
  ttfbMs: number;
  error?: string;
}

export interface LiveProbeMetadata {
  reachable: boolean;
  httpStatus: number | null;
  ttfbMs: number;
  wafBlocked: boolean;
  hasRobotsTxt: boolean;
  hasLlmsTxt: boolean;
  hasLlmsFullTxt: boolean;
  finalUrl: string;
  error?: string;
}

export interface LiveUrlAuditOutcome {
  probe: LiveProbeMetadata;
  audit: TitanAuditResult;
}

/**
 * Checks whether a dotted-quad IPv4 string falls within any private, loopback,
 * link-local (AWS/GCP metadata 169.254.0.0/16), CGNAT/Tailscale (100.64.0.0/10),
 * multicast, or reserved IANA address block.
 */
export function isBlockedIpv4(ip: string): boolean {
  const parts = ip.split(".");
  if (parts.length !== 4) return false;
  const octets = parts.map((p) => (/^\d+$/.test(p) ? Number(p) : NaN));
  if (octets.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return true;
  }

  const [a, b, c] = octets;
  if (a === 0) return true; // 0.0.0.0/8 (unspecified)
  if (a === 10) return true; // 10.0.0.0/8 (RFC1918 private)
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 (CGNAT / Tailscale)
  if (a === 127) return true; // 127.0.0.0/8 (loopback)
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 (link-local / cloud metadata)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 (RFC1918 private)
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true; // 192.0.0.0/24, 192.0.2.0/24
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 (RFC1918 private)
  if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15 (benchmarking)
  if (a === 198 && b === 51 && c === 100) return true; // 198.51.100.0/24
  if (a === 203 && b === 0 && c === 113) return true; // 203.0.113.0/24
  if (a >= 224) return true; // 224.0.0.0/4 multicast & 240.0.0.0/4 reserved
  return false;
}

/**
 * Checks whether an IPv6 literal (with or without brackets) is loopback,
 * unspecified, link-local, unique-local, multicast, or IPv4-mapped.
 */
export function isBlockedIpv6(rawHost: string): boolean {
  const clean = rawHost.replace(/^\[|\]$/g, "").split("%")[0].toLowerCase();
  if (
    clean === "::1" ||
    clean === "::" ||
    clean === "0:0:0:0:0:0:0:1" ||
    clean === "0:0:0:0:0:0:0:0"
  ) {
    return true;
  }
  // Block IPv4-mapped or IPv4-compatible IPv6 addresses (e.g. ::ffff:127.0.0.1, ::127.0.0.1)
  if (
    clean.startsWith("::ffff:") ||
    clean.startsWith("0:0:0:0:0:ffff:") ||
    /^::\d+\.\d+\.\d+\.\d+$/.test(clean)
  ) {
    return true;
  }
  // Unique local (fc00::/7 -> fc.. or fd..), Link-local (fe80::/10), Multicast (ff00::/8), Documentation (2001:db8::/32)
  if (/^(fc|fd|fe8|fe9|fea|feb|ff|2001:db8:|2001:0db8:)/.test(clean)) {
    return true;
  }
  return false;
}

/**
 * Validates and normalizes a user-supplied URL for SSRF-safe public auditing.
 * Blocks non-HTTP/HTTPS schemes, credentials, internal hostnames, rebinding domains, and private IP ranges.
 */
export function validatePublicAuditUrl(rawInput: string): UrlValidationResult {
  const trimmed = (rawInput || "").trim();
  if (!trimmed) {
    return { ok: false, reason: "URL cannot be empty." };
  }

  const hasExplicitScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed);
  const candidate = hasExplicitScheme ? trimmed : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return { ok: false, reason: "Invalid URL format." };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      ok: false,
      reason: `Unsupported URL protocol "${parsed.protocol}". Only http: and https: are allowed.`,
    };
  }

  if (parsed.username || parsed.password) {
    return { ok: false, reason: "URLs with embedded credentials are not allowed." };
  }

  const rawHostname = parsed.hostname.toLowerCase();
  if (!rawHostname || rawHostname.endsWith(".")) {
    return { ok: false, reason: `Hostname "${rawHostname}" is not a valid public domain.` };
  }

  const hostname = rawHostname.replace(/\.+$/, "");

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return { ok: false, reason: `Blocked loopback or metadata hostname "${hostname}".` };
  }

  if (BLOCKED_HOSTNAME_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) {
    return { ok: false, reason: `Blocked internal or DNS-rebinding hostname suffix on "${hostname}".` };
  }

  if (hostname.startsWith("[") || hostname.includes(":")) {
    if (isBlockedIpv6(hostname)) {
      return { ok: false, reason: `Blocked private or loopback IPv6 address "${hostname}".` };
    }
    return { ok: true, url: parsed, origin: parsed.origin };
  }

  // Check if hostname is an IPv4 literal
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    if (isBlockedIpv4(hostname)) {
      return { ok: false, reason: `Blocked private, loopback, or metadata IPv4 address "${hostname}".` };
    }
    return { ok: true, url: parsed, origin: parsed.origin };
  }

  // Require at least one dot for public DNS names
  if (!hostname.includes(".")) {
    return { ok: false, reason: `Hostname "${hostname}" is not a valid public domain.` };
  }

  return { ok: true, url: parsed, origin: parsed.origin };
}

async function verifyDnsResolutionIsPublic(
  hostname: string,
  dnsLookup?: DnsLookupFn,
): Promise<{ ok: boolean; reason?: string }> {
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname) || hostname.startsWith("[")) {
    return { ok: true };
  }

  const resolver: DnsLookupFn =
    dnsLookup ?? ((host: string) => lookup(host, { all: true }));

  try {
    const records = await resolver(hostname);
    if (!records || records.length === 0) {
      return { ok: false, reason: `DNS resolution returned no records for "${hostname}".` };
    }

    for (const rec of records) {
      if (rec.family === 4 && isBlockedIpv4(rec.address)) {
        return {
          ok: false,
          reason: `Blocked DNS rebinding: "${hostname}" resolved to private/metadata IPv4 ${rec.address}.`,
        };
      }
      if (rec.family === 6 && isBlockedIpv6(rec.address)) {
        return {
          ok: false,
          reason: `Blocked DNS rebinding: "${hostname}" resolved to private/loopback IPv6 ${rec.address}.`,
        };
      }
    }
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, reason: `DNS lookup failed for "${hostname}": ${msg}` };
  }
}

async function readBoundedBody(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) {
    const text = await response.text();
    return text.slice(0, maxBytes);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: false });
  const chunks: string[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done || !value) break;

      const remaining = maxBytes - totalBytes;
      if (value.byteLength >= remaining) {
        chunks.push(decoder.decode(value.subarray(0, remaining), { stream: false }));
        totalBytes += remaining;
        await reader.cancel().catch(() => undefined);
        break;
      }

      chunks.push(decoder.decode(value, { stream: true }));
      totalBytes += value.byteLength;
    }
    chunks.push(decoder.decode());
  } finally {
    reader.releaseLock();
  }

  return chunks.join("");
}

/**
 * Performs an SSRF-guarded HTTP GET with DNS rebinding verification, manual
 * redirect validation, timeout, and bounded response buffer.
 */
export async function safeFetchText(
  targetUrl: string,
  options: SafeFetchOptions = {},
): Promise<SafeFetchResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? MAX_HTML_BYTES;
  const fetchFn = options.fetchImpl ?? globalThis.fetch;

  let currentUrlStr = targetUrl;
  const startTime = Date.now();

  for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop++) {
    const validation = validatePublicAuditUrl(currentUrlStr);
    if (!validation.ok || !validation.url) {
      return {
        ok: false,
        status: null,
        text: "",
        finalUrl: currentUrlStr,
        ttfbMs: Date.now() - startTime,
        error: validation.reason || "Blocked URL",
      };
    }

    // Perform DNS resolution check when using real network fetch or explicit dnsLookup
    if (!options.fetchImpl || options.dnsLookup) {
      const dnsCheck = await verifyDnsResolutionIsPublic(
        validation.url.hostname,
        options.dnsLookup,
      );
      if (!dnsCheck.ok) {
        return {
          ok: false,
          status: null,
          text: "",
          finalUrl: validation.url.href,
          ttfbMs: Date.now() - startTime,
          error: dnsCheck.reason || "Blocked by DNS guard",
        };
      }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetchFn(validation.url.href, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; WebReadyAG-TitanSentinel/2.0; +https://web-ready.ag/ai.txt)",
          Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
        },
      });

      const ttfbMs = Math.max(1, Date.now() - startTime);

      if (res.status >= 300 && res.status < 400) {
        const locationHeader = res.headers.get("location");
        if (!locationHeader) {
          return {
            ok: false,
            status: res.status,
            text: "",
            finalUrl: validation.url.href,
            ttfbMs,
            error: `Redirect (${res.status}) missing Location header.`,
          };
        }
        const nextUrl = new URL(locationHeader, validation.url.href).href;
        const nextValidation = validatePublicAuditUrl(nextUrl);
        if (!nextValidation.ok) {
          return {
            ok: false,
            status: res.status,
            text: "",
            finalUrl: nextUrl,
            ttfbMs,
            error: `Blocked unsafe redirect target: ${nextValidation.reason}`,
          };
        }
        currentUrlStr = nextUrl;
        continue;
      }

      const text = await readBoundedBody(res, maxBytes);
      return {
        ok: res.status >= 200 && res.status < 300,
        status: res.status,
        text,
        finalUrl: validation.url.href,
        ttfbMs,
        error: res.status >= 400 ? `HTTP ${res.status}` : undefined,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        status: null,
        text: "",
        finalUrl: validation.url.href,
        ttfbMs: Math.max(1, Date.now() - startTime),
        error: message.includes("abort") ? `Request timed out after ${timeoutMs}ms` : message,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    ok: false,
    status: null,
    text: "",
    finalUrl: currentUrlStr,
    ttfbMs: Math.max(1, Date.now() - startTime),
    error: `Exceeded maximum redirect hops (${MAX_REDIRECT_HOPS}).`,
  };
}

/**
 * Probes a live external URL (/, /robots.txt, /llms.txt, /llms-full.txt) and runs
 * the deterministic 7-Layer & 4-Engine Titan readiness audit.
 * Never fabricates scores when blocked by a WAF (HTTP 403/429) or network failure.
 */
export async function probeAndAuditLiveUrl(
  targetUrl: string,
  options: SafeFetchOptions = {},
): Promise<LiveUrlAuditOutcome> {
  const validation = validatePublicAuditUrl(targetUrl);
  if (!validation.ok || !validation.url || !validation.origin) {
    throw new Error(validation.reason || "Invalid target URL.");
  }

  const origin = validation.origin;
  const [pageRes, robotsRes, llmsRes, llmsFullRes] = await Promise.all([
    safeFetchText(validation.url.href, { ...options, maxBytes: MAX_HTML_BYTES }),
    safeFetchText(`${origin}/robots.txt`, { ...options, maxBytes: MAX_ROBOTS_BYTES }),
    safeFetchText(`${origin}/llms.txt`, { ...options, maxBytes: MAX_ROBOTS_BYTES }),
    safeFetchText(`${origin}/llms-full.txt`, { ...options, maxBytes: MAX_ROBOTS_BYTES }),
  ]);

  const wafBlocked = pageRes.status === 403 || pageRes.status === 429 || pageRes.status === 503;
  const hasRobotsTxt = robotsRes.ok && robotsRes.text.trim().length > 0;
  const hasLlmsTxt = llmsRes.ok && llmsRes.text.trim().length > 10;
  const hasLlmsFullTxt = llmsFullRes.ok && llmsFullRes.text.trim().length > 10;

  const audit = auditHtmlAgainstTitanStandard({
    url: pageRes.finalUrl || validation.url.href,
    html: pageRes.ok ? pageRes.text : "",
    robotsTxt: hasRobotsTxt ? robotsRes.text : "",
    hasLlmsTxt,
    hasLlmsFullTxt,
    ttfbMs: pageRes.ttfbMs,
  });

  if (!pageRes.ok) {
    const statusLabel = pageRes.status
      ? `HTTP ${pageRes.status}${wafBlocked ? " (WAF / Bot Challenge Block)" : ""}`
      : pageRes.error || "Network Unreachable";
    const wafMessage = `[web-ag-edge-vitals] Live probe failed with ${statusLabel} — AI search crawlers (PerplexityBot, OAI-SearchBot, BraveBot, Googlebot) cannot extract this page.`;

    audit.layers[0].passed = false;
    audit.layers[0].score = Math.min(audit.layers[0].score, 20);
    audit.layers[0].remediation = [wafMessage, ...audit.layers[0].remediation];
    audit.nextSingleLayerToExecute = {
      layerNumber: 1,
      skillId: "web-ag-edge-vitals",
      name: audit.layers[0].name,
      mode: "REMEDIATE",
      actions: audit.layers[0].remediation,
    };
  }

  return {
    probe: {
      reachable: pageRes.ok,
      httpStatus: pageRes.status,
      ttfbMs: pageRes.ttfbMs,
      wafBlocked,
      hasRobotsTxt,
      hasLlmsTxt,
      hasLlmsFullTxt,
      finalUrl: pageRes.finalUrl || validation.url.href,
      error: pageRes.error,
    },
    audit,
  };
}
