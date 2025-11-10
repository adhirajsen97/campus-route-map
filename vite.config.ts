import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { readFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "path";
import { fileURLToPath } from "node:url";
import { componentTagger } from "lovable-tagger";
import chatHandler from "./api/chat";

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

const createChatMiddleware = () =>
  async (req: IncomingMessage, res: ServerResponse) => {
    if (!req.url) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Invalid request" }));
      return;
    }

    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.setHeader("Access-Control-Allow-Origin", req.headers.origin ?? "*");
      res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.end();
      return;
    }

    if (req.method !== "POST") {
      res.statusCode = 405;
      res.setHeader("Allow", "POST");
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Method Not Allowed" }));
      return;
    }

    res.setHeader("Access-Control-Allow-Origin", req.headers.origin ?? "*");

    try {
      await chatHandler(req, res);
    } catch (error) {
      console.error("Failed to handle /api/chat request", error);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
      }
      if (!res.writableEnded) {
        res.end(JSON.stringify({ error: "Unexpected error while handling chat request" }));
      }
    }
  };

const eventsApiPlugin = {
  name: "campus-route-map-events-api",
  configureServer(server) {
    server.middlewares.use("/api/events", createEventsMiddleware());
    server.middlewares.use("/api/chat", createChatMiddleware());
  },
  configurePreviewServer(server) {
    server.middlewares.use("/api/events", createEventsMiddleware());
    server.middlewares.use("/api/chat", createChatMiddleware());
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
