# SUBSYSTEM CONTRACT: WebReady-AG 7-Layer Multi-Engine Dominance App Expansion

**Target Repository:** `repos/web-ready-ag`  
**Master Skill Binding:** `agents/shared/skills/web-ready-ag/SKILL.md` ( + Layers 1–7 Sub-Skills)  
**Target Retrieval Backends:** Google (Core & AI Overviews), Perplexity (Sonar), OpenAI (ChatGPT Search), Brave Search (Claude 86.7% Backend)  
**Status:** `APPROVED`

---

## 1. Completed in Slice 1 (The Approved 5 Titan Upgrades Patch)

Per owner approval, the **5 Titan Upgrades** have been patched into both the `agents/shared/skills/web-ready-ag*` skill stack and the core engine of `repos/web-ready-ag`:

1. **Layer 1 (`web-ag-edge-vitals`):** `public/robots.txt`, `api/routers/aeo.ts` (`/ai.txt`), and `api/lib/aeo-payload.ts` now include all **12+ AI search-grounding user-agents** (`Googlebot`, `Google-Extended`, `OAI-SearchBot`, `ChatGPT-User`, `GPTBot`, `PerplexityBot`, `Perplexity-User`, `BraveBot`, `Claude-SearchBot`, `Claude-User`, `ClaudeBot`, `anthropic-ai`) plus Cleveland Clinic's **surgical query-parameter crawl fence** (`Disallow: /*?q=*`, `/*?filter=*`, `/*?sort=*`).
2. **Layer 2 (`web-ag-entity-graph`):** `api/lib/json-ld.ts` now implements **Wikidata Q-ID Triangulation** (`WIKIDATA_ENTITIES` bound to `sameAs`, `mainEntity`, and `areaServed`), **Cleveland Clinic's 1-Sentence Definition-in-Headline** (`buildWebPageJsonLd`), **Primary Authority Citations** (`citation[]`), and unified `@graph` construction (`buildUnifiedGraphJsonLd`).
3. **Layer 5 (`web-ag-geo-extraction`):** `api/lib/html-inject.ts` now pre-renders a zero-CLS `<main class="ag-prerender-shell min-h-screen">` directly inside `<div id="root">`, injecting **Wikipedia's Top-of-DOM `<table class="entity-infobox">`** and **Cleveland Clinic's `H2` Pillar x literal Question `H3` Fan-Out tree** on every route, plus `Accept: text/markdown` negotiation in `api/boot.ts`.
4. **Layer 7 (`web-ag-sentinel-audit`):** Created `api/lib/titan-engine.ts` and exposed `GET/POST /api/titan-audit` in `api/routers/aeo.ts`, deterministically scoring any page across all **7 WebReady-AG Layers** and all **4 Retrieval Engines (`google`, `perplexity`, `openai`, `braveClaude`)** (`38/38` unit tests passing).

---

## 2. Phase 1: 7-Vector Exploration for Full Web AG App Build-Out

