import { describe, it, expect } from "vitest";
import {
  validatePublicAuditUrl,
  safeFetchText,
  probeAndAuditLiveUrl,
} from "./url-guard";
import { buildCanonicalRobotsTxt } from "./titan-engine";
import { injectMeta, resolveRouteMeta } from "./html-inject";

describe("SSRF-Safe URL Guard & Live Probe Auditor (url-guard)", () => {
  describe("validatePublicAuditUrl", () => {
    it("accepts valid public https and http URLs and normalizes bare domains", () => {
      const r1 = validatePublicAuditUrl("https://my.clevelandclinic.org/health");
      expect(r1.ok).toBe(true);
      expect(r1.url?.href).toBe("https://my.clevelandclinic.org/health");
      expect(r1.origin).toBe("https://my.clevelandclinic.org");

      const r2 = validatePublicAuditUrl("en.wikipedia.org/wiki/Search_engine_optimization");
      expect(r2.ok).toBe(true);
      expect(r2.url?.href).toBe("https://en.wikipedia.org/wiki/Search_engine_optimization");
    });

    it("rejects non-http/https protocols (file, ftp, javascript, data, gopher)", () => {
      for (const bad of [
        "file:///etc/passwd",
        "ftp://example.com/file.txt",
        "javascript:alert(1)",
        "data:text/html,<h1>hi</h1>",
        "gopher://127.0.0.1:70",
      ]) {
        const res = validatePublicAuditUrl(bad);
        expect(res.ok).toBe(false);
        expect(res.reason).toMatch(/scheme|protocol|invalid/i);
      }
    });

    it("rejects localhost, loopback IPs, and unspecified addresses", () => {
      for (const loopback of [
        "http://localhost:3000/api",
        "https://localhost",
        "http://127.0.0.1:8080",
        "http://127.255.255.254",
        "http://0.0.0.0:5000",
        "http://[::1]:3000",
        "http://[::]",
        "http://2130706433", // decimal 127.0.0.1
        "http://0x7f000001", // hex 127.0.0.1
      ]) {
        const res = validatePublicAuditUrl(loopback);
        expect(res.ok).toBe(false);
      }
    });

    it("rejects RFC1918 private networks, Tailscale CGNAT, link-local cloud metadata, and IPv6 transition ranges", () => {
      for (const priv of [
        "http://10.0.0.1/admin",
        "http://10.255.255.255",
        "http://172.16.0.1",
        "http://172.31.255.255",
        "http://192.168.0.1",
        "http://192.168.1.254",
        "http://100.90.174.74:8000", // CGNAT / Tailscale 100.64.0.0/10
        "http://169.254.169.254/latest/meta-data/",
        "http://[::ffff:169.254.169.254]/latest/meta-data/",
        "http://[::ffff:127.0.0.1]/",
        "http://[::127.0.0.1]/", // IPv4-compatible IPv6 normalized to [::7f00:1]
        "http://[::169.254.169.254]/", // IPv4-compatible IPv6 normalized to [::a9fe:a9fe]
        "http://[64:ff9b::169.254.169.254]/", // NAT64 embedding metadata IP
        "http://[2002:7f00:1::]/", // 6to4 embedding 127.0.0.1
        "http://[2001::1]/", // Teredo
        "http://[100::1]/", // Discard-only prefix
        "http://[fe80::1]/",
        "http://[fd00::1]/",
      ]) {
        const res = validatePublicAuditUrl(priv);
        expect(res.ok).toBe(false);
      }
    });

    it("rejects non-standard TCP ports to prevent cross-host port scanning while allowing 80 and 443", () => {
      for (const blockedPort of [
        "http://example.com:6379/",
        "http://example.com:22/",
        "https://example.com:5432/",
        "http://93.184.216.34:8080/",
      ]) {
        const res = validatePublicAuditUrl(blockedPort);
        expect(res.ok).toBe(false);
        expect(res.reason).toMatch(/port/i);
      }

      expect(validatePublicAuditUrl("http://example.com:80/").ok).toBe(true);
      expect(validatePublicAuditUrl("https://example.com:443/").ok).toBe(true);
    });

    it("allows public IPv4 and IPv6 addresses outside private ranges", () => {
      expect(validatePublicAuditUrl("https://172.15.0.1").ok).toBe(true);
      expect(validatePublicAuditUrl("https://172.32.0.1").ok).toBe(true);
      expect(validatePublicAuditUrl("https://93.184.216.34").ok).toBe(true);
      expect(validatePublicAuditUrl("https://[2606:4700:4700::1111]/").ok).toBe(true);
    });

    it("rejects internal/reserved hostnames, trailing-dot bypasses, rebinding domains, and embedded credentials", () => {
      for (const badHost of [
        "http://metadata.google.internal/computeMetadata/v1/",
        "http://metadata.google.internal./computeMetadata/v1/",
        "http://localhost./admin",
        "https://db.internal",
        "https://printer.local",
        "https://intranet.corp",
        "https://127.0.0.1.nip.io",
        "https://localtest.me",
        "https://app.lvh.me",
        "https://singlelabel",
        "https://user:password@example.com/secret",
      ]) {
        const res = validatePublicAuditUrl(badHost);
        expect(res.ok).toBe(false);
      }
    });
  });

  describe("safeFetchText", () => {
    it("blocks SSRF redirect hops that point to private or metadata IPs or disallowed schemes", async () => {
      const mockFetch: typeof fetch = async (input) => {
        const urlStr = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        if (urlStr === "https://evil-redirect.example.com/") {
          return new Response(null, {
            status: 302,
            headers: { location: "http://169.254.169.254/latest/meta-data/" },
          });
        }
        return new Response("secret-keys", { status: 200 });
      };

      const res = await safeFetchText("https://evil-redirect.example.com/", {
        fetchImpl: mockFetch,
      });

      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/redirect|blocked|private|metadata/i);
    });

    it("aborts redirect loops exceeding MAX_REDIRECT_HOPS (3)", async () => {
      let hopCount = 0;
      const mockFetch: typeof fetch = async () => {
        hopCount += 1;
        return new Response(null, {
          status: 302,
          headers: { location: `https://loop.example.com/step-${hopCount}` },
        });
      };

      const res = await safeFetchText("https://loop.example.com/start", {
        fetchImpl: mockFetch,
      });

      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/Exceeded maximum redirect hops/i);
    });

    it("blocks DNS rebinding when a public domain resolves to a private or loopback IPv4 or IPv6", async () => {
      const mockFetch: typeof fetch = async () =>
        new Response("internal-secret", { status: 200 });

      const resV4 = await safeFetchText("https://rebind-attack.example.com/", {
        fetchImpl: mockFetch,
        dnsLookup: async () => [{ address: "169.254.169.254", family: 4 }],
      });
      expect(resV4.ok).toBe(false);
      expect(resV4.error).toMatch(/DNS|resolved|private|metadata/i);

      const resV6 = await safeFetchText("https://rebind-ipv6.example.com/", {
        fetchImpl: mockFetch,
        dnsLookup: async () => [{ address: "::ffff:127.0.0.1", family: 6 }],
      });
      expect(resV6.ok).toBe(false);
      expect(resV6.error).toMatch(/DNS|resolved|private|loopback/i);
    });

    it("truncates response payloads exceeding maxBytes without crashing", async () => {
      const hugeBody = "A".repeat(50_000);
      const mockFetch: typeof fetch = async () =>
        new Response(hugeBody, { status: 200 });

      const res = await safeFetchText("https://example.com/", {
        fetchImpl: mockFetch,
        maxBytes: 4096,
      });

      expect(res.ok).toBe(true);
      expect(res.text.length).toBeLessThanOrEqual(4096);
    });
  });

  describe("probeAndAuditLiveUrl", () => {
    it("audits a live URL across HTML, /robots.txt, /llms.txt, and /llms-full.txt", async () => {
      const baseHtml = `<!doctype html><html lang="en"><head><meta charset="UTF-8" /><title>Placeholder</title></head><body><div id="root"></div></body></html>`;
      const meta = await resolveRouteMeta("/");
      const titanHtml = injectMeta(baseHtml, meta!);
      const canonicalRobots = buildCanonicalRobotsTxt("https://web-ready.ag");

      const mockFetch: typeof fetch = async (input) => {
        const urlStr = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        if (urlStr.endsWith("/robots.txt")) {
          return new Response(canonicalRobots, { status: 200 });
        }
        if (urlStr.endsWith("/llms.txt") || urlStr.endsWith("/llms-full.txt")) {
          return new Response("# WEB-READY/AG LLMs Corpus", { status: 200 });
        }
        return new Response(titanHtml, { status: 200 });
      };

      const outcome = await probeAndAuditLiveUrl("https://web-ready.ag/", {
        fetchImpl: mockFetch,
      });

      expect(outcome.probe.reachable).toBe(true);
      expect(outcome.probe.httpStatus).toBe(200);
      expect(outcome.probe.hasLlmsTxt).toBe(true);
      expect(outcome.probe.hasLlmsFullTxt).toBe(true);
      expect(outcome.audit.overallScore).toBeGreaterThanOrEqual(95);
      expect(outcome.audit.layers.every((l) => l.passed)).toBe(true);
    });

    it("rejects SPA HTML catch-all responses masquerading as 200 OK on /robots.txt and /llms.txt", async () => {
      const spaFallback = `<!doctype html><html><head><title>SPA</title></head><body><div id="root"></div></body></html>`;
      const mockFetch: typeof fetch = async () =>
        new Response(spaFallback, { status: 200 });

      const outcome = await probeAndAuditLiveUrl("https://catchall-spa.example.com/", {
        fetchImpl: mockFetch,
      });

      expect(outcome.probe.reachable).toBe(true);
      expect(outcome.probe.hasRobotsTxt).toBe(false);
      expect(outcome.probe.hasLlmsTxt).toBe(false);
      expect(outcome.probe.hasLlmsFullTxt).toBe(false);
    });

    it("reports HTTP 403 WAF blocks (Mayo Clinic pattern) as a Layer 1 & Layer 7 failure with consistent scores", async () => {
      const mockFetch: typeof fetch = async () =>
        new Response("Access Denied - Akamai Ghost", { status: 403 });

      const outcome = await probeAndAuditLiveUrl("https://www.mayoclinic.org/", {
        fetchImpl: mockFetch,
      });

      expect(outcome.probe.reachable).toBe(false);
      expect(outcome.probe.httpStatus).toBe(403);
      expect(outcome.probe.wafBlocked).toBe(true);
      expect(outcome.audit.layers[0].passed).toBe(false);
      expect(outcome.audit.layers[0].remediation[0]).toMatch(/403|WAF/i);
      expect(outcome.audit.layers[6].passed).toBe(false);
      expect(outcome.audit.layers[6].score).toBe(0);
      const expectedAverage = Math.round(
        outcome.audit.layers.reduce((acc, l) => acc + l.score, 0) / outcome.audit.layers.length,
      );
      expect(outcome.audit.overallScore).toBe(expectedAverage);
      expect(outcome.audit.nextSingleLayerToExecute.layerNumber).toBe(1);
    });
  });
});
