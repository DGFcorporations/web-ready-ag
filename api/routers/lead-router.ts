import { z } from "zod";
import { eq, desc, sql } from "drizzle-orm";
import { createRouter, publicQuery, adminQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { leads } from "@db/schema";

export const leadRouter = createRouter({
  create: publicQuery
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional(),
        businessName: z.string().optional(),
        industry: z.string().optional(),
        location: z.string().optional(),
        message: z.string().optional(),
        source: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const result = await db.insert(leads).values(input);
      return { id: Number(result[0].insertId), ...input };
    }),

  list: adminQuery
    .input(
      z.object({
        status: z.string().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      const page = input?.page ?? 1;
      const limit = input?.limit ?? 20;
      const offset = (page - 1) * limit;

      const conditions = input?.status
        ? eq(leads.status, input.status as "new" | "contacted" | "qualified" | "converted" | "lost")
        : undefined;

      const result = await db.query.leads.findMany({
        where: conditions,
        orderBy: [desc(leads.createdAt)],
        limit,
        offset,
      });

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(leads);

      return { leads: result, total: Number(countResult[0].count) };
    }),

  updateStatus: adminQuery
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["new", "contacted", "qualified", "converted", "lost"]),
        assignedTo: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(leads)
        .set({
          status: input.status,
          ...(input.assignedTo ? { assignedTo: input.assignedTo } : {}),
        })
        .where(eq(leads.id, input.id));
      return { success: true };
    }),

  getStats: adminQuery.query(async () => {
    const db = getDb();
    const totalResult = await db.select({ count: sql<number>`count(*)` }).from(leads);
    const newResult = await db.select({ count: sql<number>`count(*)` }).from(leads).where(eq(leads.status, "new"));
    const convertedResult = await db.select({ count: sql<number>`count(*)` }).from(leads).where(eq(leads.status, "converted"));
    const qualifiedResult = await db.select({ count: sql<number>`count(*)` }).from(leads).where(eq(leads.status, "qualified"));

    return {
      totalLeads: Number(totalResult[0].count),
      newLeads: Number(newResult[0].count),
      convertedLeads: Number(convertedResult[0].count),
      qualifiedLeads: Number(qualifiedResult[0].count),
    };
  }),
});
