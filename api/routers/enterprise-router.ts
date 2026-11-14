import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery, adminQuery } from "../middleware";
import { getDb } from "../queries/connection";
import {
  aiReferralEvents,
  botAccessProbes,
  crawlTelemetryRuns,
  entityCorroborations,
  gscExportRows,
  llmPromptRuns,
  schemaVerificationJobs,
} from "@db/schema";
import {
  GA4_AI_REFERRAL_DOMAINS,
  GSC_BIGQUERY_EXPORT_TABLES,
  SEARCH_RETRIEVAL_BOTS,
  TRAINING_CRAWLER_BOTS,
  analyzeCrawlLogs,
  classifyAiReferralSource,
  corroborateCrossSourceEntities,
  evaluateEnterprise4Layers,
  evaluateGeoPromptBenchmark,
  type ExternalEntitySourceType,
  type GeoPromptRunInput,
  type LlmEngineId,
  type PromptStage,
} from "../lib/enterprise";
import { MAX_HTML_BYTES, MAX_ROBOTS_BYTES, probeAndAuditLiveUrl, validatePublicAuditUrl } from "../lib/url-guard";

const MAX_URL_LENGTH = 2048;

const promptStageSchema = z.enum(["awareness", "consideration", "decision"]);
const llmEngineSchema = z.enum([
  "chatgpt",
  "google_aio",
  "google_ai_mode",
  "perplexity",
  "claude",
  "copilot",
]);
const provenanceSchema = z.enum(["owned", "earned_third_party", "competitor"]);
const sentimentSchema = z.enum(["favorable", "neutral", "unfavorable"]);
const sourceTypeSchema = z.enum([
  "gbp",
  "wikidata",
  "wikipedia",
  "crunchbase",
  "bbb",
  "apple_business_connect",
  "aggregator",
]);

