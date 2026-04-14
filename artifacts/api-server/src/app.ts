import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// ─── Production: serve the compiled React frontend ───────────────────────────
// In production the frontend is built into dist/public (copied there by the
// root build script) and this Express server serves it for every non-API route.
if (process.env.NODE_ENV === "production") {
  const staticDir = resolve(dirname(fileURLToPath(import.meta.url)), "public");
  app.use(express.static(staticDir));
  app.use((_req, res) => {
    res.sendFile(resolve(staticDir, "index.html"));
  });
}

export default app;
