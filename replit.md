# Adhams ERP & Logistics Platform

## Overview

Full-stack ERP & Supply Chain Management platform for Adhams (The Royal Definition), a building materials company based in Malappuram, Kerala. The platform manages wall panels, ceiling solutions, and architectural hardware across manufacturing and import operations.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React 18 + Vite + Wouter routing + Tailwind CSS + Shadcn/UI
- **Charts**: Recharts
- **Animations**: Framer Motion
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── adhams-erp/         # React + Vite frontend (main ERP dashboard)
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
│   └── src/seed.ts         # Database seeding script
```

## Platform Modules

### Core Modules (Phase 1)
1. **Dashboard** - KPI overview with inventory value, revenue, orders, dispatches, warehouse stock charts
2. **Inventory Management** - Track items with barcodes across warehouses, QC pass/fail, saleable vs reserved qty, GRN references
3. **Product Catalog** - Wall panels, ceiling solutions, architectural hardware with HSN codes + landing cost calculator fields
4. **Orders** - B2B dealer orders with advance payments, stock reservation (7-day lock), WhatsApp notification simulation
5. **Warehouses** - 5 warehouse nodes (Malappuram, Calicut, Bangalore, Mumbai, Chennai) + 3-level location hierarchy
6. **Dealers & CRM** - Dealer network management with credit limits, commission slabs, GST numbers
7. **Logistics & Dispatch** - Fleet management, e-Way bills, route plans, proof of delivery, Tally sync simulation
8. **Finance** - Revenue reports, channel breakdown, top products, margin analysis
9. **Users & Access** - Multi-role access (Super Admin, Admin, Inventory Manager, etc.)

### Procurement Modules (Phase 2)
10. **Purchase Orders** - Local PO (domestic) and Import PO workflows; auto-creates 6 import stages on creation; type filter, supplier GSTIN, attachment URL
11. **GRN (Goods Received Notes)** - Auto-generated on every inventory receipt; shows release status, shortage/damage qty, stock release workflow
12. **Import Workflow** - 6-stage sequential pipeline: Proforma Invoice → Advance Payment → Container Loading → Remaining Payment → Unloading & QC → Stocking; stage advancement with mandatory damage reports; progress tracking

## RBAC (Role-Based Access Control)

The `RoleContext` (`artifacts/adhams-erp/src/context/RoleContext.tsx`) controls which sidebar nav items are visible and which action buttons appear based on the logged-in role. Roles include: `super_admin`, `admin`, `inventory_manager`, `finance_head`, `logistics_coordinator`, `sales_manager`, `warehouse_manager`, `accounts_team`, `distribution_head`, `business_analyst`, `transport_coordinator`. Switching role persists to `localStorage`.

## Data Entry Forms

All key pages now have working modals connected to the PostgreSQL database:
- **Products** — Add Product modal (name, category, HSN code, price, unit, origin, dimensions) + CSV import
- **Inventory** — Receive Inward modal with product/warehouse dropdowns (auto-fill HSN code) + CSV import
- **Orders** — New Order modal with dealer picker, dynamic product rows, advance payment, real-time total + CSV export
- **Dealers** — Add Dealer modal (name, contact, GST, credit limit, commission tier) + CSV import
- **Users** — Invite User modal (name, email, role with access description, password) — Super Admin only

CSV import format: each page accepts comma-separated files where the first row is headers (skipped).

## Key Features

- Adhams brand colors (orange-red #E8401C) throughout
- Role-based navigation with role switcher simulation
- INR currency formatting throughout
- Real Indian business data (HSN codes, GST numbers, Kerala/Karnataka/Maharashtra locations)
- Barcode management for inward receiving and dispatch
- QC quarantine workflow for rejected goods
- E-Way bill integration for logistics

## Database Schema

### Core Tables
`users`, `products`, `warehouses`, `inventory`, `dealers`, `orders`, `dispatches`, `activities`

### Phase 2 Tables
`purchase_orders` — PO type (local/import), status, supplier info, attachment URL
`grn` — Goods Received Notes linked to inventory items and POs
`import_stages` — 6-stage sequential import workflow per import PO
`warehouse_locations` — 3-level hierarchy (floor → section → shelf) within warehouses

### Key Column Additions
- `inventory`: `saleable_quantity`, `reserved_quantity`, `reserved_until`, `grn_id`, `grn_number`, `landing_cost`, `selling_price`, `is_grn_released`, `location_id`
- `orders`: `is_stock_reserved`, `reserved_until`, `reserved_inventory_ids`, `proof_of_delivery`, `delivery_otp`
- `products`: `purchase_cost`, `logistics_cost`, `additional_charges`, `landing_cost`, `margin_percent`, `selling_price`

## API Routes

### Core
- `GET/POST /api/inventory` — Inventory CRUD + QC + GRN auto-generation on POST + saleable stock filter (`?saleable=true`)
- `POST /api/inventory/:id/reserve` — Reserve stock for 7 days
- `POST /api/inventory/release-expired` — Release expired reservations
- `GET/POST /api/products` — Product catalog
- `GET/POST /api/orders` — Order management; stock reservation + WhatsApp simulation on POST; Tally sync on status=delivered
- `GET/POST /api/warehouses` — Warehouse management
- `GET/POST /api/dealers` — Dealer CRM
- `GET/POST /api/logistics/dispatches` — Dispatch management
- `GET /api/finance/reports` — Finance reporting
- `GET /api/dashboard/*` — Dashboard KPIs and charts
- `GET/POST /api/users` — User management

### Procurement (Phase 2)
- `GET/POST /api/purchase-orders` — Purchase orders (local + import)
- `GET /api/purchase-orders/:id` — PO with stages + GRNs
- `PATCH /api/purchase-orders/:id` — Update PO status
- `GET/POST /api/grn` — GRN management
- `PATCH /api/grn/:id` — Verify / release GRN (updates inventory saleable qty on release)
- `GET /api/import-workflow/:poId` — Import workflow stages for a PO
- `PATCH /api/import-workflow/:poId/stage/:stageId` — Advance a stage (enforces sequential order)
- `GET/POST /api/warehouse-locations` — 3-level warehouse location hierarchy

## Custom Frontend Hooks

Located at `artifacts/adhams-erp/src/hooks/useApiQuery.ts` — wraps Phase 2 API routes with React Query hooks:
`useListPurchaseOrders`, `useGetPurchaseOrder`, `useCreatePurchaseOrder`, `useUpdatePurchaseOrder`,
`useListGrn`, `useUpdateGrn`, `useGetImportWorkflow`, `useAdvanceImportStage`,
`useListWarehouseLocations`, `useCreateWarehouseLocation`

## Running

- Frontend: `pnpm --filter @workspace/adhams-erp run dev`
- API server: `pnpm --filter @workspace/api-server run dev`
- DB migrations: `pnpm --filter @workspace/db run push`
- Seed data: `pnpm --filter @workspace/scripts run seed`
- Codegen: `pnpm --filter @workspace/api-spec run codegen`

## Branding Assets

Logo and images in `attached_assets/`, imported via `@assets/` alias in the frontend.
