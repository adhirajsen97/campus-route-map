import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { readFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "path";
import { fileURLToPath } from "node:url";
import { componentTagger } from "lovable-tagger";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const eventsJsonPath = path.resolve(__dirname, "./data/events.json");

const isNodeError = (error: unknown): error is NodeJS.ErrnoException => error instanceof Error && "code" in error;

const createEventsMiddleware = () =>
  (req: IncomingMessage, res: ServerResponse, _next: () => void) => {
    const method = req.method ?? "GET";
    if (method !== "GET" && method !== "HEAD") {
      res.statusCode = 405;
      res.setHeader("Allow", "GET, HEAD");
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Method Not Allowed" }));
      return;
    }

    try {
      const data = readFileSync(eventsJsonPath, "utf8");
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      if (method === "HEAD") {
        res.end();
      } else {
        res.end(data);
      }
    } catch (error) {
      if (isNodeError(error) && error.code === "ENOENT") {
        const emptyPayload = JSON.stringify({ scrapedAt: null, events: [] });
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        if (method === "HEAD") {
          res.end();
        } else {
          res.end(emptyPayload);
        }
        return;
      }

      console.error("Failed to serve events.json", error);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Events data unavailable" }));
    }
  };

const eventsApiPlugin = {
  name: "campus-route-map-events-api",
  configureServer(server) {
    server.middlewares.use("/api/events", createEventsMiddleware());
  },
  configurePreviewServer(server) {
    server.middlewares.use("/api/events", createEventsMiddleware());
  },
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    eventsApiPlugin,
    ...(mode === "development" ? [componentTagger()] : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
