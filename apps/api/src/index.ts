import { createAdaptorServer } from "@hono/node-server";
import { Hono } from "hono";

import { loadEnvironment } from "./lib/env";
import { progressRoutes } from "./routes/progress";
import { sessionRoutes } from "./routes/sessions";
import { attachLiveSessionBridge } from "./ws/session";

loadEnvironment();

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

const server = createAdaptorServer({
  fetch: app.fetch,
});

attachLiveSessionBridge(server);

server.listen(port, () => {
  console.log(`Mentat API listening on ${port}`);
});
