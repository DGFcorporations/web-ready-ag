# WebReady-AG: Product Identity & Architecture

> **The Engine That Makes Any Site Agent-Grade**  
> Unifying AIO (AI-Optimization), AEO (Answer-Engine Optimization), and GEO (Generative-Engine Optimization).

---

## 1. Executive Vision

WebReady-AG is the operational standard and software engine that transforms static, brochure-ware, or client-rendered web applications into **Agent-Grade (AG)** digital assets. 

In the post-search web, traffic is governed not by keyword-matching search engines, but by autonomous AI agents, multi-modal reasoning models, and synthetic answer engines (ChatGPT Search, Perplexity, Claude, Google AI Overviews). A website that cannot be crawled, understood, cited, or operated by an autonomous LLM agent is invisible.

WebReady-AG bridges this gap through three core disciplines:
1. **AIO (AI-Optimization):** Server-visible, structured, machine-executable context delivered at sub-millisecond speeds directly to web crawlers and agents.
2. **AEO (Answer-Engine Optimization):** Direct, factual, un-hedged answers formatted for instant ingestion into generative synthesis layers and LLM citation indices.
3. **GEO (Generative-Engine Optimization):** High-density structured schemas, canonical entity graphs, and verifiable authority markers that force generative engines to cite the domain as the primary source of truth.

---

## 2. Core Architectural Mechanisms

```
+--------------------------------------------------------------------------------+
|                             INCOMING REQUEST                                   |
+--------------------------------------------------------------------------------+
                                       |
                   User-Agent & Accept Header Detection
                                       |
         +-----------------------------+-----------------------------+
         |                                                           |
   [Human Browser]                                           [AI Agent / Bot]
         |                                                           |
   Path-Aware Server Meta Injection                         Path-Aware AEO Middleware
         |                                                           |
  - OpenGraph / Twitter Cards                              - /llms.txt (Digest Index)
  - Canonical URL Verification                             - /llms-full.txt (Full Model Corpus)
  - Hydrated JSON-LD Entity Graph                          - /ai.txt (Agent Directive Protocol)
  - CSP-Clean Header Enforcement                           - Markdown / JSON Route Payloads
         |                                                           |
   Vite React 19 SPA                                        Zero-JS Fast Path (<10ms)
```

### 2.1 Server-Side Meta & JSON-LD Injection
Client-rendered SPAs (React, Vue) output an empty `<div id="root"></div>`. AI crawlers without expensive headless browser execution see blank HTML.
- **Mechanism:** WebReady-AG intercepts HTML requests on the server (`api/lib/vite.ts` and `api/lib/html-inject.ts`).
- **Data Hydration:** Fetches route data from the database and injects `<title>`, `<meta name="description">`, `<link rel="canonical">`, OpenGraph, Twitter tags, and high-fidelity JSON-LD schemas (`Organization`, `LocalBusiness`, `Service`, `BlogPosting`, `BreadcrumbList`) into `index.html` *before* the first byte is transmitted.
- **Result:** Pure zero-JS accessibility for bots while preserving rich client hydration for humans.

### 2.2 Path-Aware AI Crawler Payloads
Traditional setups either block bots or redirect all AI requests to a single static file. WebReady-AG implements dynamic, path-aware agent delivery:
- **/llms.txt:** Concise Markdown directory summarizing site architecture, core services, authority evidence, and canonical links.
- **/llms-full.txt:** Unabridged, structured knowledge corpus designed for ingestion into large context windows (128k–1M tokens).
- **/ai.txt:** Explicit agent permissioning protocol specifying allowed reasoning tasks, API endpoints, tool schemas, and rate limits.
- **Dynamic Route Payloads:** When an AI agent requests `/services/telephony-audit` with `Accept: text/markdown` or bot user-agents, the server serves structured Markdown with frontmatter rather than an HTML shell.

### 2.3 Citation & Answer Tracking
Generative engines reward verifiable, atomic facts over marketing prose.
- **Mechanism:** WebReady-AG formats answer blocks with explicit entity tags, verified dates (`checked YYYY-MM-DD`), and primary source citations.
- **Verification Audit:** Continuous monitoring of how LLMs cite the domain across targeted benchmark prompts, comparing retrieval status against competitor matrices.

