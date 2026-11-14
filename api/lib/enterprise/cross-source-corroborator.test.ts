import { describe, it, expect } from "vitest";
import { corroborateCrossSourceEntities } from "./cross-source-corroborator";

describe("Enterprise AIO Cross-Source Entity Corroborator & Consensus Velocity", () => {
  it("passes with Entity Conflict Count = 0 when normalized NAP, domain, and credentials align", () => {
    const res = corroborateCrossSourceEntities(
      {
        name: "WEB-READY/AG",
        domain: "https://web-ready.ag",
        phone: "+1-813-555-0199",
        street: "400 N Tampa St Ste 1500",
        city: "Tampa",
        state: "FL",
        postalCode: "33602",
        services: ["SEO", "AEO", "GEO", "AIO"],
        credentials: ["Enterprise Search Architecture"],
      },
      [
        {
          source: "gbp",
          name: "WEB-READY/AG",
          domain: "https://www.web-ready.ag/",
          phone: "(813) 555-0199",
          street: "400 North Tampa Street Suite 1500",
          city: "Tampa",
          state: "FL",
          postalCode: "33602",
        },
        {
          source: "wikidata",
          name: "WEB-READY/AG",
          domain: "web-ready.ag",
        },
        {
          source: "apple_business_connect",
          name: "WEB-READY/AG",
          phone: "8135550199",
          city: "Tampa",
          state: "FL",
        },
      ],
      { thirdPartyCitations90d: 24, favorableSentimentPct: 95 },
    );

    expect(res.entityConflictCount).toBe(0);
    expect(res.conflicts).toEqual([]);
    expect(res.passesZeroConflictTarget).toBe(true);
    expect(res.passesConsensusVelocity).toBe(true);
    expect(res.passed).toBe(true);
    expect(res.score).toBe(100);
  });

  it("detects cross-source NAP, domain, and name mismatches and sub-target consensus velocity", () => {
    const res = corroborateCrossSourceEntities(
      {
        name: "WEB-READY/AG",
        domain: "web-ready.ag",
        phone: "813-555-0199",
        city: "Tampa",
        state: "FL",
      },
      [
        {
          source: "bbb",
          name: "Legacy Agency LLC",
          domain: "old-agency.com",
          phone: "305-555-9999",
          city: "Miami",
          state: "FL",
        },
      ],
      { thirdPartyCitations90d: 4, favorableSentimentPct: 70 },
    );

    expect(res.entityConflictCount).toBe(4);
    expect(res.conflicts.map((c) => c.field).sort()).toEqual(["city", "domain", "name", "phone"]);
    expect(res.passesZeroConflictTarget).toBe(false);
    expect(res.passesConsensusVelocity).toBe(false);
    expect(res.passed).toBe(false);
    expect(res.score).toBeLessThan(50);
  });
});