To expand `repos/web-ready-ag` from a single-site agency brochure into the **Universal 7-Layer Website Dominance Application** (where any target website can be ingested, audited, and systematically moved to #1 one single layer at a time), we explored all 7 architectural vectors:

| Vector | Exploration Finding & Architectural Guarantee |
| :--- | :--- |
| **1. Architecture & Role** | Add a dedicated **7-Layer Single-Layer Execution Workbench** (`/workbench` UI + `api/routers/titan-router.ts` tRPC router) inside `repos/web-ready-ag`. Keeps fleet seats independent per `docs/product-identity.md` §4 while turning the Web AG app into the interactive & automated engine that runs the 7-layer skill stack against any target domain. |
| **2. Edge Cases** | Target websites may return HTTP 403 (WAF blocks like Mayo Clinic), empty SPA shells (`<div id="root"></div>`), missing `robots.txt` (404), or malformed JSON-LD. The scanner must handle network timeouts, non-UTF8 payloads, and malformed JSON-LD without throwing unhandled exceptions, converting failures into deterministic Layer 1 / Layer 2 remediation items. |
| **3. Invariants** | **Single-Layer Execution Law:** A site cannot advance to Layer $N+1$ until Layer $N$ scores $\ge 80/100$. Every layer outputs ready-to-deploy code artifacts (`robots.txt`, `/llms.txt`, `@graph` JSON-LD, Top-of-DOM `<table class="entity-infobox">`, and Question `H3` Fan-Out HTML). |
| **4. Future Scalability** | Auditing multiple client domains and programmatic route matrices must remain sub-second and stateless on Cloudflare Workers / Node without exhausting memory. Fetch probes are bounded to 8 seconds and 1MB max HTML read buffer. |
| **5. Failure Modes** | If a live external URL fetch is blocked or offline, the workbench supports both **Live URL Probe Mode** and **Raw HTML / Robots.txt Paste Mode**, failing closed with explicit diagnostic telemetry rather than fabricated scores. |
| **6. Neighbor Interactions** | Preserves all existing tRPC routers (`service`, `pricing`, `order`, `lead`, `geo`, `blog`, `testimonial`, `dashboard`), Hono AEO routes (`/sitemap.xml`, `/llms.txt`, `/llms-full.txt`, `/ai.txt`), and Grok's Fleet Engine Boundary (`docs/product-identity.md` §4). |
| **7. Six-Month Sanity** | Uses pure TypeScript modules shared between Hono, tRPC, and the React 19 UI—zero external bloated scraper dependencies, 100% testable via Vitest. |

---

## 3. Strict NEVER Rules (Adversarial Quality Gates)

- **NEVER** violate the Fleet Engine Boundary in `docs/product-identity.md`: fleet seats remain independent; never move persona or Captain Snow container code into `repos/web-ready-ag`.
- **NEVER** allow SSRF (Server-Side Request Forgery) in the live URL auditor: block private/loopback IP ranges (`127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.169.254`, `localhost`, `.internal`) before any remote `fetch`.
- **NEVER** invent or fabricate audit scores when a remote fetch fails—report exact HTTP status / WAF block as a Layer 1 finding.
- **NEVER** skip the Single-Layer State Machine order: Layer 1 -> Layer 2 -> Layer 3 -> Layer 4 -> Layer 5 -> Layer 6 -> Layer 7 -> Sentinel Loop.

---

## 4. File Blast Radius (`[NEW]` / `[MODIFY]` / `[DELETE]`)

```text
repos/web-ready-ag/
├── [NEW]    api/lib/url-guard.ts                  # SSRF-safe URL validator blocking loopback/private/metadata IPs
├── [NEW]    api/lib/url-guard.test.ts             # Unit tests for SSRF protection & URL normalization
├── [NEW]    api/lib/artifact-generator.ts         # Generates drop-in Layer 1–7 code artifacts (robots.txt, @graph JSON-LD, Infobox HTML, llms.txt) for any audited domain
├── [NEW]    api/lib/artifact-generator.test.ts    # Unit tests for artifact generation across niches
├── [NEW]    api/routers/titan-router.ts           # tRPC router: getSpec, auditHtml, auditLiveUrl, generateArtifacts
├── [NEW]    api/routers/titan-router.test.ts      # Contract & security tests for tRPC Titan endpoints
├── [MODIFY] api/router.ts                         # Mount `titan: titanRouter` on appRouter
├── [NEW]    src/sections/TitanEngineMatrix.tsx    # Interactive 7-Layer & 4-Engine (Google, Perplexity, OpenAI, Brave/Claude) Workbench UI
├── [NEW]    src/sections/TitanEngineMatrix.test.tsx # Component tests for 7-Layer & 4-Engine Workbench UI
├── [MODIFY] src/pages/Home.tsx                    # Render TitanEngineMatrix section on the Web AG home page
└── [MODIFY] src/pages/Dashboard.tsx               # Integrate the 7-Layer Single-Layer Tracker & Artifact Generator into the client dashboard
```

---

## 5. Bite-Sized TDD Execution Slices (Upon Approval)

1. **Slice A — SSRF-Safe Live Auditor & Artifact Generator (`api/lib/url-guard.ts` + `api/lib/artifact-generator.ts`):**
   - Write unit tests for private IP/metadata blocking and automated generation of Layer 1–7 drop-in remediation payloads (`robots.txt`, Wikidata `@graph` JSON-LD, Top-of-DOM `<table class="entity-infobox">`, Question `H3` Fan-Out, and `/llms.txt`).
2. **Slice B — tRPC Titan Router (`api/routers/titan-router.ts`):**
   - Wire `titan.getSpec`, `titan.auditHtml`, `titan.auditLiveUrl`, and `titan.generateArtifacts` into `api/router.ts`.
3. **Slice C — Interactive 7-Layer Dominance Workbench UI (`src/sections/TitanEngineMatrix.tsx`):**
   - Build the interactive 7-Layer Single-Layer Pipeline & 4-Engine Scorecard (Google, Perplexity, OpenAI, Brave/Claude) with one-click artifact generation on `Home.tsx` and `Dashboard.tsx`.
4. **Slice D — Full 4-Gate Verification:**
   - Run `npm test`, `npm run check`, `npm run build`, and `npm run lint` to 100% green exit 0.