---

## 3. The 5-Gate Engine Moat

Every site managed by or exported from WebReady-AG satisfies the DGF 5-Gate Standard:
1. **Gate 1 (Clean Core):** Zero dead links, valid XML sitemaps, robots.txt bot rules (Googlebot, GPTBot, ClaudeBot, PerplexityBot, Applebot).
2. **Gate 2 (Speed & Edge):** Initial server response <15ms; edge-cached static payloads on Cloudflare / Netlify.
3. **Gate 3 (Entity Graph):** Comprehensive JSON-LD linking business identity, founders, service areas, and customer guarantees.
4. **Gate 4 (Content Integrity):** No unsourced price claims; stoplight auditing (GO / CAUTION / STOP) aligned with published vendor ledgers.
5. **Gate 5 (Agent Interoperability):** Full compliance with RFC-style AI agent protocol (`llms.txt`, `ai.txt`, and OpenAPI tool endpoints).

---

## 4. Fleet engine boundary

WebReady-AG is the product engine. The fleet seats stay independent: Snow orchestrates, Bob builds, Rock can block on security, Lizzy writes the design spec, Bart can block on design conformance, Ace directs recon, and Hermes scrapes. WebReady-AG calls that independent crew. It does not absorb the seats into this repository, and it does not run DGF Corporations operations.

Posting for `verifiedantiagingclinics.com` is Make.com scenario 6220644. The material is already in Google Drive at `VerifiedAntiAging_Campaigns/Auto_Publish_Queue/`. Finished work, including Lizzy's, stays there and runs. Ops does not post. Ops only checks that those Make runs land on TikTok, YouTube, or Meta for that property. DGF accounts are outside this watch.

---

## 5. The 7-Layer Single-Layer Execution Engine & 4-Engine Titan Standard

WebReady-AG operationalizes the universal 7-layer skill stack (`agents/shared/skills/web-ready-ag`) to move any web property to the #1 position across **Google (Core & AI Overviews)**, **Perplexity (Sonar)**, **OpenAI (ChatGPT Search)**, and **Brave Search (Claude)**:

1. **Layer 1 (`web-ag-edge-vitals`):** Pre-rendered semantic HTML shell inside `#root` (`<150ms` TTFB, `0.00` CLS), full 12-Bot AI Search Allowlist (`Googlebot`, `Google-Extended`, `OAI-SearchBot`, `ChatGPT-User`, `GPTBot`, `PerplexityBot`, `Perplexity-User`, `BraveBot`, `Claude-SearchBot`, `Claude-User`, `ClaudeBot`, `anthropic-ai`), and surgical query-parameter crawl fence (`Disallow: /*?q=*`, `/*?filter=*`).
2. **Layer 2 (`web-ag-entity-graph`):** Interconnected JSON-LD `@graph` binding entities and locations to canonical **Wikidata Q-ID URIs** (`http://www.wikidata.org/entity/Q...`), 1-sentence factual definition inside JSON-LD `headline`, and primary authority `citation[]` arrays.
3. **Layer 3 (`web-ag-programmatic-matrix`):** Combinatorial `/{service}/{location}` taxonomy, self-referencing canonicals, and `BreadcrumbList` link mesh.
4. **Layer 4 (`web-ag-data-floor`):** Transparent pricing/feature tables and primary institutional citations that capture the walled-garden citation vacuum.
5. **Layer 5 (`web-ag-geo-extraction`):** Wikipedia-style Top-of-DOM `<table class="entity-infobox">` in the first 5KB of HTML, Cleveland Clinic `H2` Pillar $\times$ literal Question `H3` Fan-Out tree, and `/llms.txt` + `/llms-full.txt` corpora.
6. **Layer 6 (`web-ag-consensus-engine`):** Dual-track Share of Model (SoM) expansion across community hubs (Google/Perplexity/OpenAI) and open technical corpora (Brave/Claude).
7. **Layer 7 (`web-ag-sentinel-audit`):** Deterministic 7-Layer and 4-Engine readiness scoring (`/api/titan-audit`) with single-layer autonomous remediation.


