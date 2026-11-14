import type { AeoRagAuditResult, AnswerCapsuleItem, FunnelIntent } from "./types";

const QUESTION_START_RE = /^(what|how|why|when|where|who|which|can|does|is|are|should)\b/i;

const AMBIGUOUS_PRONOUN_START_RE =
  /^(it|they|this|that|these|those|its|their|he|she)\s+(?:is|are|was|were|has|have|had|can|could|will|would|does|do|did|means|helps|works|provides|includes|allows|uses|makes|shows|runs|offers|improves|enables|ensures|creates|reduces|signal\d+)\b/i;

const BARE_THIRD_PERSON_RE = /^(it|they|he|she)\b/i;

function stripTags(raw: string): string {
  return raw
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

function classifyFunnelIntent(url: string, html: string): {
  intent: FunnelIntent;
  hasMatrix: boolean;
} {
  let pathname = "/";
  try {
    pathname = new URL(url).pathname.toLowerCase();
  } catch {
    pathname = url.toLowerCase();
  }

  const hasMatrix =
    /<table\b[^>]*class=["'][^"']*(comparison|pricing|matrix|entity-infobox)/i.test(html) ||
    /\$[0-9,]+(?:\s*\/?\s*(?:mo|month|yr|year))?/i.test(html);

  if (/^\/(?:compare|vs|alternatives)(\/|$)/.test(pathname)) {
    return { intent: "decision_compare", hasMatrix };
  }
  if (/^\/pricing(\/|$)/.test(pathname)) {
    return { intent: "decision_pricing", hasMatrix };
  }
  if (/^\/(?:eligibility|qualify|requirements)(\/|$)/.test(pathname)) {
    return { intent: "decision_eligibility", hasMatrix };
  }
  if (/^\/locations\/[^/]+/.test(pathname)) {
    return { intent: "decision_localized", hasMatrix };
  }
  if (/^\/(?:services|solutions)(\/|$)/.test(pathname)) {
    return { intent: "consideration_service", hasMatrix };
  }
  if (/^\/glossary\b|^\/what-is-/i.test(pathname)) {
    return { intent: hasMatrix ? "consideration_service" : "commodity_tof_glossary", hasMatrix };
  }
  return { intent: hasMatrix ? "decision_pricing" : "consideration_service", hasMatrix };
}

export function auditAeoRagArchitecture(url: string, html: string): AeoRagAuditResult {
  const cleanHtml = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ");

  const capsules: AnswerCapsuleItem[] = [];
  const headingRe = /<(h[23])\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;

  while ((match = headingRe.exec(cleanHtml)) !== null) {
    const level = match[1].toLowerCase() as "h2" | "h3";
    const attrs = match[2];
    const headingText = stripTags(match[3]);
    const isQuestion = headingText.endsWith("?") || QUESTION_START_RE.test(headingText);
    if (!isQuestion) continue;

    const idMatch = /\bid\s*=\s*(?:"([^"]+)"|'([^']+)')/i.exec(attrs);
    const anchorId = idMatch ? (idMatch[1] ?? idMatch[2] ?? null) : null;

    const afterHeading = cleanHtml.slice(match.index + match[0].length, match.index + match[0].length + 4000);
    // Look ahead to immediate <p> or .answer-capsule block before the next heading
    const nextHeadingIdx = afterHeading.search(/<h[1-6]\b/i);
    const boundedSlice = nextHeadingIdx === -1 ? afterHeading : afterHeading.slice(0, nextHeadingIdx);
    const capsuleMatch =
      /<p\b[^>]*>([\s\S]*?)<\/p>|<div\b[^>]*class=["'][^"']*answer-capsule[^"']*["'][^>]*>([\s\S]*?)<\/div>/i.exec(
        boundedSlice,
      );

    const capsuleText = capsuleMatch ? stripTags(capsuleMatch[1] ?? capsuleMatch[2] ?? "") : "";
    const wordCount = countWords(capsuleText);
    const inTargetRange = wordCount >= 40 && wordCount <= 60;

    capsules.push({
      heading: headingText,
      headingLevel: level,
      anchorId,
      wordCount,
      inTargetRange,
      excerpt: capsuleText.slice(0, 140),
    });
  }

  const questionHeadingCount = capsules.length;
  const capsulesInRangeCount = capsules.filter((c) => c.inTargetRange).length;
  const capsuleComplianceRate =
    questionHeadingCount > 0
      ? Math.round((capsulesInRangeCount / questionHeadingCount) * 1000) / 10
      : 0;

  const anchorLinksInHtml = /<a\b[^>]*href=["']#[a-z0-9_-]+["']/i.test(cleanHtml);
  const headingIdsCount = capsules.filter((c) => Boolean(c.anchorId)).length;
  const hasSummaryAnchors =
    anchorLinksInHtml || (questionHeadingCount > 0 && headingIdsCount === questionHeadingCount);

  // RAG standalone semantic chunking (pronoun-free 2-3 line chunks across <p> and <li>)
  const blockRe = /<(?:p|li)\b[^>]*>([\s\S]*?)<\/(?:p|li)>/gi;
  const chunks: string[] = [];
  let blockMatch: RegExpExecArray | null;
  while ((blockMatch = blockRe.exec(cleanHtml)) !== null) {
    const text = stripTags(blockMatch[1]);
    if (countWords(text) >= 5) {
      chunks.push(text);
    }
  }

  const flaggedChunks: string[] = [];
  for (const chunk of chunks) {
    const sentences = chunk
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const hasAmbiguous = sentences.some(
      (s) => AMBIGUOUS_PRONOUN_START_RE.test(s) || BARE_THIRD_PERSON_RE.test(s),
    );
    if (hasAmbiguous) {
      flaggedChunks.push(chunk.slice(0, 120));
    }
  }

  const ragChunkCount = chunks.length;
  const ambiguousPronounChunks = flaggedChunks.length;
  const pronounFreeChunkRate =
    ragChunkCount > 0
      ? Math.round(((ragChunkCount - ambiguousPronounChunks) / ragChunkCount) * 1000) / 10
      : 100;

  const funnel = classifyFunnelIntent(url, cleanHtml);
  const isDownFunnelPage = funnel.intent !== "commodity_tof_glossary";

  let score = 0;
  const findings: string[] = [];

  if (questionHeadingCount === 0) {
    findings.push("No question H2/H3 headers detected for Answer Engine Extraction.");
  } else {
    score += Math.round((capsuleComplianceRate / 100) * 40);
    if (capsuleComplianceRate < 100) {
      findings.push(
        `${questionHeadingCount - capsulesInRangeCount} of ${questionHeadingCount} answer capsules sit outside the 40-60 word target window.`,
      );
    }
  }

  if (hasSummaryAnchors) {
    score += 15;
  } else {
    findings.push("Missing summary #anchor links and heading id attributes for direct chunk retrieval.");
  }

  score += Math.round((pronounFreeChunkRate / 100) * 30);
  if (ambiguousPronounChunks > 0) {
    findings.push(
      `${ambiguousPronounChunks} prose chunk(s) begin with unresolved pronouns (It/This/They/That); rewrite as standalone named-entity blocks.`,
    );
  }

  if (isDownFunnelPage) {
    score += 15;
  } else {
    findings.push(
      "Page classified as commodity top-of-funnel glossary without down-funnel comparison, pricing, or eligibility value.",
    );
  }

  score = Math.max(0, Math.min(100, score));
  const passed =
    questionHeadingCount >= 1 &&
    capsuleComplianceRate >= 80 &&
    hasSummaryAnchors &&
    pronounFreeChunkRate >= 85 &&
    isDownFunnelPage;

  return {
    score,
    passed,
    questionHeadingCount,
    capsulesInRangeCount,
    capsuleComplianceRate,
    hasSummaryAnchors,
    capsules,
    ragChunkCount,
    ambiguousPronounChunks,
    pronounFreeChunkRate,
    flaggedChunks,
    funnelIntent: funnel.intent,
    isDownFunnelPage,
    hasComparisonOrPricingMatrix: funnel.hasMatrix,
    findings,
  };
}
