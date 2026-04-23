// One-time migration script to add tax/pricing columns to the orders table
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

// Load .env from workspace root
const envPath = path.resolve(__dirname, "../../.env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^(['"])(.*)\\1$/, "$2");
    if (!process.env[key]) process.env[key] = value;
  }
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  const columns = [
    { name: "discount_amount", type: "numeric(12,2)", default: "'0'" },
    { name: "shipping_amount", type: "numeric(12,2)", default: "'0'" },
    { name: "tax_rate", type: "numeric(6,2)", default: "'0'" },
    { name: "cgst_amount", type: "numeric(12,2)", default: "'0'" },
    { name: "sgst_amount", type: "numeric(12,2)", default: "'0'" },
    { name: "igst_amount", type: "numeric(12,2)", default: "'0'" },
    { name: "tax_type", type: "text", default: "'intra'" },
    { name: "grand_total", type: "numeric(12,2)", default: "'0'" },
  ];

  for (const col of columns) {
    const sql = `ALTER TABLE orders ADD COLUMN IF NOT EXISTS ${col.name} ${col.type} DEFAULT ${col.default};`;
    try {
      await pool.query(sql);
      console.log(`✓ Added column: ${col.name}`);
    } catch (err) {
      console.log(`⚠ Column ${col.name}: ${err.message}`);
    }
  }

  // Backfill grand_total for existing orders where it's 0
  const backfill = `UPDATE orders SET grand_total = total_amount WHERE grand_total = '0' OR grand_total IS NULL;`;
  const result = await pool.query(backfill);
  console.log(`✓ Backfilled grand_total for ${result.rowCount} existing orders`);

  await pool.end();
  console.log("\nMigration complete!");
}

main().catch(console.error);
