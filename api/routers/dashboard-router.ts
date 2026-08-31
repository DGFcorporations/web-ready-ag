import { z } from "zod";
import { desc, sql, eq } from "drizzle-orm";
import { createRouter, adminQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { orders, leads, users, orderServices } from "@db/schema";

export const dashboardRouter = createRouter({
  stats: adminQuery.query(async () => {
    const db = getDb();
    const usersCount = await db.select({ count: sql<number>`count(*)` }).from(users);
    const ordersCount = await db.select({ count: sql<number>`count(*)` }).from(orders);
    const leadsCount = await db.select({ count: sql<number>`count(*)` }).from(leads);
    const revenueResult = await db
      .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
      .from(orders)
      .where(eq(orders.status, "active"));
    const deployingCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(orderServices)
      .where(eq(orderServices.deploymentStatus, "in_progress"));

    return {
      users: Number(usersCount[0].count),
      orders: Number(ordersCount[0].count),
      leads: Number(leadsCount[0].count),
      revenue: Number(revenueResult[0].total),
      deployments: Number(deployingCount[0].count),
    };
  }),

  recentOrders: adminQuery
    .input(z.object({ limit: z.number().min(1).max(50).default(10) }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const limit = input?.limit ?? 10;
      return db.query.orders.findMany({
        orderBy: [desc(orders.createdAt)],
        limit,
      });
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

  revenueByMonth: adminQuery.query(async () => {
    return [
      { month: "2026-01", revenue: 8950 },
      { month: "2026-02", revenue: 12340 },
      { month: "2026-03", revenue: 15670 },
      { month: "2026-04", revenue: 18900 },
      { month: "2026-05", revenue: 22450 },
    ];
  }),

  deploymentsByStatus: adminQuery.query(async () => {
    const db = getDb();
    const pending = await db
      .select({ count: sql<number>`count(*)` })
      .from(orderServices)
      .where(eq(orderServices.deploymentStatus, "pending"));
    const inProgress = await db
      .select({ count: sql<number>`count(*)` })
      .from(orderServices)
      .where(eq(orderServices.deploymentStatus, "in_progress"));
    const completed = await db
      .select({ count: sql<number>`count(*)` })
      .from(orderServices)
      .where(eq(orderServices.deploymentStatus, "completed"));
    const failed = await db
      .select({ count: sql<number>`count(*)` })
      .from(orderServices)
      .where(eq(orderServices.deploymentStatus, "failed"));

    return [
      { status: "pending", count: Number(pending[0].count) },
      { status: "in_progress", count: Number(inProgress[0].count) },
      { status: "completed", count: Number(completed[0].count) },
      { status: "failed", count: Number(failed[0].count) },
    ];
  }),
});
