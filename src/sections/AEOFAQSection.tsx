export default function AEOFAQSection() {
  const faqs = [
    {
      id: "faq-service-automation",
      label: "Service Automation",
      q: "What is AI Automation for Service Businesses?",
      a: "AI automation for commercial service businesses combines Agent-Grade Voice AI receptionists, structured CRM workflows, and automated follow-up sequences to answer inbound phone calls, qualify buyer intent, and schedule confirmed calendar bookings 24 hours a day across regulated local markets without manual data entry.",
    },
    {
      id: "faq-aio-governance",
      label: "AIO & Bot Policy",
      q: "How does AIO (Artificial Intelligence Optimization) help my business?",
      a: "Artificial Intelligence Optimization structures website HTML, connected @id JSON-LD graphs, and separate retrieval and foundation-model training policies so OpenAI SearchBot, PerplexityBot, Claude-SearchBot, and Googlebot can retrieve factual service pricing while training access follows the organization’s data-governance choice.",
    },
    {
      id: "faq-voice-ai",
      label: "Voice AI Reception",
      q: "Can AI Voice Agents really replace a human receptionist?",
      a: "Agent-Grade Voice AI handles concurrent inbound calls with natural speech comprehension, appointment booking, service eligibility screening, and instant CRM synchronization 24/7. Teams capture after-hours inquiries immediately while routing specialized consultations cleanly to dedicated staff without missed leads.",
    },
    {
      id: "faq-deployment-speed",
      label: "Deployment Speed",
      q: "How fast can an AI automation system be deployed?",
      a: "WEB-READY/AG engineers and launches full 4-layer search architecture, Voice AI call routing, CRM workflow synchronization, and automated schema verification in under seven days for Florida service businesses, including segmented XML sitemap deployment and mobile Core Web Vitals tuning under 1.8 seconds.",
    },
  ];

  return (
    <section className="bg-[#0A0A0A] py-24 px-6 lg:px-10 border-t border-[#1A1A1A]">
      <div className="max-w-[800px] mx-auto">
        <div className="text-center mb-8">
          <span className="font-mono text-[12px] text-[#C8A45C] uppercase tracking-[0.1em]">
            Answer Engine Optimized
          </span>
          <h2 className="text-white text-[32px] md:text-[40px] font-bold mt-4">
            Frequently Asked Questions
          </h2>
          <nav
            aria-label="Answer capsules"
            className="mt-4 flex flex-wrap justify-center gap-3 font-mono text-[11px] text-[#C8A45C]"
          >
            {faqs.map((faq) => (
              <a key={faq.id} href={`#${faq.id}`} className="hover:underline">
                {faq.label}
              </a>
            ))}
          </nav>
        </div>

        {/* Standalone 40-60w Answer Capsules under Question H3s */}
        <div className="space-y-4">
          {faqs.map((faq) => (
            <article
              key={faq.id}
              id={faq.id}
              className="bg-[#141414] border border-[#2A2A2A] p-6"
            >
              <h3 className="text-white text-[18px] font-semibold mb-3">{faq.q}</h3>
              <p className="text-[#C8C8C8] text-[15px] leading-relaxed">{faq.a}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
