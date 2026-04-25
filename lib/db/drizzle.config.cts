// drizzle.config.cts — CommonJS format so drizzle-kit can require() it
// (The db package has "type":"module", so we use .cts to force CJS for this file only)
const { defineConfig } = require("drizzle-kit");
const fs = require("fs");
const path = require("path");

// Manually load the workspace-root .env (two levels up from lib/db/)
const envPath = path.resolve(__dirname, "../../.env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed
      .slice(eqIdx + 1)
      .trim()
      .replace(/^(['"])(.*)\1$/, "$2"); // strip surrounding quotes
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

// Support two modes:
// 1. Individual DB_* vars (recommended when password has special chars like @, ], etc.)
// 2. Fallback to DATABASE_URL
const hasIndividualParams = !!(
  process.env.DB_HOST || process.env.DB_USER || process.env.DB_NAME
);

if (!hasIndividualParams && !process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL (or DB_HOST/DB_USER/DB_PASSWORD/DB_NAME) is not set – ensure the database is provisioned and .env exists at the workspace root"
  );
}

/** @type {any} */
let dbCredentials;

if (hasIndividualParams) {
  dbCredentials = {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || "5432"),
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "adhams_erp",
    ssl: process.env.DB_SSL === "true",
  };
  console.log(
    "[drizzle-config] Connecting to:",
    dbCredentials.host + ":" + dbCredentials.port + "/" + dbCredentials.database,
    "as", dbCredentials.user
  );
} else {
  dbCredentials = { url: process.env.DATABASE_URL };
  console.log("[drizzle-config] Connecting using DATABASE_URL");
}

module.exports = defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials,
  out: "./drizzle",
  verbose: true,
});
