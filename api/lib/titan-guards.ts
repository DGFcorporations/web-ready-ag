/**
 * Pure, dependency-free HTML guards used by the Titan audit engine.
 *
 * ReDoS / DoS policy: every regex here is linear — tag scans use bounded
 * `[^>]{0,N}` quantifiers (so an unterminated `<tag` costs at most N chars per
 * start offset), there are no nested quantifiers, and comment/element scans use
 * indexOf loops that always advance.
 */

const MAX_TAG_LEN = 2000;

/** Scholarly-article Wikidata items that must never anchor a commercial entity graph. */
export const SCHOLARLY_QIDS: ReadonlySet<string> = new Set(["Q13442814", "Q18918145", "Q7318358"]);

/** Un-escapes JSON-escaped slashes (`http:\/\/www.wikidata.org\/entity\/Q1`). */
export function unescapeJsonSlashes(html: string): string {
  return html.includes("\\/") ? html.replace(/\\\//g, "/") : html;
}

/** Strips HTML comments in linear O(N) time without regex backtracking. */
export function stripComments(html: string): string {
  let out = "";
  let pos = 0;
  while (pos < html.length) {
    const s = html.indexOf("<!--", pos);
    if (s === -1) {
      out += html.slice(pos);
      break;
    }
    out += html.slice(pos, s);
    const e = html.indexOf("-->", s + 4);
    if (e === -1) {
      // Unterminated comment swallows rest of document
      pos = html.length;
      break;
    }
    pos = e + 3;
  }
  return out;
}

function attr(tag: string, name: string): string | null {
  const m = new RegExp(`[\\s"'/]${name}\\s*=\\s*(?:"([^"]{0,${MAX_TAG_LEN}})"|'([^']{0,${MAX_TAG_LEN}})'|([^\\s"'>]{1,${MAX_TAG_LEN}}))`, "i").exec(tag);
  return m ? (m[1] ?? m[2] ?? m[3] ?? "") : null;
}

/** G-INDEX / G-SNIPPET: true when robots/googlebot meta forbids indexing or snippets. Strips comments first. */
export function hasBlockingRobotsMeta(html: string): boolean {
  const stripped = stripComments(html);
  const metaRe = new RegExp(`<meta\\b[^>]{0,${MAX_TAG_LEN}}>`, "gi");
  for (const m of stripped.matchAll(metaRe)) {
    const name = (attr(m[0], "name") || "").trim().toLowerCase();
    if (name !== "robots" && name !== "googlebot") continue;
    const content = (attr(m[0], "content") || "").toLowerCase();
    if (/(?:^|[\s,])(?:noindex|none|nosnippet)(?=$|[\s,;])/.test(content)) return true;
    if (/max-snippet\s*:\s*0(?!\d)/.test(content)) return true;
  }
  return false;
}

/**
 * `data-nosnippet` on the main content containers (main/article/body/h1, #root,
 * or the entity infobox) hides the answer from snippets. Small inline fragments
 * are legitimate and ignored. Strips comments first.
 */
export function hasContentNoSnippet(html: string): boolean {
  const stripped = stripComments(html);
  const tagRe = new RegExp(`<(main|article|body|h1|table|div)\\b[^>]{0,${MAX_TAG_LEN}}>`, "gi");
  for (const m of stripped.matchAll(tagRe)) {
    const tag = m[0];
    if (!/\sdata-nosnippet(?=[\s=>/])/i.test(tag)) continue;
    const name = m[1].toLowerCase();
    if (name === "table") {
      if (/entity-infobox/i.test(attr(tag, "class") || "")) return true;
    } else if (name === "div") {
      if ((attr(tag, "id") || "").toLowerCase() === "root") return true;
    } else {
      return true;
    }
  }
  return false;
}

/** Returns the raw text of every `<script type="application/ld+json">` block. Handles media parameters like ;charset=utf-8. */
export function extractJsonLdBlocks(html: string): string[] {
  const blocks: string[] = [];
  const openRe = new RegExp(
    `<script\\b[^>]{0,${MAX_TAG_LEN}}type\\s*=\\s*["']?application\\/ld\\+json(?:\\s*;[^"'>]*)?["']?[^>]{0,${MAX_TAG_LEN}}>`,
    "gi",
  );
  const lower = html.toLowerCase();
  for (const m of html.matchAll(openRe)) {
    const start = (m.index ?? 0) + m[0].length;
    const end = lower.indexOf("</script", start);
    blocks.push(html.slice(start, end === -1 ? undefined : end));
  }
  return blocks;
}

/** Wikidata Q-IDs referenced anywhere in `text` (handles JSON-escaped slashes). */
export function findWikidataQids(text: string): string[] {
  const out: string[] = [];
  for (const m of unescapeJsonSlashes(text).matchAll(/wikidata\.org\/(?:entity|wiki|Special:EntityData|wiki\/Special:EntityData)\/(Q\d+)/gi)) {
    out.push(m[1].toUpperCase());
  }
  return out;
}

const SCHOLARLY_BINDING_RE =
  /"(?:sameAs|mainEntity|about|itemOffered)"\s*:\s*(?:\[[^\]]*|)\s*"(?:https?:\\\/\\\/[^"]*\/|https?:\/\/[^"]*\/)?(Q13442814|Q18918145|Q7318358)\b/i;

/** True when any JSON-LD block binds to a scholarly-article Q-ID. */
export function hasScholarlyQidBinding(html: string): boolean {
  return extractJsonLdBlocks(html).some((block) => {
    if (findWikidataQids(block).some((q) => SCHOLARLY_QIDS.has(q))) return true;
    return SCHOLARLY_BINDING_RE.test(block);
  });
}

/** Byte offset of the entity-infobox `<table>` start, or -1 if absent. Ignores commented-out tables. */
export function infoboxByteOffset(html: string): number {
  const stripped = stripComments(html);
  const re = new RegExp(
    `<table\\b[^>]{0,${MAX_TAG_LEN}}class\\s*=\\s*(?:["'][^"']{0,500}\\bentity-infobox\\b[^"']*["']|entity-infobox\\b)`,
    "i",
  );
  const m = re.exec(stripped);
  if (!m) return -1;
  return new TextEncoder().encode(stripped.slice(0, m.index)).length;
}

export const INFOBOX_BYTE_BUDGET = 15 * 1024;

function stripElements(lowerHtml: string, tag: string): string {
  const open = `<${tag}`;
  const close = `</${tag}>`;
  let out = "";
  let pos = 0;
  for (;;) {
    const s = lowerHtml.indexOf(open, pos);
    if (s === -1) break;
    const next = lowerHtml[s + open.length];
    if (next !== ">" && next !== " " && next !== "\t" && next !== "\n" && next !== "\r") {
      out += lowerHtml.slice(pos, s + open.length);
      pos = s + open.length;
      continue;
    }
    const e = lowerHtml.indexOf(close, s);
    out += lowerHtml.slice(pos, s);
    if (e === -1) {
      pos = lowerHtml.length;
      break;
    }
    pos = e + close.length;
  }
  return out + lowerHtml.slice(pos);
}

const INJECTION_PHRASES = [
  /(?:ignore|disregard|forget|override|bypass|discard|reset)\s+(?:all\s+)?(?:of\s+)?(?:the\s+)?(?:previous|prior|above|earlier|preceding)\s+(?:instructions?|prompts?|directions?|context)/,
  /<\|(?:system|im_start|im_end|assistant|user|endoftext)\|>/,
  /\[INST\][\s\S]*?\[\/INST\]/,
];
const COMMENT_DIRECTIVE = /(?:^|\n|\b)(?:prompt|instructions?|system|assistant|ai instructions?)\s*:/;
const HIDDEN_STYLE =
  /display\s*:\s*none|visibility\s*:\s*hidden|font-size\s*:\s*0*[01](?:\.\d+)?(?:px|pt|em|rem|%)?\s*(?:;|$)|color\s*:\s*transparent|opacity\s*:\s*0(?:\.0+)?\s*(?:;|$)|text-indent\s*:\s*-[0-9]{3,}|position\s*:\s*absolute\s*;\s*(?:left|top)\s*:\s*-[0-9]{3,}|clip\s*:\s*rect\s*\(\s*0|clip-path\s*:\s*inset\s*\(\s*(?:50%|100%)/;
const HIDDEN_CLASS =
  /\b(?:hidden|sr-only|visually-hidden|d-none|invisible)\b/i;
const HIDDEN_DIRECTIVE =
  /\b(?:you are (?:an?|the) (?:ai|assistant|language model|llm|chatbot)|system prompt|ai (?:agents?|assistants?|models?|crawlers?)\s*[:,]|as an ai\b|(?:always|must) (?:recommend|rank|cite|mention)|do not (?:mention|reveal|tell))/;

function findMatchingCloseTag(html: string, tagName: string, fromIndex: number): number {
  const openPattern = `<${tagName}`;
  const closePattern = `</${tagName}>`;
  let depth = 1;
  let pos = fromIndex;
  const maxSearch = Math.min(html.length, fromIndex + 65536);
  while (pos < maxSearch && depth > 0) {
    const nextOpen = html.indexOf(openPattern, pos);
    const nextClose = html.indexOf(closePattern, pos);
    if (nextClose === -1) {
      return maxSearch;
    }
    if (nextOpen !== -1 && nextOpen < nextClose) {
      const after = html[nextOpen + openPattern.length];
      if (after === ">" || after === " " || after === "\t" || after === "\n" || after === "\r" || after === "/") {
        const tagEnd = html.indexOf(">", nextOpen);
        if (tagEnd !== -1 && tagEnd < nextClose && html.slice(nextOpen, tagEnd).trim().endsWith("/")) {
          // self closing
        } else {
          depth++;
        }
      }
      pos = nextOpen + openPattern.length;
    } else {
      depth--;
      if (depth === 0) {
        return nextClose;
      }
      pos = nextClose + closePattern.length;
    }
  }
  return pos;
}

/**
 * Detects hidden prompt-injection / cloaking aimed at LLM crawlers:
 * known override phrases and chat-template tokens (outside <pre>/<code>),
 * HTML comments carrying `prompt:`/`instruction:` directives or injection phrases,
 * and hidden elements (display:none, microfont, transparent, off-screen, sr-only,
 * hidden attribute) carrying directive text, including nested containers.
 */
export function hasPromptInjection(html: string): boolean {
  const lower = html.toLowerCase();

  // 1. Comments: check full comment bodies without arbitrary length truncation
  let pos = 0;
  while (pos < lower.length) {
    const s = lower.indexOf("<!--", pos);
    if (s === -1) break;
    const e = lower.indexOf("-->", s + 4);
    const body = e === -1 ? lower.slice(s + 4) : lower.slice(s + 4, e);
    const normalizedBody = body.replace(/\s+/g, " ");
    if (COMMENT_DIRECTIVE.test(body) || COMMENT_DIRECTIVE.test(normalizedBody)) return true;
    if (INJECTION_PHRASES.some((re) => re.test(body) || re.test(normalizedBody))) return true;
    if (e === -1) break;
    pos = e + 3;
  }

  // 2. Visible text (excluding <pre> and <code> blocks, with comments stripped)
  const withoutComments = stripComments(lower);
  const visible = stripElements(stripElements(withoutComments, "pre"), "code");
  const visibleText = visible.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
  if (INJECTION_PHRASES.some((re) => re.test(visible) || re.test(visibleText))) return true;

  // 3. Hidden elements: handles nested containers, CSS framework classes, and tag attributes
  const tagRe = new RegExp(`<([a-z][a-z0-9]{0,9})\\b[^>]{0,${MAX_TAG_LEN}}>`, "gi");
  for (const m of visible.matchAll(tagRe)) {
    const tag = m[0];
    const tagName = m[1].toLowerCase();
    const style = attr(tag, "style");
    const classAttr = attr(tag, "class");
    const isHidden =
      (style && HIDDEN_STYLE.test(style)) ||
      (classAttr && HIDDEN_CLASS.test(classAttr)) ||
      /\bhidden\b/i.test(tag);
    if (!isHidden) continue;

    // Check tag itself (e.g. <input type="hidden" value="You are an AI assistant...">)
    if (HIDDEN_DIRECTIVE.test(tag)) return true;

    const from = (m.index ?? 0) + tag.length;
    const end = findMatchingCloseTag(visible, tagName, from);
    const text = visible.slice(from, end).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
    if (HIDDEN_DIRECTIVE.test(text) || INJECTION_PHRASES.some((re) => re.test(text))) return true;
  }
  return false;
}
