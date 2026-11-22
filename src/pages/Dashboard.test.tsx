import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import Dashboard from "./Dashboard";

const mockAuthState: {
  user: { id: number; name: string; role: "admin" | "user" } | null;
  isLoading: boolean;
} = {
  user: { id: 1, name: "Admin", role: "admin" },
  isLoading: false,
};

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockAuthState,
}));

vi.mock("@/providers/trpc", () => ({
  trpc: {
    order: {
      myOrders: {
        useQuery: () => ({ data: [], isLoading: false }),
      },
    },
    enterprise: {
      periodReport: {
        useQuery: (input: { domain: string }) => ({ data: input.domain === "example.org" ? {
          search: { clicks: 4, impressions: 80 }, referrals: null,
          models: { runs: 10, referenceRatePct: 30 },
        } : undefined }),
      },
      getGovernancePolicy: {
        useQuery: () => ({
          data: {
            trainingPolicy: "CONFIGURE_INDEPENDENTLY",
            retrievalBots: [{ id: "OAI-SearchBot", category: "search_retrieval", purpose: "OpenAI", policy: "ALLOW" }],
            trainingBots: [{ id: "GPTBot", category: "model_training", purpose: "OpenAI", policy: "ALLOW" }],
            ga4AiReferralDomains: ["chatgpt.com", "perplexity.ai"],
            gscBigQueryTables: ["searchdata_site_impression", "searchdata_url_impression"],
            ga4CustomChannelRule: { channelName: "AI Search & LLM Referrals", condition: "regex" },
          },
        }),
      },
      listTelemetrySummary: {
        useQuery: () => ({
          isLoading: false,
          data: {
            hasLiveTelemetry: false,
            latestCrawl: [],
            referrals: [],
            gscRows: [],
            promptBenchmark: null,
            corroborations: [],
            botProbes: [],
            verificationJobs: [],
          },
        }),
      },
    },
    titan: {
      auditLiveUrl: {
        useMutation: () => ({ mutateAsync: vi.fn(), isPending: false, error: null }),
      },
    },
  },
}));

vi.mock("@/components/Navigation", () => ({
  default: () => <nav data-testid="mock-nav" />,
}));

vi.mock("@/components/Footer", () => ({
  default: () => <footer data-testid="mock-footer" />,
}));

describe("Dashboard Enterprise 4-Layer Telemetry Panels", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders KPI, Hydration/Bots, Server Logs/GSC, and LLM Prompt tabs with honest unconfigured state", () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    expect(screen.getByText(/SEO \/ AEO \/ GEO \/ AIO Control Surface/i)).toBeTruthy();
    expect(screen.getByText(/CONFIGURE_INDEPENDENTLY/i)).toBeTruthy();
    expect(screen.getByText(/Unconfigured — 0 prompt runs recorded/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: /Hydration & Bots/i }));
    const hydrationPanel = screen.getByRole("tabpanel", { name: /Hydration and Bots/i });
    expect(within(hydrationPanel).getByText(/OAI-SearchBot/i)).toBeTruthy();
    expect(within(hydrationPanel).getByText(/GPTBot/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: /Server Logs & GSC/i }));
    const logsPanel = screen.getByRole("tabpanel", { name: /Server Logs and GSC/i });
    expect(within(logsPanel).getByText(/searchdata_site_impression/i)).toBeTruthy();
    expect(within(logsPanel).getByText(/unconfigured/i)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Reporting domain"), { target: { value: "example.org" } });
    fireEvent.click(screen.getByRole("button", { name: "Compare period" }));
    expect(screen.getByText("4 clicks / 80 impressions")).toBeTruthy();
    expect(screen.getByText("AI referrals not measured")).toBeTruthy();
    expect(screen.getByText("30% across 10 responses")).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: /LLM Prompt Matrix/i }));
    const promptsPanel = screen.getByRole("tabpanel", { name: /LLM Prompt Matrix/i });
    expect(within(promptsPanel).getByText(/0 prompt runs ingested/i)).toBeTruthy();
  });
});
