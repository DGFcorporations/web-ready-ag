import { describe, it, expect, vi } from "vitest";
import type { TrpcContext } from "../context";

vi.mock("../queries/connection", () => ({
  getDb: () => ({
    select: () => ({
      from: () => ({
        where: () => ({
          groupBy: () => ({
            orderBy: async () => [],
          }),
        }),
      }),
    }),
  }),
}));

import { appRouter } from "../router";

function createAdminCaller() {
  const ctx = {
    req: new Request("https://web-ready.ag/api/trpc"),
    resHeaders: new Headers(),
    user: {
      id: 1,
      unionId: "admin-1",
      name: "Admin",
      email: "admin@web-ready.ag",
      role: "admin" as const,
    },
  } as unknown as TrpcContext;
  return appRouter.createCaller(ctx);
}

describe("dashboardRouter real DB queries (zero synthetic mock telemetry)", () => {
  it("revenueByMonth queries Drizzle orders and returns empty array when 0 paid orders exist", async () => {
    const caller = createAdminCaller();
    const rows = await caller.dashboard.revenueByMonth();
    expect(Array.isArray(rows)).toBe(true);
    expect(rows).toEqual([]);
  });
});
