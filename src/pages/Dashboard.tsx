import { useState } from "react";
import { Link } from "react-router";
import Navigation from "@/components/Navigation";
import SEO from "@/components/SEO";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import TitanEngineMatrix from "@/sections/TitanEngineMatrix";
import { Package, CreditCard, Settings, ArrowRight, Loader2, ShieldCheck, Activity, Database, Sparkles } from "lucide-react";

type EnterpriseDashboardTab = "kpi" | "hydration" | "logs" | "prompts";

function PeriodReport() {
  const [period, setPeriod] = useState(() => ({
    domain: "", start: new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10),
    end: new Date().toISOString().slice(0, 10),
  }));
  const { data, isFetching, error } = trpc.enterprise.periodReport.useQuery(period, { enabled: !!period.domain, retry: false });
  return <section aria-label="Domain period report" className="space-y-3 border-t border-[#2A2A2A] pt-3">
    <h3 className="font-semibold text-white">Compare search, AI revenue, and citations</h3>
    <form className="flex flex-wrap items-end gap-3" onSubmit={event => {
      event.preventDefault();
      const fields = new FormData(event.currentTarget);
      setPeriod({ domain: String(fields.get("domain")).trim(), start: String(fields.get("start")), end: String(fields.get("end")) });
    }}>
      <label>Reporting domain<input className="block bg-[#141414] border p-1" name="domain" required maxLength={255} placeholder="example.org" /></label>
      <label>From<input className="block bg-[#141414] border p-1" type="date" name="start" defaultValue={period.start} required /></label>
      <label>Through<input className="block bg-[#141414] border p-1" type="date" name="end" defaultValue={period.end} required /></label>
      <button type="submit" className="border px-3 py-1">Compare period</button>
    </form>
    {error && <p role="alert">{error.message}</p>}
    {isFetching && <p role="status">Loading period…</p>}
    {data && <dl className="grid gap-3 sm:grid-cols-3">
      <div><dt>GSC URL impressions</dt><dd>{data.search ? `${data.search.clicks} clicks / ${data.search.impressions} impressions` : "Search not measured"}</dd></div>
      <div><dt>GA4 AI referrals</dt><dd>{data.referrals ? `${data.referrals.sessions} sessions / ${data.referrals.conversions} conversions / ${data.referrals.revenue.toFixed(2)} revenue (property currency)` : "AI referrals not measured"}</dd></div>
      <div><dt>Documented Reference Rate</dt><dd>{data.models ? `${data.models.referenceRatePct}% across ${data.models.runs} responses` : "Citations not measured"}</dd></div>
    </dl>}
    <p>Same domain and reporting period; not a user-level attribution join.</p>
  </section>;
}

