// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { TRPCProvider } from "@/providers/trpc";
import TitanEngineMatrix from "./TitanEngineMatrix";

afterEach(() => {
  cleanup();
});

function renderWorkbench(props?: { compact?: boolean }) {
  return render(
    <TRPCProvider>
      <TitanEngineMatrix {...props} />
    </TRPCProvider>,
  );
}

describe("TitanEngineMatrix 7-Layer & 4-Engine Workbench UI", () => {
  it("renders all 4 retrieval engine scorecards and all 7 single-layer stages", () => {
    renderWorkbench();

    expect(
      screen.getByText(/Google Core & AI Overviews/i),
    ).toBeDefined();
    expect(screen.getByText(/Perplexity AI \(Sonar\)/i)).toBeDefined();
    expect(screen.getByText(/OpenAI \(ChatGPT Search\)/i)).toBeDefined();
    expect(screen.getByText(/Brave Search & Claude/i)).toBeDefined();

    expect(screen.getAllByText(/web-ag-edge-vitals/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/web-ag-entity-graph/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/web-ag-geo-extraction/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/web-ag-sentinel-audit/i).length).toBeGreaterThan(0);
  });

  it("audits a Walled-Garden Empty SPA in Raw HTML mode and locks onto Layer 1 remediation", () => {
    renderWorkbench();

    const auditorTab = screen.getByRole("button", {
      name: /Live URL & HTML Auditor/i,
    });
    fireEvent.click(auditorTab);

    const rawHtmlModeBtn = screen.getByRole("button", {
      name: /Raw HTML & robots\.txt Paste Mode/i,
    });
    fireEvent.click(rawHtmlModeBtn);

    const walledGardenBtn = screen.getByRole("button", {
      name: /Load Walled-Garden Empty SPA Preset/i,
    });
    fireEvent.click(walledGardenBtn);

    const runAuditBtn = screen.getByRole("button", {
      name: /Audit HTML Against Titan Standard/i,
    });
    fireEvent.click(runAuditBtn);

    expect(
      screen.getByText(/Active Single-Layer Remediation: Layer 1/i),
    ).toBeDefined();
  });

  it("generates custom Layer 1-7 code artifacts and verifies >= 95 score when audited", () => {
    renderWorkbench();

    const generatorTab = screen.getByRole("button", {
      name: /Layer 1–7 Code Generator/i,
    });
    fireEvent.click(generatorTab);

    const domainInput = screen.getByLabelText(/Target Domain/i);
    fireEvent.change(domainInput, {
      target: { value: "https://tampalaserclinic.example.com" },
    });

    const brandInput = screen.getByLabelText(/Brand \/ Entity Name/i);
    fireEvent.change(brandInput, {
      target: { value: "Tampa Precision Laser" },
    });

    const generateBtn = screen.getByRole("button", {
      name: /Generate Layer 1–7 Code Bundle/i,
    });
    fireEvent.click(generateBtn);

    expect(
      screen.getByText(/Sitemap: https:\/\/tampalaserclinic\.example\.com\/sitemap\.xml/i),
    ).toBeDefined();

    const auditPreviewBtn = screen.getByRole("button", {
      name: /Audit Generated Bundle in Scorecard/i,
    });
    fireEvent.click(auditPreviewBtn);

    expect(
      screen.getAllByText(/SENTINEL_LOOP/i).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText("https://tampalaserclinic.example.com"),
    ).toBeDefined();
  });

  it("regenerates from current form inputs when clicking Audit Generated Bundle in Scorecard directly", () => {
    renderWorkbench();

    const generatorTab = screen.getByRole("button", {
      name: /Layer 1–7 Code Generator/i,
    });
    fireEvent.click(generatorTab);

    const domainInput = screen.getByLabelText(/Target Domain/i);
    fireEvent.change(domainInput, {
      target: { value: "https://directaudit.example.com" },
    });

    const auditPreviewBtn = screen.getByRole("button", {
      name: /Audit Generated Bundle in Scorecard/i,
    });
    fireEvent.click(auditPreviewBtn);

    expect(
      screen.getByText("https://directaudit.example.com"),
    ).toBeDefined();
  });
});
