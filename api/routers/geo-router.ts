import { z } from "zod";
import { eq, and, asc } from "drizzle-orm";
import { createRouter, publicQuery, adminQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { geoPages } from "@db/schema";

export const geoRouter = createRouter({
  list: publicQuery
    .input(z.object({ state: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      if (input?.state) {
        return db.query.geoPages.findMany({
          where: and(eq(geoPages.isActive, true), eq(geoPages.state, input.state)),
          orderBy: [asc(geoPages.city)],
        });
      }
      return db.query.geoPages.findMany({
        where: eq(geoPages.isActive, true),
        orderBy: [asc(geoPages.city)],
      });
    }),

  getBySlug: publicQuery
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db.query.geoPages.findFirst({
        where: and(eq(geoPages.slug, input.slug), eq(geoPages.isActive, true)),
      });
    }),

  create: adminQuery
    .input(
      z.object({
        slug: z.string().min(1),
        city: z.string().min(1),
        state: z.string().min(1),
        metaTitle: z.string().optional(),
        metaDescription: z.string().optional(),
        headline: z.string().optional(),
        bodyContent: z.string().optional(),
        services: z.string().optional(),
        stats: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const values = {
        ...input,
        services: input.services ? JSON.parse(input.services) : undefined,
        stats: input.stats ? JSON.parse(input.stats) : undefined,
      };
      const result = await db.insert(geoPages).values(values);
      return { id: Number(result[0].insertId), ...input };
    }),

  update: adminQuery
    .input(
      z.object({
        id: z.number(),
        slug: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        metaTitle: z.string().optional(),
        metaDescription: z.string().optional(),
        headline: z.string().optional(),
        bodyContent: z.string().optional(),
        services: z.string().optional(),
        stats: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const db = getDb();
      await db.update(geoPages).set(data).where(eq(geoPages.id, id));
      return { success: true };
    }),

  delete: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(geoPages).where(eq(geoPages.id, input.id));
      return { success: true };
    }),
});
