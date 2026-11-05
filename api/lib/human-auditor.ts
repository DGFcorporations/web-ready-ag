import type {
  DefectSummary,
  HumanGradeAuditResult,
} from "./human-audit-types";
import { auditMobileVitals, type MobileVitalsOptions } from "./mobile-vitals";
import { auditContrast } from "./contrast-checker";
import { buildLinkGraph, parseSitemapUrls, type CrawledPageInput, type LinkGraphOptions } from "./link-graph";
import { auditClientRuntime } from "./client-runtime";

export interface HumanGradeAuditInput {
  url: string;
  html: string;
  cspHeader?: string;
  sitemapXml?: string;
  additionalPages?: CrawledPageInput[];
  mobileOptions?: MobileVitalsOptions;
  linkGraphOptions?: LinkGraphOptions;
}

/**
 * Executes a comprehensive human-grade browser audit over the target page,
 * capturing:
 * 1. Mobile Device Emulation (390px) & Lab TBT / main-thread blocking time.
 * 2. Computed WCAG AA contrast across rendered templates & theme bleed.
 * 3. Internal link graph click depth & navigational orphan pages.
 * 4. Client-side console error, CSP violation, and dead chatbot widget risks.
 */
export function auditHumanGradePage(input: HumanGradeAuditInput): HumanGradeAuditResult {
  const { url, html, cspHeader, sitemapXml, additionalPages, mobileOptions, linkGraphOptions } =
    input;

  // 1. Mobile Vitals & TBT Lab Emulation
  const mobileVitals = auditMobileVitals(html, mobileOptions);

  // 2. Computed WCAG AA Contrast & Theme Bleed
  const contrast = auditContrast(html);

  // 3. Link Graph & Orphan Page Detection
  const allPages: CrawledPageInput[] = [{ url, html }, ...(additionalPages || [])];
  const sitemapUrls = sitemapXml ? parseSitemapUrls(sitemapXml, url) : linkGraphOptions?.sitemapUrls;

  const linkGraph = buildLinkGraph(allPages, {
    homepageUrl: linkGraphOptions?.homepageUrl || url,
    sitemapUrls,
    maxDepthLimit: linkGraphOptions?.maxDepthLimit,
  });

  // 4. Client Runtime (Console Errors, CSP Violations, Chatbots)
  const clientRuntime = auditClientRuntime(html, cspHeader);

  // Compile Defect Summaries
  const defectsSummary: DefectSummary[] = [];

  // Mobile TBT defects
  if (!mobileVitals.passed) {
    defectsSummary.push({
      category: "MOBILE_TBT",
      severity: mobileVitals.severity === "CRITICAL" ? "CRITICAL" : "HIGH",
      title: `Excessive Mobile Total Blocking Time (${mobileVitals.estimatedTbtMs}ms)`,
      description: mobileVitals.unthrottledAnimationLoops.length > 0
        ? `Heavy JavaScript canvas animation loops running continuously on 390px mobile viewport without viewport media queries.`
        : `Main-thread blocking tasks (${mobileVitals.blockingTasksCount}) exceeding acceptable lab limits.`,
      remediation:
        "Pause requestAnimationFrame loops on mobile viewports (<768px), throttle canvas render rate, or offload heavy computations to Web Workers.",
    });
  }

  // Contrast / Theme Bleed defects
  if (!contrast.passed) {
    const criticalCount = contrast.violations.filter((v) => v.severity === "CRITICAL").length;
    defectsSummary.push({
      category: "CONTRAST_THEME_BLEED",
      severity: criticalCount > 0 ? "CRITICAL" : "HIGH",
      title: contrast.themeBleedDetected
        ? "Global CSS Theme Bleed & Unreadable Subpage Elements"
        : `WCAG AA Contrast Violations (${contrast.violationsCount} elements)`,
      description: contrast.themeBleedDetected
        ? "Dark theme classes (e.g. pale text/badges) leaking onto white container backgrounds, rendering text unreadable."
        : `Found ${contrast.violationsCount} elements failing minimum WCAG 2.1 AA contrast ratio requirements.`,
      remediation:
        "Enforce strict theme encapsulation, replace pale Tailwind classes with high-contrast variants (minimum 4.5:1 for normal text, 3.0:1 for badges/large text).",
    });
  }

  // Orphan page defects
  if (linkGraph.orphanPages.length > 0) {
    defectsSummary.push({
      category: "ORPHAN_PAGES",
      severity: "CRITICAL",
      title: `Navigational Orphan Pages (${linkGraph.orphanPages.length} pages)`,
      description: `Pages exist in sitemap or route catalog but have zero inbound links in the internal link graph: ${linkGraph.orphanPages.slice(0, 5).join(", ")}.`,
      remediation:
        "Add contextual internal links from parent hub pages, navigational menus, or footer site mesh.",
    });
  }

  // Client Runtime / CSP defects
  if (!clientRuntime.passed) {
    if (clientRuntime.unconfiguredChatbots.length > 0) {
      defectsSummary.push({
        category: "CONSOLE_CSP_RUNTIME",
        severity: "HIGH",
        title: "Dead / Unconfigured Chatbot Widget",
        description: clientRuntime.unconfiguredChatbots
          .map((c) => `${c.provider}: ${c.detail}`)
          .join("; "),
        remediation:
          "Configure valid API/project tokens or strip inactive chatbot embed scripts; update Content-Security-Policy to allow required connect-src/script-src domains.",
      });
    }

    if (clientRuntime.cspViolations.length > 0) {
      defectsSummary.push({
        category: "CONSOLE_CSP_RUNTIME",
        severity: "HIGH",
        title: `Client-Side CSP Violations (${clientRuntime.cspViolations.length} blocked)`,
        description: `Content Security Policy directives blocked resources: ${clientRuntime.cspViolations.map((c) => `${c.directive} -> ${c.blockedUri}`).join(", ")}.`,
        remediation:
          "Update CSP header directives to whitelist legitimate third-party endpoints or bundle scripts locally.",
      });
    }

    if (clientRuntime.consoleErrors.length > 0) {
      defectsSummary.push({
        category: "CONSOLE_CSP_RUNTIME",
        severity: "HIGH",
        title: `Client-Side Console Exceptions (${clientRuntime.consoleErrors.length} errors)`,
        description: clientRuntime.consoleErrors.map((e) => e.message).slice(0, 3).join("; "),
        remediation: "Resolve unhandled JavaScript runtime exceptions and missing client variables.",
      });
    }
  }

  // Scoring
  let score = 100;
  if (!mobileVitals.passed) {
    score -= mobileVitals.severity === "CRITICAL" ? 30 : 15;
  }
  if (!contrast.passed) {
    score -= contrast.themeBleedDetected ? 25 : 15;
  }
  if (linkGraph.orphanPages.length > 0) {
    score -= Math.min(30, linkGraph.orphanPages.length * 10);
  }
  if (!clientRuntime.passed) {
    score -= 20;
  }

  const overallScore = Math.max(0, score);
  const overallPassed = overallScore >= 80 && defectsSummary.every((d) => d.severity !== "CRITICAL");

  return {
    url,
    timestamp: new Date().toISOString(),
    overallPassed,
    overallScore,
    mobileVitals,
    contrast,
    linkGraph,
    clientRuntime,
    defectsSummary,
  };
}


