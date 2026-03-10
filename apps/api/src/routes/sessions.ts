import { Hono } from "hono";

export const sessionRoutes = new Hono()
  .get("/context/:userId", (c) => {
    return c.json({
      userId: c.req.param("userId"),
      sport: "table-tennis",
      message: "Session context route scaffolded.",
    });
  })
  .post("/finalize", async (c) => {
    const body = await c.req.json().catch(() => ({}));

    return c.json({
      status: "queued-in-process",
      message: "Finalize session route scaffolded.",
      body,
    });
  });
