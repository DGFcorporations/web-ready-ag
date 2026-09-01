import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function AEOFAQSection() {
  const faqs = [
    {
      q: "What is AI Automation for Service Businesses?",
      a: "AI automation for service businesses involves using artificial intelligence, such as Voice AI and CRM integrations, to handle repetitive tasks like answering calls, qualifying leads, and scheduling appointments 24/7 without human intervention."
    },
    {
      q: "How does AIO (Artificial Intelligence Optimization) help my business?",
      a: "AIO prepares your website and digital presence to be easily understood by Large Language Models (LLMs) and Answer Engines. By structuring your data (JSON-LD), we ensure that when a customer asks ChatGPT or Perplexity for a local service recommendation, your business is cited as the primary answer."
    },
    {
      q: "Can AI Voice Agents really replace a human receptionist?",
      a: "Yes. Our Agent-Grade Voice AI can understand natural language, handle complex scheduling, answer specific business questions, and log all details directly into your CRM. It operates 24/7 and never misses a call, capturing leads that human receptionists might miss during off-hours."
    },
    {
      q: "How fast can an AI automation system be deployed?",
      a: "We deploy complete AI automation systems, including Voice AI, CRM sync, and automated outreach, in under one week for Florida service businesses."
    }
  ];

  return (
    <section className="bg-[#0A0A0A] py-24 px-6 lg:px-10 border-t border-[#1A1A1A]">
      <div className="max-w-[800px] mx-auto">
        <div className="text-center mb-12">
          <span className="font-mono text-[12px] text-[#C8A45C] uppercase tracking-[0.1em]">
            Answer Engine Optimized
          </span>
          <h2 className="text-white text-[32px] md:text-[40px] font-bold mt-4">
            Frequently Asked Questions
          </h2>
        </div>

        {/* Answer Engine Structured Content Block */}
        <div itemScope itemType="https://schema.org/FAQPage">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem 
                key={i} 
                value={`item-${i}`} 
                className="border-[#2A2A2A]"
                itemScope 
                itemProp="mainEntity" 
                itemType="https://schema.org/Question"
              >
                <AccordionTrigger className="text-white hover:text-[#C8A45C] text-left text-[18px]">
                  <span itemProp="name">{faq.q}</span>
                </AccordionTrigger>
                <AccordionContent 
                  className="text-[#8A8A8A] text-[16px] leading-relaxed"
                  itemScope 
                  itemProp="acceptedAnswer" 
                  itemType="https://schema.org/Answer"
                >
                  <span itemProp="text">{faq.a}</span>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
