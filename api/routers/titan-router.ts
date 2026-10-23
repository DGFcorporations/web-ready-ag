import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "../middleware";
import {
  WEB_AG_LAYERS,
  TARGET_ENGINES,
  buildCanonicalRobotsTxt,
  auditHtmlAgainstTitanStandard,
} from "../lib/titan-engine";
import { injectMeta, resolveRouteMeta } from "../lib/html-inject";
import {
  validatePublicAuditUrl,
  probeAndAuditLiveUrl,
  MAX_HTML_BYTES,
  MAX_ROBOTS_BYTES,
} from "../lib/url-guard";
import { generateTitanLayerArtifacts } from "../lib/artifact-generator";

const MAX_URL_LENGTH = 2048;
const MAX_FIELD_LENGTH = 200;
const MAX_SERVICES_COUNT = 20;

export const titanRouter = createRouter({
  getSpec: publicQuery.query(async () => {
    const baseHtml = `<!doctype html><html lang="en"><head><meta charset="UTF-8" /><title>WEB-READY/AG</title></head><body><div id="root"></div></body></html>`;
    const meta = await resolveRouteMeta("/");
    const injectedHtml = meta ? injectMeta(baseHtml, meta) : baseHtml;
    const robotsTxt = buildCanonicalRobotsTxt("https://web-ready.ag");

    const defaultSelfAudit = auditHtmlAgainstTitanStandard({
      url: "https://web-ready.ag/",
      html: injectedHtml,
      robotsTxt,
      hasLlmsTxt: true,
      hasLlmsFullTxt: true,
      ttfbMs: 38,
    });

    return {
      layers: WEB_AG_LAYERS,
      engines: TARGET_ENGINES,
      defaultSelfAudit,
    };
  }),

  auditHtml: publicQuery
    .input(
      z.object({
        url: z.string().min(1).max(MAX_URL_LENGTH),
        html: z.string().max(MAX_HTML_BYTES),
        robotsTxt: z.string().max(MAX_ROBOTS_BYTES).optional(),
        hasLlmsTxt: z.boolean().optional(),
        hasLlmsFullTxt: z.boolean().optional(),
        ttfbMs: z.number().min(0).max(60_000).optional(),
      }),
    )
    .mutation(({ input }) => {
      return auditHtmlAgainstTitanStandard({
        url: input.url,
        html: input.html,
        robotsTxt: input.robotsTxt,
        hasLlmsTxt: input.hasLlmsTxt ?? false,
        hasLlmsFullTxt: input.hasLlmsFullTxt ?? false,
        ttfbMs: input.ttfbMs ?? 120,
      });
    }),

  auditLiveUrl: publicQuery
    .input(
      z.object({
        url: z.string().min(1).max(MAX_URL_LENGTH),
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

      return probeAndAuditLiveUrl(input.url);
    }),

  generateArtifacts: publicQuery
    .input(
      z.object({
        domain: z.string().min(1).max(512),
        brandName: z.string().min(1).max(MAX_FIELD_LENGTH),
        niche: z.string().min(1).max(MAX_FIELD_LENGTH),
        city: z.string().max(120).optional(),
        state: z.string().max(60).optional(),
        services: z.array(z.string().max(120)).max(MAX_SERVICES_COUNT).optional(),
        startingPrice: z.string().max(60).optional(),
      }),
    )
    .mutation(({ input }) => {
      const bundle = generateTitanLayerArtifacts(input);
      const previewAudit = auditHtmlAgainstTitanStandard({
        url: bundle.normalizedDomain,
        html: bundle.fullHtmlPreview,
        robotsTxt: bundle.robotsTxt,
        hasLlmsTxt: true,
        hasLlmsFullTxt: true,
        ttfbMs: 42,
      });

      return {
        bundle,
        previewAudit,
      };
    }),
});
