import { useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Lock,
  Copy,
  Check,
  Search,
  Code2,
  Layers,
  ShieldCheck,
  Activity,
  Loader2,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import {
  WEB_AG_LAYERS,
  TARGET_ENGINES,
  auditHtmlAgainstTitanStandard,
  buildCanonicalRobotsTxt,
  type TitanAuditResult,
} from "../../api/lib/titan-engine";
import {
  generateTitanLayerArtifacts,
  type TitanArtifactBundle,
} from "../../api/lib/artifact-generator";

type WorkbenchTab = "pipeline" | "auditor" | "generator";
type AuditMode = "live" | "raw";

const DEFAULT_GENERATOR_INPUT = {
  domain: "https://web-ready.ag",
  brandName: "WEB-READY/AG",
  niche: "7-Layer AI & Search Dominance Platform",
  city: "Miami",
  state: "FL",
  servicesText: "Agent-Grade SEO & AEO, Wikidata Entity Graph, Top-of-DOM GEO Infobox",
  startingPrice: "$497/mo",
};

const WALLED_GARDEN_PRESET_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Legacy Walled-Garden SPA</title>
</head>
<body>
  <div id="root"></div>
</body>
</html>`;

const WALLED_GARDEN_PRESET_ROBOTS = `User-agent: OAI-SearchBot
Disallow: /

User-agent: GPTBot
Disallow: /

User-agent: PerplexityBot
Disallow: /

User-agent: Claude-SearchBot
Disallow: /

User-agent: BraveBot
Disallow: /
`;

function createDefaultBundle(): TitanArtifactBundle {
  return generateTitanLayerArtifacts({
    domain: DEFAULT_GENERATOR_INPUT.domain,
    brandName: DEFAULT_GENERATOR_INPUT.brandName,
    niche: DEFAULT_GENERATOR_INPUT.niche,
    city: DEFAULT_GENERATOR_INPUT.city,
    state: DEFAULT_GENERATOR_INPUT.state,
    services: DEFAULT_GENERATOR_INPUT.servicesText.split(",").map((s) => s.trim()),
    startingPrice: DEFAULT_GENERATOR_INPUT.startingPrice,
  });
}

function createDefaultAudit(bundle: TitanArtifactBundle): TitanAuditResult {
  return auditHtmlAgainstTitanStandard({
    url: bundle.normalizedDomain,
    html: bundle.fullHtmlPreview,
    robotsTxt: bundle.robotsTxt,
    hasLlmsTxt: true,
    hasLlmsFullTxt: true,
    ttfbMs: 38,
  });
}

function getScoreBadgeColor(score: number): string {
  if (score >= 85) return "text-[#22C55E] border-[#22C55E]/40 bg-[#22C55E]/10";
  if (score >= 60) return "text-[#C8A45C] border-[#C8A45C]/40 bg-[#C8A45C]/10";
  return "text-[#EF4444] border-[#EF4444]/40 bg-[#EF4444]/10";
}

export interface TitanEngineMatrixProps {
  compact?: boolean;
}

export default function TitanEngineMatrix({ compact = false }: TitanEngineMatrixProps) {
  const [initialBundle] = useState<TitanArtifactBundle>(() => createDefaultBundle());
  const [auditResult, setAuditResult] = useState<TitanAuditResult>(() =>
    createDefaultAudit(initialBundle),
  );
  const [artifactBundle, setArtifactBundle] = useState<TitanArtifactBundle>(initialBundle);

  const [activeTab, setActiveTab] = useState<WorkbenchTab>("pipeline");
  const [selectedLayerNumber, setSelectedLayerNumber] = useState<number>(1);
  const [selectedArtifactLayer, setSelectedArtifactLayer] = useState<number>(1);
  const [copiedLayer, setCopiedLayer] = useState<number | null>(null);

  // Auditor state
  const [auditMode, setAuditMode] = useState<AuditMode>("live");
  const [liveUrlInput, setLiveUrlInput] = useState<string>("https://en.wikipedia.org/wiki/Search_engine_optimization");
  const [rawUrlInput, setRawUrlInput] = useState<string>("https://web-ready.ag/");
  const [rawHtmlInput, setRawHtmlInput] = useState<string>(() => initialBundle.fullHtmlPreview);
  const [rawRobotsInput, setRawRobotsInput] = useState<string>(() =>
    buildCanonicalRobotsTxt("https://web-ready.ag"),
  );
  const [rawHasLlmsTxt, setRawHasLlmsTxt] = useState<boolean>(true);
  const [probeError, setProbeError] = useState<string | null>(null);
  const [probeTelemetry, setProbeTelemetry] = useState<{
    httpStatus: number | null;
    ttfbMs: number;
    wafBlocked: boolean;
    hasRobotsTxt: boolean;
    hasLlmsTxt: boolean;
  } | null>(null);

  // Generator state
  const [domainInput, setDomainInput] = useState<string>(DEFAULT_GENERATOR_INPUT.domain);
  const [brandInput, setBrandInput] = useState<string>(DEFAULT_GENERATOR_INPUT.brandName);
  const [nicheInput, setNicheInput] = useState<string>(DEFAULT_GENERATOR_INPUT.niche);
  const [cityInput, setCityInput] = useState<string>(DEFAULT_GENERATOR_INPUT.city);
  const [stateInput, setStateInput] = useState<string>(DEFAULT_GENERATOR_INPUT.state);
  const [servicesInput, setServicesInput] = useState<string>(DEFAULT_GENERATOR_INPUT.servicesText);
  const [priceInput, setPriceInput] = useState<string>(DEFAULT_GENERATOR_INPUT.startingPrice);

  const liveProbeMutation = trpc.titan.auditLiveUrl.useMutation();

  const handleRunLiveProbe = async () => {
    setProbeError(null);
    try {
      const outcome = await liveProbeMutation.mutateAsync({ url: liveUrlInput });
      setProbeTelemetry({
        httpStatus: outcome.probe.httpStatus,
        ttfbMs: outcome.probe.ttfbMs,
        wafBlocked: outcome.probe.wafBlocked,
        hasRobotsTxt: outcome.probe.hasRobotsTxt,
        hasLlmsTxt: outcome.probe.hasLlmsTxt,
      });
      setAuditResult(outcome.audit);
      setSelectedLayerNumber(outcome.audit.nextSingleLayerToExecute.layerNumber);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Live URL probe failed.";
      setProbeError(message);
    }
  };

  const handleRunRawAudit = () => {
    setProbeError(null);
    setProbeTelemetry(null);
    const result = auditHtmlAgainstTitanStandard({
      url: rawUrlInput || "https://example.com/",
      html: rawHtmlInput,
      robotsTxt: rawRobotsInput,
      hasLlmsTxt: rawHasLlmsTxt,
      hasLlmsFullTxt: rawHasLlmsTxt,
      ttfbMs: 85,
    });
    setAuditResult(result);
    setSelectedLayerNumber(result.nextSingleLayerToExecute.layerNumber);
  };

  const handleLoadWalledGardenPreset = () => {
    setRawUrlInput("https://walled-garden-incumbent.example.com/");
    setRawHtmlInput(WALLED_GARDEN_PRESET_HTML);
    setRawRobotsInput(WALLED_GARDEN_PRESET_ROBOTS);
    setRawHasLlmsTxt(false);
  };

  const handleLoadTitanPreset = () => {
    setRawUrlInput(artifactBundle.normalizedDomain);
    setRawHtmlInput(artifactBundle.fullHtmlPreview);
    setRawRobotsInput(artifactBundle.robotsTxt);
    setRawHasLlmsTxt(true);
  };

  const buildCurrentBundle = (): TitanArtifactBundle => {
    const services = servicesInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return generateTitanLayerArtifacts({
      domain: domainInput,
      brandName: brandInput,
      niche: nicheInput,
      city: cityInput,
      state: stateInput,
      services,
      startingPrice: priceInput,
    });
  };

  const handleGenerateArtifacts = () => {
    setArtifactBundle(buildCurrentBundle());
  };

  const handleAuditGeneratedBundle = () => {
    const freshBundle = buildCurrentBundle();
    setArtifactBundle(freshBundle);
    const previewAudit = auditHtmlAgainstTitanStandard({
      url: freshBundle.normalizedDomain,
      html: freshBundle.fullHtmlPreview,
      robotsTxt: freshBundle.robotsTxt,
      hasLlmsTxt: true,
      hasLlmsFullTxt: true,
      ttfbMs: 42,
    });
    setAuditResult(previewAudit);
    setSelectedLayerNumber(previewAudit.nextSingleLayerToExecute.layerNumber);
    setActiveTab("pipeline");
  };

  const handleCopyArtifact = async (layerNum: number, code: string) => {
    try {
      await navigator.clipboard?.writeText(code);
    } catch {
      // Clipboard API may be unavailable in headless/test environments
    }
    setCopiedLayer(layerNum);
    setTimeout(() => setCopiedLayer(null), 2000);
  };

  const activeLayerSpec =
    WEB_AG_LAYERS.find((l) => l.layerNumber === selectedLayerNumber) || WEB_AG_LAYERS[0];
  const activeLayerAudit =
    auditResult.layers.find((l) => l.layerNumber === selectedLayerNumber) || auditResult.layers[0];
  const currentArtifact =
    artifactBundle.layerArtifacts.find((a) => a.layerNumber === selectedArtifactLayer) ||
    artifactBundle.layerArtifacts[0];

  const firstFailingLayerNum =
    auditResult.layers.find((l) => !l.passed)?.layerNumber ?? null;

  return (
    <section
      id="titan-workbench"
      aria-label="WebReady-AG 7-Layer Multi-Engine Dominance Workbench"
      style={{
        contentVisibility: "auto",
        containIntrinsicSize: "auto none auto 920px",
      }}
      className={`bg-[#0A0A0A] border-t border-[#1A1A1A] ${
        compact ? "py-10 px-4 lg:px-6" : "py-24 px-6 lg:px-10"
      }`}
    >
      <div className="max-w-[1280px] mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10">
          <div>
            <span className="font-mono text-[12px] text-[#C8A45C] uppercase tracking-[0.1em] inline-flex items-center gap-2">
              <ShieldCheck size={14} /> 7-Layer Single-Layer Execution Engine (Titan-Upgraded)
            </span>
            <h2 className="text-white text-[28px] md:text-[40px] font-bold mt-3 leading-tight">
              4-Engine #1 Rank Dominance Workbench
            </h2>
            <p className="text-[#8A8A8A] text-[15px] md:text-[16px] mt-2 max-w-[760px]">
              Engineered from live wire reverse-engineering of Wikipedia, Cleveland Clinic, NIH, G2, and Reddit.
              Audits any website and generates drop-in Layer 1–7 code artifacts to dominate Google, Perplexity, OpenAI Search, and Brave Search (Claude).
            </p>
          </div>

          {/* Overall Score Pill */}
          <div className="bg-[#141414] border border-[#2A2A2A] p-4 flex items-center gap-5 shrink-0">
            <div>
              <div className="font-mono text-[11px] text-[#8A8A8A] uppercase tracking-[0.08em]">
                Audited Target
              </div>
              <div className="text-white font-mono text-[13px] truncate max-w-[240px]">
                {auditResult.url}
              </div>
              <div className="font-mono text-[11px] text-[#C8A45C] mt-1">
                Mode: {auditResult.nextSingleLayerToExecute.mode}
              </div>
            </div>
            <div
              className={`px-4 py-2 border font-mono text-[24px] font-bold ${getScoreBadgeColor(
                auditResult.overallScore,
              )}`}
            >
              {auditResult.overallScore}
              <span className="text-[12px] font-normal">/100</span>
            </div>
          </div>
        </div>

        {/* 4-Engine Retrieval Scorecard */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {TARGET_ENGINES.map((engine) => {
            const score = auditResult.engineScores[engine.id];
            return (
              <div
                key={engine.id}
                className="bg-[#141414] border border-[#2A2A2A] p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-white font-semibold text-[15px]">
                      {engine.name}
                    </span>
                    <span
                      className={`font-mono text-[14px] font-bold px-2.5 py-0.5 border ${getScoreBadgeColor(
                        score,
                      )}`}
                    >
                      {score}/100
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-[#C8A45C] mb-2">
                    Crawlers: {engine.crawlers.slice(0, 3).join(", ")}
                  </div>
                  <p className="text-[#8A8A8A] text-[12px] leading-relaxed">
                    {engine.primarySignal}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#222222] font-mono text-[11px] text-[#666666]">
                  Titans: {engine.titanBenchmark}
                </div>
              </div>
            );
          })}
        </div>

        {/* Active Single-Layer State Machine Banner */}
        <div className="bg-[#141414] border border-[#2A2A2A] p-4 mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3">
            <Activity size={18} className="text-[#C8A45C] mt-0.5 shrink-0" />
            <div>
              <div className="text-white text-[14px] font-semibold">
                {auditResult.nextSingleLayerToExecute.mode === "REMEDIATE"
                  ? `Active Single-Layer Remediation: Layer ${auditResult.nextSingleLayerToExecute.layerNumber} (${auditResult.nextSingleLayerToExecute.skillId})`
                  : `All 7 Layers Verified (>= 80/100 Gate) — Active Mode: SENTINEL_LOOP`}
              </div>
              <div className="text-[#8A8A8A] text-[13px] mt-0.5">
                {auditResult.nextSingleLayerToExecute.actions[0]}
              </div>
            </div>
          </div>
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] px-3 py-1.5 bg-[#1A1A1A] border border-[#2A2A2A] text-[#C8A45C] shrink-0">
            Single-Layer Lock: &gt;= 80/100 Required to Advance
          </span>
        </div>

        {/* Workbench Mode Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-[#2A2A2A] mb-8">
          <button
            type="button"
            onClick={() => setActiveTab("pipeline")}
            className={`px-5 py-3 font-mono text-[12px] uppercase tracking-[0.08em] flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === "pipeline"
                ? "border-[#C8A45C] text-white bg-[#141414]"
                : "border-transparent text-[#8A8A8A] hover:text-white"
            }`}
          >
            <Layers size={14} /> 7-Layer Single-Layer Pipeline
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("auditor")}
            className={`px-5 py-3 font-mono text-[12px] uppercase tracking-[0.08em] flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === "auditor"
                ? "border-[#C8A45C] text-white bg-[#141414]"
                : "border-transparent text-[#8A8A8A] hover:text-white"
            }`}
          >
            <Search size={14} /> Live URL &amp; HTML Auditor
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("generator")}
            className={`px-5 py-3 font-mono text-[12px] uppercase tracking-[0.08em] flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === "generator"
                ? "border-[#C8A45C] text-white bg-[#141414]"
                : "border-transparent text-[#8A8A8A] hover:text-white"
            }`}
          >
            <Code2 size={14} /> Layer 1–7 Code Generator
          </button>
        </div>

        {/* TAB 1: 7-Layer Single-Layer Pipeline */}
        {activeTab === "pipeline" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: 7 Sequential Layers */}
            <div className="lg:col-span-5 space-y-2.5">
              {auditResult.layers.map((layer) => {
                const isSelected = layer.layerNumber === selectedLayerNumber;
                const isLockedByEarlierFailure =
                  firstFailingLayerNum !== null &&
                  layer.layerNumber > firstFailingLayerNum;

                return (
                  <button
                    key={layer.layerNumber}
                    type="button"
                    onClick={() => setSelectedLayerNumber(layer.layerNumber)}
                    className={`w-full text-left p-4 border transition-colors flex items-center justify-between gap-3 ${
                      isSelected
                        ? "bg-[#1A1A1A] border-[#C8A45C]"
                        : "bg-[#121212] border-[#242424] hover:border-[#3A3A3A]"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-[#C8A45C] uppercase">
                          Layer {layer.layerNumber}
                        </span>
                        <span className="font-mono text-[11px] text-[#8A8A8A]">
                          ({layer.skillId})
                        </span>
                      </div>
                      <div className="text-white font-semibold text-[14px] mt-1 truncate">
                        {layer.name}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isLockedByEarlierFailure ? (
                        <span className="font-mono text-[11px] text-[#8A8A8A] flex items-center gap-1 px-2 py-1 bg-[#1A1A1A] border border-[#2A2A2A]">
                          <Lock size={12} /> Queued
                        </span>
                      ) : layer.passed ? (
                        <span className="font-mono text-[12px] text-[#22C55E] flex items-center gap-1">
                          <CheckCircle2 size={14} /> {layer.score}%
                        </span>
                      ) : (
                        <span className="font-mono text-[12px] text-[#EF4444] flex items-center gap-1">
                          <AlertTriangle size={14} /> {layer.score}%
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right Column: Selected Layer Detail & Checks */}
            <div className="lg:col-span-7 bg-[#141414] border border-[#2A2A2A] p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#2A2A2A]">
                <div>
                  <span className="font-mono text-[11px] text-[#C8A45C] uppercase tracking-[0.08em]">
                    Layer {activeLayerSpec.layerNumber} • {activeLayerSpec.skillId}
                  </span>
                  <h3 className="text-white text-[20px] font-bold mt-1">
                    {activeLayerSpec.name}
                  </h3>
                </div>
                <span
                  className={`font-mono text-[14px] font-bold px-3 py-1 border ${getScoreBadgeColor(
                    activeLayerAudit.score,
                  )}`}
                >
                  {activeLayerAudit.score}/100 ({activeLayerAudit.passed ? "PASS" : "REMEDIATE"})
                </span>
              </div>

              <div className="mt-4 space-y-3 text-[14px]">
                <div>
                  <span className="font-mono text-[11px] text-[#8A8A8A] uppercase">
                    Reverse-Engineered Titan Pattern:
                  </span>
                  <div className="text-white font-medium mt-0.5">
                    {activeLayerSpec.titanPattern}
                  </div>
                </div>
                <div>
                  <span className="font-mono text-[11px] text-[#8A8A8A] uppercase">
                    Mechanism &amp; Objective:
                  </span>
                  <p className="text-[#B0B0B0] mt-0.5 leading-relaxed">
                    {activeLayerSpec.description}
                  </p>
                </div>
                <div>
                  <span className="font-mono text-[11px] text-[#8A8A8A] uppercase">
                    Verification Gate Command:
                  </span>
                  <code className="block mt-1 bg-[#0A0A0A] border border-[#2A2A2A] px-3 py-2 font-mono text-[12px] text-[#C8A45C]">
                    {activeLayerSpec.verificationGate}
                  </code>
                </div>
              </div>

              {/* Layer Checks */}
              <div className="mt-6">
                <div className="font-mono text-[11px] text-[#8A8A8A] uppercase tracking-[0.08em] mb-3">
                  Deterministic Layer {activeLayerSpec.layerNumber} Verification Checks
                </div>
                <div className="space-y-2">
                  {activeLayerAudit.checks.map((chk, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-3 p-3 bg-[#0A0A0A] border border-[#222222]"
                    >
                      <span className="text-white text-[13px]">{chk.label}</span>
                      {chk.passed ? (
                        <span className="font-mono text-[11px] text-[#22C55E] flex items-center gap-1 shrink-0">
                          <CheckCircle2 size={13} /> PASS
                        </span>
                      ) : (
                        <span className="font-mono text-[11px] text-[#EF4444] flex items-center gap-1 shrink-0">
                          <AlertTriangle size={13} /> FAIL
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedArtifactLayer(activeLayerSpec.layerNumber);
                    setActiveTab("generator");
                  }}
                  className="bg-[#C8A45C] text-[#0A0A0A] text-[13px] font-semibold px-5 py-2.5 hover:bg-[#D4BC7E] transition-colors"
                >
                  View Layer {activeLayerSpec.layerNumber} Drop-In Code Artifact
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Live URL & Raw HTML Auditor */}
        {activeTab === "auditor" && (
          <div className="bg-[#141414] border border-[#2A2A2A] p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAuditMode("live")}
                  className={`px-4 py-2 font-mono text-[12px] uppercase border transition-colors ${
                    auditMode === "live"
                      ? "bg-[#C8A45C] text-[#0A0A0A] border-[#C8A45C] font-semibold"
                      : "bg-[#0A0A0A] text-[#8A8A8A] border-[#2A2A2A] hover:text-white"
                  }`}
                >
                  Live URL Probe Mode (SSRF-Guarded)
                </button>
                <button
                  type="button"
                  onClick={() => setAuditMode("raw")}
                  className={`px-4 py-2 font-mono text-[12px] uppercase border transition-colors ${
                    auditMode === "raw"
                      ? "bg-[#C8A45C] text-[#0A0A0A] border-[#C8A45C] font-semibold"
                      : "bg-[#0A0A0A] text-[#8A8A8A] border-[#2A2A2A] hover:text-white"
                  }`}
                >
                  Raw HTML &amp; robots.txt Paste Mode
                </button>
              </div>
            </div>

            {auditMode === "live" ? (
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="titan-live-url-input"
                    className="block font-mono text-[11px] text-[#8A8A8A] uppercase mb-2"
                  >
                    Public Target Website URL (Probes /, /robots.txt, /llms.txt, and /llms-full.txt)
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      id="titan-live-url-input"
                      type="text"
                      value={liveUrlInput}
                      onChange={(e) => setLiveUrlInput(e.target.value)}
                      placeholder="https://example.com"
                      className="flex-1 bg-[#0A0A0A] border border-[#2A2A2A] text-white px-4 py-3 font-mono text-[13px] focus:outline-none focus:border-[#C8A45C]"
                    />
                    <button
                      type="button"
                      disabled={liveProbeMutation.isPending}
                      onClick={handleRunLiveProbe}
                      className="bg-[#C8A45C] text-[#0A0A0A] font-semibold text-[13px] px-6 py-3 hover:bg-[#D4BC7E] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {liveProbeMutation.isPending ? (
                        <>
                          <Loader2 size={15} className="animate-spin" /> Probing Target...
                        </>
                      ) : (
                        "Run 7-Layer Live Probe"
                      )}
                    </button>
                  </div>
                </div>

                {probeError && (
                  <div className="p-4 bg-[#EF4444]/10 border border-[#EF4444]/40 text-[#EF4444] font-mono text-[12px]">
                    Probe Guard Alert: {probeError}
                  </div>
                )}

                {probeTelemetry && (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                    <div className="bg-[#0A0A0A] border border-[#2A2A2A] p-3">
                      <div className="font-mono text-[10px] text-[#8A8A8A] uppercase">HTTP Status</div>
                      <div className="font-mono text-[15px] text-white font-bold mt-1">
                        {probeTelemetry.httpStatus ?? "ERR"}
                      </div>
                    </div>
                    <div className="bg-[#0A0A0A] border border-[#2A2A2A] p-3">
                      <div className="font-mono text-[10px] text-[#8A8A8A] uppercase">TTFB Latency</div>
                      <div className="font-mono text-[15px] text-white font-bold mt-1">
                        {probeTelemetry.ttfbMs}ms
                      </div>
                    </div>
                    <div className="bg-[#0A0A0A] border border-[#2A2A2A] p-3">
                      <div className="font-mono text-[10px] text-[#8A8A8A] uppercase">WAF Status</div>
                      <div className="font-mono text-[15px] text-white font-bold mt-1">
                        {probeTelemetry.wafBlocked
                          ? `BLOCKED (${probeTelemetry.httpStatus ?? 403})`
                          : probeTelemetry.httpStatus === null
                            ? "UNREACHABLE"
                            : "OPEN"}
                      </div>
                    </div>
                    <div className="bg-[#0A0A0A] border border-[#2A2A2A] p-3">
                      <div className="font-mono text-[10px] text-[#8A8A8A] uppercase">/robots.txt</div>
                      <div className="font-mono text-[15px] text-white font-bold mt-1">
                        {probeTelemetry.hasRobotsTxt ? "FOUND" : "MISSING"}
                      </div>
                    </div>
                    <div className="bg-[#0A0A0A] border border-[#2A2A2A] p-3">
                      <div className="font-mono text-[10px] text-[#8A8A8A] uppercase">/llms.txt</div>
                      <div className="font-mono text-[15px] text-white font-bold mt-1">
                        {probeTelemetry.hasLlmsTxt ? "ACTIVE" : "MISSING"}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleLoadWalledGardenPreset}
                    className="px-3 py-1.5 bg-[#0A0A0A] border border-[#2A2A2A] text-[#C8A45C] font-mono text-[11px] hover:border-[#C8A45C]"
                  >
                    Load Walled-Garden Empty SPA Preset
                  </button>
                  <button
                    type="button"
                    onClick={handleLoadTitanPreset}
                    className="px-3 py-1.5 bg-[#0A0A0A] border border-[#2A2A2A] text-[#22C55E] font-mono text-[11px] hover:border-[#22C55E]"
                  >
                    Load Titan-Upgraded WebReady-AG Preset
                  </button>
                </div>

                <div>
                  <label
                    htmlFor="titan-raw-url-input"
                    className="block font-mono text-[11px] text-[#8A8A8A] uppercase mb-1"
                  >
                    Canonical URL Context
                  </label>
                  <input
                    id="titan-raw-url-input"
                    type="text"
                    value={rawUrlInput}
                    onChange={(e) => setRawUrlInput(e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] text-white px-3 py-2 font-mono text-[12px]"
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="titan-raw-html-input"
                      className="block font-mono text-[11px] text-[#8A8A8A] uppercase mb-1"
                    >
                      Raw Server-Rendered HTML Document
                    </label>
                    <textarea
                      id="titan-raw-html-input"
                      rows={8}
                      value={rawHtmlInput}
                      onChange={(e) => setRawHtmlInput(e.target.value)}
                      className="w-full bg-[#0A0A0A] border border-[#2A2A2A] text-white p-3 font-mono text-[12px]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="titan-raw-robots-input"
                      className="block font-mono text-[11px] text-[#8A8A8A] uppercase mb-1"
                    >
                      robots.txt Content
                    </label>
                    <textarea
                      id="titan-raw-robots-input"
                      rows={8}
                      value={rawRobotsInput}
                      onChange={(e) => setRawRobotsInput(e.target.value)}
                      className="w-full bg-[#0A0A0A] border border-[#2A2A2A] text-white p-3 font-mono text-[12px]"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4">
                  <label className="inline-flex items-center gap-2 text-[#B0B0B0] text-[13px]">
                    <input
                      type="checkbox"
                      checked={rawHasLlmsTxt}
                      onChange={(e) => setRawHasLlmsTxt(e.target.checked)}
                    />
                    Domain serves active /llms.txt and /llms-full.txt manifests
                  </label>

                  <button
                    type="button"
                    onClick={handleRunRawAudit}
                    className="bg-[#C8A45C] text-[#0A0A0A] font-semibold text-[13px] px-6 py-2.5 hover:bg-[#D4BC7E] transition-colors"
                  >
                    Audit HTML Against Titan Standard
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Layer 1-7 Code Artifact Generator */}
        {activeTab === "generator" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Generator Form */}
            <div className="lg:col-span-5 bg-[#141414] border border-[#2A2A2A] p-6 space-y-4">
              <div className="font-mono text-[12px] text-[#C8A45C] uppercase tracking-[0.08em]">
                Target Property Profile
              </div>

              <div>
                <label
                  htmlFor="gen-domain-input"
                  className="block font-mono text-[11px] text-[#8A8A8A] uppercase mb-1"
                >
                  Target Domain
                </label>
                <input
                  id="gen-domain-input"
                  type="text"
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] text-white px-3 py-2 font-mono text-[13px]"
                />
              </div>

              <div>
                <label
                  htmlFor="gen-brand-input"
                  className="block font-mono text-[11px] text-[#8A8A8A] uppercase mb-1"
                >
                  Brand / Entity Name
                </label>
                <input
                  id="gen-brand-input"
                  type="text"
                  value={brandInput}
                  onChange={(e) => setBrandInput(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] text-white px-3 py-2 text-[13px]"
                />
              </div>

              <div>
                <label
                  htmlFor="gen-niche-input"
                  className="block font-mono text-[11px] text-[#8A8A8A] uppercase mb-1"
                >
                  Primary Niche / Category
                </label>
                <input
                  id="gen-niche-input"
                  type="text"
                  value={nicheInput}
                  onChange={(e) => setNicheInput(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] text-white px-3 py-2 text-[13px]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label
                    htmlFor="gen-city-input"
                    className="block font-mono text-[11px] text-[#8A8A8A] uppercase mb-1"
                  >
                    Primary City
                  </label>
                  <input
                    id="gen-city-input"
                    type="text"
                    value={cityInput}
                    onChange={(e) => setCityInput(e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] text-white px-3 py-2 text-[13px]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="gen-state-input"
                    className="block font-mono text-[11px] text-[#8A8A8A] uppercase mb-1"
                  >
                    State
                  </label>
                  <input
                    id="gen-state-input"
                    type="text"
                    value={stateInput}
                    onChange={(e) => setStateInput(e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] text-white px-3 py-2 text-[13px]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="gen-price-input"
                    className="block font-mono text-[11px] text-[#8A8A8A] uppercase mb-1"
                  >
                    Starting Price Floor
                  </label>
                  <input
                    id="gen-price-input"
                    type="text"
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] text-white px-3 py-2 text-[13px]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="gen-services-input"
                  className="block font-mono text-[11px] text-[#8A8A8A] uppercase mb-1"
                >
                  Core Services (Comma-Separated)
                </label>
                <input
                  id="gen-services-input"
                  type="text"
                  value={servicesInput}
                  onChange={(e) => setServicesInput(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] text-white px-3 py-2 text-[13px]"
                />
              </div>

              <div className="pt-2 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={handleGenerateArtifacts}
                  className="w-full bg-[#C8A45C] text-[#0A0A0A] font-semibold text-[13px] py-3 hover:bg-[#D4BC7E] transition-colors"
                >
                  Generate Layer 1–7 Code Bundle
                </button>
                <button
                  type="button"
                  onClick={handleAuditGeneratedBundle}
                  className="w-full bg-[#234524] text-white font-semibold text-[13px] py-2.5 hover:bg-[#143114] transition-colors"
                >
                  Audit Generated Bundle in Scorecard
                </button>
              </div>
            </div>

            {/* Generated Code Viewer */}
            <div className="lg:col-span-7 bg-[#141414] border border-[#2A2A2A] p-6 flex flex-col">
              <div className="flex flex-wrap gap-1.5 mb-4">
                {artifactBundle.layerArtifacts.map((art) => (
                  <button
                    key={art.layerNumber}
                    type="button"
                    onClick={() => setSelectedArtifactLayer(art.layerNumber)}
                    className={`px-3 py-1.5 font-mono text-[11px] border transition-colors ${
                      selectedArtifactLayer === art.layerNumber
                        ? "bg-[#C8A45C] text-[#0A0A0A] border-[#C8A45C] font-semibold"
                        : "bg-[#0A0A0A] text-[#8A8A8A] border-[#2A2A2A] hover:text-white"
                    }`}
                  >
                    L{art.layerNumber}: {art.fileName}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-[#2A2A2A]">
                <div>
                  <div className="text-white font-semibold text-[14px]">
                    Layer {currentArtifact.layerNumber}: {currentArtifact.title}
                  </div>
                  <div className="font-mono text-[11px] text-[#8A8A8A]">
                    Target File: {currentArtifact.fileName} • Gate: {currentArtifact.verificationGate}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleCopyArtifact(currentArtifact.layerNumber, currentArtifact.code)
                  }
                  className="px-3 py-1.5 bg-[#0A0A0A] border border-[#2A2A2A] text-[#C8A45C] font-mono text-[11px] flex items-center gap-1.5 hover:border-[#C8A45C]"
                >
                  {copiedLayer === currentArtifact.layerNumber ? (
                    <>
                      <Check size={13} /> Copied
                    </>
                  ) : (
                    <>
                      <Copy size={13} /> Copy Code
                    </>
                  )}
                </button>
              </div>

              <pre className="bg-[#0A0A0A] border border-[#222222] p-4 font-mono text-[12px] text-[#E5E5E5] overflow-x-auto max-h-[420px] leading-relaxed">
                <code>{currentArtifact.code}</code>
              </pre>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
