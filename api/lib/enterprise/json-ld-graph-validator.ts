import type { JsonLdGraphValidationResult } from "./types";

const SCHOLARLY_QIDS = new Set(["Q13442814", "Q18918145", "Q7318358"]);

const STRUCTURAL_LINK_KEYS = new Set([
  "isPartOf",
  "publisher",
  "provider",
  "worksFor",
  "author",
  "mainEntity",
  "mainEntityOfPage",
  "breadcrumb",
  "hasPart",
  "about",
  "mentions",
]);

const INSTITUTIONAL_HOST_RE =
  /(linkedin\.com|orcid\.org|pubmed\.ncbi\.nlm\.nih\.gov|scholar\.google\.|npiregistry\.cms\.hhs\.gov|wikidata\.org|wikipedia\.org|crunchbase\.com|bbb\.org|\.gov\b|\.edu\b)/i;

function normalizeWikidataUri(raw: string): string | null {
  const m = /https?:\/\/(?:www\.)?wikidata\.org\/(?:entity|wiki)\/(Q\d+)\b/i.exec(
    raw.replace(/\\\//g, "/"),
  );
  if (!m) return null;
  return `https://www.wikidata.org/entity/${m[1].toUpperCase()}`;
}

function collectNodesAndRefs(
  val: unknown,
  parentKey: string | null,
  isGraphChild: boolean,
  definedIds: Set<string>,
  nodeTypes: Set<string>,
  personNodes: Array<Record<string, unknown>>,
  refCandidates: Array<{ key: string | null; ref: string }>,
  wikidataUris: Set<string>,
  scholarlyQids: Set<string>,
  duplicateContextCounter: { count: number },
  graph: Map<string, { types: Set<string>; links: Set<string> }>,
): void {
  if (val === null || val === undefined) return;
  if (typeof val === "string") {
    const wd = normalizeWikidataUri(val);
    if (wd) {
      wikidataUris.add(wd);
      const qMatch = /(Q\d+)$/i.exec(wd);
      if (qMatch && SCHOLARLY_QIDS.has(qMatch[1].toUpperCase())) {
        scholarlyQids.add(qMatch[1].toUpperCase());
      }
    }
    const bareQ = /\b(Q13442814|Q18918145|Q7318358)\b/.exec(val);
    if (bareQ && (parentKey === "sameAs" || parentKey === "about" || parentKey === "@id")) {
      scholarlyQids.add(bareQ[1]);
    }
    return;
  }
  if (Array.isArray(val)) {
    for (const item of val) {
      collectNodesAndRefs(
        item,
        parentKey,
        isGraphChild,
        definedIds,
        nodeTypes,
        personNodes,
        refCandidates,
        wikidataUris,
        scholarlyQids,
        duplicateContextCounter,
        graph,
      );
    }
    return;
  }
  if (typeof val !== "object") return;

  const obj = val as Record<string, unknown>;
  if (isGraphChild && "@context" in obj) {
    duplicateContextCounter.count += 1;
  }

  const keys = Object.keys(obj);
  const rawType = obj["@type"];
  const rawId = typeof obj["@id"] === "string" ? obj["@id"].trim() : null;

  // Distinguish full node definition vs pure {"@id": "..."} reference pointer
  const isPureIdRef = Boolean(rawId) && keys.every((k) => k === "@id") && parentKey !== null;

  if (isPureIdRef && rawId) {
    refCandidates.push({ key: parentKey, ref: rawId });
    const wd = normalizeWikidataUri(rawId);
    if (wd) {
      wikidataUris.add(wd);
      const qMatch = /(Q\d+)$/i.exec(wd);
      if (qMatch && SCHOLARLY_QIDS.has(qMatch[1].toUpperCase())) {
        scholarlyQids.add(qMatch[1].toUpperCase());
      }
    }
    return;
  }

  if (rawId && (rawType !== undefined || keys.length > 1)) {
    definedIds.add(rawId);
    const node = graph.get(rawId) ?? { types: new Set<string>(), links: new Set<string>() };
    for (const type of [rawType].flat()) if (typeof type === "string") node.types.add(type);
    for (const key of STRUCTURAL_LINK_KEYS) {
      for (const target of [obj[key]].flat()) {
        const id = typeof target === "string" ? target :
          target && typeof target === "object" && "@id" in target ? target["@id"] : undefined;
        if (typeof id === "string") node.links.add(id);
      }
    }
    graph.set(rawId, node);
  }

  if (typeof rawType === "string") {
    nodeTypes.add(rawType);
    if (rawType === "Person") personNodes.push(obj);
  } else if (Array.isArray(rawType)) {
    for (const t of rawType) {
      if (typeof t === "string") {
        nodeTypes.add(t);
        if (t === "Person") personNodes.push(obj);
      }
    }
  }

  if (Array.isArray(obj["@graph"])) {
    for (const child of obj["@graph"]) {
      collectNodesAndRefs(
        child,
        "@graph",
        true,
        definedIds,
        nodeTypes,
        personNodes,
        refCandidates,
        wikidataUris,
        scholarlyQids,
        duplicateContextCounter,
        graph,
      );
    }
  }

  for (const [k, v] of Object.entries(obj)) {
    if (k === "@graph" || k === "@context") continue;
    collectNodesAndRefs(
      v,
      k,
      false,
      definedIds,
      nodeTypes,
      personNodes,
      refCandidates,
      wikidataUris,
      scholarlyQids,
      duplicateContextCounter,
      graph,
    );
  }
}

export function validateJsonLdKnowledgeGraph(html: string): JsonLdGraphValidationResult {
  const withoutComments = html.replace(/<!--[\s\S]*?-->/g, " ");
  const scriptRe =
    /<script\b[^>]*type=["']application\/ld\+json[^"']*["'][^>]*>([\s\S]*?)<\/script>/gi;

  const rawBlocks: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = scriptRe.exec(withoutComments)) !== null) {
    rawBlocks.push(m[1].trim());
  }

  const parseErrors: string[] = [];
  const schemaErrors: string[] = [];
  const definedIds = new Set<string>();
  const nodeTypes = new Set<string>();
  const personNodes: Array<Record<string, unknown>> = [];
  const refCandidates: Array<{ key: string | null; ref: string }> = [];
  const wikidataUris = new Set<string>();
  const scholarlyQids = new Set<string>();
  const duplicateContextCounter = { count: 0 };
  const graph = new Map<string, { types: Set<string>; links: Set<string> }>();

  let schemaOrgContextValid = false;
  let totalNodes = 0;

  for (let idx = 0; idx < rawBlocks.length; idx += 1) {
    const raw = rawBlocks[idx];
    if (!raw) {
      parseErrors.push(`JSON-LD block #${idx + 1} is empty.`);
      continue;
    }
    try {
      const parsed = JSON.parse(raw) as unknown;
      const roots = Array.isArray(parsed) ? parsed : [parsed];
      for (const root of roots) {
        if (root && typeof root === "object") {
          const rObj = root as Record<string, unknown>;
          const ctx = rObj["@context"];
          if (
            (typeof ctx === "string" && /^https?:\/\/schema\.org\/?$/i.test(ctx)) ||
            (Array.isArray(ctx) &&
              ctx.some((c) => typeof c === "string" && /^https?:\/\/schema\.org\/?$/i.test(c)))
          ) {
            schemaOrgContextValid = true;
          }
          if (Array.isArray(rObj["@graph"])) {
            totalNodes += rObj["@graph"].length;
          } else if (rObj["@type"]) {
            totalNodes += 1;
          }
          collectNodesAndRefs(
            rObj,
            null,
            false,
            definedIds,
            nodeTypes,
            personNodes,
            refCandidates,
            wikidataUris,
            scholarlyQids,
            duplicateContextCounter,
            graph,
          );
        }
      }
    } catch (err) {
      parseErrors.push(
        `JSON-LD block #${idx + 1} parse error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // Detect primary origin from defined @ids for same-origin dangling @id detection
  const definedOrigins = new Set<string>();
  for (const id of definedIds) {
    try {
      definedOrigins.add(new URL(id).origin.toLowerCase());
    } catch {
      // ignore non-URL @ids
    }
  }

  const danglingIdRefs: string[] = [];
  for (const cand of refCandidates) {
    if (definedIds.has(cand.ref)) continue;
    const isExternalAuthority =
      /wikidata\.org|wikipedia\.org|schema\.org|orcid\.org|linkedin\.com/i.test(cand.ref);
    if (isExternalAuthority) continue;

    let sameOrigin = false;
    try {
      const refOrigin = new URL(cand.ref).origin.toLowerCase();
      sameOrigin = definedOrigins.has(refOrigin);
    } catch {
      sameOrigin = cand.ref.startsWith("#");
    }

    if (cand.ref.startsWith("#") || sameOrigin || (cand.key && STRUCTURAL_LINK_KEYS.has(cand.key))) {
      if (!danglingIdRefs.includes(cand.ref)) {
        danglingIdRefs.push(cand.ref);
      }
    }
  }

  // A page may link directly to its publisher or through a WebSite.
  for (const [id, node] of graph) {
    for (const target of node.links) graph.get(target)?.links.add(id);
  }
  const seen = new Set<string>();
  let hasConnectedCoreGraph = false;
  for (const start of graph.keys()) {
    if (seen.has(start)) continue;
    const pending = [start];
    const types = new Set<string>();
    while (pending.length) {
      const id = pending.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      const node = graph.get(id);
      if (!node) continue;
      for (const type of node.types) types.add(type);
      for (const target of node.links) if (!seen.has(target)) pending.push(target);
    }
    if (["MedicalClinic", "Organization", "LocalBusiness", "MedicalOrganization"].some(t => types.has(t)) &&
        ["WebPage", "AboutPage", "CollectionPage"].some(t => types.has(t)) &&
        ["Service", "Person", "BlogPosting", "FAQPage", "OfferCatalog"].some(t => types.has(t))) {
      hasConnectedCoreGraph = true;
      break;
    }
  }

  let hasName = false;
  let hasWorksFor = false;
  let hasCredential = false;
  const institutionalSameAs: string[] = [];

  for (const person of personNodes) {
    if (typeof person.name === "string" && person.name.trim().length > 0) hasName = true;
    if (person.worksFor !== undefined) hasWorksFor = true;
    if (person.hasCredential !== undefined) hasCredential = true;
    const sameAsList = Array.isArray(person.sameAs)
      ? person.sameAs
      : typeof person.sameAs === "string"
        ? [person.sameAs]
        : [];
    for (const s of sameAsList) {
      if (typeof s === "string" && INSTITUTIONAL_HOST_RE.test(s) && !institutionalSameAs.includes(s)) {
        institutionalSameAs.push(s);
      }
    }
  }

  const hasPersonEeat = personNodes.some(p => typeof p.name === "string" && p.name.trim() &&
    p.worksFor && p.hasCredential && [p.sameAs].flat().some(s => institutionalSameAs.includes(s as string)));

  if (rawBlocks.length === 0) schemaErrors.push("No JSON-LD script blocks found.");
  for (const pe of parseErrors) schemaErrors.push(pe);
  if (rawBlocks.length > 0 && !schemaOrgContextValid) {
    schemaErrors.push("Missing https://schema.org @context.");
  }
  if (duplicateContextCounter.count > 0) {
    schemaErrors.push(
      `Found ${duplicateContextCounter.count} redundant @context declaration(s) inside @graph children.`,
    );
  }
  if (danglingIdRefs.length > 0) {
    schemaErrors.push(`Dangling unresolved @id references: ${danglingIdRefs.join(", ")}`);
  }
  if (scholarlyQids.size > 0) {
    schemaErrors.push(
      `Invalid scholarly publication Q-ID(s) in schema: ${Array.from(scholarlyQids).join(", ")}`,
    );
  }
  if (!hasConnectedCoreGraph) {
    schemaErrors.push(
      "Graph missing connected Organization/LocalBusiness -> WebSite -> WebPage -> Service/FAQPage/Person @id hierarchy.",
    );
  }
  if (!hasPersonEeat) {
    schemaErrors.push(
      "Missing machine-verifiable Person E-E-A-T node with worksFor, hasCredential, and institutional sameAs.",
    );
  }

  let score = 100;
  if (rawBlocks.length === 0) score = 0;
  else {
    score -= parseErrors.length * 30;
    if (!schemaOrgContextValid) score -= 15;
    score -= duplicateContextCounter.count * 10;
    score -= Math.min(30, danglingIdRefs.length * 15);
    score -= scholarlyQids.size * 20;
    if (!hasConnectedCoreGraph) score -= 20;
    if (!hasPersonEeat) score -= 15;
  }

  score = Math.max(0, Math.min(100, score));
  const passed =
    rawBlocks.length > 0 &&
    parseErrors.length === 0 &&
    schemaOrgContextValid &&
    duplicateContextCounter.count === 0 &&
    danglingIdRefs.length === 0 &&
    scholarlyQids.size === 0 &&
    hasConnectedCoreGraph &&
    hasPersonEeat;

  return {
    score,
    passed,
    blockCount: rawBlocks.length,
    parseErrors,
    schemaOrgContextValid,
    duplicateChildContexts: duplicateContextCounter.count,
    nodeCount: totalNodes,
    nodeTypes: Array.from(nodeTypes),
    definedIds: Array.from(definedIds),
    danglingIdRefs,
    hasConnectedCoreGraph,
    hasPersonEeat,
    personCredentialDetails: {
      hasName,
      hasWorksFor,
      hasCredential,
      institutionalSameAs,
    },
    normalizedWikidataUris: Array.from(wikidataUris),
    invalidScholarlyQids: Array.from(scholarlyQids),
    schemaErrors,
  };
}
