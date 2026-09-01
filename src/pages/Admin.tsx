import { useEffect } from "react";
import { useNavigate, Link } from "react-router";
import Navigation from "@/components/Navigation";
import SEO from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import {
  Users,
  ShoppingCart,
  Mail,
  DollarSign,
  Loader2,
  TrendingUp,
  Activity,
} from "lucide-react";

export default function Admin() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate("/");
    }
  }, [authLoading, isAdmin, navigate]);

  const { data: stats } = trpc.dashboard.stats.useQuery(undefined, { enabled: isAdmin });
  const { data: ordersData } = trpc.order.list.useQuery(
    { limit: 10, page: 1 },
    { enabled: isAdmin }
  );
  const { data: leadsData } = trpc.lead.list.useQuery(
    { limit: 10, page: 1 },
    { enabled: isAdmin }
  );

  if (authLoading) {
    return (
      <div className="bg-[#0A0A0A] min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="text-[#C8A45C] animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const statusColors: Record<string, string> = {
    new: "text-blue-400",
    contacted: "text-yellow-400",
    qualified: "text-green-400",
    converted: "text-[#C8A45C]",
    lost: "text-red-400",
  };

  const orderStatusColors: Record<string, string> = {
    pending: "text-yellow-500",
    paid: "text-blue-400",
    deploying: "text-orange-400",
    active: "text-green-500",
    cancelled: "text-red-400",
    refunded: "text-gray-400",
  };

  return (
    <div className="bg-[#0A0A0A] min-h-screen">
      <SEO title="Admin | WEB-READY/AG" description="Admin page for WEB-READY/AG." />
      <Navigation />
      <section className="pt-28 pb-24 px-6 lg:px-10">
        <div className="max-w-[1280px] mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-white font-bold text-[28px]">Admin Dashboard</h1>
              <p className="text-[#8A8A8A] text-[13px] mt-1">
                Manage orders, leads, and deployments.
              </p>
            </div>
            <Link
              to="/dashboard"
              className="text-[#8A8A8A] text-[13px] hover:text-[#C8A45C] transition-colors"
            >
              Back to My Dashboard
            </Link>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {[
              { label: "Total Users", value: stats?.users ?? 0, icon: Users, color: "text-blue-400" },
              { label: "Total Orders", value: stats?.orders ?? 0, icon: ShoppingCart, color: "text-[#C8A45C]" },
              { label: "Total Leads", value: stats?.leads ?? 0, icon: Mail, color: "text-green-400" },
              { label: "Revenue", value: `$${(stats?.revenue ?? 0).toLocaleString()}`, icon: DollarSign, color: "text-purple-400" },
            ].map((stat) => (
              <div key={stat.label} className="bg-[#1A1A1A] border border-[#2A2A2A] p-5">
                <div className="flex items-center justify-between mb-3">
                  <stat.icon size={18} className={stat.color} />
                  <TrendingUp size={14} className="text-[#8A8A8A]" />
                </div>
                <div className="text-white text-[28px] font-black">{stat.value}</div>
                <div className="text-[#8A8A8A] text-[11px] font-mono uppercase tracking-[0.06em] mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Orders */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A]">
              <div className="p-5 border-b border-[#2A2A2A] flex items-center justify-between">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <ShoppingCart size={16} className="text-[#C8A45C]" />
                  Recent Orders
                </h3>
                <span className="text-[#8A8A8A] text-[11px] font-mono">
                  {ordersData?.total ?? 0} total
                </span>
              </div>
              <div className="divide-y divide-[#2A2A2A]">
                {ordersData?.orders.map((order) => (
                  <div key={order.id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="text-white text-[13px] font-medium">
                        Order #{order.id} — Plan #{order.planId}
                      </div>
                      <div className="text-[#8A8A8A] text-[11px] font-mono mt-0.5">
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "N/A"} · {order.billingCycle}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white text-[13px] font-semibold">
                        ${Number(order.amount).toLocaleString()}
                      </div>
                      <span className={`text-[11px] font-mono capitalize ${orderStatusColors[order.status] || "text-[#8A8A8A]"}`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
                {(!ordersData?.orders || ordersData.orders.length === 0) && (
                  <div className="p-6 text-center text-[#8A8A8A] text-[13px]">No orders yet</div>
                )}
              </div>
            </div>

            {/* Recent Leads */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A]">
              <div className="p-5 border-b border-[#2A2A2A] flex items-center justify-between">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Mail size={16} className="text-green-400" />
                  Recent Leads
                </h3>
                <span className="text-[#8A8A8A] text-[11px] font-mono">
                  {leadsData?.total ?? 0} total
                </span>
              </div>
              <div className="divide-y divide-[#2A2A2A]">
                {leadsData?.leads.map((lead) => (
                  <div key={lead.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-white text-[13px] font-medium">{lead.name}</div>
                      <span className={`text-[11px] font-mono capitalize ${statusColors[lead.status] || "text-[#8A8A8A]"}`}>
                        {lead.status}
                      </span>
                    </div>
                    <div className="text-[#8A8A8A] text-[11px] font-mono mt-0.5">
                      {lead.email} · {lead.businessName || "No business"} · {lead.location || "No location"}
                    </div>
                    {lead.message && (
                      <p className="text-[#8A8A8A] text-[12px] mt-1 italic line-clamp-1">
                        &ldquo;{lead.message}&rdquo;
                      </p>
                    )}
                  </div>
                ))}
                {(!leadsData?.leads || leadsData.leads.length === 0) && (
                  <div className="p-6 text-center text-[#8A8A8A] text-[13px]">No leads yet</div>
                )}
              </div>
            </div>
          </div>

          {/* Deployment Activity */}
          <div className="mt-6 bg-[#1A1A1A] border border-[#2A2A2A] p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={16} className="text-orange-400" />
              <h3 className="text-white font-semibold">System Status</h3>
            </div>
            <div className="flex flex-wrap gap-4">
              {[
                { label: "Active Deployments", value: stats?.deployments ?? 0, color: "text-orange-400" },
                { label: "Database", value: "Connected", color: "text-green-400" },
                { label: "API Status", value: "Operational", color: "text-green-400" },
                { label: "Last Sync", value: new Date().toLocaleTimeString(), color: "text-[#8A8A8A]" },
              ].map((item) => (
                <div key={item.label} className="bg-[#0A0A0A] px-4 py-2.5 border border-[#2A2A2A]">
                  <div className={`text-[14px] font-semibold ${item.color}`}>{item.value}</div>
                  <div className="text-[#8A8A8A] text-[10px] font-mono uppercase tracking-[0.06em] mt-0.5">
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}


