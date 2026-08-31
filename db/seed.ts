import { getDb } from "../api/queries/connection";
import {
  services,
  testimonials,
  geoPages,
  blogPosts,
} from "./schema";

async function seed() {
  const db = getDb();
  console.log("Seeding database...");

  // ─── Services ───────────────────────────────────────────
  const existingServices = await db.query.services.findMany();
  if (existingServices.length === 0) {
    await db.insert(services).values([
      {
        slug: "voice-ai",
        name: "Voice AI",
        shortDesc: "Intelligent phone agents that handle inbound calls, qualify leads, and book appointments 24/7",
        fullDesc: "Our AI Voice Agents answer every call with natural language understanding. They qualify leads, schedule appointments, take messages, and route emergency calls — all without human intervention. Integration with your existing phone system takes under 48 hours.",
        features: JSON.stringify([
          "Natural language call handling",
          "Real-time appointment booking",
          "Post-call Gmail + Sheets logging",
          "Florida phone number included",
          "Powered by Claude AI",
        ]),
        icon: "phone",
        category: "voice",
        sortOrder: 1,
      },
      {
        slug: "cold-outreach",
        name: "Cold Outreach",
        shortDesc: "Multi-agent infrastructure that researches prospects and writes personalized emails automatically",
        fullDesc: "Our 3-agent research + email stack identifies ideal prospects, crafts personalized outreach messages, and manages follow-up cadences automatically. Four approval gates keep you in control while eliminating manual work.",
        features: JSON.stringify([
          "3-agent research + email stack",
          "Day 0 → 3 → 7 → 14 follow-up cadence",
          "Four approval gates you control",
          "Gmail-native, zero new tools",
          "Vertical-specific messaging",
        ]),
        icon: "mail",
        category: "outreach",
        sortOrder: 2,
      },
      {
        slug: "crm-automation",
        name: "CRM Automation",
        shortDesc: "Connected workflows that sync calls, emails, and calendar eliminating manual admin",
        fullDesc: "We connect your existing tools into a seamless workflow. Every call, email, and appointment is automatically logged, categorized, and routed. Your team focuses on serving customers while the system handles the paperwork.",
        features: JSON.stringify([
          "Google Sheets CRM integration",
          "Automated Gmail notifications",
          "Calendar sync & scheduling",
          "Custom reporting dashboards",
          "Full deployment documentation",
        ]),
        icon: "database",
        category: "crm",
        sortOrder: 3,
      },
      {
        slug: "review-generation",
        name: "Review Generation",
        shortDesc: "Automated systems that capture feedback and distribute positive reviews across platforms",
        fullDesc: "Capture customer feedback at the perfect moment and automatically distribute positive reviews to Google, Yelp, and industry-specific platforms. Our system identifies satisfied customers and guides them through the review process.",
        features: JSON.stringify([
          "Automated review requests",
          "Google & Yelp distribution",
          "Customer satisfaction tracking",
          "Negative feedback alerts",
          "Review response templates",
        ]),
        icon: "star",
        category: "reviews",
        sortOrder: 4,
      },
      {
        slug: "local-seo",
        name: "Local SEO",
        shortDesc: "Data-driven optimization that puts your business at the top of local search results",
        fullDesc: "We optimize your business for local search dominance. From Google Business Profile management to citation building and geo-targeted content, we ensure customers find you first when they search for services in your area.",
        features: JSON.stringify([
          "Google Business optimization",
          "Citation building",
          "Geo-targeted content",
          "Competitor analysis",
          "Monthly ranking reports",
        ]),
        icon: "map-pin",
        category: "seo",
        sortOrder: 5,
      },
      {
        slug: "ai-assistants",
        name: "AI Assistants",
        shortDesc: "Custom-trained chatbots that handle inquiries, scheduling, and support across all channels",
        fullDesc: "Deploy intelligent assistants across your website, SMS, and social channels. Trained on your business data, they handle inquiries, schedule appointments, and provide support 24/7 with human-like conversation quality.",
        features: JSON.stringify([
          "Website chat integration",
          "SMS-based responses",
          "Custom training on your data",
          "Multi-channel support",
          "Conversation analytics",
        ]),
        icon: "bot",
        category: "assistants",
        sortOrder: 6,
      },
    ]);
    console.log("Seeded 6 services");
  }

  // ─── Testimonials ───────────────────────────────────────
  const existingTestimonials = await db.query.testimonials.findMany();
  if (existingTestimonials.length === 0) {
    await db.insert(testimonials).values([
      {
        name: "Marcus Rodriguez",
        business: "Coastal Plumbing",
        industry: "Plumbing",
        location: "Tampa, FL",
        quote: "DGF deployed our AI voice system in 5 days. We're answering every call now, even at 2 AM. The lead increase has been incredible.",
        metric: "147%",
        metricLabel: "Lead Increase",
        sortOrder: 1,
      },
      {
        name: "Dr. Sarah Chen",
        business: "Bright Smile Dental",
        industry: "Dental",
        location: "Miami, FL",
        quote: "Our patients love the instant response. No more voicemail tag. The AI handles scheduling perfectly, even rescheduling complex appointments.",
        metric: "3.2x",
        metricLabel: "Faster Response",
        sortOrder: 2,
      },
      {
        name: "James Whitfield",
        business: "Whitfield & Associates",
        industry: "Legal",
        location: "Jacksonville, FL",
        quote: "The CRM automation eliminated our admin bottleneck. Invoicing, follow-ups, and client communications now happen automatically. Game changer.",
        metric: "$47K",
        metricLabel: "Annual Savings",
        sortOrder: 3,
      },
      {
        name: "Elena Vasquez",
        business: "Orlando HVAC Pros",
        industry: "HVAC",
        location: "Orlando, FL",
        quote: "We were losing emergency calls to competitors. Now every call gets answered immediately, and the AI qualifies the lead before routing to our on-call tech.",
        metric: "312%",
        metricLabel: "ROI First Year",
        sortOrder: 4,
      },
      {
        name: "David Park",
        business: "Park Electrical Services",
        industry: "Electrical",
        location: "Daytona Beach, FL",
        quote: "The cold outreach system generated 3 new commercial contracts in the first month alone. The personalization is surprisingly good — prospects think we wrote each email.",
        metric: "89%",
        metricLabel: "Customer Satisfaction",
        sortOrder: 5,
      },
    ]);
    console.log("Seeded 5 testimonials");
  }

  // ─── Geo Pages ──────────────────────────────────────────
  const existingGeo = await db.query.geoPages.findMany();
  if (existingGeo.length === 0) {
    const cities = [
      { slug: "palm-coast", city: "Palm Coast", state: "FL" },
      { slug: "daytona-beach", city: "Daytona Beach", state: "FL" },
      { slug: "orlando", city: "Orlando", state: "FL" },
      { slug: "jacksonville", city: "Jacksonville", state: "FL" },
      { slug: "tampa", city: "Tampa", state: "FL" },
      { slug: "miami", city: "Miami", state: "FL" },
      { slug: "st-augustine", city: "St. Augustine", state: "FL" },
      { slug: "gainesville", city: "Gainesville", state: "FL" },
      { slug: "tallahassee", city: "Tallahassee", state: "FL" },
      { slug: "fort-lauderdale", city: "Fort Lauderdale", state: "FL" },
      { slug: "sarasota", city: "Sarasota", state: "FL" },
      { slug: "clearwater", city: "Clearwater", state: "FL" },
    ];

    for (const c of cities) {
      await db.insert(geoPages).values({
        slug: c.slug,
        city: c.city,
        state: c.state,
        metaTitle: `AI Automation for ${c.city} Small Businesses | DGF Corporations`,
        metaDescription: `Veteran-owned AI automation agency serving ${c.city}, FL. Voice AI, CRM automation, and outreach systems for local service businesses. Book your free strategy call.`,
        headline: `AI Automation Built for ${c.city} Service Businesses`,
        bodyContent: `<p>DGF Corporations brings enterprise-grade AI automation to ${c.city} small businesses. As a veteran-owned company based in Florida, we understand the unique challenges facing local service businesses in the ${c.city} market.</p>
        <p>Our ready-to-deploy systems include AI voice agents that answer calls 24/7, automated CRM workflows that eliminate manual data entry, and intelligent outreach systems that generate new leads while you focus on serving customers.</p>
        <p>Every system is configured specifically for your business and deployed within one week. No long-term contracts. No hidden fees. Just results.</p>`,
        services: JSON.stringify(["voice-ai", "crm-automation", "cold-outreach", "local-seo"]),
        stats: JSON.stringify({
          businesses: "2,400+",
          avgDeploy: "< 1 week",
          satisfaction: "94%",
        }),
      });
    }
    console.log("Seeded 12 geo pages");
  }

  // ─── Blog Posts ─────────────────────────────────────────
  const existingPosts = await db.query.blogPosts.findMany();
  if (existingPosts.length === 0) {
    await db.insert(blogPosts).values([
      {
        slug: "ai-voice-agents-small-business-2026",
        title: "Why Every Florida Small Business Needs an AI Voice Agent in 2026",
        excerpt: "Missed calls cost service businesses an average of $18,000 per year. Here's how AI voice agents are changing the game.",
        content: `<p>In 2026, customers expect instant responses. When a potential client calls your business and gets voicemail, 67% will hang up and call a competitor. For Florida service businesses — HVAC, plumbing, electrical, dental, legal — this translates to thousands in lost revenue every month.</p>
        <h2>The Cost of Missed Calls</h2>
        <p>According to industry research, the average service business misses 35% of incoming calls during business hours, and nearly 80% after hours. Each missed call represents a potential customer who will take their business elsewhere.</p>
        <h2>How AI Voice Agents Work</h2>
        <p>Modern AI voice agents use natural language processing to have human-like conversations. They can qualify leads, schedule appointments, answer common questions, and route urgent calls — all without human intervention.</p>
        <h2>Real Results from Florida Businesses</h2>
        <p>Our clients report an average 147% increase in captured leads within the first 60 days of deployment. The system pays for itself within the first month.</p>`,
        category: "AI Voice",
        tags: JSON.stringify(["voice-ai", "small-business", "florida"]),
        author: "DGF Corporations",
        metaTitle: "AI Voice Agents for Small Businesses 2026 | DGF Corporations",
        metaDescription: "Learn why Florida service businesses are adopting AI voice agents to capture more leads and provide 24/7 customer service.",
        isPublished: true,
        publishedAt: new Date("2026-05-15"),
      },
      {
        slug: "crm-automation-service-businesses",
        title: "The Complete Guide to CRM Automation for Service Businesses",
        excerpt: "Stop losing leads to spreadsheet chaos. Here's how to automate your customer management from first call to final invoice.",
        content: `<p>Most service businesses run on a patchwork of spreadsheets, sticky notes, and memory. When a lead comes in, someone writes it down. When a job completes, someone manually sends an invoice. When a customer needs a follow-up, someone has to remember.</p>
        <h2>The Automation Advantage</h2>
        <p>CRM automation connects every touchpoint in your customer journey. From the moment a prospect calls to the final invoice payment, every action is tracked, every follow-up is scheduled, and no lead falls through the cracks.</p>
        <h2>What We Automate</h2>
        <ul><li>Lead capture and scoring</li><li>Appointment scheduling</li><li>Follow-up sequences</li><li>Invoice generation</li><li>Review requests</li><li>Referral outreach</li></ul>`,
        category: "CRM",
        tags: JSON.stringify(["crm", "automation", "service-business"]),
        author: "DGF Corporations",
        metaTitle: "CRM Automation Guide for Service Businesses | DGF Corporations",
        metaDescription: "Discover how CRM automation can streamline your service business operations and eliminate manual admin work.",
        isPublished: true,
        publishedAt: new Date("2026-05-10"),
      },
      {
        slug: "local-seo-florida-small-business",
        title: "Local SEO Strategies That Actually Work for Florida Small Businesses",
        excerpt: "Tired of being on page 2 of Google? These proven local SEO tactics will put your business at the top of local search results.",
        content: `<p>When someone searches "plumber near me" or "HVAC repair Orlando," the businesses that appear first get the calls. Local SEO is the art and science of making sure your business shows up when local customers are searching for your services.</p>
        <h2>Google Business Profile Optimization</h2>
        <p>Your Google Business Profile is the foundation of local SEO. We optimize every element — categories, descriptions, photos, posts, and Q&A — to signal relevance to Google's algorithm.</p>
        <h2>Citation Building</h2>
        <p>Consistent business information across the web builds trust with search engines. We ensure your NAP (Name, Address, Phone) is identical across 50+ directories.</p>`,
        category: "Local SEO",
        tags: JSON.stringify(["local-seo", "florida", "google"]),
        author: "DGF Corporations",
        metaTitle: "Local SEO for Florida Small Businesses | DGF Corporations",
        metaDescription: "Proven local SEO strategies to rank higher in Florida search results and attract more local customers to your service business.",
        isPublished: true,
        publishedAt: new Date("2026-05-05"),
      },
    ]);
    console.log("Seeded 3 blog posts");
  }

  console.log("Seed complete!");
}

seed().catch(console.error);
