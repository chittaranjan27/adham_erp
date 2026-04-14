# 🏗️ Adham ERP: Architecture & Development Process

This document explains how the Adham ERP project is structured and the thought process behind its development. It is designed to help other developers or stakeholders understand the technical foundation of the system.

## 📁 1. Project Structure (The Monorepo Approach)

We chose a **Monorepo** architecture using `pnpm workspaces`. This means the frontend, backend, and shared tools all live in the same repository. This makes sharing code (like types and validation rules) incredibly seamless.

Here is how the main directories are broken down:

```text
adhamflow/
│
├── artifacts/                  # Main Applications
│   ├── adhams-erp/             # 💻 Frontend: React + Vite web dashboard
│   └── api-server/             # ⚙️ Backend: Express Node.js API server
│
├── lib/                        # Shared Libraries modules & logic
│   ├── db/                     # 🗄️ Database: Drizzle ORM schemas and connections
│   ├── api-zod/                # 🛡️ Validation: Shared Zod schemas for both frontend & backend
│   └── api-client-react/       # 🔗 Client Hooks: Shared React-Query data fetching hooks
│
└── pnpm-workspace.yaml         # Configuration gluing all workspaces together
```

### Why this structure?
- **Single Source of Truth:** We define our data models and validation logic once in `lib/` and use them concurrently in the frontend and backend.
- **Refactoring Safety:** Changing a database column name in `lib/db/` instantly reveals downstream errors in both the API server and UI components during type-checking.

---

## 🛠️ 2. The Technology Stack

We deliberately selected a modern, highly scalable full-stack ecosystem:

### Frontend (`artifacts/adhams-erp`)
- **Framework:** React 19 built with **Vite** for lightning-fast hot reloading.
- **Styling:** **Tailwind CSS v4** combined with **Radix UI** primitives to build an accessible, responsive, and highly customized interface.
- **State & Data Fetching:** **TanStack React Query** coupled with `wouter` for lightweight routing.
- **Forms:** `react-hook-form` paired with `zod` for robust, type-checked user inputs.

### Backend (`artifacts/api-server`)
- **API Framework:** **Express v5** running on Node.js.
- **Logging:** **Pino** for extremely fast JSON-based centralized logging.

### Database & ORM (`lib/db`)
- **Database:** **PostgreSQL**.
- **ORM:** **Drizzle ORM**. It provides top-tier TypeScript safety and great SQL-like query syntax without the bloat of traditional ORMs.

---

## 🔄 3. Our Development Process

Our development lifecycle strongly prioritizes **Type Safety** and **Iterative Building**. Here is the standard flow when we add a new feature (like "Goods Receipt Notes"):

### Step 1: Data Modeling (`lib/db`)
We start at the very bottom. We define the new schema using Drizzle (e.g., creating a `grn` table and its columns in `lib/db/schema`). We then use our custom pnpm scripts to push the schema directly to PostgreSQL (`pnpm db:push`).

### Step 2: Shared Types (`lib/api-zod`)
We define the exact structure of what the API will expect using `Zod` blocks. Because this lives in the `lib` folder, both the API and the React frontend will import these exact same validation rules.

### Step 3: API Endpoints (`artifacts/api-server`)
We write the Express.js routes to handle the `GET`, `POST`, `PUT`, or `DELETE` operations. These endpoints receive inputs, validate them against the Zod schemas from Step 2, and use Drizzle ORM to talk to the database.

### Step 4: UI Hooks (`lib/api-client-react`)
To make data fetching a breeze, we write typed React Query hooks (like `useCreateGRNMutation`) that interact directly with our API server. This keeps our UI code incredibly clean.

### Step 5: User Interface (`artifacts/adhams-erp`)
Finally, we build the visual layers. We compose Tailwind-styled React components, connect our data fetching hooks, and map out the user interaction flows. Errors handled on the backend elegantly bubble up to the frontend UI through standardized toasts/alerts.

---

## 🚀 4. How to Run It Quickly
Due to the monorepo setup, you don't need a dozen terminal windows to run everything.
Simply running:
```bash
pnpm run dev
```
Automatically launches the React Frontend and the API Backend simultaneously via parallel processing.
