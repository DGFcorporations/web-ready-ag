import { Link } from "react-router";
import { Phone, Mail, MapPin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#0A0A0A] border-t border-[#2A2A2A]">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <Link to="/" className="text-white font-bold text-[18px]">
              DGF CORPORATIONS
            </Link>
            <p className="font-mono text-[11px] text-[#8A8A8A] mt-2 uppercase tracking-[0.06em]">
              Veteran-Owned AI Automation
            </p>
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-2 text-[#8A8A8A] text-[13px]">
                <MapPin size={14} className="text-[#C8A45C]" />
                Palm Coast, Florida
              </div>
              <div className="flex items-center gap-2 text-[#8A8A8A] text-[13px]">
                <Phone size={14} className="text-[#C8A45C]" />
                (904) 555-0147
              </div>
              <div className="flex items-center gap-2 text-[#8A8A8A] text-[13px]">
                <Mail size={14} className="text-[#C8A45C]" />
                hello@dgfcorporations.com
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-white text-[14px] font-semibold mb-4">Services</h4>
            <ul className="space-y-2.5">
              {["Voice AI", "Cold Outreach", "CRM Automation", "Review Generation", "Local SEO"].map(
                (service) => (
                  <li key={service}>
                    <Link
                      to="/services"
                      className="text-[#8A8A8A] text-[13px] hover:text-white transition-colors duration-300"
                    >
                      {service}
                    </Link>
                  </li>
                )
              )}
            </ul>
          </div>

          <div>
            <h4 className="text-white text-[14px] font-semibold mb-4">Company</h4>
            <ul className="space-y-2.5">
              {[
                { label: "About", href: "/#values" },
                { label: "Process", href: "/#process" },
                { label: "Pricing", href: "/pricing" },
                { label: "Blog", href: "/blog" },
                { label: "Contact", href: "/#cta" },
              ].map((item) => (
                <li key={item.label}>
                  <Link
                    to={item.href}
                    className="text-[#8A8A8A] text-[13px] hover:text-white transition-colors duration-300"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white text-[14px] font-semibold mb-4">Connect</h4>
            <ul className="space-y-2.5">
              <li>
                <Link
                  to="/login"
                  className="text-[#8A8A8A] text-[13px] hover:text-white transition-colors duration-300"
                >
                  Book a Strategy Call
                </Link>
              </li>
              <li>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#8A8A8A] text-[13px] hover:text-white transition-colors duration-300"
                >
                  LinkedIn
                </a>
              </li>
              <li>
                <a
                  href="mailto:hello@dgfcorporations.com"
                  className="text-[#8A8A8A] text-[13px] hover:text-white transition-colors duration-300"
                >
                  Email Us
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[#2A2A2A] mt-12 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="font-mono text-[11px] text-[#8A8A8A]">
            2026 DGF Corporations LLC. All rights reserved.
          </p>
          <div className="flex gap-4">
            <Link
              to="/"
              className="font-mono text-[11px] text-[#8A8A8A] hover:text-white transition-colors"
            >
              Privacy Policy
            </Link>
            <span className="text-[#8A8A8A]">·</span>
            <Link
              to="/"
              className="font-mono text-[11px] text-[#8A8A8A] hover:text-white transition-colors"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
