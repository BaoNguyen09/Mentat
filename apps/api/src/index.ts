import { serve } from "@hono/node-server";
import { Hono } from "hono";

import { progressRoutes } from "./routes/progress";
import { sessionRoutes } from "./routes/sessions";

const app = new Hono();

app.get("/", (c) => {
  return c.json({
    name: "Mentat API",
    sport: "table-tennis",
    status: "ok",
  });
});

app.route("/api/sessions", sessionRoutes);
app.route("/api/progress", progressRoutes);

const port = Number(process.env.PORT ?? 8000);

serve(
  {
    fetch: app.fetch,
    port,
  },
  () => {
    console.log(`Mentat API listening on ${port}`);
  },
);
