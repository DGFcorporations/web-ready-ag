import { relations } from "drizzle-orm";
import {
  users,
  services,
  pricingPlans,
  planFeatures,
  orders,
  orderServices,
} from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
}));

export const pricingPlansRelations = relations(pricingPlans, ({ many }) => ({
  features: many(planFeatures),
  orders: many(orders),
}));

export const planFeaturesRelations = relations(planFeatures, ({ one }) => ({
  plan: one(pricingPlans, { fields: [planFeatures.planId], references: [pricingPlans.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  plan: one(pricingPlans, { fields: [orders.planId], references: [pricingPlans.id] }),
  services: many(orderServices),
}));

export const orderServicesRelations = relations(orderServices, ({ one }) => ({
  order: one(orders, { fields: [orderServices.orderId], references: [orders.id] }),
  service: one(services, { fields: [orderServices.serviceId], references: [services.id] }),
}));

export const servicesRelations = relations(services, ({ many }) => ({
  orderServices: many(orderServices),
}));