export const enterpriseRouter = createRouter({
  getGovernancePolicy: publicQuery.query(() => {
    return {
      trainingAllowPolicy: "ALLOW_EXPLICIT_ZERO_PENALTY" as const,
      retrievalBots: SEARCH_RETRIEVAL_BOTS.map((b) => ({
        id: b.id,
        category: b.category,
        purpose: b.purpose,
        policy: "ALLOW",
      })),
      trainingBots: TRAINING_CRAWLER_BOTS.map((b) => ({
        id: b.id,
        category: b.category,
        purpose: b.purpose,
        policy: "ALLOW",
      })),
      ga4AiReferralDomains: [...GA4_AI_REFERRAL_DOMAINS],
      gscBigQueryTables: [...GSC_BIGQUERY_EXPORT_TABLES],
      ga4CustomChannelRule: {
        channelName: "AI Search & LLM Referrals",
        condition: `Source matches regex (${GA4_AI_REFERRAL_DOMAINS.map((d) => d.replace(/\./g, "\\.")).join("|")})`,
      },
    };
  }),

  classifyAiReferral: publicQuery
    .input(z.object({ referrer: z.string().max(1000) }))
    .query(({ input }) => {
      const matchedDomain = classifyAiReferralSource(input.referrer);
      return {
        referrer: input.referrer,
        isAiReferral: matchedDomain !== null,
        channel: matchedDomain ? "AI Search & LLM Referrals" : "Other",
        matchedDomain,
      };
    }),

  auditEnterprisePage: publicQuery
    .input(
      z.object({
        url: z.string().min(1).max(MAX_URL_LENGTH),
        finalUrl: z.string().max(MAX_URL_LENGTH).optional(),
        html: z.string().max(MAX_HTML_BYTES),
        renderedHtml: z.string().max(MAX_HTML_BYTES).optional(),
        robotsTxt: z.string().max(MAX_ROBOTS_BYTES).optional(),
        sitemapXml: z.string().max(MAX_ROBOTS_BYTES * 2).optional(),
        knownSitemapUrls: z.array(z.string()).max(2000).optional(),
        lcpMs: z.number().min(0).max(60_000).optional(),
        inpMs: z.number().min(0).max(30_000).optional(),
        cls: z.number().min(0).max(10).optional(),
        crawlLogs: z.string().max(MAX_HTML_BYTES).optional(),
        thirdPartyCitations90d: z.number().int().min(0).optional(),
        favorableSentimentPct: z.number().min(0).max(100).optional(),
      }),
    )
    .mutation(({ input }) => {
      return evaluateEnterprise4Layers({
        url: input.url,
        finalUrl: input.finalUrl,
        html: input.html,
        renderedHtml: input.renderedHtml,
        robotsTxt: input.robotsTxt,
        sitemapXml: input.sitemapXml,
        knownSitemapUrls: input.knownSitemapUrls,
        lcpMs: input.lcpMs,
        inpMs: input.inpMs,
        cls: input.cls,
        crawlLogs: input.crawlLogs,
        thirdPartyCitations90d: input.thirdPartyCitations90d,
        favorableSentimentPct: input.favorableSentimentPct,
      });
    }),

  probeLiveEnterprise: publicQuery
    .input(
      z.object({
        url: z.string().min(1).max(MAX_URL_LENGTH),
        probeBots: z.boolean().default(true),
      }),
    )
    .mutation(async ({ input }) => {
      const validation = validatePublicAuditUrl(input.url);
      if (!validation.ok) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: validation.reason || "Blocked URL.",
        });
      }
      return probeAndAuditLiveUrl(input.url, { probeBots: input.probeBots });
    }),

  analyzeCrawlLogs: publicQuery
    .input(
      z.object({
        rawLogs: z.string().max(MAX_HTML_BYTES),
        knownSitemapUrls: z.array(z.string()).max(5000).optional(),
        citationsCount: z.number().int().min(0).optional(),
      }),
    )
    .mutation(({ input }) => {
      return analyzeCrawlLogs(input.rawLogs, {
        knownSitemapUrls: input.knownSitemapUrls,
        citationsCount: input.citationsCount,
      });
    }),

  evaluateGeoBenchmark: publicQuery
    .input(
      z.object({
        runs: z
          .array(
            z.object({
              prompt: z.string().min(1).max(500),
              stage: promptStageSchema,
              engine: llmEngineSchema,
              citedBrand: z.boolean(),
              competitorCitations: z.number().int().min(0).max(100),
              provenance: provenanceSchema,
              sentiment: sentimentSchema,
            }),
          )
          .max(2000),
      }),
    )
    .mutation(({ input }) => {
      const normalized: GeoPromptRunInput[] = input.runs.map((r) => ({
        prompt: r.prompt,
        stage: r.stage as PromptStage,
        engine: r.engine as LlmEngineId,
        citedBrand: r.citedBrand,
        competitorCitations: r.competitorCitations,
        provenance: r.provenance,
        sentiment: r.sentiment,
      }));
      return evaluateGeoPromptBenchmark(normalized);
    }),

  corroborateEntity: publicQuery
    .input(
      z.object({
        canonical: z.object({
          name: z.string().min(1).max(255),
          domain: z.string().min(1).max(255),
          phone: z.string().max(64).optional(),
          street: z.string().max(255).optional(),
          city: z.string().max(120).optional(),
          state: z.string().max(60).optional(),
          postalCode: z.string().max(32).optional(),
        }),
        externalSources: z
          .array(
            z.object({
              source: sourceTypeSchema,
              name: z.string().max(255).optional(),
              domain: z.string().max(255).optional(),
              phone: z.string().max(64).optional(),
              street: z.string().max(255).optional(),
              city: z.string().max(120).optional(),
              state: z.string().max(60).optional(),
              postalCode: z.string().max(32).optional(),
            }),
          )
          .max(25),
        thirdPartyCitations90d: z.number().int().min(0).optional(),
        favorableSentimentPct: z.number().min(0).max(100).optional(),
      }),
    )
    .mutation(({ input }) => {
      return corroborateCrossSourceEntities(
        input.canonical,
        input.externalSources.map((s) => ({
          ...s,
          source: s.source as ExternalEntitySourceType,
        })),
        input.thirdPartyCitations90d !== undefined ||
          input.favorableSentimentPct !== undefined
          ? {
              thirdPartyCitations90d: input.thirdPartyCitations90d,
              favorableSentimentPct: input.favorableSentimentPct,
            }
          : undefined,
      );
    }),

  ingestCrawlTelemetry: adminQuery
    .input(
      z.object({
        domain: z.string().min(1).max(255),
        logSource: z.enum(["cloudflare", "nginx", "apache", "manual"]).default("cloudflare"),
        rawLogs: z.string().max(MAX_HTML_BYTES),
        knownSitemapUrls: z.array(z.string()).max(5000).optional(),
        citationsCount: z.number().int().min(0).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const analysis = analyzeCrawlLogs(input.rawLogs, {
        knownSitemapUrls: input.knownSitemapUrls,
        citationsCount: input.citationsCount,
      });

      await db.insert(crawlTelemetryRuns).values({
        domain: input.domain,
        logSource: input.logSource,
        totalHits: analysis.totalHits,
        retrievalBotHits: analysis.retrievalBotHits,
        trainingBotHits: analysis.trainingBotHits,
        humanHits: analysis.humanOrOtherHits,
        non200Rate: String(analysis.non200BotRate),
        orphanUrlsJson: analysis.logOrphans,
        crawlTrapUrlsJson: analysis.crawlTrapUrls,
        uncrawledUrlsJson: analysis.uncrawledHighValueUrls,
        crawlWastePercent: String(analysis.crawlWastePercent),
        crawlToCitationRatio:
          analysis.crawlToCitationRatio !== null ? String(analysis.crawlToCitationRatio) : null,
        summaryJson: analysis,
      });

      return analysis;
    }),

  ingestAiReferrals: adminQuery
    .input(
      z.object({
        domain: z.string().min(1).max(255),
        events: z
          .array(
            z.object({
              sourceHost: z.string().min(1).max(120),
              landingPath: z.string().min(1).max(500),
              sessionsCount: z.number().int().min(0),
              conversionsCount: z.number().int().min(0).default(0),
              revenueAmount: z.number().min(0).default(0),
              recordedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            }),
          )
          .min(1)
          .max(500),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.insert(aiReferralEvents).values(
        input.events.map((ev) => ({
          domain: input.domain,
          sourceHost: classifyAiReferralSource(ev.sourceHost) ?? ev.sourceHost,
          landingPath: ev.landingPath,
          sessionsCount: ev.sessionsCount,
          conversionsCount: ev.conversionsCount,
          revenueAmount: ev.revenueAmount.toFixed(2),
          recordedDate: ev.recordedDate,
        })),
      );
      return { inserted: input.events.length };
    }),

  ingestGscExport: adminQuery
    .input(
      z.object({
        domain: z.string().min(1).max(255),
        bigqueryDataset: z.string().max(120).optional(),
        bigqueryTable: z.string().max(120).optional(),
        rows: z
          .array(
            z.object({
              dataDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
              urlPath: z.string().min(1).max(500),
              queryText: z.string().max(500).optional(),
              clicks: z.number().int().min(0),
              impressions: z.number().int().min(0),
              ctr: z.number().min(0).max(1),
              avgPosition: z.number().min(0),
            }),
          )
          .min(1)
          .max(1000),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.insert(gscExportRows).values(
        input.rows.map((r) => ({
          domain: input.domain,
          dataDate: r.dataDate,
          urlPath: r.urlPath,
          queryText: r.queryText ?? null,
          clicks: r.clicks,
          impressions: r.impressions,
          ctr: r.ctr.toFixed(4),
          avgPosition: r.avgPosition.toFixed(2),
          bigqueryDataset: input.bigqueryDataset ?? null,
          bigqueryTable: input.bigqueryTable ?? null,
        })),
      );
      return { inserted: input.rows.length };
    }),

  recordPromptBatch: adminQuery
    .input(
      z.object({
        domain: z.string().min(1).max(255),
        runs: z
          .array(
            z.object({
              prompt: z.string().min(1).max(500),
              stage: promptStageSchema,
              engine: llmEngineSchema,
              citedBrand: z.boolean(),
              competitorCitations: z.number().int().min(0).default(0),
              provenance: provenanceSchema,
              sentiment: sentimentSchema,
              responseExcerpt: z.string().max(2000).optional(),
            }),
          )
          .min(1)
          .max(500),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.insert(llmPromptRuns).values(
        input.runs.map((r) => ({
          domain: input.domain,
          promptText: r.prompt,
          stage: r.stage,
          engine: r.engine,
          citedBrand: r.citedBrand,
          competitorCitations: r.competitorCitations,
          provenance: r.provenance,
          sentiment: r.sentiment,
          responseExcerpt: r.responseExcerpt ?? null,
        })),
      );
      return evaluateGeoPromptBenchmark(input.runs);
    }),

  listTelemetrySummary: adminQuery
    .input(z.object({ domain: z.string().max(255).optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const domainFilter = input?.domain;

      const [latestCrawl, referrals, gscRows, promptRows, corroborations, botProbes, jobs] =
        await Promise.all([
          db.query.crawlTelemetryRuns.findMany({
            where: domainFilter ? eq(crawlTelemetryRuns.domain, domainFilter) : undefined,
            orderBy: [desc(crawlTelemetryRuns.createdAt)],
            limit: 10,
          }),
          db.query.aiReferralEvents.findMany({
            where: domainFilter ? eq(aiReferralEvents.domain, domainFilter) : undefined,
            orderBy: [desc(aiReferralEvents.createdAt)],
            limit: 50,
          }),
          db.query.gscExportRows.findMany({
            where: domainFilter ? eq(gscExportRows.domain, domainFilter) : undefined,
            orderBy: [desc(gscExportRows.createdAt)],
            limit: 50,
          }),
          db.query.llmPromptRuns.findMany({
            where: domainFilter ? eq(llmPromptRuns.domain, domainFilter) : undefined,
            orderBy: [desc(llmPromptRuns.measuredAt)],
            limit: 200,
          }),
          db.query.entityCorroborations.findMany({
            where: domainFilter ? eq(entityCorroborations.domain, domainFilter) : undefined,
            orderBy: [desc(entityCorroborations.checkedAt)],
            limit: 20,
          }),
          db.query.botAccessProbes.findMany({
            where: domainFilter ? eq(botAccessProbes.domain, domainFilter) : undefined,
            orderBy: [desc(botAccessProbes.probedAt)],
            limit: 30,
          }),
          db.query.schemaVerificationJobs.findMany({
            where: domainFilter ? eq(schemaVerificationJobs.domain, domainFilter) : undefined,
            orderBy: [desc(schemaVerificationJobs.createdAt)],
            limit: 20,
          }),
        ]);

      const promptBenchmark =
        promptRows.length > 0
          ? evaluateGeoPromptBenchmark(
              promptRows.map((p) => ({
                prompt: p.promptText,
                stage: p.stage as PromptStage,
                engine: p.engine as LlmEngineId,
                citedBrand: p.citedBrand,
                competitorCitations: p.competitorCitations,
                provenance: p.provenance as "owned" | "earned_third_party" | "competitor",
                sentiment: p.sentiment as "favorable" | "neutral" | "unfavorable",
              })),
            )
          : null;

      return {
        hasLiveTelemetry:
          latestCrawl.length > 0 ||
          referrals.length > 0 ||
          gscRows.length > 0 ||
          promptRows.length > 0 ||
          corroborations.length > 0,
        latestCrawl,
        referrals,
        gscRows,
        promptBenchmark,
        corroborations,
        botProbes,
        verificationJobs: jobs,
      };
    }),
});
