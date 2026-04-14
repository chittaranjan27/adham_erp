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

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set – ensure the database is provisioned and .env exists at the workspace root"
  );
}

module.exports = defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  out: "./drizzle",
});
