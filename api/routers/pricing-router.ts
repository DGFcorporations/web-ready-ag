import { z } from "zod";
import { eq, asc } from "drizzle-orm";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { pricingPlans, planFeatures } from "@db/schema";

export const pricingRouter = createRouter({
  list: publicQuery.query(async () => {
    const db = getDb();
    const plans = await db.query.pricingPlans.findMany({
      orderBy: [asc(pricingPlans.sortOrder)],
    });
    const features = await db.query.planFeatures.findMany({
      orderBy: [asc(planFeatures.sortOrder)],
    });
    return plans.map((plan) => ({
      ...plan,
      features: features.filter((f) => f.planId === plan.id),
    }));
  }),

  getBySlug: publicQuery
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const plan = await db.query.pricingPlans.findFirst({
        where: eq(pricingPlans.slug, input.slug),
      });
      if (!plan) return null;
      const features = await db.query.planFeatures.findMany({
        where: eq(planFeatures.planId, plan.id),
        orderBy: [asc(planFeatures.sortOrder)],
      });
      return { ...plan, features };
    }),
});
