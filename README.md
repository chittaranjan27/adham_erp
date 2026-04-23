# 🏗️ Adhams ERP — Enterprise Resource Planning System

> A full-stack ERP system for Adhams Building Solutions covering inventory management, procurement workflows, import logistics, Tally accounting integration, and warehouse operations.

![Stack](https://img.shields.io/badge/React%2019-Vite-blue?style=flat-square) ![Backend](https://img.shields.io/badge/Express%20v5-Node.js-green?style=flat-square) ![Database](https://img.shields.io/badge/PostgreSQL-Drizzle%20ORM-purple?style=flat-square) ![Tally](https://img.shields.io/badge/TallyPrime-XML%20API-orange?style=flat-square)

---

## 📋 Table of Contents

- [Features Overview](#-features-overview)
- [Requirements Coverage](#-requirements-coverage)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Quick Start](#-quick-start)
- [Database Schema](#-database-schema)
- [Module Guide](#-module-guide)
- [Tally Integration](#-tally-integration)
- [Landing Cost Calculation](#-landing-cost-calculation)
- [Role-Based Access Control](#-role-based-access-control)
- [API Endpoints](#-api-endpoints)

---

## 🚀 Features Overview

### Inventory & Sales Management
- ✅ **General Inventory** — Track all products across multiple warehouses with barcode scanning
- ✅ **Saleable Stock View** — Dedicated role-gated view for Sales Team showing only GRN-verified, available inventory
- ✅ **7-Day Stock Reservation** — When a Sales Order is created with advance payment, stock is automatically blocked for 7 days to prevent double-selling
- ✅ **Inventory Statuses** — available, reserved, quarantined, in_transit, pending_qc

### Procurement & PO Management
- ✅ **Purchase Orders** — Create, edit, and track POs with line items, GST, and quality checks
- ✅ **Local vs Import** — Clear categorization with `po_type` field (local/import)
- ✅ **PO Attachments** — `attachment_url` field for linking documents (single URL; multi-photo enhancement pending)
- ✅ **GRN Auto-Generation** — Every inward receipt auto-creates a Goods Received Note
- 🔶 **PO Photo Upload** — Schema supports attachments; multi-photo upload UI enhancement pending

### Import & Logistics Workflow
- ✅ **6-Stage Import Pipeline** — Sequential, no-skip-allowed workflow:
  1. 📄 Proforma Invoice (PI) — Upload document
  2. 💰 Advance Payment — Record deposit with UTR reference
  3. 📦 Container Loading — BL number confirmation
  4. 💳 Remaining Payment — Balance settlement
  5. 🔍 Unloading & QC — Shortage + damage qty with **mandatory damage report**
  6. 🏭 Stocking — Auto-creates GRN + inventory entry

### Costing & Pricing
- ✅ **Landing Cost Formula** — `Landing Cost = Purchase Cost + Logistics Cost + Additional Charges`
- ✅ **Selling Price Calculation** — `Selling Price = Landing Cost × (1 + Margin% / 100)`
- ✅ **Live Preview** — Inventory inward form shows computed selling price as you type

### Warehouse Structure
- ✅ **3-Tier Hierarchy** — Warehouse → Location (floor/section/shelf) → Item
- ✅ **Location Types** — shelf, zone, rack, cold_storage, hazmat
- ✅ **Capacity Tracking** — Visual utilization bars per warehouse

### Tally Integration (Post 1st April)
- ✅ **Sales Invoice** — Pushed on order delivery with full GST breakdown
- ✅ **Purchase Invoice** — Pushed for PO sync
- ✅ **Receipt Voucher** — Advance payments
- ✅ **Sales Order** — Order book tracking
- ✅ **Auto-Ledger Creation** — CGST, SGST, IGST, Discount, Freight ledgers

### Documentation & Tracking
- ✅ **GRN (Goods Received Notes)** — Auto-generated, release-gated stock availability
- ✅ **Activity Log** — All system events logged for audit trail
- ❌ **Google Sheets Export** — Not yet implemented (low priority)

---

## 📊 Requirements Coverage

| # | Requirement | Status |
|---|------------|--------|
| 1 | General inventory vs saleable stock distinction | ✅ Implemented |
| 2 | Saleable stock view for Sales Team only | ✅ Implemented |
| 3 | 7-day Sales Order stock reservation | ✅ Implemented |
| 4 | Tally sync — Purchase records | ✅ Implemented |
| 5 | Tally sync — Sales records | ✅ Implemented |
| 6 | PO with Photo attachments | 🔶 Partial — URL field exists, multi-upload pending |
| 7 | Local vs Import PO categorization | ✅ Implemented |
| 8–13 | 6-stage Import Workflow (PI → Stocking) | ✅ All 6 stages implemented |
| 14 | Mandatory Shortage & Damage report | ✅ Implemented — enforced client + server |
| 15 | Landing Cost calculation | ✅ Implemented |
| 16 | Selling Price = Landing Cost + Margin% | ✅ Implemented |
| 17 | 3-tier warehouse hierarchy | ✅ Implemented |
| 18 | GRN triggers Purchase entry | ✅ Implemented |
| 19 | Google Sheets export/sync | ❌ Not started |

**Score: 17/19 fully implemented, 1 partial, 1 not started**

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, Tailwind CSS v4, TanStack React Query, Wouter, Framer Motion |
| Backend | Express v5, Node.js, Pino logger |
| Database | PostgreSQL via Drizzle ORM |
| Accounting | TallyPrime XML API (HTTP POST on port 9000) |
| Architecture | pnpm monorepo with shared Zod validators and generated React Query hooks |

---

## 📁 Project Structure

```
adhamflow/
├── artifacts/
│   ├── adhams-erp/              # 💻 Frontend — React + Vite (port 5173)
│   │   └── src/
│   │       ├── pages/           # 17 page components
│   │       │   ├── Dashboard.tsx
│   │       │   ├── Inventory.tsx
│   │       │   ├── SaleableInventory.tsx    # Sales-only role-gated view
│   │       │   ├── Products.tsx
│   │       │   ├── Orders.tsx / OrderDetails.tsx
│   │       │   ├── PurchaseOrders.tsx / CreatePurchaseOrder.tsx
│   │       │   ├── GRN.tsx / PartialGRN.tsx
│   │       │   ├── ImportWorkflow.tsx       # 6-stage import pipeline
│   │       │   ├── Warehouses.tsx
│   │       │   ├── Dealers.tsx
│   │       │   ├── Logistics.tsx
│   │       │   ├── Finance.tsx
│   │       │   └── Users.tsx
│   │       ├── components/      # Layout, UI primitives
│   │       ├── context/         # RoleContext (RBAC with 11 roles)
│   │       └── hooks/           # API query hooks
│   │
│   └── api-server/              # ⚙️ Backend — Express v5 (port 3000)
│       └── src/
│           ├── routes/          # 16 route modules
│           │   ├── orders.ts    # Order CRUD + stock reservation
│           │   ├── inventory.ts # Inventory CRUD + saleable filter
│           │   ├── grn.ts       # GRN CRUD + release logic
│           │   ├── importWorkflow.ts  # 6-stage import pipeline
│           │   ├── tally.ts     # Tally sync endpoints
│           │   └── ...
│           └── lib/
│               └── tallyClient.ts  # TallyPrime XML API client (903 lines)
│
├── lib/                         # 📦 Shared Libraries
│   ├── db/                      # Drizzle ORM schemas (13 tables)
│   │   └── src/schema/
│   │       ├── inventory.ts     # quantity, saleableQty, reservedQty, landingCost
│   │       ├── orders.ts        # GST fields, reservation, delivery
│   │       ├── purchaseOrders.ts # local/import type, attachments
│   │       ├── importStages.ts  # 6-stage sequential workflow
│   │       ├── grn.ts           # shortage, damage, release gate
│   │       ├── products.ts      # landingCost components, margin, sellingPrice
│   │       ├── warehouses.ts    # capacity, location
│   │       ├── warehouseLocations.ts  # 3-tier hierarchy
│   │       └── ...
│   ├── api-zod/                 # Shared Zod validators
│   └── api-client-react/        # Generated React Query hooks
│
├── scripts/                     # PowerShell utility scripts
│   ├── sync-to-tally.ps1       # Manual Tally sync
│   ├── test-tally-sync.ps1     # Test Tally connection
│   └── check-tally.ps1         # Health check
│
├── .env                         # Database URL, Tally config
├── pnpm-workspace.yaml          # Monorepo workspace config
└── package.json                 # Root scripts
```

---

## 🏃 Quick Start

### Prerequisites
- **Node.js 18+** and **pnpm** installed globally
- **PostgreSQL** database running
- **TallyPrime** (optional — only for accounting sync)

### Installation

```bash
# 1. Install all dependencies
pnpm install

# 2. Set up environment variables
#    Copy .env.example to .env and fill in:
#    DATABASE_URL=postgresql://user:password@host:port/database
#    TALLY_HOST=localhost
#    TALLY_PORT=9000
#    TALLY_COMPANY=Adhams Building Solutions

# 3. Push schema to database
pnpm db:push

# 4. Start development servers (frontend + backend)
pnpm run dev
```

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000

---

## 🗄️ Database Schema

### 13 Tables

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `users` | System users | name, email, role, isActive |
| `products` | Product master catalog | name, category, hsnCode, basePrice, purchaseCost, logisticsCost, landingCost, marginPercent, sellingPrice |
| `warehouses` | Warehouse locations | code, name, location, capacity, usedCapacity |
| `warehouse_locations` | 3-tier location hierarchy | warehouseId, code, floor, section, shelfNumber, locationType |
| `inventory` | Stock tracking per unit | barcode, productId, warehouseId, locationId, quantity, saleableQuantity, reservedQuantity, reservedUntil, landingCost, sellingPrice, qcStatus, isGrnReleased |
| `orders` | Sales orders | orderNumber, dealerId, status, totalAmount, grandTotal, taxRate, taxType (intra/inter), cgstAmount, sgstAmount, igstAmount, isStockReserved, reservedUntil |
| `dealers` | Dealer/customer CRM | dealerCode, name, gstNumber, creditLimit, outstandingBalance |
| `purchase_orders` | Procurement POs | poNumber, supplierName, poType (local/import), attachmentUrl, currency |
| `grn` | Goods Received Notes | grnNumber, poId, warehouseId, totalItemsReceived, shortageQty, damageQty, isReleased |
| `import_stages` | 6-stage import workflow | poId, stage, stageIndex, status, shortageQty, damageQty, damageReport |
| `dispatches` | Delivery dispatches | dispatchNumber, orderId, vehicleNumber, eWayBillNumber |
| `activities` | System audit log | type, description, user, status |

---

## 📖 Module Guide

### Inventory Management (`/inventory`)
- View all inventory with barcode, product, warehouse, bin location, status
- **Receive Inward** — Add new stock with landing cost + margin calculation
- Filter by status: available, reserved, quarantined, in_transit, pending_qc
- CSV bulk import

### Saleable Stock (`/inventory/saleable`)
- **Role-gated:** Only `sales_manager` can access
- Shows only GRN-released, available inventory
- KPIs: products available, total units, low-stock warnings

### 7-Day Stock Reservation
When an order is created with advance payment:
1. System checks inventory availability
2. Reserves specific inventory items (`reservedInventoryIds`)
3. Sets `reservedUntil = now + 7 days`
4. Reduces `saleableQuantity` on reserved items
5. Reservation prevents double-selling during finalization

### Import Workflow (`/import-workflow/:id`)
Sequential 6-stage pipeline with visual progress:

```
[1] Proforma Invoice → [2] Advance Payment → [3] Container Loading
     → [4] Remaining Payment → [5] Unloading & QC → [6] Stocking
```

- **No stage skipping** — each stage must complete before the next unlocks
- **Stage 5 (QC):** Mandatory damage report when damage qty > 0
- **Stage 6 (Stocking):** Auto-creates GRN + inventory entry in `pending_qc` status

### GRN — Goods Received Notes (`/grn`)
- Auto-generated on every inward receipt
- Tracks shortage and damage quantities
- **Release gate:** Stock only becomes saleable after warehouse manager releases the GRN
- Partial GRN support for split deliveries

---

## 🔗 Tally Integration

### Configuration

```env
TALLY_HOST=localhost      # TallyPrime server IP
TALLY_PORT=9000           # Default Tally HTTP port
TALLY_COMPANY=Adhams Building Solutions
```

### Supported Operations

| Operation | Endpoint | When to Use |
|-----------|----------|-------------|
| Health Check | `GET /api/tally/health` | Verify Tally is running |
| Sync Sales Invoice | `POST /api/tally/sync-order/:id` | After order delivery |
| Sync Purchase | `POST /api/tally/sync-purchase/:poId` | After PO completion |
| Sync Advance Receipt | `POST /api/tally/sync-advance/:id` | After advance payment |
| Dealer Balance | `GET /api/tally/dealer-balance/:dealerId` | Check outstanding |

### GST Handling

```
Intra-state (within state):  CGST = rate/2  +  SGST = rate/2
Inter-state (across states):  IGST = full rate
```

Tax type is determined by `order.taxType` field (`"intra"` or `"inter"`).

### Auto-Created Ledgers
On first sync, the system ensures these Tally ledgers exist:
- Output CGST, Output SGST, Output IGST (under Duties & Taxes)
- Discount Allowed (under Indirect Expenses)
- Freight & Shipping (under Direct Expenses)

---

## 💰 Landing Cost Calculation

### Formula

```
Landing Cost = Purchase Cost + Logistics Cost + Additional Charges

Selling Price = Landing Cost × (1 + Margin% / 100)
```

### Example

| Component | Amount |
|-----------|--------|
| Purchase Cost | ₹500 |
| Logistics (freight + customs) | ₹80 |
| Additional (handling + warehousing) | ₹20 |
| **Landing Cost** | **₹600** |
| Margin (25%) | — |
| **Selling Price** | **₹750** |

### Where It's Tracked
- **Product level:** `products.purchaseCost`, `products.logisticsCost`, `products.additionalCharges` → `products.landingCost`
- **Inventory level:** `inventory.landingCost`, `inventory.sellingPrice` (per-batch pricing)
- **UI:** Inventory Receive Inward modal shows real-time selling price preview

---

## 🔐 Role-Based Access Control

### 11 Predefined Roles

| Role | Accessible Modules | Key Permissions |
|------|-------------------|----------------|
| Super Admin | All | Full CRUD, approve, sync |
| Admin | All | Full CRUD, approve |
| Inventory Manager | Dashboard, Inventory, Products, Warehouses, GRN, POs | Create/edit inventory |
| Finance Head | Dashboard, Finance, Orders, Dealers, POs | View + edit |
| Logistics Coordinator | Dashboard, Logistics, Inventory, Warehouses, Orders, GRN | Manage dispatches |
| **Sales Manager** | Dashboard, Orders, Dealers, Products, **Saleable Stock** | Create orders |
| Warehouse Manager | Dashboard, Inventory, Warehouses, GRN, POs | GRN release |
| Accounts Team | Dashboard, Finance, Orders, POs | View only |
| Distribution Head | Dashboard, Logistics, Orders, Inventory, Warehouses, GRN | Dispatches + approve |
| Business Analyst | Dashboard, Finance, Orders, Inventory, Products, POs | View only |
| Transport Coordinator | Dashboard, Logistics, Warehouses | Dispatches only |

### How It Works
1. **Role Switcher** in header — dropdown selector for role-based demo
2. **Sidebar filtering** — only shows modules your role can access
3. **Route guards** — `<ProtectedRoute>` redirects unauthorized access
4. **Component guards** — `useRole().can("action")` hides create/edit/delete buttons
5. **API header** — `X-Role` header sent with every request

---

## 📡 API Endpoints

| Module | Method | Endpoint | Description |
|--------|--------|----------|-------------|
| **Dashboard** | GET | `/api/dashboard/stats` | KPI summary |
| **Products** | GET/POST | `/api/products` | List/create products |
| **Products** | PATCH/DELETE | `/api/products/:id` | Update/delete product |
| **Inventory** | GET/POST | `/api/inventory` | List/create inventory |
| **Inventory** | GET | `/api/inventory?saleable=true` | Saleable stock only |
| **Orders** | GET/POST | `/api/orders` | List/create orders |
| **Orders** | PATCH | `/api/orders/:id` | Update order |
| **Dealers** | GET/POST | `/api/dealers` | List/create dealers |
| **Purchase Orders** | GET/POST | `/api/purchase-orders` | List/create POs |
| **GRN** | GET/POST | `/api/grn` | List/create GRNs |
| **GRN** | PATCH | `/api/grn/:id` | Update/release GRN |
| **Import Workflow** | GET | `/api/import-workflow/:poId` | Get workflow stages |
| **Import Workflow** | POST | `/api/import-workflow/:poId/stages/:stageId/advance` | Complete a stage |
| **Warehouses** | GET/POST | `/api/warehouses` | List/create warehouses |
| **Warehouse Locations** | GET/POST | `/api/warehouse-locations` | Manage locations |
| **Tally** | GET | `/api/tally/health` | Check Tally connection |
| **Tally** | POST | `/api/tally/sync-order/:id` | Push Sales Invoice |
| **Tally** | POST | `/api/tally/sync-purchase/:poId` | Push Purchase Invoice |
| **Tally** | POST | `/api/tally/sync-advance/:id` | Push Receipt Voucher |
| **Users** | GET/POST | `/api/users` | Manage users |

---

## 📚 Additional Documentation

- [Project Architecture Guide](./PROJECT_ARCHITECTURE.md) — Monorepo structure, tech decisions, dev workflow
- [User Guide](./USER_GUIDE.md) — Non-technical guide for business users
