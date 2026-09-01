import { Link } from "react-router";
import Navigation from "@/components/Navigation";
import SEO from "@/components/SEO";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { Package, CreditCard, Settings, ArrowRight, Loader2 } from "lucide-react";

export default function Dashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: orders, isLoading: ordersLoading } = trpc.order.myOrders.useQuery(
    undefined,
    { enabled: !!user }
  );

  if (authLoading) {
    return (
      <div className="bg-[#0A0A0A] min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="text-[#C8A45C] animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-[#0A0A0A] min-h-screen">
        <SEO title="Dashboard | WEB-READY/AG" description="Dashboard page for WEB-READY/AG." />
      <Navigation />
        <div className="pt-32 pb-24 px-6 text-center">
          <h1 className="text-white text-2xl font-bold mb-4">Please Sign In</h1>
          <p className="text-[#8A8A8A] mb-6">Sign in to view your dashboard and manage your services.</p>
          <Link to="/login" className="bg-[#C8A45C] text-[#0A0A0A] px-8 py-3 font-semibold hover:bg-[#D4BC7E] transition-colors">
            Sign In
          </Link>
        </div>
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
      <Footer />
    </div>
  );
}


