import { Link } from "react-router";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

export default function Dashboard() {
  const { user, isLoading: authLoading } = useAuth();

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

  return (
    <div className="bg-[#0A0A0A] min-h-screen">
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
        </div>
      </section>
      <Footer />
    </div>
  );
}
