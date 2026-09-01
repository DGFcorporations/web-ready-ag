import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import Navigation from "@/components/Navigation";
import SEO from "@/components/SEO";
import Footer from "@/components/Footer";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Check, CreditCard, Building2, User, Phone } from "lucide-react";
import { toast } from "sonner";

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const planSlug = searchParams.get("plan");
  const { user } = useAuth();
  const { data: plans } = trpc.pricing.list.useQuery();

  const [selectedPlan, setSelectedPlan] = useState(planSlug || "professional");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [formData, setFormData] = useState({
    businessName: "",
    industry: "",
    phone: "",
    location: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activePlan = plans?.find((p) => p.slug === selectedPlan) ?? plans?.[1];

  const handleSubmit = async () => {
    setIsSubmitting(true);
    // Simulate checkout
    setTimeout(() => {
      toast.success("Order received! Our team will contact you within 24 hours.");
      setIsSubmitting(false);
    }, 1500);
  };

  return (
    <div className="bg-[#0A0A0A] min-h-screen">
      <SEO title="Checkout | WEB-READY/AG" description="Checkout page for WEB-READY/AG." />
      <Navigation />
      <section className="pt-32 pb-24 px-6 lg:px-10">
        <div className="max-w-[1100px] mx-auto">
          <Link to="/pricing" className="text-[#8A8A8A] text-[13px] hover:text-[#C8A45C] transition-colors">
            ← Back to Pricing
          </Link>
          <h1 className="text-white font-black text-[36px] md:text-[48px] mt-4">
            Checkout
          </h1>
          <p className="text-[#8A8A8A] text-[16px] mt-2">
            Complete your order and we'll deploy your automation system within 7 days.
          </p>

          <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Plan Selection */}
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] p-6">
                <h3 className="text-white font-semibold mb-4">Select Plan</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {plans?.map((plan) => (
                    <button
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan.slug)}
                      className={`p-4 border text-left transition-all ${
                        selectedPlan === plan.slug
                          ? "border-[#C8A45C] bg-[#C8A45C]/10"
                          : "border-[#2A2A2A] hover:border-[#3A3A3A]"
                      }`}
                    >
                      <div className="text-white text-[14px] font-semibold">{plan.name}</div>
                      <div className="text-[#8A8A8A] text-[12px] mt-1">
                        ${billingCycle === "yearly" ? Number(plan.yearlyPrice).toLocaleString() : Number(plan.price).toLocaleString()}/{billingCycle === "yearly" ? "year" : "mo"}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Billing Cycle */}
                <div className="flex gap-4 mt-4">
                  <button
                    onClick={() => setBillingCycle("monthly")}
                    className={`px-4 py-2 text-[13px] font-medium border transition-all ${
                      billingCycle === "monthly"
                        ? "border-[#C8A45C] text-[#C8A45C]"
                        : "border-[#2A2A2A] text-[#8A8A8A]"
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setBillingCycle("yearly")}
                    className={`px-4 py-2 text-[13px] font-medium border transition-all ${
                      billingCycle === "yearly"
                        ? "border-[#C8A45C] text-[#C8A45C]"
                        : "border-[#2A2A2A] text-[#8A8A8A]"
                    }`}
                  >
                    Yearly (Save 2 months)
                  </button>
                </div>
              </div>

              {/* Business Info */}
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] p-6 space-y-4">
                <h3 className="text-white font-semibold">Business Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[#8A8A8A] text-[12px] mb-1 block">Business Name</label>
                    <div className="relative">
                      <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8A8A]" />
                      <input
                        type="text"
                        value={formData.businessName}
                        onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                        className="w-full bg-[#0A0A0A] border border-[#2A2A2A] text-white text-[14px] pl-9 pr-4 py-3 focus:border-[#C8A45C] outline-none transition-colors"
                        placeholder="Your Business"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[#8A8A8A] text-[12px] mb-1 block">Industry</label>
                    <select
                      value={formData.industry}
                      onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                      className="w-full bg-[#0A0A0A] border border-[#2A2A2A] text-white text-[14px] px-4 py-3 focus:border-[#C8A45C] outline-none transition-colors appearance-none"
                    >
                      <option value="">Select Industry</option>
                      <option value="hvac">HVAC</option>
                      <option value="plumbing">Plumbing</option>
                      <option value="electrical">Electrical</option>
                      <option value="dental">Dental</option>
                      <option value="legal">Legal</option>
                      <option value="roofing">Roofing</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[#8A8A8A] text-[12px] mb-1 block">Phone</label>
                    <div className="relative">
                      <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8A8A]" />
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full bg-[#0A0A0A] border border-[#2A2A2A] text-white text-[14px] pl-9 pr-4 py-3 focus:border-[#C8A45C] outline-none transition-colors"
                        placeholder="(904) 555-0147"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[#8A8A8A] text-[12px] mb-1 block">City, State</label>
                    <div className="relative">
                      <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8A8A]" />
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        className="w-full bg-[#0A0A0A] border border-[#2A2A2A] text-white text-[14px] pl-9 pr-4 py-3 focus:border-[#C8A45C] outline-none transition-colors"
                        placeholder="Orlando, FL"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* User Info */}
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] p-6">
                <h3 className="text-white font-semibold mb-4">Account</h3>
                {user ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#234524] flex items-center justify-center text-white font-bold">
                      {user.name?.[0] || "U"}
                    </div>
                    <div>
                      <div className="text-white text-[14px]">{user.name}</div>
                      <div className="text-[#8A8A8A] text-[12px]">{user.email}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-[#8A8A8A] text-[14px]">
                    <Link to="/login" className="text-[#C8A45C] hover:underline">
                      Sign in
                    </Link>{" "}
                    to save your order to your account, or continue as guest.
                  </div>
                )}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] p-6 h-fit">
              <h3 className="text-white font-semibold mb-4">Order Summary</h3>
              {activePlan && (
                <>
                  <div className="flex justify-between py-3 border-b border-[#2A2A2A]">
                    <span className="text-[#8A8A8A] text-[14px]">
                      {activePlan.name} Plan ({billingCycle})
                    </span>
                    <span className="text-white text-[14px] font-semibold">
                      ${billingCycle === "yearly"
                        ? Number(activePlan.yearlyPrice).toLocaleString()
                        : Number(activePlan.price).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-[#2A2A2A]">
                    <span className="text-[#8A8A8A] text-[14px]">Setup Fee</span>
                    <span className="text-[#C8A45C] text-[14px]">Waived</span>
                  </div>
                  <div className="flex justify-between py-4">
                    <span className="text-white text-[16px] font-semibold">Total</span>
                    <span className="text-white text-[20px] font-black">
                      ${billingCycle === "yearly"
                        ? Number(activePlan.yearlyPrice).toLocaleString()
                        : Number(activePlan.price).toLocaleString()}
                      <span className="text-[#8A8A8A] text-[14px] font-normal">
                        /{billingCycle === "yearly" ? "year" : "month"}
                      </span>
                    </span>
                  </div>
                </>
              )}

              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full bg-[#C8A45C] text-[#0A0A0A] text-[14px] font-semibold py-4 hover:bg-[#D4BC7E] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
              >
                <CreditCard size={16} />
                {isSubmitting ? "Processing..." : "Complete Order"}
              </button>

              <div className="mt-4 space-y-2">
                {[
                  "Deploys in under 7 days",
                  "30-day money-back guarantee",
                  "No long-term contract",
                  "Cancel anytime",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-[#8A8A8A] text-[12px]">
                    <Check size={12} className="text-[#C8A45C]" />
                    {item}
                  </div>
                ))}
              </div>

              <div className="mt-6 text-center">
                <span className="text-[#8A8A8A] text-[12px]">
                  Questions? Call us at{" "}
                  <a href="tel:9045550147" className="text-[#C8A45C]">
                    (904) 555-0147
                  </a>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}


