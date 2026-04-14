import { db } from "@workspace/db";
import {
  usersTable,
  productsTable,
  warehousesTable,
  warehouseLocationsTable,
  inventoryTable,
  dealersTable,
  ordersTable,
  dispatchesTable,
  activitiesTable,
  purchaseOrdersTable,
  grnTable,
  importStagesTable,
  IMPORT_STAGES,
} from "@workspace/db";
// sql tagged template from drizzle-orm (available through @workspace/db's transitive dep)
import { sql } from "drizzle-orm";

async function seed() {
  console.log("🗑️  Clearing existing data...");

  // Truncate all tables in dependency order (children first)
  await db.execute(sql`TRUNCATE TABLE import_stages RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE grn RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE dispatches RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE orders RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE inventory RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE purchase_orders RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE warehouse_locations RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE dealers RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE products RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE warehouses RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE activities RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE users RESTART IDENTITY CASCADE`);

  console.log("✅  All tables cleared.\n");

  // ──────────────────────────────────────────────────────────────────────────────
  // 1. USERS — 2 key roles
  // ──────────────────────────────────────────────────────────────────────────────
  console.log("👤  Seeding users...");
  await db.insert(usersTable).values([
    { name: "Mohammed Adhams", email: "superadmin@adhams.in", role: "super_admin", isActive: true },
    { name: "Lakshmi Nair", email: "inventory@adhams.in", role: "inventory_manager", isActive: true },
  ]);

  // ──────────────────────────────────────────────────────────────────────────────
  // 2. WAREHOUSES — 2 locations
  // ──────────────────────────────────────────────────────────────────────────────
  console.log("🏭  Seeding warehouses...");
  await db.insert(warehousesTable).values([
    { code: "MPM", name: "Malappuram Central", location: "Malappuram, Kerala", address: "NH-66 Bypass, Malappuram 676519", manager: "Lakshmi Nair", capacity: 50000, usedCapacity: 7300, lat: 11.0510, lng: 76.0711 },
    { code: "BLR", name: "Bangalore Distribution", location: "Bengaluru, Karnataka", address: "Peenya Industrial Area, Bengaluru 560058", manager: "Suresh Reddy", capacity: 40000, usedCapacity: 4200, lat: 12.9716, lng: 77.5946 },
  ]);

  // ──────────────────────────────────────────────────────────────────────────────
  // 3. WAREHOUSE LOCATIONS — 2 bins, one per warehouse
  // ──────────────────────────────────────────────────────────────────────────────
  console.log("📍  Seeding warehouse locations...");
  await db.insert(warehouseLocationsTable).values([
    { warehouseId: 1, code: "A-01-01", name: "Ground Floor, Section A, Shelf 1", floor: "Ground Floor", section: "A", shelfNumber: "01", capacity: 5000, usedCapacity: 2100, locationType: "shelf" },
    { warehouseId: 2, code: "C-01-01", name: "Bay C, Row 1, Shelf 1", floor: "Ground Floor", section: "C", shelfNumber: "01", capacity: 8000, usedCapacity: 4200, locationType: "zone" },
  ]);

  // ──────────────────────────────────────────────────────────────────────────────
  // 4. PRODUCTS — 2 building-material products
  //    Product 1: locally manufactured (PVC Panel)
  //    Product 2: imported (WPC Wall Panel)
  // ──────────────────────────────────────────────────────────────────────────────
  console.log("📦  Seeding products...");
  await db.insert(productsTable).values([
    { name: "PVC Ceiling Panel 8ft", category: "Ceiling Solutions", subcategory: "PVC Panels", masterBarcode: "ADH-PRD-001", hsnCode: "3921", basePrice: "950", unit: "pcs", dimensions: "8ft × 10in", weight: 1.5, origin: "manufactured" },
    { name: "WPC Wall Panel Premium", category: "Wall Solutions", subcategory: "WPC Panels", masterBarcode: "ADH-PRD-002", hsnCode: "3921", basePrice: "1850", unit: "sheet", dimensions: "8ft × 4ft", weight: 7.5, origin: "imported" },
  ]);

  // ──────────────────────────────────────────────────────────────────────────────
  // 5. DEALERS — 2 dealers
  //    Dealer 1: Kerala-based (Malabar Interiors) — has a completed order
  //    Dealer 2: Karnataka-based (Decor Plus Bangalore) — has a pending order
  // ──────────────────────────────────────────────────────────────────────────────
  console.log("🤝  Seeding dealers...");
  await db.insert(dealersTable).values([
    { dealerCode: "DLR-KL-001", name: "Malabar Interiors", contactPerson: "Naseer Ahmed", phone: "9447123456", email: "malabar.interiors@gmail.com", city: "Kozhikode", state: "Kerala", gstNumber: "32AABCU9603R1ZV", creditLimit: "500000", outstandingBalance: "0", commissionSlab: "8%" },
    { dealerCode: "DLR-KA-001", name: "Decor Plus Bangalore", contactPerson: "Ramesh Gowda", phone: "9845345678", email: "decorplus.blr@gmail.com", city: "Bengaluru", state: "Karnataka", gstNumber: "29AABCU9605R1ZV", creditLimit: "1000000", outstandingBalance: "270000", commissionSlab: "9%" },
  ]);

  // ──────────────────────────────────────────────────────────────────────────────
  // 6. PURCHASE ORDERS — 2 POs
  //    PO 1: Local (completed) — Kerala Polymers supplies PVC Panels → Malappuram
  //    PO 2: Import (confirmed) — Guangzhou WPC Materials supplies WPC Panels → Bangalore
  // ──────────────────────────────────────────────────────────────────────────────
  console.log("📋  Seeding purchase orders...");
  await db.insert(purchaseOrdersTable).values([
    { poNumber: "PO-LCL-20260301", supplierName: "Kerala Polymers Pvt Ltd", supplierGstin: "32AAACK5678L1ZX", supplierCountry: "India", poType: "local", status: "completed", currency: "INR", totalAmount: "475000", taxAmount: "85500", shippingAmount: "12000", expectedDeliveryDate: new Date("2026-03-15"), warehouseId: 1, createdBy: "Mohammed Adhams" },
    { poNumber: "PO-IMP-20260320", supplierName: "Guangzhou WPC Materials Co.", supplierGstin: null, supplierCountry: "China", poType: "import", status: "confirmed", currency: "USD", totalAmount: "37000", taxAmount: "0", shippingAmount: "5200", expectedDeliveryDate: new Date("2026-04-25"), warehouseId: 2, createdBy: "Mohammed Adhams" },
  ]);

  // Import stages for PO #2 (import PO) — currently at customs_clearance stage
  console.log("📊  Seeding import stages...");
  await db.insert(importStagesTable).values(
    IMPORT_STAGES.map((stage, index) => ({
      poId: 2,
      stage,
      stageIndex: index,
      status: index <= 2 ? "completed" as const : index === 3 ? "in_progress" as const : "pending" as const,
      completedAt: index <= 2 ? new Date(2026, 2, 22 + index * 5) : undefined,
      completedBy: index <= 2 ? "Mohammed Adhams" : undefined,
    }))
  );

  // ──────────────────────────────────────────────────────────────────────────────
  // 7. INVENTORY — 2 stock lots, one per warehouse
  //    Lot 1: PVC Panels at Malappuram — fully saleable (GRN released)
  //    Lot 2: WPC Panels at Bangalore — fully saleable (GRN released)
  // ──────────────────────────────────────────────────────────────────────────────
  console.log("📦  Seeding inventory...");
  await db.insert(inventoryTable).values([
    { barcode: "ADH-20260301-A1", productId: 1, warehouseId: 1, locationId: 1, binLocation: "A-01-01", status: "available", quantity: 500, saleableQuantity: 500, reservedQuantity: 0, unitPrice: "950", hsnCode: "3921", grnNumber: "GRN-20260315-01", isGrnReleased: true },
    { barcode: "ADH-20260320-B1", productId: 2, warehouseId: 2, locationId: 2, binLocation: "C-01-01", status: "available", quantity: 200, saleableQuantity: 200, reservedQuantity: 0, unitPrice: "1850", hsnCode: "3921", grnNumber: "GRN-20260405-02", isGrnReleased: true },
  ]);

  // ──────────────────────────────────────────────────────────────────────────────
  // 8. GRNs — 2 Goods Receipt Notes linked to inventory + POs
  //    GRN 1: PVC Panels from local PO-1 → Malappuram (accepted, released)
  //    GRN 2: WPC Panels from import PO-2 → Bangalore (accepted, released)
  // ──────────────────────────────────────────────────────────────────────────────
  console.log("📝  Seeding GRNs...");
  await db.insert(grnTable).values([
    { grnNumber: "GRN-20260315-01", poId: 1, warehouseId: 1, inventoryId: 1, totalItemsReceived: 500, shortageQty: 0, damageQty: 0, status: "accepted", createdBy: "Lakshmi Nair", isReleased: true },
    { grnNumber: "GRN-20260405-02", poId: 2, warehouseId: 2, inventoryId: 2, totalItemsReceived: 200, shortageQty: 0, damageQty: 3, damageNotes: "Minor surface scratches on 3 panels", status: "accepted", createdBy: "Suresh Reddy", isReleased: true },
  ]);

  // Link GRN IDs back to inventory items
  await db.execute(sql`UPDATE inventory SET grn_id = 1 WHERE id = 1`);
  await db.execute(sql`UPDATE inventory SET grn_id = 2 WHERE id = 2`);

  // ──────────────────────────────────────────────────────────────────────────────
  // 9. ORDERS — 2 sales orders showing different lifecycle stages
  //    Order 1: DELIVERED — Malabar Interiors ordered PVC Panels (complete lifecycle)
  //    Order 2: PENDING — Decor Plus ordered WPC Panels (awaiting advance)
  // ──────────────────────────────────────────────────────────────────────────────
  console.log("🛒  Seeding orders...");
  await db.insert(ordersTable).values([
    // Order 1 — Delivered (complete lifecycle)
    {
      orderNumber: "ORD-20260318-001", dealerId: 1, status: "delivered",
      totalAmount: "190000", advancePaid: "100000",
      items: JSON.parse(JSON.stringify([
        { productId: 1, productName: "PVC Ceiling Panel 8ft", quantity: 200, unitPrice: 950 },
      ])),
      deliveredAt: new Date("2026-03-25"),
      isStockReserved: false,
    },
    // Order 2 — Pending (awaiting advance payment from dealer)
    {
      orderNumber: "ORD-20260410-002", dealerId: 2, status: "pending",
      totalAmount: "370000", advancePaid: "0",
      items: JSON.parse(JSON.stringify([
        { productId: 2, productName: "WPC Wall Panel Premium", quantity: 200, unitPrice: 1850 },
      ])),
      isStockReserved: false,
      notes: "Awaiting advance payment confirmation from dealer",
    },
  ]);

  // ──────────────────────────────────────────────────────────────────────────────
  // 10. DISPATCHES — 2 logistics entries linked to orders
  //     Dispatch 1: Delivered — PVC Panels → Kozhikode (Malabar Interiors)
  //     Dispatch 2: Planned — WPC Panels → Bangalore (Decor Plus) — future
  // ──────────────────────────────────────────────────────────────────────────────
  console.log("🚚  Seeding dispatches...");
  await db.insert(dispatchesTable).values([
    { dispatchNumber: "DSP-20260320-001", orderId: 1, vehicleNumber: "KL-11-AZ-4521", driverName: "Mujeeb Rahman", driverPhone: "9447001234", status: "delivered", routePlan: "Malappuram → Kozhikode", eWayBillNumber: "EWB2603200001", dispatchDate: new Date("2026-03-20"), deliveryDate: new Date("2026-03-25") },
    { dispatchNumber: "DSP-20260415-002", orderId: 2, vehicleNumber: "KA-01-CY-3344", driverName: "Kumar R", driverPhone: "9845003456", status: "planned", routePlan: "Bangalore Warehouse → Decor Plus, Peenya", eWayBillNumber: "EWB2604150002", dispatchDate: new Date("2026-04-15") },
  ]);

  // ──────────────────────────────────────────────────────────────────────────────
  // 11. ACTIVITIES — 2 recent activity log entries
  // ──────────────────────────────────────────────────────────────────────────────
  console.log("📜  Seeding activities...");
  await db.insert(activitiesTable).values([
    { type: "inward", description: "500 PVC Ceiling Panels received at Malappuram Central — GRN-20260315-01 accepted", user: "Lakshmi Nair", status: "completed" },
    { type: "order", description: "New order ORD-20260410-002 from Decor Plus Bangalore — 200 WPC Wall Panels · ₹3,70,000 — awaiting advance", user: "Mohammed Adhams", status: "completed" },
  ]);

  console.log("\n🎉  Seeding complete! 2 sample records per module inserted successfully.");
  console.log("\n📋  Data Summary:");
  console.log("   • 2 Users (Super Admin + Inventory Manager)");
  console.log("   • 2 Warehouses (Malappuram + Bangalore)");
  console.log("   • 2 Products (PVC Panel + WPC Panel)");
  console.log("   • 2 Dealers (Malabar Interiors + Decor Plus)");
  console.log("   • 2 Purchase Orders (1 Local Completed + 1 Import Confirmed)");
  console.log("   • 2 Inventory Lots (both available & GRN-released)");
  console.log("   • 2 GRNs (both accepted & released)");
  console.log("   • 2 Orders (1 Delivered + 1 Pending)");
  console.log("   • 2 Dispatches (1 Delivered + 1 Planned)");
  console.log("   • 2 Activities (inward + order)");
}

seed().catch(console.error);
