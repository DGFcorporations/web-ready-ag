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
