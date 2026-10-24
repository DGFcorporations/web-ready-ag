/**
 * llms.txt helpers: Markdown link formatting + a linter mirroring the Lighthouse 13.5
 * `llms-txt` audit (H1, blockquote, at least one H2, at least one [text](url) link).
 * All regexes are linear (no nested quantifiers).
 */

/** Escapes characters that would break `[label](url)` syntax. */
function escapeLabel(label: string): string {
  return label.replace(/\\/g, "\\\\").replace(/\[/g, "\\[").replace(/\]/g, "\\]").replace(/\s+/g, " ").trim();
}

export function mdLink(label: string, url: string): string {
  const safeUrl = url.replace(/\s/g, "%20").replace(/\(/g, "%28").replace(/\)/g, "%29");
  return `[${escapeLabel(label) || safeUrl}](${safeUrl})`;
}

export interface LlmsTxtFinding {
  rule: "h1" | "blockquote" | "h2" | "link";
  message: string;
}

export function lintLlmsTxt(md: string): LlmsTxtFinding[] {
  const findings: LlmsTxtFinding[] = [];
  const lines = md.split(/\r?\n/);
  if (!lines.some((l) => /^# \S/.test(l))) findings.push({ rule: "h1", message: "Missing `# H1` title" });
  if (!lines.some((l) => /^>\s*\S/.test(l))) findings.push({ rule: "blockquote", message: "Missing `> ` summary blockquote" });
  if (!lines.some((l) => /^## \S/.test(l))) findings.push({ rule: "h2", message: "Missing `## H2` section" });
  if (!/\[[^\]\n]+\]\(https?:\/\/[^)\s]+\)/.test(md)) findings.push({ rule: "link", message: "Missing `[text](url)` Markdown link" });
  return findings;
}

/** Standard-link "Key Pages" section for /llms.txt. */
export function buildKeyPagesSection(baseUrl: string): string {
  return [
    `## Key Pages`,
    `- ${mdLink("Services", `${baseUrl}/services`)}: Full catalog of AI automation and 7-layer search dominance services`,
    `- ${mdLink("Pricing", `${baseUrl}/pricing`)}: Transparent first-party pricing`,
    `- ${mdLink("Locations", `${baseUrl}/locations`)}: Florida service areas`,
    `- ${mdLink("Blog", `${baseUrl}/blog`)}: AI automation and AEO/GEO insights`,
    `- ${mdLink("Full knowledge base (llms-full.txt)", `${baseUrl}/llms-full.txt`)}: Unabridged corpus`,
    ``,
  ].join("\n");
}
