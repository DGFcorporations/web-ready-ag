import type {
  CanonicalEntityProfile,
  CrossSourceCorroborationResult,
  EntityConflict,
  ExternalEntitySnapshot,
} from "./types";

function normalizeHost(rawDomain: string): string {
  const clean = rawDomain.trim().toLowerCase();
  if (!clean) return "";
  try {
    const withProto = /^https?:\/\//i.test(clean) ? clean : `https://${clean}`;
    return new URL(withProto).hostname.replace(/^www\./, "");
  } catch {
    return clean.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  }
}

function normalizePhone(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return digits;
}

function normalizeStreet(rawStreet: string): string {
  return rawStreet
    .toLowerCase()
    .replace(/[.,#]/g, " ")
    .replace(/\bnorth\b/g, "n")
    .replace(/\bsouth\b/g, "s")
    .replace(/\beast\b/g, "e")
    .replace(/\bwest\b/g, "w")
    .replace(/\bstreet\b/g, "st")
    .replace(/\bavenue\b/g, "ave")
    .replace(/\bboulevard\b/g, "blvd")
    .replace(/\bsuite\b/g, "ste")
    .replace(/\broad\b/g, "rd")
    .replace(/\bdrive\b/g, "dr")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeText(val: string): string {
  return val.trim().toLowerCase().replace(/\s+/g, " ");
}

function missingSetValues(expected: string[] = [], observed: string[] = []): string[] {
  const normalizedObserved = new Set(observed.map(normalizeText));
  return expected.filter((value) => !normalizedObserved.has(normalizeText(value)));
}

export function corroborateCrossSourceEntities(
  canonical: CanonicalEntityProfile,
  externalSources: ExternalEntitySnapshot[],
  consensusMetrics?: {
    thirdPartyCitations90d?: number;
    favorableSentimentPct?: number;
  },
): CrossSourceCorroborationResult {
  const conflicts: EntityConflict[] = [];

  for (const ext of externalSources) {
    if (ext.name && normalizeText(ext.name) !== normalizeText(canonical.name)) {
      conflicts.push({
        source: ext.source,
        field: "name",
        expected: canonical.name,
        actual: ext.name,
        severity: "critical",
      });
    }
    if (ext.domain && normalizeHost(ext.domain) !== normalizeHost(canonical.domain)) {
      conflicts.push({
        source: ext.source,
        field: "domain",
        expected: normalizeHost(canonical.domain),
        actual: normalizeHost(ext.domain),
        severity: "critical",
      });
    }
    if (
      ext.phone &&
      canonical.phone &&
      normalizePhone(ext.phone) !== normalizePhone(canonical.phone)
    ) {
      conflicts.push({
        source: ext.source,
        field: "phone",
        expected: canonical.phone,
        actual: ext.phone,
        severity: "critical",
      });
    }
    if (
      ext.street &&
      canonical.street &&
      normalizeStreet(ext.street) !== normalizeStreet(canonical.street)
    ) {
      conflicts.push({
        source: ext.source,
        field: "street",
        expected: canonical.street,
        actual: ext.street,
        severity: "warning",
      });
    }
    if (
      ext.city &&
      canonical.city &&
      normalizeText(ext.city) !== normalizeText(canonical.city)
    ) {
      conflicts.push({
        source: ext.source,
        field: "city",
        expected: canonical.city,
        actual: ext.city,
        severity: "critical",
      });
    }
    if (
      ext.state &&
      canonical.state &&
      normalizeText(ext.state) !== normalizeText(canonical.state)
    ) {
      conflicts.push({
        source: ext.source,
        field: "state",
        expected: canonical.state,
        actual: ext.state,
        severity: "warning",
      });
    }
    if (
      ext.postalCode &&
      canonical.postalCode &&
      ext.postalCode.trim().slice(0, 5) !== canonical.postalCode.trim().slice(0, 5)
    ) {
      conflicts.push({
        source: ext.source,
        field: "postalCode",
        expected: canonical.postalCode,
        actual: ext.postalCode,
        severity: "warning",
      });
    }
    if (canonical.services && ext.services) {
      const missingServices = missingSetValues(canonical.services, ext.services);
      if (missingServices.length > 0 || missingSetValues(ext.services, canonical.services).length > 0) {
        conflicts.push({
          source: ext.source,
          field: "services",
          expected: canonical.services.join(", "),
          actual: ext.services.join(", "),
          severity: "warning",
        });
      }
    }
    if (canonical.credentials && ext.credentials) {
      const missingCredentials = missingSetValues(
        canonical.credentials,
        ext.credentials,
      );
      if (missingCredentials.length > 0 || missingSetValues(ext.credentials, canonical.credentials).length > 0) {
        conflicts.push({
          source: ext.source,
          field: "credentials",
          expected: canonical.credentials.join(", "),
          actual: ext.credentials.join(", "),
          severity: "critical",
        });
      }
    }
  }

  const thirdPartyCitations90d = consensusMetrics?.thirdPartyCitations90d ?? 0;
  const favorableSentimentPct = consensusMetrics?.favorableSentimentPct ?? 0;

  const entityConflictCount = conflicts.length;
  const passesZeroConflictTarget = externalSources.length > 0 && entityConflictCount === 0;
  const passesConsensusVelocity =
    thirdPartyCitations90d >= 20 && favorableSentimentPct >= 90;

  let score = 100;
  if (!passesZeroConflictTarget) {
    const criticalCount = conflicts.filter((c) => c.severity === "critical").length;
    const warningCount = conflicts.length - criticalCount;
    score -= Math.min(70, criticalCount * 18 + warningCount * 10);
  }
  if (externalSources.length === 0) {
    score -= 15;
  }
  if (
    consensusMetrics !== undefined &&
    (thirdPartyCitations90d < 20 || favorableSentimentPct < 90)
  ) {
    score -= 20;
  }

  score = Math.max(0, Math.min(100, score));
  const passed =
    passesZeroConflictTarget &&
    (consensusMetrics === undefined || passesConsensusVelocity);

  return {
    score,
    passed,
    sourcesChecked: externalSources.map((s) => s.source),
    entityConflictCount,
    conflicts,
    thirdPartyCitations90d,
    favorableSentimentPct,
    passesZeroConflictTarget,
    passesConsensusVelocity,
  };
}
