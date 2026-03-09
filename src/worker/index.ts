import { Hono } from "hono";
import { cors } from "hono/cors";
import type { AppEnv } from "./types";
import { ingestRoutes } from "./routes/ingest";
import { insightsRoutes } from "./routes/insights";
import { themesRoutes } from "./routes/themes";
import { statsRoutes } from "./routes/stats";
import { adminRoutes } from "./routes/admin";

const app = new Hono<AppEnv>();

// CORS for all API routes
app.use("/api/*", cors());

// Routes
app.route("/api/ingest", ingestRoutes);
app.route("/api/insights", insightsRoutes);
app.route("/api/themes", themesRoutes);
app.route("/api/stats", statsRoutes);
app.route("/api/admin", adminRoutes);

// Health check
app.get("/api/health", (c) => c.json({ ok: true, timestamp: new Date().toISOString() }));

export default app;
