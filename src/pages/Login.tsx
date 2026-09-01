import { useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, LogIn, Shield, Zap, Clock } from "lucide-react";

function getAuthUrl() {
  const portalUrl = import.meta.env.VITE_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  const url = new URL(`${portalUrl}/api/oauth/authorize`);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "profile");
  url.searchParams.set("state", state);

  return url.toString();
}

export default function Login() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || "/dashboard";

  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  if (isLoading) {
    return (
      <div className="bg-[#0A0A0A] min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="text-[#C8A45C] animate-spin" />
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="bg-[#0A0A0A] min-h-screen flex">
      {/* Left Side - Value Props */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#234524] flex-col justify-center px-16 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative z-10">
          <Link to="/" className="text-white font-bold text-[18px] tracking-[0.05em]">
            DGF CORPORATIONS
          </Link>
          <h2 className="text-white font-black text-[36px] mt-8 leading-tight">
            Get Your Time Back.
          </h2>
          <p className="text-white/70 text-[16px] mt-4 max-w-[400px]">
            Join hundreds of Florida service businesses using AI automation to
            grow without the overhead.
          </p>
          <div className="mt-10 space-y-6">
            {[
              { icon: Shield, text: "Veteran-owned, Florida-based team" },
              { icon: Zap, text: "Deploy in under 7 days" },
              { icon: Clock, text: "24/7 AI coverage from day one" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3">
                <item.icon size={20} className="text-[#C8A45C]" />
                <span className="text-white/80 text-[15px]">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Login */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-[400px]">
          <div className="lg:hidden mb-8 text-center">
            <Link to="/" className="text-white font-bold text-[16px] tracking-[0.05em]">
              DGF CORPORATIONS
            </Link>
          </div>

          <h1 className="text-white font-bold text-[28px]">Welcome Back</h1>
          <p className="text-[#8A8A8A] text-[14px] mt-2">
            Sign in to manage your automation services.
          </p>

          <a
            href={getAuthUrl()}
            className="mt-8 w-full bg-[#C8A45C] text-[#0A0A0A] text-[14px] font-semibold py-4 px-6 flex items-center justify-center gap-2 hover:bg-[#D4BC7E] transition-colors duration-300"
          >
            <LogIn size={18} />
            Sign In with Kimi
          </a>

          <div className="mt-8 text-center">
            <p className="text-[#8A8A8A] text-[13px]">
              Don't have an account?{" "}
              <a
                href={getAuthUrl()}
                className="text-[#C8A45C] hover:underline"
              >
                Create one
              </a>
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-[#2A2A2A]">
            <div className="flex items-center justify-center gap-6">
              <Link
                to="/"
                className="text-[#8A8A8A] text-[12px] hover:text-[#C8A45C] transition-colors"
              >
                Home
              </Link>
              <Link
                to="/services"
                className="text-[#8A8A8A] text-[12px] hover:text-[#C8A45C] transition-colors"
              >
                Services
              </Link>
              <Link
                to="/pricing"
                className="text-[#8A8A8A] text-[12px] hover:text-[#C8A45C] transition-colors"
              >
                Pricing
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

