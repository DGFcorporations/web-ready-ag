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

function attr(tag: string, name: string): string | null {
  const m = new RegExp(`[\\s"'/]${name}\\s*=\\s*(?:"([^"]{0,${MAX_TAG_LEN}})"|'([^']{0,${MAX_TAG_LEN}})'|([^\\s"'>]{1,${MAX_TAG_LEN}}))`, "i").exec(tag);
  return m ? (m[1] ?? m[2] ?? m[3] ?? "") : null;
}

/** G-INDEX / G-SNIPPET: true when robots/googlebot meta forbids indexing or snippets. */
export function hasBlockingRobotsMeta(html: string): boolean {
  const metaRe = new RegExp(`<meta\\b[^>]{0,${MAX_TAG_LEN}}>`, "gi");
  for (const m of html.matchAll(metaRe)) {
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
 * are legitimate and ignored.
 */
export function hasContentNoSnippet(html: string): boolean {
  const tagRe = new RegExp(`<(main|article|body|h1|table|div)\\b[^>]{0,${MAX_TAG_LEN}}>`, "gi");
  for (const m of html.matchAll(tagRe)) {
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

/** Returns the raw text of every `<script type="application/ld+json">` block. */
export function extractJsonLdBlocks(html: string): string[] {
  const blocks: string[] = [];
  const openRe = new RegExp(
    `<script\\b[^>]{0,500}type\\s*=\\s*["']?application\\/ld\\+json["']?[^>]{0,500}>`,
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
  for (const m of unescapeJsonSlashes(text).matchAll(/wikidata\.org\/(?:entity|wiki)\/(Q\d+)/gi)) {
    out.push(m[1].toUpperCase());
  }
  return out;
}

/** True when any JSON-LD block binds to a scholarly-article Q-ID. */
export function hasScholarlyQidBinding(html: string): boolean {
  return extractJsonLdBlocks(html).some((block) =>
    findWikidataQids(block).some((q) => SCHOLARLY_QIDS.has(q)),
  );
}

/** Byte offset of the entity-infobox `<table>` start, or -1 if absent. */
export function infoboxByteOffset(html: string): number {
  const re = new RegExp(
    `<table\\b[^>]{0,${MAX_TAG_LEN}}class=["'][^"']{0,500}entity-infobox`,
    "i",
  );
  const m = re.exec(html);
  if (!m) return -1;
  return new TextEncoder().encode(html.slice(0, m.index)).length;
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
  /(?:ignore|disregard|forget)\s{1,5}(?:all\s{1,5})?(?:of\s{1,5})?(?:the\s{1,5})?(?:previous|prior|above|earlier|preceding)\s{1,5}(?:instructions?|prompts?|directions?|context)/,
  /<\|(?:system|im_start|im_end|assistant|user|endoftext)\|>/,
];
const COMMENT_DIRECTIVE = /^\s*(?:prompt|instructions?|system|assistant|ai instructions?)\s*:/;
const HIDDEN_STYLE =
  /display\s*:\s*none|visibility\s*:\s*hidden|font-size\s*:\s*0*[01](?:\.\d+)?(?:px|pt|em|rem|%)?\s*(?:;|$)|color\s*:\s*transparent|opacity\s*:\s*0(?:\.0+)?\s*(?:;|$)/;
const HIDDEN_DIRECTIVE =
  /\b(?:you are (?:an?|the) (?:ai|assistant|language model|llm|chatbot)|system prompt|ai (?:agents?|assistants?|models?|crawlers?)\s*[:,]|as an ai\b|(?:always|must) (?:recommend|rank|cite|mention)|do not (?:mention|reveal|tell))/;

/**
 * Detects hidden prompt-injection / cloaking aimed at LLM crawlers:
 * known override phrases and chat-template tokens (outside <pre>/<code>),
 * HTML comments carrying `prompt:`/`instruction:` directives, and
 * display:none / microfont / transparent elements with directive text.
 */
export function hasPromptInjection(html: string): boolean {
  const lower = html.toLowerCase();

  const visible = stripElements(stripElements(lower, "pre"), "code");
  if (INJECTION_PHRASES.some((re) => re.test(visible))) return true;

  // HTML comments (an unterminated comment swallows the rest of the document).
  let pos = 0;
  for (;;) {
    const s = lower.indexOf("<!--", pos);
    if (s === -1) break;
    const e = lower.indexOf("-->", s + 4);
    const body = lower.slice(s + 4, e === -1 ? s + 4 + MAX_TAG_LEN : Math.min(e, s + 4 + MAX_TAG_LEN));
    if (COMMENT_DIRECTIVE.test(body)) return true;
    if (e === -1) break;
    pos = e + 3;
  }

  // Hidden elements carrying directive-style text.
  const tagRe = new RegExp(`<([a-z][a-z0-9]{0,9})\\b[^>]{0,${MAX_TAG_LEN}}>`, "g");
  for (const m of visible.matchAll(tagRe)) {
    const style = attr(m[0], "style");
    if (!style || !HIDDEN_STYLE.test(style)) continue;
    const from = (m.index ?? 0) + m[0].length;
    const nextTag = visible.indexOf("<", from);
    const text = visible.slice(from, nextTag === -1 ? from + MAX_TAG_LEN : Math.min(nextTag, from + MAX_TAG_LEN));
    if (HIDDEN_DIRECTIVE.test(text)) return true;
  }
  return false;
}
