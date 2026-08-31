import { z } from "zod";
import { eq, asc } from "drizzle-orm";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { services } from "@db/schema";

export const serviceRouter = createRouter({
  list: publicQuery
    .input(z.object({ category: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [];
      if (input?.category) {
        conditions.push(eq(services.category, input.category as "voice" | "outreach" | "crm" | "reviews" | "seo" | "assistants"));
      }
      const result = await db.query.services.findMany({
        where: conditions.length > 0 ? conditions[0] : undefined,
        orderBy: [asc(services.sortOrder)],
      });
      return result;
    }),

  getBySlug: publicQuery
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db.query.services.findFirst({
        where: eq(services.slug, input.slug),
      });
      return result;
    }),
});
