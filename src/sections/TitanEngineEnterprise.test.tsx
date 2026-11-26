import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import TitanEngineMatrix from "./TitanEngineMatrix";

vi.mock("@/providers/trpc", () => ({
  trpc: {
    titan: {
      auditLiveUrl: {
        useMutation: () => ({
          mutateAsync: vi.fn(),
          isPending: false,
          error: null,
        }),
      },
    },
  },
}));

describe("TitanEngineMatrix Enterprise 4-Layer Tab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders 4-Layer Enterprise Audit mode button and full SEO/AEO/GEO/AIO diagnostics", () => {
    render(
      <MemoryRouter>
        <TitanEngineMatrix />
      </MemoryRouter>,
    );

    const enterpriseTab = screen.getByRole("button", {
      name: /4-Layer Enterprise Audit/i,
    });
    expect(enterpriseTab.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(enterpriseTab);
    expect(enterpriseTab.getAttribute("aria-pressed")).toBe("true");

    expect(
      screen.getByText(/Enterprise 4-Layer Search Visibility Diagnostics/i),
    ).toBeTruthy();
    expect(screen.getByText(/Hydration Parity:/i)).toBeTruthy();
    expect(screen.getByText(/Redirect & Canonical Hygiene:/i)).toBeTruthy();
    expect(screen.getByText(/40–60w Answer Capsules:/i)).toBeTruthy();
    expect(screen.getByText(/Pronoun-Free RAG Chunking:/i)).toBeTruthy();

    const region = screen.getByRole("region", {
      name: /AI Bot Governance Matrix/i,
    });
    expect(region.getAttribute("tabindex")).toBe("0");
    expect(screen.getByText("OAI-SearchBot")).toBeTruthy();
    expect(screen.getByText("GPTBot")).toBeTruthy();
    expect(screen.getByText("Google-Extended")).toBeTruthy();
    expect(screen.getByText("CCBot")).toBeTruthy();
    expect(screen.getByText(/Training policy: allow/i)).toBeTruthy();
    expect(screen.getByText(/directives match the selected data-governance policy/i)).toBeTruthy();
  });
});
