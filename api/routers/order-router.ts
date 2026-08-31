import { z } from "zod";
import { eq, desc, sql } from "drizzle-orm";
import { createRouter, authedQuery, adminQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { orders, orderServices, pricingPlans } from "@db/schema";

export const orderRouter = createRouter({
  create: authedQuery
    .input(
      z.object({
        planId: z.number(),
        billingCycle: z.enum(["monthly", "yearly"]).default("monthly"),
        services: z.array(z.number()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const plan = await db.query.pricingPlans.findFirst({
        where: eq(pricingPlans.id, input.planId),
      });
      if (!plan) throw new Error("Plan not found");

      const amount = input.billingCycle === "yearly" ? plan.yearlyPrice : plan.price;
      const result = await db.insert(orders).values({
        userId: ctx.user.id,
        planId: input.planId,
        amount: amount?.toString() ?? "0",
        billingCycle: input.billingCycle,
        status: "pending",
      });
      const orderId = Number(result[0].insertId);

      if (input.services && input.services.length > 0) {
        for (const serviceId of input.services) {
          await db.insert(orderServices).values({
            orderId,
            serviceId,
            deploymentStatus: "pending",
          });
        }
      }

      return { id: orderId, status: "pending" };
    }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const order = await db.query.orders.findFirst({
        where: eq(orders.id, input.id),
      });
      if (!order) return null;
      if (order.userId !== ctx.user.id && ctx.user.role !== "admin") return null;

      const services = await db.query.orderServices.findMany({
        where: eq(orderServices.orderId, input.id),
      });
      return { ...order, services };
    }),

  myOrders: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db.query.orders.findMany({
      where: eq(orders.userId, ctx.user.id),
      orderBy: [desc(orders.createdAt)],
    });
  }),

  updateStatus: adminQuery
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["pending", "paid", "deploying", "active", "cancelled", "refunded"]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(orders)
        .set({ status: input.status, notes: input.notes })
        .where(eq(orders.id, input.id));
      return { success: true };
    }),

  updateDeployment: adminQuery
    .input(
      z.object({
        orderServiceId: z.number(),
        deploymentStatus: z.enum(["pending", "in_progress", "completed", "failed"]),
        deploymentLog: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(orderServices)
        .set({
          deploymentStatus: input.deploymentStatus,
          deploymentLog: input.deploymentLog,
          ...(input.deploymentStatus === "completed" ? { completedAt: new Date() } : {}),
        })
        .where(eq(orderServices.id, input.orderServiceId));
      return { success: true };
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
        ? eq(orders.status, input.status as "pending" | "paid" | "deploying" | "active" | "cancelled" | "refunded")
        : undefined;

      const result = await db.query.orders.findMany({
        where: conditions,
        orderBy: [desc(orders.createdAt)],
        limit,
        offset,
      });

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(orders);

      return { orders: result, total: Number(countResult[0].count) };
    }),

  getStats: adminQuery.query(async () => {
    const db = getDb();
    const totalResult = await db.select({ count: sql<number>`count(*)` }).from(orders);
    const activeResult = await db.select({ count: sql<number>`count(*)` }).from(orders).where(eq(orders.status, "active"));
    const pendingResult = await db.select({ count: sql<number>`count(*)` }).from(orders).where(eq(orders.status, "paid"));
    const revenueResult = await db
      .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
      .from(orders)
      .where(eq(orders.status, "active"));

    return {
      totalOrders: Number(totalResult[0].count),
      activeSubscriptions: Number(activeResult[0].count),
      pendingDeployments: Number(pendingResult[0].count),
      monthlyRevenue: Number(revenueResult[0].total),
    };
  }),
});
