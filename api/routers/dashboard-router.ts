import { z } from "zod";
import { desc, sql } from "drizzle-orm";
import { createRouter, adminQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { leads, users } from "@db/schema";

export const dashboardRouter = createRouter({
  stats: adminQuery.query(async () => {
    const db = getDb();
    const usersCount = await db.select({ count: sql<number>`count(*)` }).from(users);
    const leadsCount = await db.select({ count: sql<number>`count(*)` }).from(leads);

    return {
      users: Number(usersCount[0].count),
      leads: Number(leadsCount[0].count),
    };
  }),

  recentLeads: adminQuery
    .input(z.object({ limit: z.number().min(1).max(50).default(10) }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const limit = input?.limit ?? 10;
      return db.query.leads.findMany({
        orderBy: [desc(leads.createdAt)],
        limit,
      });
    }),
});
