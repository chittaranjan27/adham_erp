/**
 * Seed script — creates default users for all 11 ERP roles.
 *
 * Usage:
 *   pnpm seed:users          (from workspace root)
 *   pnpm --filter @workspace/scripts run seed:users
 *
 * Each user gets the default password: Adhams@2026
 * Existing users (by email) are skipped, not overwritten.
 */

import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createHash } from "node:crypto";

// ─── bcryptjs ships as ESM default in some setups; handle both ───────────────
// The scripts workspace doesn't have bcryptjs as a direct dep, so we use
// a simple inline bcrypt-compatible hash via the native crypto module.
// For production seeding, this is fine — passwords can be changed via the UI.

// We'll use a dynamic import of bcryptjs from the api-server's node_modules
// since it's already installed there, OR fall back to a simple hash.

async function hashPassword(password: string): Promise<string> {
  try {
    // Try to use bcryptjs if available
    const bcrypt = await import("bcryptjs");
    return bcrypt.default.hash(password, 12);
  } catch {
    // Fallback: use a recognizable prefix so we know it's not bcrypt
    // This won't work for login — you'd need to reset passwords.
    // But bcryptjs should be resolvable from the workspace.
    throw new Error(
      "bcryptjs not found. Run: pnpm add bcryptjs from the scripts directory, " +
      "or run this script from the api-server context."
    );
  }
}

const DEFAULT_PASSWORD = "Adhams@2026";

interface SeedUser {
  name: string;
  email: string;
  role: string;
}

const SEED_USERS: SeedUser[] = [
  { name: "Adhams Admin",      email: "superadmin@adhams.com",  role: "super_admin" },
  { name: "Platform Admin",    email: "admin@adhams.com",       role: "admin" },
  { name: "Murali G",          email: "murali@adhams.com",      role: "inventory_manager" },
  { name: "Ravi Patil",        email: "ravi.p@adhams.com",      role: "finance_head" },
  { name: "Satheeshan K",      email: "satheeshan@adhams.com",  role: "logistics_coordinator" },
  { name: "Vijay P",           email: "vijay.p@adhams.com",     role: "sales_manager" },
  { name: "Warehouse Head",    email: "wh@adhams.com",          role: "warehouse_manager" },
  { name: "Accounts Staff",    email: "accounts@adhams.com",    role: "accounts_team" },
  { name: "Distribution Head", email: "dist@adhams.com",        role: "distribution_head" },
  { name: "Business Analyst",  email: "ba@adhams.com",          role: "business_analyst" },
  { name: "Transport Coord",   email: "transport@adhams.com",   role: "transport_coordinator" },
];

async function main() {
  console.log("🌱 Seeding ERP users...\n");
  console.log(`Default password for all users: ${DEFAULT_PASSWORD}\n`);

  const passwordHash = await hashPassword(DEFAULT_PASSWORD);
  let created = 0;
  let skipped = 0;

  for (const user of SEED_USERS) {
    // Check if user already exists
    const [existing] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, user.email));

    if (existing) {
      console.log(`  ⏭  ${user.role.padEnd(24)} ${user.email.padEnd(28)} (already exists, id=${existing.id})`);
      skipped++;
      continue;
    }

    const [inserted] = await db
      .insert(usersTable)
      .values({
        name: user.name,
        email: user.email,
        role: user.role,
        passwordHash,
        isActive: true,
      })
      .returning({ id: usersTable.id });

    console.log(`  ✅ ${user.role.padEnd(24)} ${user.email.padEnd(28)} → id=${inserted.id}`);
    created++;
  }

  console.log(`\n📊 Done: ${created} created, ${skipped} skipped (already existed)`);
  console.log("\n📋 Login credentials:");
  console.log("─".repeat(60));
  for (const user of SEED_USERS) {
    console.log(`  ${user.role.padEnd(24)} → ${user.email} / ${DEFAULT_PASSWORD}`);
  }
  console.log("─".repeat(60));

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
