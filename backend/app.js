import cors from "cors";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const docsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "docs");
import { monitor, statsHandler } from "./monitoring.js";
import { loadApiKeys, rateLimit, requireApiKey } from "./security.js";
import { medicinesRouter } from "./routes/medicines.js";
import { pharmaciesRouter } from "./routes/pharmacies.js";
import { webappRouter } from "./routes/webapp.js";

// Builds the Express app without starting it, so tests can run it with supertest.
export function createApp({ pool, apiKeys = loadApiKeys(), rateLimitMax = Number(process.env.RATE_LIMIT_MAX || 100) }) {
  const app = express();
  app.use(monitor); // first, so 401s and 429s are logged too
  app.use(cors());
  app.use(express.json());

  // Rendered docs: http://localhost:5000/docs
  app.use("/docs", express.static(docsDir));
  app.get("/openapi.yaml", (req, res) => res.sendFile(path.join(docsDir, "openapi.yaml")));

  // Open on purpose: lets a consumer check we are up without spending a key.
  app.get("/health", (req, res) => res.json({ status: "ok" }));

  // Routes used by the PharmaLink website in frontend/ (no partner key; limited per IP).
  app.use("/api", rateLimit({ windowMs: 60000, max: rateLimitMax }), webappRouter(pool));

  // Partner API (the routes in openapi.yaml): every request needs a valid X-API-Key.
  const partner = express.Router();
  partner.use(requireApiKey(apiKeys));
  partner.use(rateLimit({ windowMs: 60000, max: rateLimitMax }));
  partner.get("/stats", statsHandler);
  partner.use("/medicines", medicinesRouter(pool));
  partner.use("/pharmacies", pharmaciesRouter(pool));
  app.use(partner);

  app.use((req, res) => {
    res.status(404).json({ message: "Route not found" });
  });

  app.use((error, req, res, next) => {
    if (error.type === "entity.parse.failed") {
      return res.status(400).json({ message: "Request body is not valid JSON" });
    }
    console.error(error);
    res.status(500).json({ message: "Server error" }); // no error detail: it can reveal SQL and table names
  });

  return app;
}
