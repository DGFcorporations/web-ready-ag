# Enterprise 4-Layer Operating Standard

WebReady-AG must not label an audit enterprise-complete from static HTML checks alone. A passing enterprise audit requires all evidence streams below and keeps missing evidence separate from observed failures.

## Required evidence

| Layer | Evidence required |
|---|---|
| SEO | Raw HTML, rendered DOM, redirect chain, segmented sitemap, 30–90 days of crawl logs, live bot probes, mobile LCP/INP/CLS, GSC BigQuery rows, and GA4 AI-referral conversions |
| AEO | Question headings, 40–60 word answer capsules, standalone RAG chunks, structured tables/lists, and a connected JSON-LD `@id` graph with zero parse or dangling-reference errors |
| GEO | At least 25 documented buyer prompts across at least five engines, citation provenance, sentiment, visible/schema freshness parity, and quantitative information-gain signals |
| AIO | Independently configured retrieval/training policies, HTTP/WAF verification, external entity snapshots, entity-conflict checks, citation velocity, and crawl-to-citation telemetry |

Training access is a data-governance choice. Blocking a model-training crawler is compliant when the selected policy is `block`; live retrieval crawlers remain a separate policy and must be verified by HTTP status and server logs.

## Collect and submit evidence

- **Engineering:** select a commercial URL inventory for one host. Save requested URL, each redirect response, final status, raw document and rendered DOM for the same visit. Supply the sitemap index and inventory; inspect child sitemaps against content history for bulk date churn. A syntactically valid `lastmod` is not proof of a substantive edit. Report mobile p75 field vitals separately from lab observations.
- **Infrastructure:** export 30–90 consecutive days for that host. Remove IP addresses, identifiers and sensitive query values. Mark `verifiedBot: true` only when the trusted exporter established crawler identity independently of the UA. Public submissions ignore that flag; authorized admins can import the export. Unverified UAs contribute to traffic observations, not verified crawl efficacy. An off-inventory path is an orphan *candidate*, not proof that no internal link points to it.
- **Editorial:** attach a Rich Results Test and Schema.org result for each template (`searchEvidence.richResults` and `.schemaOrg`: evidence reference and error count). Record dated SERP observations with opportunities and owned results in `.searchFeatures`. Zero opportunities has no ownership percentage. Local graph/word-count checks are not external validation or proof of clinical credentials.
- **Research:** schedule a recurring panel with the same anonymized buyer questions across at least five engines. Record stage, source reference, measurement timestamp, sentiment and cited URLs, including `citations: []` for uncited answers. An earned URL must corroborate the brand, not merely occur in the response. `recordPromptBatch` retains that evidence; `earnedCitationDomains` counts responses containing each earned host, not links per page. Verify domain authority and original-data provenance separately.
- **Entity owner:** compare the same legal entity and location against each required profile. Record dated source snapshots and resolve conflicts before claiming zero contradictions. Do not substitute an empty source, made-up license or AI-generated endorsement for an observation.
- **Analytics:** use consented aggregates only. Configure GA4's AI referral channel on recognized source hostnames; verify a test session and conversion in the property. If call tracking is used, import only consented, deduplicated converting sessions, not recordings, patient details or caller identifiers. Use one property currency; do not add revenue across currencies.

## Reporting and deployment

On **Dashboard → Server Logs & GSC → Compare period**, an admin selects one domain and an inclusive 1–90 day range. The report compares three independent aggregates, not the most recent sample of rows: GSC URL-impression exports with dataset/table provenance, recognized GA4 AI referrals, and dated, documented prompt responses. Missing streams show as unmeasured. Supply `measuredAt` for historical prompt runs; otherwise recording time is used. Align property time zones with the reporting dates before import and avoid reimporting the same batch. These are period-level comparisons, not a causal link from a citation to an individual conversion.

The app consumes evidence; it does not provision BigQuery or GA4, execute a paid multi-engine panel, or authenticate third-party profiles. Before deployment, apply the additive MySQL SQL in `backend/migrations/0002_prompt_evidence.sql` **once** after the existing `db/migrations/0001_enterprise_4layer.sql` schema, or apply the equivalent schema change through your established Drizzle push process, not both. The numbered SQL files are manual migrations (the repository has no Drizzle migration journal). Existing prompt runs remain readable but do not count as a documented panel until evidence is supplied.

## Operating cadence

1. **Monthly pre-release gate:** Compare raw and rendered templates, validate canonicals and schema, probe retrieval bots, and review crawl-log waste before release.
2. **Quarterly content and entity gate:** Refresh proprietary data, update `dateModified` only after substantive edits, and corroborate external profiles after pricing, location, service, or leadership changes.
3. **Closed-loop attribution:** Join GSC BigQuery rows, GA4 AI-referral conversions, server crawl telemetry, and multi-LLM Reference Rate into one reporting period.

## Interpretation

`passed` means every layer meets its threshold and required evidence is complete. `overallScore` is capped below a passing score when evidence is missing. `telemetryCoverage.missingEnterpriseInputs` identifies unavailable inputs; remediation findings identify observed defects.
