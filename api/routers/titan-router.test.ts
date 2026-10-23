import { describe, it, expect } from "vitest";
import { appRouter } from "../router";
import type { TrpcContext } from "../context";

function createTestCaller() {
  const ctx: TrpcContext = {
    req: new Request("https://web-ready.ag/api/trpc"),
    resHeaders: new Headers(),
  };
  return appRouter.createCaller(ctx);
}

describe("tRPC Titan Router (titan-router)", () => {
  it("getSpec returns all 7 layers, 4 retrieval engines, and default self-audit >= 95", async () => {
    const caller = createTestCaller();
    const spec = await caller.titan.getSpec();

    expect(spec.layers).toHaveLength(7);
    expect(spec.engines).toHaveLength(4);
    expect(spec.defaultSelfAudit.overallScore).toBeGreaterThanOrEqual(95);
    expect(spec.defaultSelfAudit.layers.every((l) => l.passed)).toBe(true);
  });

  it("auditHtml scores an empty SPA shell as failing Layer 1", async () => {
    const caller = createTestCaller();
    const audit = await caller.titan.auditHtml({
      url: "https://legacy-spa.example.com/",
      html: "<!doctype html><html><head><title>Legacy</title></head><body><div id='root'></div></body></html>",
      robotsTxt: "User-agent: *\nDisallow: /\n",
      hasLlmsTxt: false,
      hasLlmsFullTxt: false,
      ttfbMs: 620,
    });

    expect(audit.overallScore).toBeLessThan(35);
    expect(audit.layers[0].passed).toBe(false);
    expect(audit.nextSingleLayerToExecute.layerNumber).toBe(1);
    expect(audit.nextSingleLayerToExecute.mode).toBe("REMEDIATE");
  });

  it("auditLiveUrl rejects private/loopback/metadata SSRF targets with BAD_REQUEST", async () => {
    const caller = createTestCaller();

    await expect(
      caller.titan.auditLiveUrl({ url: "http://169.254.169.254/latest/meta-data/" }),
    ).rejects.toThrow(/Blocked|private|metadata/i);

    await expect(
      caller.titan.auditLiveUrl({ url: "http://127.0.0.1:8000/health" }),
    ).rejects.toThrow(/Blocked|private|loopback/i);
  });

  it("generateArtifacts returns all 7 layer payloads and a verified >= 95 previewAudit", async () => {
    const caller = createTestCaller();
    const result = await caller.titan.generateArtifacts({
      domain: "palmcoastplumbing.example.com",
      brandName: "Palm Coast Precision Plumbing",
      niche: "Emergency Commercial & Residential Plumbing",
      city: "Orlando",
      state: "FL",
      services: ["24/7 Leak Detection", "Hydro-Jetting", "Water Heater Replacement"],
      startingPrice: "$149",
    });

    expect(result.bundle.normalizedDomain).toBe("https://palmcoastplumbing.example.com");
    expect(result.bundle.layerArtifacts).toHaveLength(7);
    expect(result.previewAudit.overallScore).toBeGreaterThanOrEqual(95);
    expect(result.previewAudit.layers.every((l) => l.passed)).toBe(true);
  });
});
