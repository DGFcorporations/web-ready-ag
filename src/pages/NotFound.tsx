import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="bg-[#0A0A0A] min-h-screen flex items-center justify-center px-6">
      <div className="text-center">
        <div className="text-[#C8A45C] font-mono text-[12px] uppercase tracking-[0.1em] mb-4">
          404 Error
        </div>
        <h1 className="text-white font-black text-[64px] md:text-[96px] leading-none">
          Page Not Found
        </h1>
        <p className="text-[#8A8A8A] text-[16px] mt-4 max-w-[400px] mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 mt-8 bg-[#C8A45C] text-[#0A0A0A] text-[14px] font-semibold px-8 py-4 hover:bg-[#D4BC7E] transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Home
        </Link>
      </div>
    </div>
  );
}

