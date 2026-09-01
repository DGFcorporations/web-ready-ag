import { relations } from "drizzle-orm";
import {
  users,
  services,
} from "./schema";

export const usersRelations = relations(users, () => ({
}));

export const servicesRelations = relations(services, () => ({
}));
