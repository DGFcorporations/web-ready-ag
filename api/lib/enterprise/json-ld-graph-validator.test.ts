import { describe, it, expect } from "vitest";
import { validateJsonLdKnowledgeGraph } from "./json-ld-graph-validator";

describe("Enterprise AEO/GEO Connected @id JSON-LD Knowledge Graph Validator", () => {
  it("validates a connected @graph with Organization -> WebSite -> WebPage -> Service/FAQPage/Person, normalized Wikidata URIs, and zero dangling @id refs", () => {
    const html = `<!doctype html><html><head>
      <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Organization",
            "@id": "https://web-ready.ag/#organization",
            "name": "WEB-READY/AG",
            "url": "https://web-ready.ag",
            "sameAs": [
              "https://www.wikidata.org/entity/Q180711",
              "https://www.linkedin.com/company/web-ready-ag"
            ]
          },
          {
            "@type": "WebSite",
            "@id": "https://web-ready.ag/#website",
            "url": "https://web-ready.ag",
            "publisher": { "@id": "https://web-ready.ag/#organization" }
          },
          {
            "@type": "Person",
            "@id": "https://web-ready.ag/#person-chandler",
            "name": "Josh Chandler",
            "worksFor": { "@id": "https://web-ready.ag/#organization" },
            "hasCredential": {
              "@type": "EducationalOccupationalCredential",
              "credentialCategory": "Enterprise Search Architecture Lead"
            },
            "sameAs": [
              "https://www.linkedin.com/in/joshchandler",
              "https://orcid.org/0000-0002-1825-0097"
            ]
          },
          {
            "@type": "WebPage",
            "@id": "https://web-ready.ag/services/#webpage",
            "url": "https://web-ready.ag/services",
            "isPartOf": { "@id": "https://web-ready.ag/#website" },
            "author": { "@id": "https://web-ready.ag/#person-chandler" },
            "mainEntity": { "@id": "https://web-ready.ag/services/#service" },
            "dateModified": "2026-11-13"
          },
          {
            "@type": "Service",
            "@id": "https://web-ready.ag/services/#service",
            "name": "Enterprise 4-Layer Search Architecture",
            "provider": { "@id": "https://web-ready.ag/#organization" }
          },
          {
            "@type": "FAQPage",
            "@id": "https://web-ready.ag/services/#faq",
            "isPartOf": { "@id": "https://web-ready.ag/services/#webpage" }
          }
        ]
      }
      </script>
    </head><body></body></html>`;

    const res = validateJsonLdKnowledgeGraph(html);
    expect(res.parseErrors).toEqual([]);
    expect(res.schemaOrgContextValid).toBe(true);
    expect(res.duplicateChildContexts).toBe(0);
    expect(res.danglingIdRefs).toEqual([]);
    expect(res.hasConnectedCoreGraph).toBe(true);
    expect(res.hasPersonEeat).toBe(true);
    expect(res.personCredentialDetails.hasCredential).toBe(true);
    expect(res.personCredentialDetails.hasWorksFor).toBe(true);
    expect(res.personCredentialDetails.institutionalSameAs.length).toBeGreaterThanOrEqual(2);
    expect(res.invalidScholarlyQids).toEqual([]);
    expect(res.schemaErrors).toEqual([]);
    expect(res.passed).toBe(true);
    expect(res.score).toBe(100);
  });

  it("flags malformed JSON-LD, dangling @id references, duplicate child @context, and scholarly Q-IDs", () => {
    const html = `<!doctype html><html><head>
      <script type="application/ld+json">{ invalid json</script>
      <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            "@id": "https://example.com/#webpage",
            "isPartOf": { "@id": "https://example.com/#missing-website" },
            "about": { "@id": "http://www.wikidata.org/entity/Q13442814" }
          }
        ]
      }
      </script>
    </head><body></body></html>`;

    const res = validateJsonLdKnowledgeGraph(html);
    expect(res.passed).toBe(false);
    expect(res.parseErrors.length).toBe(1);
    expect(res.duplicateChildContexts).toBe(1);
    expect(res.danglingIdRefs).toContain("https://example.com/#missing-website");
    expect(res.invalidScholarlyQids).toContain("Q13442814");
    expect(res.normalizedWikidataUris).toContain("https://www.wikidata.org/entity/Q13442814");
    expect(res.schemaErrors.length).toBeGreaterThan(0);
  });
});
