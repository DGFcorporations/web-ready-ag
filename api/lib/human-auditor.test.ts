import { describe, it, expect } from "vitest";
import { auditHumanGradePage } from "./human-auditor";
import { auditMobileVitals } from "./mobile-vitals";
import { auditContrast, calculateContrastRatio, parseColor } from "./contrast-checker";
import { buildLinkGraph, extractInternalLinks, normalizePath } from "./link-graph";
import { auditClientRuntime, parseCspDirectives, isAllowedByCsp } from "./client-runtime";
import { auditHtmlAgainstTitanStandard } from "./titan-engine";

describe("Human-Grade WebAG Audits — Mobile TBT, WCAG Contrast, Orphan Crawler & CSP/Console", () => {
  describe("1. Mobile Device Emulation & Lab TBT (390px Viewport)", () => {
    it("detects unthrottled canvas animation loops and flags catastrophic mobile TBT", () => {
      const htmlWithHeavyCanvas = `<!doctype html>
      <html>
        <head><title>3D Canvas Site</title></head>
        <body>
          <canvas id="hero-canvas"></canvas>
          <script>
            const canvas = document.getElementById('hero-canvas');
            const ctx = canvas.getContext('2d');
            function animate() {
              ctx.clearRect(0, 0, 1000, 1000);
              requestAnimationFrame(animate);
            }
            animate();
          </script>
        </body>
      </html>`;

      const result = auditMobileVitals(htmlWithHeavyCanvas, { viewportWidth: 390 });
      expect(result.viewport.isMobile).toBe(true);
      expect(result.heavyCanvasDetected).toBe(true);
      expect(result.unthrottledAnimationLoops.length).toBeGreaterThan(0);
      expect(result.estimatedTbtMs).toBeGreaterThan(600); // Exceeds 600ms critical threshold (9,090ms catastrophe pattern)
      expect(result.passed).toBe(false);
      expect(result.severity).toBe("CRITICAL");
    });

    it("passes when canvas animation is responsive and gated by media queries or mobile guards", () => {
      const responsiveCanvasHtml = `<!doctype html>
      <html>
        <head><title>Optimized Canvas Site</title></head>
        <body>
          <canvas id="hero-canvas"></canvas>
          <script>
            if (window.matchMedia('(min-width: 768px)').matches) {
              const canvas = document.getElementById('hero-canvas');
              const ctx = canvas.getContext('2d');
              function animate() {
                ctx.clearRect(0, 0, 1000, 1000);
                requestAnimationFrame(animate);
              }
              animate();
            }
          </script>
        </body>
      </html>`;

      const result = auditMobileVitals(responsiveCanvasHtml, { viewportWidth: 390 });
      expect(result.unthrottledAnimationLoops).toHaveLength(0);
      expect(result.passed).toBe(true);
      expect(result.severity).toBe("PASS");
    });
  });

  describe("2. Computed WCAG AA Contrast & Theme Bleed", () => {
    it("calculates relative luminance and contrast ratios accurately according to W3C spec", () => {
      const white = parseColor("#ffffff")!;
      const black = parseColor("#000000")!;
      expect(calculateContrastRatio(white, black)).toBe(21);

      // Pale gray (#cbd5e1 - Tailwind slate-300) on white (#ffffff)
      const slate300 = parseColor("#cbd5e1")!;
      const ratio = calculateContrastRatio(slate300, white);
      expect(ratio).toBeLessThan(3.0); // Fails normal text (4.5:1) and large text (3.0:1)
    });

    it("identifies theme bleed and pale text violations on light background containers", () => {
      const themeBleedHtml = `<!doctype html>
      <html>
        <body class="bg-white">
          <div class="card bg-white">
            <h1 class="text-3xl text-slate-800">Readable Heading</h1>
            <p class="text-slate-300">This pale text is completely unreadable on white.</p>
            <span class="badge text-white bg-slate-100">Unreadable Badge</span>
          </div>
        </body>
      </html>`;

      const result = auditContrast(themeBleedHtml);
      expect(result.passed).toBe(false);
      expect(result.themeBleedDetected).toBe(true);
      expect(result.violations.length).toBeGreaterThan(0);

      const paleTextViolation = result.violations.find((v) => v.sampleText.includes("pale text"));
      expect(paleTextViolation).toBeDefined();
      expect(paleTextViolation?.contrastRatio).toBeLessThan(3.0);
    });
  });

  describe("3. Internal Link Graph & True Orphan Page Crawler", () => {
    it("identifies orphan pages declared in sitemap.xml with zero inbound links", () => {
      const homepageHtml = `<!doctype html>
      <html>
        <body>
          <a href="/about">About Us</a>
          <a href="/services">Services</a>
          <a href="/contact">Contact</a>
        </body>
      </html>`;

      const aboutHtml = `<!doctype html><html><body><a href="/">Home</a><a href="/contact">Contact</a></body></html>`;
      const servicesHtml = `<!doctype html><html><body><a href="/">Home</a></body></html>`;
      const contactHtml = `<!doctype html><html><body><a href="/">Home</a></body></html>`;

      // /med-spas/ is in the sitemap, but NOT linked anywhere in the DOM link graph!
      const sitemap = `<urlset>
        <loc>https://example.com/</loc>
        <loc>https://example.com/about</loc>
        <loc>https://example.com/services</loc>
        <loc>https://example.com/contact</loc>
        <loc>https://example.com/med-spas</loc>
      </urlset>`;

      const pages = [
        { url: "https://example.com/", html: homepageHtml },
        { url: "https://example.com/about", html: aboutHtml },
        { url: "https://example.com/services", html: servicesHtml },
        { url: "https://example.com/contact", html: contactHtml },
      ];

      const graph = buildLinkGraph(pages, {
        homepageUrl: "https://example.com/",
        sitemapUrls: ["https://example.com/med-spas"],
      });

      expect(graph.passed).toBe(false);
      expect(graph.orphanPages).toContain("/med-spas");
      expect(graph.inDegreeMap["/med-spas"]).toBe(0);
      expect(graph.homepageClickDepth["/about"]).toBe(1);
    });

    it("normalizes internal and external paths without breaking on malformed links", () => {
      expect(normalizePath("/about/", "https://example.com")).toBe("/about");
      expect(normalizePath("https://example.com/services", "https://example.com")).toBe("/services");
      expect(normalizePath("https://external.com/page", "https://example.com")).toBeNull();
      expect(normalizePath("javascript:void(0)", "https://example.com")).toBeNull();
      expect(normalizePath("#section-1", "https://example.com")).toBeNull();
    });
  });

  describe("4. Client-Side Console Errors & CSP Violations", () => {
    it("detects unconfigured Voiceflow chatbot widgets and CSP directive conflicts", () => {
      const unconfiguredWidgetHtml = `<!doctype html>
      <html>
        <head>
          <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; connect-src 'self';" />
          <script type="text/javascript">
            (function(d, t) {
                var v = d.createElement(t), s = d.getElementsByTagName(t)[0];
                v.onload = function() {
                  window.voiceflow.chat.load({
                    target: document.body,
                    projectID: 'YOUR_PROJECT_ID'
                  });
                }
                v.src = "https://cdn.voiceflow.com/widget/bundle.mjs";
                v.type = "text/javascript";
                s.parentNode.insertBefore(v, s);
            })(document, 'script');
          </script>
        </head>
        <body><div id="root">App</div></body>
      </html>`;

      const result = auditClientRuntime(unconfiguredWidgetHtml);
      expect(result.passed).toBe(false);
      expect(result.unconfiguredChatbots.length).toBeGreaterThan(0);
      expect(result.unconfiguredChatbots[0].provider).toBe("Voiceflow");
      expect(result.cspViolations.length).toBeGreaterThan(0);
      expect(result.consoleErrors.length).toBeGreaterThan(0);
    });

    it("parses and validates CSP directives against allowed third-party origins", () => {
      const csp = "default-src 'self'; script-src 'self' cdn.voiceflow.com; connect-src 'self' *.voiceflow.com;";
      const directives = parseCspDirectives(csp);
      expect(directives["script-src"]).toContain("cdn.voiceflow.com");

      expect(isAllowedByCsp(directives["script-src"], directives["default-src"], "cdn.voiceflow.com")).toBe(true);
      expect(isAllowedByCsp(directives["connect-src"], directives["default-src"], "general-runtime.voiceflow.com")).toBe(true);
      expect(isAllowedByCsp(directives["connect-src"], directives["default-src"], "malicious.org")).toBe(false);
    });
  });

  describe("5. End-to-End Unified Human-Grade Audit & Titan Standard Integration", () => {
    it("fails Titan standard Layer 1 when mobile TBT exceeds threshold from canvas loop", () => {
      const defectiveHtml = `<!doctype html>
      <html lang="en">
        <head>
          <title>Defective Site</title>
          <meta name="description" content="A page with heavy animation loops and no mobile responsive guards" />
          <link rel="canonical" href="https://example.com/" />
        </head>
        <body>
          <div id="root">
            <main class="ag-prerender-shell">
              <canvas id="canvas"></canvas>
              <script>
                const ctx = document.getElementById('canvas').getContext('2d');
                function loop() { ctx.fillRect(0,0,10,10); requestAnimationFrame(loop); }
                loop();
              </script>
            </main>
          </div>
        </body>
      </html>`;

      const titanAudit = auditHtmlAgainstTitanStandard({
        url: "https://example.com/",
        html: defectiveHtml,
        robotsTxt: "User-agent: *\nAllow: /\nDisallow: /*?q=*\n",
      });

      // Layer 1 must fail due to mobile lab emulation & TBT check
      expect(titanAudit.layers[0].passed).toBe(false);
      const tbtCheck = titanAudit.layers[0].checks.find((c) => c.label.includes("Mobile lab emulation"));
      expect(tbtCheck?.passed).toBe(false);
    });

    it("fails Titan standard Layer 3 when declared sitemap route is an orphan page", () => {
      const siteHtml = `<!doctype html>
      <html lang="en">
        <head>
          <title>Site with Orphan Page</title>
          <meta name="description" content="Valid description" />
          <link rel="canonical" href="https://example.com/" />
          <script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"Test"}</script>
        </head>
        <body>
          <div id="root">
            <main class="ag-prerender-shell">
              <a href="/contact">Contact Us</a>
            </main>
          </div>
        </body>
      </html>`;

      const sitemap = `<urlset>
        <loc>https://example.com/</loc>
        <loc>https://example.com/contact</loc>
        <loc>https://example.com/med-spas</loc>
      </urlset>`;

      const titanAudit = auditHtmlAgainstTitanStandard({
        url: "https://example.com/",
        html: siteHtml,
        robotsTxt: "User-agent: *\nAllow: /\nDisallow: /*?q=*\n",
        sitemapXml: sitemap,
      });

      expect(titanAudit.layers[2].passed).toBe(false);
      const orphanCheck = titanAudit.layers[2].checks.find((c) => c.label.includes("Internal link graph & zero orphan pages"));
      expect(orphanCheck?.passed).toBe(false);
      expect(titanAudit.humanGradeAudit?.linkGraph.orphanPages).toContain("/med-spas");
    });

    it("filters out sub-sitemap .xml files from sitemapindex so they are not flagged as orphans", () => {
      const siteHtml = `<!doctype html><html><body><a href="/contact">Contact</a></body></html>`;
      const sitemapIndex = `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <sitemap><loc>https://example.com/sitemap-pages.xml</loc></sitemap>
        <sitemap><loc>https://example.com/sitemap-posts.xml</loc></sitemap>
      </sitemapindex>`;

      const audit = auditHumanGradePage({
        url: "https://example.com/",
        html: siteHtml,
        sitemapXml: sitemapIndex,
      });

      expect(audit.linkGraph.orphanPages).toEqual([]);
      expect(audit.linkGraph.nodes["/sitemap-pages.xml"]).toBeUndefined();
    });

    it("evaluates arbitrary hex and opacity Tailwind classes for contrast violations", () => {
      const defectiveHtml = `<!doctype html><html><body class="bg-white">
        <p class="text-[#cbd5e1]">Pale hex text</p>
        <span class="badge text-slate-300/80 bg-slate-50">Pale badge with opacity</span>
      </body></html>`;

      const audit = auditHumanGradePage({
        url: "https://example.com/",
        html: defectiveHtml,
      });

      expect(audit.contrast.passed).toBe(false);
      expect(audit.contrast.violationsCount).toBeGreaterThanOrEqual(1);
    });
  });
});
