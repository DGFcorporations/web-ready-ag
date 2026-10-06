import { z } from "zod";
import { desc, sql, eq } from "drizzle-orm";
import { createRouter, adminQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { orders, leads, users, orderServices } from "@db/schema";

export const dashboardRouter = createRouter({
  stats: adminQuery.query(async () => {
    const db = getDb();
    // ⚡ Bolt: Using Promise.all to run 5 independent DB queries concurrently instead of sequentially
    // Reduces latency on dashboard load by parallelizing I/O
    const [usersCount, ordersCount, leadsCount, revenueResult, deployingCount] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(users),
      db.select({ count: sql<number>`count(*)` }).from(orders),
      db.select({ count: sql<number>`count(*)` }).from(leads),
      db.select({ total: sql<number>`COALESCE(SUM(amount), 0)` }).from(orders).where(eq(orders.status, "active")),
      db.select({ count: sql<number>`count(*)` }).from(orderServices).where(eq(orderServices.deploymentStatus, "in_progress"))
    ]);

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
    // ⚡ Bolt: Using Promise.all to run 4 independent DB queries concurrently instead of sequentially
    // Reduces latency by executing these counts in parallel
    const [pending, inProgress, completed, failed] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(orderServices).where(eq(orderServices.deploymentStatus, "pending")),
      db.select({ count: sql<number>`count(*)` }).from(orderServices).where(eq(orderServices.deploymentStatus, "in_progress")),
      db.select({ count: sql<number>`count(*)` }).from(orderServices).where(eq(orderServices.deploymentStatus, "completed")),
      db.select({ count: sql<number>`count(*)` }).from(orderServices).where(eq(orderServices.deploymentStatus, "failed"))
    ]);

    return [
      { status: "pending", count: Number(pending[0].count) },
      { status: "in_progress", count: Number(inProgress[0].count) },
      { status: "completed", count: Number(completed[0].count) },
      { status: "failed", count: Number(failed[0].count) },
    ];
  }),
});
