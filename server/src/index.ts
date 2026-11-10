import { Hono } from "hono";
import { serveStatic } from "hono/bun";

const app = new Hono();

app.get("/api/health", (c) => c.json({ ok: true }));

// Serverar den byggda klienten.
app.use(
  "/*",
  serveStatic({
    root: "./client/dist",
    rewriteRequestPath: (p) => p.replace(/^\/cafestjarnan/, ""),
  }),
);

// Bakom Caddy tas prefixet bort innan anropet når hit.
// Lokalt (utan Caddy) svarar vi även under /cafestjarnan.
const root = new Hono();
root.route("/", app);
root.route("/cafestjarnan", app);

export default {
  port: Number(process.env.PORT ?? 3000),
  fetch: root.fetch,
};
