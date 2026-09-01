import { authRouter } from "./auth-router";
import { createRouter, publicQuery } from "./middleware";
import { serviceRouter } from "./routers/service-router";
import { leadRouter } from "./routers/lead-router";
import { geoRouter } from "./routers/geo-router";
import { blogRouter } from "./routers/blog-router";
import { testimonialRouter } from "./routers/testimonial-router";
import { dashboardRouter } from "./routers/dashboard-router";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  service: serviceRouter,
  lead: leadRouter,
  geo: geoRouter,
  blog: blogRouter,
  testimonial: testimonialRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;
