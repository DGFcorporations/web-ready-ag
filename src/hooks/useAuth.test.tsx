import { describe, it, expect, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import { trpc } from "@/providers/trpc";
import { useAuth } from "./useAuth";

function ChildNav() {
  const { user } = useAuth();
  return <nav data-testid="nav">{user ? "Logged In" : "Guest"}</nav>;
}

function SimulatedDashboard() {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return <div data-testid="spinner">Loading</div>;
  }
  return (
    <div data-testid="signed-out">
      <h1>{user ? "Welcome" : "Please Sign In"}</h1>
      <ChildNav />
    </div>
  );
}

describe("useAuth regression — secondary mount after 401", () => {
  afterEach(() => {
    cleanup();
  });

  it("does not refetch auth.me in a loop when a child mounts useAuth after initial 401", async () => {
    let fetchCount = 0;
    const mockFetch: typeof fetch = async () => {
      fetchCount += 1;
      const payload = [
        {
          error: {
            json: {
              message: "Authentication required",
              code: -32001,
              data: { code: "UNAUTHORIZED", httpStatus: 401, path: "auth.me" },
            },
          },
        },
      ];
      return new Response(JSON.stringify(payload), {
        status: 207,
        headers: { "content-type": "application/json" },
      });
    };

    const queryClient = new QueryClient();
    const trpcClient = trpc.createClient({
      links: [
        httpBatchLink({
          url: "/api/trpc",
          transformer: superjson,
          fetch: mockFetch,
        }),
      ],
    });

    render(
      <MemoryRouter>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <SimulatedDashboard />
          </QueryClientProvider>
        </trpc.Provider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("signed-out")).toBeTruthy();
    });

    await new Promise((r) => setTimeout(r, 100));

    expect(screen.getByTestId("nav").textContent).toBe("Guest");
    expect(fetchCount).toBe(1);
  });
});
