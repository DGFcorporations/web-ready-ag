// @ts-ignore
import { JSDOM } from "jsdom";
import type {
  ClientRuntimeResult,
  ConsoleErrorEntry,
  CspViolationEntry,
  UnconfiguredChatbot,
} from "./human-audit-types";

export interface ChatbotSignature {
  provider: string;
  scriptPattern: RegExp;
  configPattern?: RegExp;
  requiredCspDomains: string[];
  placeholderPatterns: RegExp[];
}

export const CHATBOT_SIGNATURES: ChatbotSignature[] = [
  {
    provider: "Voiceflow",
    scriptPattern: /cdn\.voiceflow\.com\/widget\/bundle\.mjs|voiceflow/i,
    configPattern: /voiceflow\.chat\.load\s*\(\s*\{[\s\S]*?projectID\s*:\s*['"]([^'"]+)['"]/i,
    requiredCspDomains: ["cdn.voiceflow.com", "general-runtime.voiceflow.com"],
    placeholderPatterns: [/YOUR_PROJECT_ID/i, /^$/, /^undefined$/i, /^null$/i, /<project_id>/i, /\$\{.*?\}/],
  },
  {
    provider: "Crisp",
    scriptPattern: /client\.crisp\.chat\/l\.js|CRISP_WEBSITE_ID/i,
    configPattern: /CRISP_WEBSITE_ID\s*=\s*['"]([^'"]+)['"]/i,
    requiredCspDomains: ["client.crisp.chat"],
    placeholderPatterns: [/YOUR_WEBSITE_ID/i, /^$/, /^undefined$/i, /^null$/i, /<website_id>/i],
  },
  {
    provider: "Intercom",
    scriptPattern: /widget\.intercom\.io\/widget|intercomSettings/i,
    configPattern: /app_id\s*:\s*['"]([^'"]+)['"]/i,
    requiredCspDomains: ["widget.intercom.io", "api-iam.intercom.io"],
    placeholderPatterns: [/YOUR_APP_ID/i, /^$/, /^undefined$/i, /^null$/i],
  },
  {
    provider: "Chatwoot",
    scriptPattern: /chatwoot\.js|chatwootSDK/i,
    configPattern: /websiteToken\s*:\s*['"]([^'"]+)['"]/i,
    requiredCspDomains: ["app.chatwoot.com"],
    placeholderPatterns: [/YOUR_WEBSITE_TOKEN/i, /^$/, /^undefined$/i],
  },
  {
    provider: "Tidio",
    scriptPattern: /code\.tidio\.co\/[a-z0-9]+\.js|tidio/i,
    configPattern: /code\.tidio\.co\/([a-zA-Z0-9_-]+)\.js/i,
    requiredCspDomains: ["code.tidio.co", "widget-v4.tidiochat.com"],
    placeholderPatterns: [/YOUR_PUBLIC_KEY/i, /^$/],
  },
];

/**
 * Parses CSP directives from header strings or meta tags.
 */
export function parseCspDirectives(cspHeader: string): Record<string, string[]> {
  const directives: Record<string, string[]> = {};
  const parts = cspHeader.split(";");

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const tokens = trimmed.split(/\s+/);
    const directiveName = tokens[0].toLowerCase();
    const sources = tokens.slice(1);
    directives[directiveName] = sources;
  }

  return directives;
}

/**
 * Checks whether a given host/origin is allowed under a specific CSP directive.
 */
export function isAllowedByCsp(
  directiveSources: string[] | undefined,
  defaultSources: string[] | undefined,
  targetDomain: string,
): boolean {
  const sources = directiveSources || defaultSources;
  if (!sources || sources.length === 0) return true; // No policy restriction

  if (sources.includes("*")) return true;

  for (const src of sources) {
    const cleanSrc = src
      .replace(/^https?:\/\//, "")
      .split("/")[0]
      .replace(/:\d+$/, "")
      .toLowerCase();
    const cleanTarget = targetDomain.toLowerCase();

    if (cleanSrc === cleanTarget) return true;
    if (cleanSrc.startsWith("*.")) {
      const rootDomain = cleanSrc.slice(2);
      if (cleanTarget === rootDomain || cleanTarget.endsWith("." + rootDomain)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Audits an HTML document and associated CSP header for client-side console risks,
 * CSP directive violations, and dead/unconfigured chatbot widgets.
 */
export function auditClientRuntime(
  html: string,
  cspHeader?: string,
  loggedConsoleErrors?: ConsoleErrorEntry[],
): ClientRuntimeResult {
  const consoleErrors: ConsoleErrorEntry[] = loggedConsoleErrors ? [...loggedConsoleErrors] : [];
  const cspViolations: CspViolationEntry[] = [];
  const unconfiguredChatbots: UnconfiguredChatbot[] = [];
  // Extract CSP from meta tag if not passed via header
  let activeCsp = cspHeader || "";
  if (!activeCsp) {
    try {
      const dom = new JSDOM(html);
      const meta = dom.window.document.querySelector('meta[http-equiv="Content-Security-Policy" i]');
      if (meta) {
        activeCsp = meta.getAttribute("content") || "";
      }
    } catch {
      const metaCsp = html.match(/content=["']([^"']+)["'][^>]*http-equiv=["']Content-Security-Policy["']/i) ||
        html.match(/http-equiv=["']Content-Security-Policy["'][^>]*content=["']([^"']+)["']/i);
      if (metaCsp) {
        activeCsp = metaCsp[1];
      }
    }
  }

  const parsedCsp = activeCsp ? parseCspDirectives(activeCsp) : null;

  // 1. Audit Chatbot Widgets for unconfigured keys, dead scripts, or CSP blocking
  for (const sig of CHATBOT_SIGNATURES) {
    const isScriptPresent = sig.scriptPattern.test(html);
    if (!isScriptPresent) continue;

    let isUnconfigured = false;
    let configToken: string | null = null;

    if (sig.configPattern) {
      const configMatch = html.match(sig.configPattern);
      if (configMatch) {
        configToken = configMatch[1];
        for (const placeholder of sig.placeholderPatterns) {
          if (placeholder.test(configToken)) {
            isUnconfigured = true;
            break;
          }
        }
      } else {
        // Script is embedded but configuration call is missing
        isUnconfigured = true;
      }
    }

    if (isUnconfigured) {
      unconfiguredChatbots.push({
        provider: sig.provider,
        status: "UNCONFIGURED",
        detail: `Chatbot widget (${sig.provider}) is embedded in DOM but missing valid projectID/token.`,
      });
      consoleErrors.push({
        message: `Uncaught Error: [${sig.provider}] widget failed to initialize: missing valid configuration token.`,
        source: sig.provider.toLowerCase() + "-widget.js",
      });
    }

    // Check CSP compatibility
    if (parsedCsp) {
      const connectSrc = parsedCsp["connect-src"];
      const scriptSrc = parsedCsp["script-src"];
      const defaultSrc = parsedCsp["default-src"];

      for (const requiredDomain of sig.requiredCspDomains) {
        const scriptAllowed = isAllowedByCsp(scriptSrc, defaultSrc, requiredDomain);
        const connectAllowed = isAllowedByCsp(connectSrc, defaultSrc, requiredDomain);

        if (!scriptAllowed) {
          cspViolations.push({
            directive: "script-src",
            blockedUri: requiredDomain,
            violatedDirective: "script-src",
            sampleSource: sig.provider,
          });
        }
        if (!connectAllowed) {
          cspViolations.push({
            directive: "connect-src",
            blockedUri: requiredDomain,
            violatedDirective: "connect-src",
            sampleSource: sig.provider,
          });
        }

        if (!scriptAllowed || !connectAllowed) {
          unconfiguredChatbots.push({
            provider: sig.provider,
            status: "CSP_BLOCKED",
            detail: `Chatbot (${sig.provider}) blocked by Content Security Policy: '${requiredDomain}' not whitelisted in connect-src or script-src.`,
          });
        }
      }
    }
  }

  // 2. Scan for generic broken script patterns or undefined references in inline scripts
  const inlineScriptBlocks = html.match(/<script\b[^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const block of inlineScriptBlocks) {
    if (/process\.env\.[A-Z_]+(?!\s*\?\?|\s*\|\|)/.test(block)) {
      consoleErrors.push({
        message: "Uncaught ReferenceError: process is not defined in client-side bundle",
        source: "inline-script",
      });
    }
    if (/undefined\.addEventListener|null\.addEventListener/.test(block)) {
      consoleErrors.push({
        message: "Uncaught TypeError: Cannot read properties of null (reading 'addEventListener')",
        source: "inline-script",
      });
    }
  }

  const passed =
    consoleErrors.length === 0 && cspViolations.length === 0 && unconfiguredChatbots.length === 0;

  return {
    consoleErrors,
    cspViolations,
    unconfiguredChatbots,
    passed,
  };
}
