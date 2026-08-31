import { z } from "zod";
import { eq, asc } from "drizzle-orm";
import { createRouter, publicQuery, adminQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { testimonials } from "@db/schema";

export const testimonialRouter = createRouter({
  list: publicQuery.query(async () => {
    const db = getDb();
    return db.query.testimonials.findMany({
      where: eq(testimonials.isActive, true),
      orderBy: [asc(testimonials.sortOrder)],
    });
  }),

  create: adminQuery
    .input(
      z.object({
        name: z.string().min(1),
        business: z.string().optional(),
        industry: z.string().optional(),
        location: z.string().optional(),
        quote: z.string().min(1),
        metric: z.string().optional(),
        metricLabel: z.string().optional(),
        sortOrder: z.number().default(0),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const result = await db.insert(testimonials).values(input);
      return { id: Number(result[0].insertId), ...input };
    }),

  update: adminQuery
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        business: z.string().optional(),
        quote: z.string().optional(),
        metric: z.string().optional(),
        metricLabel: z.string().optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const db = getDb();
      await db.update(testimonials).set(data).where(eq(testimonials.id, id));
      return { success: true };
    }),

  delete: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(testimonials).where(eq(testimonials.id, input.id));
      return { success: true };
    }),
});
