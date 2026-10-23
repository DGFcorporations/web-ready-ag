import { describe, it, expect } from "vitest";
import {
  generateTitanLayerArtifacts,
  type ArtifactGeneratorInput,
} from "./artifact-generator";
import { auditHtmlAgainstTitanStandard } from "./titan-engine";

describe("Layer 1-7 Titan Code Artifact Generator (artifact-generator)", () => {
  const sampleInput: ArtifactGeneratorInput = {
    domain: "https://apexmedspa.example.com",
    brandName: "Apex Longevity & Med Spa",
    niche: "Regenerative Medicine & Peptide Therapy",
    city: "Naples",
    state: "FL",
    services: ["Peptide Therapy", "TRT Optimization", "IV NAD+ Infusion"],
    startingPrice: "$295/mo",
  };

  it("generates all 7 layer code artifacts with metadata and verification gates", () => {
    const bundle = generateTitanLayerArtifacts(sampleInput);

    expect(bundle.normalizedDomain).toBe("https://apexmedspa.example.com");
    expect(bundle.layerArtifacts).toHaveLength(7);
    expect(bundle.layerArtifacts.map((a) => a.layerNumber)).toEqual([1, 2, 3, 4, 5, 6, 7]);

    // Layer 1: robots.txt with 12+ AI bots + parameter fence
    expect(bundle.robotsTxt).toContain("User-agent: OAI-SearchBot");
    expect(bundle.robotsTxt).toContain("User-agent: PerplexityBot");
    expect(bundle.robotsTxt).toContain("User-agent: BraveBot");
    expect(bundle.robotsTxt).toContain("User-agent: Claude-SearchBot");
    expect(bundle.robotsTxt).toContain("Disallow: /*?q=*");
    expect(bundle.robotsTxt).toContain("Sitemap: https://apexmedspa.example.com/sitemap.xml");

    // Layer 2: @graph JSON-LD with Wikidata Q-ID + definition headline + citations
    expect(bundle.jsonLdGraph).toContain('"@graph"');
    expect(bundle.jsonLdGraph).toContain("http://www.wikidata.org/entity/Q124197"); // Naples Q-ID
    expect(bundle.jsonLdGraph).toContain('"headline"');
    expect(bundle.jsonLdGraph).toContain('"citation"');

    // Layer 3: Programmatic route matrix & BreadcrumbList
    expect(bundle.programmaticRoutes).toContain("/services/peptide-therapy/naples");
    expect(bundle.programmaticRoutes).toContain("BreadcrumbList");

    // Layer 4: Transparent Pricing & OfferCatalog Data Floor
    expect(bundle.dataFloorHtml).toContain("$295/mo");
    expect(bundle.dataFloorHtml).toContain("OfferCatalog");

    // Layer 5: Top-of-DOM <table class="entity-infobox"> + H3 Question Fan-Out + /llms.txt
    expect(bundle.infoboxAndFanOutHtml).toContain('<table class="entity-infobox"');
    expect(bundle.infoboxAndFanOutHtml).toContain("<h3>What is Apex Longevity &amp; Med Spa");
    expect(bundle.llmsTxt).toContain("# Apex Longevity & Med Spa");
    expect(bundle.llmsTxt).toContain("Entity Summary Infobox");

    // Layer 6: Dual-Track Consensus Blueprint (Track A + Track B)
    expect(bundle.consensusBlueprint).toContain("Track A");
    expect(bundle.consensusBlueprint).toContain("Track B");
    expect(bundle.consensusBlueprint).toContain("86.7%");

    // Layer 7: IndexNow & Sentinel config
    expect(bundle.indexNowPayload).toContain('"host": "apexmedspa.example.com"');
    expect(bundle.indexNowPayload).toContain("/services/peptide-therapy/naples");
  });

  it("synthesizes a fullHtmlPreview that scores >= 95 across all 7 layers and 4 engines when audited", () => {
    const bundle = generateTitanLayerArtifacts(sampleInput);

    const audit = auditHtmlAgainstTitanStandard({
      url: bundle.normalizedDomain,
      html: bundle.fullHtmlPreview,
      robotsTxt: bundle.robotsTxt,
      hasLlmsTxt: true,
      hasLlmsFullTxt: true,
      ttfbMs: 45,
    });

    expect(audit.overallScore).toBeGreaterThanOrEqual(95);
    expect(audit.engineScores.google).toBeGreaterThanOrEqual(95);
    expect(audit.engineScores.perplexity).toBeGreaterThanOrEqual(95);
    expect(audit.engineScores.openai).toBeGreaterThanOrEqual(95);
    expect(audit.engineScores.braveClaude).toBeGreaterThanOrEqual(95);
    expect(audit.layers.every((l) => l.passed)).toBe(true);
  });

  it("escapes untrusted HTML characters in brandName, niche, and services to prevent XSS", () => {
    const malicious = generateTitanLayerArtifacts({
      domain: "example.com",
      brandName: ' Acme <script>alert("xss")</script> ',
      niche: 'AI & "Search" <img src=x onerror=alert(1)>',
      city: "Miami",
      state: "FL",
      services: ["SEO <script>evil()</script>"],
    });

    expect(malicious.fullHtmlPreview).not.toContain('<script>alert("xss")</script>');
    expect(malicious.fullHtmlPreview).not.toContain("<img src=x onerror=alert(1)>");
    expect(malicious.infoboxAndFanOutHtml).toContain("&lt;script&gt;");
  });
});
