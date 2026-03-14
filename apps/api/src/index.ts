import { createAdaptorServer } from "@hono/node-server";
import { Hono } from "hono";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadEnvironment } from "./lib/env.js";
import { knowledgeRoutes } from "./routes/knowledge.js";
import { progressRoutes } from "./routes/progress.js";
import { sessionRoutes } from "./routes/sessions.js";
import { attachLiveSessionBridge } from "./ws/session.js";

loadEnvironment();

const app = new Hono();
const webDistDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../web/dist",
);
const webIndexPath = path.join(webDistDir, "index.html");

const contentTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function isAppRoute(pathname: string) {
  return !pathname.startsWith("/api") && !pathname.startsWith("/ws");
}

function resolveAssetPath(requestPath: string) {
  const nextPath = requestPath === "/" ? "/index.html" : requestPath;
  const safePath = path.normalize(nextPath).replace(/^(\.\.(\/|\\|$))+/, "");
  return path.join(webDistDir, safePath);
}

app.get("/api/health", (c) => {
  return c.json({
    name: "Mentat API",
    sport: "table-tennis",
    status: "ok",
  });
});

app.route("/api/sessions", sessionRoutes);
app.route("/api/progress", progressRoutes);
app.route("/api/knowledge", knowledgeRoutes);

app.get("*", async (c) => {
  if (!isAppRoute(c.req.path) || !existsSync(webIndexPath)) {
    return c.notFound();
  }

  const assetPath = resolveAssetPath(c.req.path);

  if (existsSync(assetPath) && !assetPath.endsWith(path.sep)) {
    const body = await readFile(assetPath);
    const extension = path.extname(assetPath);
    return new Response(body, {
      headers: {
        "Content-Type":
          contentTypes[extension] ?? "application/octet-stream",
      },
    });
  }

  const html = await readFile(webIndexPath);
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
});

const port = Number(process.env.PORT ?? 8000);

const server = createAdaptorServer({
  fetch: app.fetch,
});

attachLiveSessionBridge(server);

server.listen(port, () => {
  console.log(`Mentat API listening on ${port}`);
});
