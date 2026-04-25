// drizzle.config.cts — CommonJS format so drizzle-kit can require() it
// (The db package has "type":"module", so we use .cts to force CJS for this file only)
const { defineConfig } = require("drizzle-kit");
const path = require("path");
const dotenv = require("dotenv");

// Load the workspace-root .env safely using dotenv
const envPath = path.resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set – ensure the database is provisioned and .env exists at the workspace root"
  );
}

// Print the URL to the terminal so the user can verify what Drizzle sees
console.log("👉 Drizzle is trying to connect to:", process.env.DATABASE_URL.replace(/:[^:@]+@/, ':***@')); // hides the password

module.exports = defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  out: "./drizzle",
});
