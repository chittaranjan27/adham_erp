# 🏗️ Adhams ERP — Complete Flow & Credentials Guide

> This document describes the end-to-end flow of data across the entire ERP system, the login credentials for every role, and which modules each role can access.

---

## 🔐 Login Credentials

All users share the **default password** on first login: `Adhams@2026`

Users can change their password after logging in via the user menu → **Change Password**.

| # | Role | Email | Default Password |
|---|------|-------|------------------|
| 1 | **Super Admin** | `superadmin@adhams.com` | `Adhams@2026` |
| 2 | **Admin** | `admin@adhams.com` | `Adhams@2026` |
| 3 | **Inventory Manager** | `murali@adhams.com` | `Adhams@2026` |
| 4 | **Finance Head** | `ravi.p@adhams.com` | `Adhams@2026` |
| 5 | **Logistics Coordinator** | `satheeshan@adhams.com` | `Adhams@2026` |
| 6 | **Sales Manager** | `vijay.p@adhams.com` | `Adhams@2026` |
| 7 | **Warehouse Manager** | `wh@adhams.com` | `Adhams@2026` |
| 8 | **Accounts Team** | `accounts@adhams.com` | `Adhams@2026` |
| 9 | **Distribution Head** | `dist@adhams.com` | `Adhams@2026` |
| 10 | **Business Analyst** | `ba@adhams.com` | `Adhams@2026` |
| 11 | **Transport Coordinator** | `transport@adhams.com` | `Adhams@2026` |

---

## 🔑 Authentication Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Login Flow                           │
│                                                         │
│  1. User enters email + password on Login page          │
│  2. POST /api/auth/login → bcrypt.compare()             │
│  3. Server returns JWT (8h expiry) + user info          │
│  4. Token stored in localStorage ("adhams_token")       │
│  5. All API requests include Authorization: Bearer JWT  │
│  6. Backend requireAuth middleware validates on every    │
│     request, extracts role from JWT payload              │
│  7. requirePermission() checks role-specific perms      │
└─────────────────────────────────────────────────────────┘
```

### JWT Payload Structure
```json
{
  "userId": 1,
  "role": "super_admin",
  "name": "Adhams Admin",
  "email": "superadmin@adhams.com",
  "iat": 1745563200,
  "exp": 1745592000
}
```

---

## 📊 Module Access Matrix

| Module | Super Admin | Admin | Inv. Mgr | Finance | Logistics | Sales | WH Mgr | Accounts | Dist. Head | BA | Transport |
|--------|:-----------:|:-----:|:--------:|:-------:|:---------:|:-----:|:------:|:--------:|:----------:|:--:|:---------:|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Inventory | R/W | R/W | R/W | — | R | — | R/W | — | R | R | — |
| Products | R/W | R/W | R/W | — | — | R | — | — | — | R | — |
| Orders | R/W | R/W | — | R | R/W | R/W | — | R | R | R | — |
| Warehouses | R/W | R/W | R | — | R | — | R/W | — | R | — | R |
| Dealers & CRM | R/W | R/W | — | R | — | R/W | — | — | — | — | — |
| Logistics | R/W | R/W | — | — | R/W | — | — | — | R/W | — | R/W |
| Finance | R/W | R/W | — | R | — | — | — | R | — | R | — |
| Users & Access | R/W | R/W | — | — | — | — | — | — | — | — | — |
| Purchase Orders | R/W | R/W | R/W | R | — | — | R/W | R | — | R | — |
| GRN | R/W | R/W | R/W | — | R | — | R/W | — | R | — | — |
| Import Workflow | R/W | R/W | R/W | — | — | — | — | — | — | — | — |
| Saleable Stock | — | — | — | — | — | R | — | — | — | — | — |

**R** = Read-only &nbsp;&nbsp; **R/W** = Read & Write &nbsp;&nbsp; **—** = No access

---

## 🔄 End-to-End Data Flow

### 1. Product Catalog → Purchase Order → Import

```
Products (catalog)
    │
    ▼
Purchase Order (PO)
    │  Created by: Inventory Manager, Warehouse Manager, Admin
    │  Status: draft → submitted → approved → ordered → shipped → received
    │
    ▼
