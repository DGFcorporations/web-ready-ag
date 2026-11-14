import { describe, it, expect } from "vitest";
import { auditMobileVitals } from "../mobile-vitals";
import { probeAiBotAccess, safeFetchText } from "../url-guard";
import { buildFaqPageJsonLd, buildPersonJsonLd } from "../json-ld";
import { generateTitanLayerArtifacts } from "../artifact-generator";
import { auditHtmlAgainstTitanStandard } from "../titan-engine";

describe("Component 1B Integration: CWV Budgets, Redirect Chains, Bot Probes & Artifact Parity", () => {
  it("evaluates mobile LCP < 1800ms, INP <= 200ms, CLS <= 0.10 and flags violations", () => {
    const cleanHtml = `<!doctype html><html><body><main><h1>Fast</h1><img src="/a.jpg" width="400" height="300" /></main></body></html>`;
    const pass = auditMobileVitals(cleanHtml, {
      measuredLcpMs: 1120,
      measuredInpMs: 80,
      measuredCls: 0.02,
    });
    expect(pass.passed).toBe(true);
    expect(pass.cwvPassed).toBe(true);

    const slowLcp = auditMobileVitals(cleanHtml, {
      measuredLcpMs: 2700,
      measuredInpMs: 120,
      measuredCls: 0.05,
    });
    expect(slowLcp.passed).toBe(false);
    expect(slowLcp.cwvPassed).toBe(false);
    expect(slowLcp.severity).toBe("CRITICAL");
  });

  it("traces redirect chains across safeFetchText and probes both retrieval and training AI bots", async () => {
    const mockFetch: typeof fetch = async (input, init) => {
      const urlStr = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const headers = new Headers(init?.headers);
      const ua = headers.get("User-Agent") ?? "";
      if (urlStr === "https://chain.example.com/start") {
        return new Response(null, {
          status: 301,
          headers: { location: "https://chain.example.com/hop1" },
        });
      }
      if (urlStr === "https://chain.example.com/hop1") {
        return new Response(null, {
          status: 301,
          headers: { location: "https://chain.example.com/final" },
        });
      }
      if (ua.includes("GPTBot")) {
        return new Response("Access Denied", { status: 403 });
      }
      return new Response("<html><body>OK</body></html>", { status: 200 });
    };

    const fetchRes = await safeFetchText("https://chain.example.com/start", {
      fetchImpl: mockFetch,
    });
    expect(fetchRes.ok).toBe(true);
    expect(fetchRes.redirectChain?.length).toBe(3);
    expect(fetchRes.redirectChain?.[0].status).toBe(301);
    expect(fetchRes.redirectChain?.[1].status).toBe(301);

    const probes = await probeAiBotAccess("https://chain.example.com/final", {
      fetchImpl: mockFetch,
    });
    const gptProbe = probes.find((p) => p.bot === "GPTBot");
    const oaiProbe = probes.find((p) => p.bot === "OAI-SearchBot");
    expect(gptProbe?.wafBlocked).toBe(true);
    expect(gptProbe?.category).toBe("model_training");
    expect(oaiProbe?.ok).toBe(true);
    expect(oaiProbe?.category).toBe("search_retrieval");
  });

  it("synthesizes Titan layer artifacts that pass enterpriseAudit with Person E-E-A-T, connected @graph, and separated training+retrieval allow policy", () => {
    const person = buildPersonJsonLd({ name: "Josh Chandler" });
    const faq = buildFaqPageJsonLd(
      [{ question: "What is WebReady-AG?", answer: "Deterministic schema engineering." }],
      "https://web-ready.ag/services",
    );
    expect(person["@type"]).toBe("Person");
    expect(person.hasCredential).toBeDefined();
    expect(faq["@type"]).toBe("FAQPage");

    const bundle = generateTitanLayerArtifacts({
      domain: "https://clinic.example.com",
      brandName: "Clinic One",
      niche: "Longevity Medicine",
      city: "Tampa",
      state: "FL",
      dateModified: "2026-11-12",
    });

    const audit = auditHtmlAgainstTitanStandard({
      url: "https://clinic.example.com/",
      html: bundle.fullHtmlPreview,
      renderedHtml: bundle.fullHtmlPreview,
      robotsTxt: bundle.robotsTxt,
      hasLlmsTxt: true,
      hasLlmsFullTxt: true,
      ttfbMs: 40,
      lcpMs: 950,
      inpMs: 60,
      cls: 0.01,
    });

    expect(audit.overallScore).toBe(100);
    expect(audit.enterpriseAudit?.botGovernance.passed).toBe(true);
    expect(audit.enterpriseAudit?.botGovernance.allTrainingBotsAllowed).toBe(true);
    expect(audit.enterpriseAudit?.jsonLdGraph.passed).toBe(true);
    expect(audit.enterpriseAudit?.aeoRag.capsuleComplianceRate).toBe(100);
    expect(audit.enterpriseAudit?.geoFreshnessDensity.freshnessParityPassed).toBe(true);
  });
});
