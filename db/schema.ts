import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  timestamp,
  decimal,
  int,
  json,
  boolean,
  bigint,
} from "drizzle-orm/mysql-core";

// ─── Users ───────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  phone: varchar("phone", { length: 20 }),
  businessName: varchar("business_name", { length: 255 }),
  location: varchar("location", { length: 255 }),
  industry: varchar("industry", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Services ────────────────────────────────────────────────────
export const services = mysqlTable("services", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  shortDesc: varchar("short_desc", { length: 500 }),
  fullDesc: text("full_desc"),
  features: json("features"),
  icon: varchar("icon", { length: 50 }),
  category: mysqlEnum("category", ["voice", "outreach", "crm", "reviews", "seo", "assistants"]).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: int("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Service = typeof services.$inferSelect;

// ─── Pricing Plans ───────────────────────────────────────────────
export const pricingPlans = mysqlTable("pricing_plans", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  yearlyPrice: decimal("yearly_price", { precision: 10, scale: 2 }),
  description: varchar("description", { length: 500 }),
  isPopular: boolean("is_popular").notNull().default(false),
  sortOrder: int("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export type PricingPlan = typeof pricingPlans.$inferSelect;

// ─── Plan Features ───────────────────────────────────────────────
export const planFeatures = mysqlTable("plan_features", {
  id: serial("id").primaryKey(),
  planId: bigint("plan_id", { mode: "number", unsigned: true }).notNull(),
  feature: varchar("feature", { length: 255 }).notNull(),
  included: boolean("included").notNull().default(true),
  sortOrder: int("sort_order").notNull().default(0),
});

export type PlanFeature = typeof planFeatures.$inferSelect;

// ─── Orders ──────────────────────────────────────────────────────
export const orders = mysqlTable("orders", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true }),
  planId: bigint("plan_id", { mode: "number", unsigned: true }).notNull(),
  status: mysqlEnum("status", ["pending", "paid", "deploying", "active", "cancelled", "refunded"])
    .notNull()
    .default("pending"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  billingCycle: mysqlEnum("billing_cycle", ["monthly", "yearly"]).notNull().default("monthly"),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  deployedAt: timestamp("deployed_at"),
  expiresAt: timestamp("expires_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
});

export type Order = typeof orders.$inferSelect;

// ─── Order Services ──────────────────────────────────────────────
export const orderServices = mysqlTable("order_services", {
  id: serial("id").primaryKey(),
  orderId: bigint("order_id", { mode: "number", unsigned: true }).notNull(),
  serviceId: bigint("service_id", { mode: "number", unsigned: true }).notNull(),
  deploymentStatus: mysqlEnum("deployment_status", ["pending", "in_progress", "completed", "failed"])
    .notNull()
    .default("pending"),
  deploymentLog: text("deployment_log"),
  completedAt: timestamp("completed_at"),
});

export type OrderService = typeof orderServices.$inferSelect;

// ─── Leads ───────────────────────────────────────────────────────
export const leads = mysqlTable("leads", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  businessName: varchar("business_name", { length: 255 }),
  industry: varchar("industry", { length: 100 }),
  location: varchar("location", { length: 255 }),
  message: text("message"),
  source: varchar("source", { length: 100 }),
  status: mysqlEnum("status", ["new", "contacted", "qualified", "converted", "lost"])
    .notNull()
    .default("new"),
  assignedTo: bigint("assigned_to", { mode: "number", unsigned: true }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
});

export type Lead = typeof leads.$inferSelect;

// ─── Geo Pages ───────────────────────────────────────────────────
export const geoPages = mysqlTable("geo_pages", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  city: varchar("city", { length: 255 }).notNull(),
  state: varchar("state", { length: 50 }).notNull(),
  metaTitle: varchar("meta_title", { length: 255 }),
  metaDescription: varchar("meta_description", { length: 500 }),
  headline: varchar("headline", { length: 500 }),
  bodyContent: text("body_content"),
  services: json("services"),
  stats: json("stats"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
});

export type GeoPage = typeof geoPages.$inferSelect;

// ─── Blog Posts ──────────────────────────────────────────────────
export const blogPosts = mysqlTable("blog_posts", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  excerpt: varchar("excerpt", { length: 500 }),
  content: text("content").notNull(),
  featuredImage: varchar("featured_image", { length: 500 }),
  category: varchar("category", { length: 100 }),
  tags: json("tags"),
  author: varchar("author", { length: 255 }),
  metaTitle: varchar("meta_title", { length: 255 }),
  metaDescription: varchar("meta_description", { length: 500 }),
  publishedAt: timestamp("published_at"),
  isPublished: boolean("is_published").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
});

export type BlogPost = typeof blogPosts.$inferSelect;

// ─── Testimonials ────────────────────────────────────────────────
export const testimonials = mysqlTable("testimonials", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  business: varchar("business", { length: 255 }),
  industry: varchar("industry", { length: 100 }),
  location: varchar("location", { length: 255 }),
  quote: text("quote").notNull(),
  metric: varchar("metric", { length: 100 }),
  metricLabel: varchar("metric_label", { length: 100 }),
  avatar: varchar("avatar", { length: 500 }),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: int("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Testimonial = typeof testimonials.$inferSelect;

// ─── Enterprise 4-Layer Telemetry Tables (SEO / AEO / GEO / AIO) ────
export const crawlTelemetryRuns = mysqlTable("crawl_telemetry_runs", {
  id: serial("id").primaryKey(),
  domain: varchar("domain", { length: 255 }).notNull(),
  logSource: varchar("log_source", { length: 32 }).notNull().default("cloudflare"),
  totalHits: int("total_hits").notNull().default(0),
  retrievalBotHits: int("retrieval_bot_hits").notNull().default(0),
  trainingBotHits: int("training_bot_hits").notNull().default(0),
  humanHits: int("human_hits").notNull().default(0),
  non200Rate: decimal("non_200_rate", { precision: 6, scale: 2 }).notNull().default("0.00"),
  orphanUrlsJson: json("orphan_urls_json"),
  crawlTrapUrlsJson: json("crawl_trap_urls_json"),
  uncrawledUrlsJson: json("uncrawled_urls_json"),
  crawlWastePercent: decimal("crawl_waste_percent", { precision: 6, scale: 2 })
    .notNull()
    .default("0.00"),
  crawlToCitationRatio: decimal("crawl_to_citation_ratio", { precision: 8, scale: 2 }),
  summaryJson: json("summary_json"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type CrawlTelemetryRun = typeof crawlTelemetryRuns.$inferSelect;

export const aiReferralEvents = mysqlTable("ai_referral_events", {
  id: serial("id").primaryKey(),
  domain: varchar("domain", { length: 255 }).notNull(),
  sourceHost: varchar("source_host", { length: 120 }).notNull(),
  landingPath: varchar("landing_path", { length: 500 }).notNull(),
  sessionsCount: int("sessions_count").notNull().default(0),
  conversionsCount: int("conversions_count").notNull().default(0),
  revenueAmount: decimal("revenue_amount", { precision: 10, scale: 2 })
    .notNull()
    .default("0.00"),
  recordedDate: varchar("recorded_date", { length: 10 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type AiReferralEvent = typeof aiReferralEvents.$inferSelect;

export const gscExportRows = mysqlTable("gsc_export_rows", {
  id: serial("id").primaryKey(),
  domain: varchar("domain", { length: 255 }).notNull(),
  dataDate: varchar("data_date", { length: 10 }).notNull(),
  urlPath: varchar("url_path", { length: 500 }).notNull(),
  queryText: varchar("query_text", { length: 500 }),
  clicks: int("clicks").notNull().default(0),
  impressions: int("impressions").notNull().default(0),
  ctr: decimal("ctr", { precision: 6, scale: 4 }).notNull().default("0.0000"),
  avgPosition: decimal("avg_position", { precision: 6, scale: 2 }).notNull().default("0.00"),
  bigqueryDataset: varchar("bigquery_dataset", { length: 120 }),
  bigqueryTable: varchar("bigquery_table", { length: 120 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export type GscExportRow = typeof gscExportRows.$inferSelect;

export const llmPromptRuns = mysqlTable("llm_prompt_runs", {
  id: serial("id").primaryKey(),
  domain: varchar("domain", { length: 255 }).notNull(),
  promptText: varchar("prompt_text", { length: 500 }).notNull(),
  stage: varchar("stage", { length: 32 }).notNull(),
  engine: varchar("engine", { length: 32 }).notNull(),
  citedBrand: boolean("cited_brand").notNull().default(false),
  competitorCitations: int("competitor_citations").notNull().default(0),
  provenance: varchar("provenance", { length: 32 }).notNull(),
  sentiment: varchar("sentiment", { length: 24 }).notNull(),
  responseExcerpt: text("response_excerpt"),
  measuredAt: timestamp("measured_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type LlmPromptRun = typeof llmPromptRuns.$inferSelect;

export const entityCorroborations = mysqlTable("entity_corroborations", {
  id: serial("id").primaryKey(),
  domain: varchar("domain", { length: 255 }).notNull(),
  sourceType: varchar("source_type", { length: 48 }).notNull(),
  expectedJson: json("expected_json"),
  observedJson: json("observed_json"),
  conflictCount: int("conflict_count").notNull().default(0),
  conflictsJson: json("conflicts_json"),
  thirdPartyCitations90d: int("third_party_citations_90d").notNull().default(0),
  favorableSentimentPct: decimal("favorable_sentiment_pct", { precision: 5, scale: 2 })
    .notNull()
    .default("0.00"),
  checkedAt: timestamp("checked_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type EntityCorroboration = typeof entityCorroborations.$inferSelect;

export const botAccessProbes = mysqlTable("bot_access_probes", {
  id: serial("id").primaryKey(),
  domain: varchar("domain", { length: 255 }).notNull(),
  targetUrl: varchar("target_url", { length: 500 }).notNull(),
  botName: varchar("bot_name", { length: 64 }).notNull(),
  botCategory: varchar("bot_category", { length: 32 }).notNull(),
  httpStatus: int("http_status"),
  wafBlocked: boolean("waf_blocked").notNull().default(false),
  challengeDetected: boolean("challenge_detected").notNull().default(false),
  robotsAllowed: boolean("robots_allowed").notNull().default(true),
  probedAt: timestamp("probed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type BotAccessProbe = typeof botAccessProbes.$inferSelect;

export const schemaVerificationJobs = mysqlTable("schema_verification_jobs", {
  id: serial("id").primaryKey(),
  domain: varchar("domain", { length: 255 }).notNull(),
  targetUrl: varchar("target_url", { length: 500 }).notNull(),
  status: varchar("status", { length: 24 }).notNull().default("pending"),
  triggerSource: varchar("trigger_source", { length: 32 }).notNull().default("manual"),
  overallScore: int("overall_score"),
  seoScore: int("seo_score"),
  aeoScore: int("aeo_score"),
  geoScore: int("geo_score"),
  aioScore: int("aio_score"),
  danglingRefsCount: int("dangling_refs_count").notNull().default(0),
  reportJson: json("report_json"),
  scheduledFor: timestamp("scheduled_for"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type SchemaVerificationJob = typeof schemaVerificationJobs.$inferSelect;
