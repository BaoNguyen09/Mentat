import { Hono } from "hono";

export const progressRoutes = new Hono().get("/:userId", (c) => {
  return c.json({
    userId: c.req.param("userId"),
    sport: "table-tennis",
    message: "Progress route scaffolded.",
  });
});