Import Workflow (for international POs)
    │  Stages: Documents → Customs → Clearance → Transport → Delivered
    │  Each stage tracks: status, dates, documents, notes
    │
    ▼
GRN (Goods Received Note)
    │  Created when goods arrive at warehouse
    │  Can be partial (multiple GRNs per PO)
    │  Status: pending → inspected → released
    │
    ▼
Inventory (stock in warehouse)
    Items enter as "Pending QC"
```

### 2. Inventory QC → Available Stock

```
Inventory Item (Pending QC)
    │
    ├── QC Pass → Status: "Available"
    │     └── Can be allocated to orders
    │
    └── QC Fail → Status: "Quarantined"
          └── Reason logged, item isolated
```

### 3. Sales Flow: Order → Dispatch → Delivery

```
Dealer (customer)
    │
    ▼
Order
    │  Created by: Sales Manager, Logistics Coordinator, Admin
    │  Status: draft → confirmed → processing → packed → dispatched → delivered
    │  Contains: items, quantities, pricing (tax, discount, shipping)
    │
    ▼
Dispatch (Logistics)
    │  Created by: Logistics Coordinator, Distribution Head, Transport Coordinator
    │  Links: order → warehouse → vehicle → driver
    │  Status: scheduled → in_transit → delivered → cancelled
    │
    ▼
Finance
    │  Order totals, tax breakdowns (CGST/SGST/IGST)
    │  Tally Prime sync for accounting
    │
    ▼
Tally Prime (external)
    XML voucher sync for sales invoices
```

### 4. Complete System Flow Diagram

```
┌──────────┐     ┌──────────────┐     ┌───────────────┐
│ Products │────▶│Purchase Order│────▶│Import Workflow │
└──────────┘     └──────────────┘     └───────┬───────┘
                        │                      │
                        │                      │
                        ▼                      ▼
                  ┌──────────┐          ┌──────────┐
                  │   GRN    │◀─────────│  Customs │
                  └────┬─────┘          └──────────┘
                       │
                       ▼
                 ┌───────────┐
                 │ Inventory │
                 │(Pending QC)│
                 └─────┬─────┘
                       │
              ┌────────┼────────┐
              ▼        ▼        ▼
         ┌────────┐ ┌──────┐ ┌──────────┐
         │Available│ │Failed│ │Quarantine│
         └───┬────┘ └──────┘ └──────────┘
             │
             ▼
        ┌─────────┐     ┌───────────┐
        │  Order  │────▶│ Dispatch  │
        └────┬────┘     └─────┬─────┘
             │                │
             ▼                ▼
        ┌─────────┐     ┌──────────┐
        │ Finance │────▶│  Tally   │
        └─────────┘     └──────────┘
```

---

## 🛠️ Technical Setup

### Prerequisites
- Node.js 18+
- PostgreSQL database
- pnpm package manager

### First-Time Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Push database schema
pnpm db:push

# 3. Seed default users (11 roles)
pnpm seed:users

# 4. Start development server
pnpm dev
```

### Environment Variables (`.env`)
```env
DATABASE_URL=postgresql://user:password@localhost:5432/adhams_erp
PORT=5000
NODE_ENV=development
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=8h
```

### API Endpoints

#### Authentication (Public)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login with email + password |
| GET | `/api/auth/me` | Validate JWT, get current user |
| POST | `/api/auth/change-password` | Change password (requires auth) |

#### Protected (requires Bearer JWT)
All other `/api/*` endpoints require a valid JWT token in the `Authorization` header.

---

## 🔒 Security Notes

1. **Passwords** are hashed with bcrypt (12 salt rounds)
2. **JWT tokens** expire after 8 hours (configurable via `JWT_EXPIRES_IN`)
3. **RBAC** is enforced at two levels:
   - **Frontend**: Role-based navigation hiding and route guards
   - **Backend**: `requireAuth` middleware validates JWT, `requirePermission` checks role permissions
4. **Change `JWT_SECRET`** in production — the default is for development only
5. **User accounts** can be deactivated without deletion (isActive flag)
