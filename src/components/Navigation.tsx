import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 100);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const isHome = location.pathname === "/";

  const scrollToSection = (id: string) => {
    if (!isHome) {
      window.location.href = `/#${id}`;
      return;
    }
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
    setMobileOpen(false);
  };

  const navLinks = [
    { label: "Services", action: () => scrollToSection("services"), href: "/services" },
    { label: "Pricing", action: () => scrollToSection("pricing"), href: "/pricing" },
    { label: "Locations", href: "/locations" },
    { label: "Blog", href: "/blog" },
  ];

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 h-16 flex items-center transition-all duration-300 ${
          scrolled
            ? "bg-[#234524]/95 backdrop-blur-xl shadow-lg"
            : "bg-transparent"
        }`}
      >
        <div className="w-full max-w-[1280px] mx-auto px-6 lg:px-10 flex items-center justify-between">
          <Link
            to="/"
            className="text-white font-bold text-[16px] tracking-[0.05em]"
          >
            DGF CORPORATIONS
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) =>
              link.href ? (
                <Link
                  key={link.label}
                  to={link.href}
                  className="text-white text-[12px] font-medium uppercase tracking-[0.05em] hover:text-[#C8A45C] transition-colors duration-300"
                >
                  {link.label}
                </Link>
              ) : (
                <button
                  key={link.label}
                  onClick={link.action}
                  className="text-white text-[12px] font-medium uppercase tracking-[0.05em] hover:text-[#C8A45C] transition-colors duration-300"
                >
                  {link.label}
                </button>
              )
            )}
            {user?.role === "admin" && (
              <Link
                to="/admin"
                className="text-[#C8A45C] text-[12px] font-medium uppercase tracking-[0.05em] hover:text-[#D4BC7E] transition-colors duration-300"
              >
                Admin
              </Link>
            )}
            {user ? (
              <div className="flex items-center gap-4">
                <Link
                  to="/dashboard"
                  className="text-white text-[12px] font-medium uppercase tracking-[0.05em] hover:text-[#C8A45C] transition-colors duration-300"
                >
                  Dashboard
                </Link>
                <button
                  onClick={logout}
                  className="text-[#8A8A8A] text-[12px] font-medium uppercase tracking-[0.05em] hover:text-white transition-colors duration-300"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="bg-[#C8A45C] text-[#0A0A0A] text-[12px] font-semibold px-5 py-2.5 hover:bg-[#D4BC7E] transition-colors duration-300"
              >
                Book a Call
              </Link>
            )}
          </div>

          <button
            className="md:hidden text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-[#234524] flex flex-col items-center justify-center gap-8">
          {navLinks.map((link) =>
            link.href ? (
              <Link
                key={link.label}
                to={link.href}
                className="text-white text-lg font-medium uppercase tracking-[0.05em] hover:text-[#C8A45C] transition-colors"
              >
                {link.label}
              </Link>
            ) : (
              <button
                key={link.label}
                onClick={link.action}
                className="text-white text-lg font-medium uppercase tracking-[0.05em] hover:text-[#C8A45C] transition-colors"
              >
                {link.label}
              </button>
            )
          )}
          {user?.role === "admin" && (
            <Link
              to="/admin"
              className="text-[#C8A45C] text-lg font-medium uppercase tracking-[0.05em]"
            >
              Admin
            </Link>
          )}
          {user ? (
            <>
              <Link
                to="/dashboard"
                className="text-white text-lg font-medium uppercase tracking-[0.05em]"
              >
                Dashboard
              </Link>
              <button
                onClick={logout}
                className="text-[#8A8A8A] text-lg font-medium uppercase tracking-[0.05em]"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="bg-[#C8A45C] text-[#0A0A0A] text-lg font-semibold px-8 py-3"
            >
              Book a Call
            </Link>
          )}
        </div>
      )}
    </>
  );
}