export default function Dashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const [enterpriseTab, setEnterpriseTab] = useState<EnterpriseDashboardTab>("kpi");
  const { data: orders, isLoading: ordersLoading } = trpc.order.myOrders.useQuery(
    undefined,
    { enabled: !!user }
  );
  const { data: governancePolicy } = trpc.enterprise.getGovernancePolicy.useQuery();
  const { data: telemetrySummary, isLoading: telemetryLoading } =
    trpc.enterprise.listTelemetrySummary.useQuery(undefined, {
      enabled: user?.role === "admin",
    });

  if (authLoading) {
    return (
      <div className="bg-[#0A0A0A] min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="text-[#C8A45C] animate-spin" />
      </div>
    );
  }

  const EnterpriseTelemetryPanel = (
    <section
      aria-labelledby="enterprise-4layer-heading"
      className="px-6 lg:px-10 pb-12"
    >
      <div className="max-w-[1280px] mx-auto bg-[#141414] border border-[#2A2A2A] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#C8A45C]">
              Enterprise 4-Layer Telemetry
            </span>
            <h2 id="enterprise-4layer-heading" className="text-white font-bold text-[20px] mt-1">
              SEO / AEO / GEO / AIO Control Surface
            </h2>
          </div>
          <div role="tablist" aria-label="Enterprise telemetry views" className="flex flex-wrap gap-2">
            {(
              [
                { id: "kpi", label: "KPI & Governance", Icon: ShieldCheck },
                { id: "hydration", label: "Hydration & Bots", Icon: Activity },
                { id: "logs", label: "Server Logs & GSC", Icon: Database },
                { id: "prompts", label: "LLM Prompt Matrix", Icon: Sparkles },
              ] as const
            ).map(({ id, label, Icon }) => {
              const selected = enterpriseTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setEnterpriseTab(id)}
                  className={
                    selected
                      ? "inline-flex items-center gap-1.5 px-3 py-2 bg-[#C8A45C] text-[#0A0A0A] font-mono text-[12px] font-semibold"
                      : "inline-flex items-center gap-1.5 px-3 py-2 border border-[#2A2A2A] bg-[#0A0A0A] text-[#A3A3A3] font-mono text-[12px] hover:border-[#C8A45C] hover:text-white"
                  }
                >
                  <Icon size={13} />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {enterpriseTab === "kpi" && (
          <div role="tabpanel" aria-label="KPI and Governance" className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#0A0A0A] border border-[#2A2A2A] p-4">
              <div className="text-[11px] font-mono uppercase text-[#8A8A8A]">Training Bot Policy</div>
              <div className="text-white font-semibold mt-1">
                {governancePolicy?.trainingPolicy ?? "CONFIGURE_INDEPENDENTLY"}
              </div>
              <p className="text-[#A3A3A3] text-[12px] mt-2">
                {governancePolicy
                  ? `${governancePolicy.retrievalBots.length} retrieval bots allowed; ${governancePolicy.trainingBots.length} training bots governed independently.`
                  : "Separated search retrieval and model training crawlers configured."}
              </p>
            </div>
            <div className="bg-[#0A0A0A] border border-[#2A2A2A] p-4">
              <div className="text-[11px] font-mono uppercase text-[#8A8A8A]">Live Reference Rate</div>
              <div className="text-white font-semibold mt-1">
                {user?.role === "admin"
                  ? telemetryLoading
                    ? "Loading..."
                    : telemetrySummary?.promptBenchmark
                      ? `${telemetrySummary.promptBenchmark.referenceRatePct.toFixed(1)}%`
                      : "Unconfigured — 0 prompt runs recorded"
                  : "Admin sign-in required"}
              </div>
              <p className="text-[#A3A3A3] text-[12px] mt-2">
                Zero fabricated metrics: requires recorded multi-LLM prompt runs.
              </p>
            </div>
            <div className="bg-[#0A0A0A] border border-[#2A2A2A] p-4">
              <div className="text-[11px] font-mono uppercase text-[#8A8A8A]">GA4 AI Referral Group</div>
              <div className="text-white font-semibold mt-1">
                {governancePolicy?.ga4CustomChannelRule.channelName ?? "AI Search & LLM Referrals"}
              </div>
              <p className="text-[#A3A3A3] text-[12px] mt-2 break-all">
                {(governancePolicy?.ga4AiReferralDomains ?? ["chatgpt.com", "perplexity.ai"]).slice(0, 4).join(", ")}
              </p>
            </div>
          </div>
        )}

        {enterpriseTab === "hydration" && (
          <div role="tabpanel" aria-label="Hydration and Bots" className="space-y-3 text-[13px] text-[#D4D4D4]">
            <p className="font-mono text-[12px] text-[#C8A45C]">
              Hydration Parity Budget: SSR/Hydrated word ratio &gt;= 85%, zero client-only schema, mobile LCP &lt; 1800ms.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#0A0A0A] border border-[#2A2A2A] p-4">
                <div className="text-white font-semibold mb-2">Search Retrieval Bots (Allow: /)</div>
                <p className="text-[#A3A3A3] font-mono text-[12px]">
                  {governancePolicy?.retrievalBots.map((b) => b.id).join(", ") || "OAI-SearchBot, PerplexityBot, Claude-SearchBot"}
                </p>
              </div>
              <div className="bg-[#0A0A0A] border border-[#2A2A2A] p-4">
                <div className="text-white font-semibold mb-2">Model Training Bots (Independent Policy)</div>
                <p className="text-[#A3A3A3] font-mono text-[12px]">
                  {governancePolicy?.trainingBots.map((b) => b.id).join(", ") || "GPTBot, Google-Extended, CCBot, ClaudeBot"}
                </p>
              </div>
            </div>
            <p className="text-[#8A8A8A] text-[12px]">
              Recorded bot probes:{" "}
              {user?.role === "admin"
                ? telemetrySummary?.botProbes.length ?? 0
                : "Sign in as admin to view persisted HTTP probe logs."}
            </p>
          </div>
        )}

        {enterpriseTab === "logs" && (
          <div role="tabpanel" aria-label="Server Logs and GSC" className="space-y-3 text-[13px] text-[#D4D4D4]">
            <p className="font-mono text-[12px] text-[#C8A45C]">
              GSC BigQuery Tables: {governancePolicy?.gscBigQueryTables.join(", ") || "searchdata_site_impression, searchdata_url_impression"}
            </p>
            <p className="text-[#A3A3A3]">
              {user?.role === "admin"
                ? telemetrySummary && (telemetrySummary.latestCrawl.length > 0 || telemetrySummary.gscRows.length > 0)
                  ? `Crawl telemetry runs: ${telemetrySummary.latestCrawl.length} | GSC export rows: ${telemetrySummary.gscRows.length}`
                  : "Server log analyzer & GSC BigQuery pipeline status: unconfigured (awaiting NDJSON/W3C log or BigQuery export ingestion)."
                : "Sign in as admin to inspect ingested server crawl logs and GSC BigQuery exports."}
            </p>
            {user?.role === "admin" && <PeriodReport />}
          </div>
        )}

        {enterpriseTab === "prompts" && (
          <div role="tabpanel" aria-label="LLM Prompt Matrix" className="space-y-3 text-[13px] text-[#D4D4D4]">
            <p className="font-mono text-[12px] text-[#C8A45C]">
              Multi-LLM Benchmark Matrix: 25–100+ real buyer prompts across Awareness, Consideration, and Decision.
            </p>
            <p className="text-[#A3A3A3]">
              {user?.role === "admin"
                ? telemetrySummary?.promptBenchmark
                  ? `Total runs: ${telemetrySummary.promptBenchmark.totalRuns} | Reference Rate: ${telemetrySummary.promptBenchmark.referenceRatePct.toFixed(1)}% | Share of Model: ${telemetrySummary.promptBenchmark.shareOfModelPct.toFixed(1)}%`
                  : "Multi-LLM prompt tracking status: unconfigured (0 prompt runs ingested in DB)."
                : "Sign in as admin to inspect multi-LLM Share of Model and citation provenance telemetry."}
            </p>
          </div>
        )}
      </div>
    </section>
  );

  if (!user) {
    return (
      <div className="bg-[#0A0A0A] min-h-screen">
        <SEO title="Dashboard | WEB-READY/AG" description="Dashboard page for WEB-READY/AG." />
        <Navigation />
        <div className="pt-32 pb-12 px-6 text-center">
          <h1 className="text-white text-2xl font-bold mb-4">Please Sign In</h1>
          <p className="text-[#8A8A8A] mb-6">Sign in to view your orders, or use the Enterprise 4-Layer Search Visibility Workbench below.</p>
          <Link to="/login" className="bg-[#C8A45C] text-[#0A0A0A] px-8 py-3 font-semibold hover:bg-[#D4BC7E] transition-colors">
            Sign In
          </Link>
        </div>
        {EnterpriseTelemetryPanel}
        <TitanEngineMatrix compact />
        <Footer />
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    pending: "text-yellow-500",
    paid: "text-blue-400",
    deploying: "text-orange-400",
    active: "text-green-500",
    cancelled: "text-red-400",
    refunded: "text-gray-400",
  };

  return (
    <div className="bg-[#0A0A0A] min-h-screen">
      <SEO title="Dashboard | WEB-READY/AG" description="Dashboard page for WEB-READY/AG." />
      <Navigation />
      <section className="pt-32 pb-24 px-6 lg:px-10">
        <div className="max-w-[1280px] mx-auto">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h1 className="text-white font-bold text-[32px]">
                Welcome, {user.name || "User"}
              </h1>
              <p className="text-[#8A8A8A] text-[14px] mt-1">
                Manage your automation services and account settings.
              </p>
            </div>
            {user.role === "admin" && (
              <Link
                to="/admin"
                className="bg-[#234524] text-white text-[13px] font-semibold px-5 py-2.5 hover:bg-[#143114] transition-colors"
              >
                Admin Panel
              </Link>
            )}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] p-6">
              <Package size={20} className="text-[#C8A45C] mb-2" />
              <div className="text-white text-[28px] font-black">
                {orders?.length || 0}
              </div>
              <div className="text-[#8A8A8A] text-[12px] font-mono uppercase tracking-[0.06em]">
                Active Services
              </div>
            </div>
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] p-6">
              <CreditCard size={20} className="text-[#C8A45C] mb-2" />
              <div className="text-white text-[28px] font-black">
                ${orders?.reduce((acc, o) => acc + Number(o.amount), 0).toLocaleString() || "0"}
              </div>
              <div className="text-[#8A8A8A] text-[12px] font-mono uppercase tracking-[0.06em]">
                Total Invested
              </div>
            </div>
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] p-6">
              <Settings size={20} className="text-[#C8A45C] mb-2" />
              <div className="text-white text-[28px] font-black">
                {orders?.filter((o) => o.status === "active").length || 0}
              </div>
              <div className="text-[#8A8A8A] text-[12px] font-mono uppercase tracking-[0.06em]">
                Deployed
              </div>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A]">
            <div className="p-6 border-b border-[#2A2A2A] flex items-center justify-between">
              <h2 className="text-white font-semibold">Your Orders</h2>
              <Link
                to="/pricing"
                className="text-[#C8A45C] text-[12px] font-mono uppercase tracking-[0.06em] hover:text-[#D4BC7E] flex items-center gap-1"
              >
                New Order <ArrowRight size={12} />
              </Link>
            </div>
            {ordersLoading ? (
              <div className="p-10 text-center">
                <Loader2 size={24} className="text-[#C8A45C] animate-spin mx-auto" />
              </div>
            ) : orders && orders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#2A2A2A]">
                      <th className="text-left text-[#8A8A8A] text-[11px] font-mono uppercase tracking-[0.06em] p-4">Plan</th>
                      <th className="text-left text-[#8A8A8A] text-[11px] font-mono uppercase tracking-[0.06em] p-4">Amount</th>
                      <th className="text-left text-[#8A8A8A] text-[11px] font-mono uppercase tracking-[0.06em] p-4">Status</th>
                      <th className="text-left text-[#8A8A8A] text-[11px] font-mono uppercase tracking-[0.06em] p-4">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} className="border-b border-[#2A2A2A] last:border-0">
                        <td className="text-white text-[14px] p-4">Plan #{order.planId}</td>
                        <td className="text-white text-[14px] p-4">${Number(order.amount).toLocaleString()}</td>
                        <td className="p-4">
                          <span className={`text-[13px] font-medium capitalize ${statusColors[order.status] || "text-[#8A8A8A]"}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="text-[#8A8A8A] text-[13px] p-4">
                          {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-10 text-center">
                <p className="text-[#8A8A8A] text-[14px]">No orders yet.</p>
                <Link
                  to="/pricing"
                  className="inline-block mt-4 bg-[#C8A45C] text-[#0A0A0A] text-[13px] font-semibold px-6 py-2.5 hover:bg-[#D4BC7E] transition-colors"
                >
                  Browse Plans
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>
      {EnterpriseTelemetryPanel}
      <TitanEngineMatrix compact />
      <Footer />
    </div>
  );
}
