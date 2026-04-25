import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

// Support two modes:
// 1. Individual DB_* vars (recommended when password has special chars like @, ], etc.)
// 2. Fallback to DATABASE_URL
const hasIndividualParams = !!(
  process.env.DB_HOST || process.env.DB_USER || process.env.DB_NAME
);

if (!hasIndividualParams && !process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL (or DB_HOST/DB_USER/DB_PASSWORD/DB_NAME) must be set. Did you forget to provision a database?",
  );
}

const poolConfig: pg.PoolConfig = hasIndividualParams
  ? {
      host: process.env.DB_HOST || "127.0.0.1",
      port: Number(process.env.DB_PORT || "5432"),
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "adhams_erp",
      ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
    }
  : { connectionString: process.env.DATABASE_URL };

export const pool = new Pool(poolConfig);
export const db = drizzle(pool, { schema });

export * from "./schema";
