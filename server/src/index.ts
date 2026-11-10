import "./instrument";
import * as Sentry from "@sentry/bun";
import { Hono } from "hono";
import { serveStatic } from "hono/bun";

const app = new Hono();

app.get("/api/health", (c) => c.json({ ok: true }));

app.use(
  "/*",
  serveStatic({
    root: "./client/dist",
    rewriteRequestPath: (p) => p.replace(/^\/cafestjarnan/, ""),
  }),
);

const root = new Hono();
root.route("/", app);
root.route("/cafestjarnan", app);

root.onError((err, c) => {
  Sentry.captureException(err);
  return c.json({ error: "Internal Server Error" }, 500);
});

export default {
  port: Number(process.env.PORT ?? 3000),
  fetch: root.fetch,
};
