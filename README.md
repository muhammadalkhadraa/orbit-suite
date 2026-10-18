# Orbit Business Suite

Orbit Business Suite is an enterprise-grade, multi-tenant SaaS business management platform. It allows independent companies to seamlessly manage employees, organizational hierarchies, role-based permissions, tasks, and full-suite operational workflows (CRM, Support, Inventory, Manufacturing, HR, Invoicing, and Executive Analytics) through a single unified portal.

---

## Architecture Highlights

- **Frontend:** Angular 19 (Standalone Components, TypeScript Strict Mode, Reactive Forms, SCSS Design System with Dark Aurora and Glassmorphism).
- **Backend:** ASP.NET Core 10 Web API (Modular Monolith, Clean Architecture).
- **Database & ORM:** SQL Server / EF Core with automatic multi-tenant global query filters and migrations.
- **Security & Multi-Tenancy:**
  - Complete logical data isolation enforced at the database and application layers.
  - Server-verified tenant membership (`X-Tenant-Id` header validated against active memberships).
  - ASP.NET Core Identity authentication with PBKDF2 password hashing and JWT Bearer tokens.
  - Comprehensive automated security and cross-tenant isolation test suite (58/58 tests passing).

---

## Live Business Modules

1. **Tasks & Projects (`/app/tasks`):** 4-lane Kanban board, role-scoped task visibility, priority tracking, due date monitoring.
2. **Organization Structure (`/app/organization`):** Multi-branch facility management, departmental structures, company profiles.
3. **Employees & Directory (`/app/employees`):** Decoupled identity-to-profile directory, supervisor reporting trees, invite workflows.
4. **CRM & Deal Pipeline (`/app/crm`):** Account directory, 6-stage Kanban pipeline, win-probability forecasting, conversion metrics.
5. **Customer Support & Helpdesk (`/app/support`):** Sequential ticket numbering (`TCK-1001`), SLA monitoring, internal notes, discussion threads.
6. **Multi-Location Inventory (`/app/inventory`):** SKU catalog, multi-branch allocations, immutable `StockMovement` ledger, inter-branch transfers.
7. **Invoicing & Accounts Receivable (`/app/finance`):** Sequential billing (`INV-YYYY-XXXX`), line-item tax/discounts, immutable payment cash receipts ledger (`PAY-YYYY-XXXX`), overpayment guardrails.
8. **Manufacturing & Work Orders (`/app/manufacturing`):** BOM formulation recipes (`BOM-XXXX`), shop-floor work orders (`WO-YYYY-XXXX`), atomic finished-goods stock yield.
9. **HR & Attendance Management (`/app/hr`):** Digital self-service time clock, multi-tier leave approval hierarchy (`LR-YYYY-XXXX`), shift schedule rotas.
10. **Reports & Executive Analytics (`/app/reports`):** 6-domain KPI matrix, 6-month financial trajectory charts, sales funnel velocity, dynamic on-demand CSV & JSON file export engine with forensic audit trail.
11. **Audit & Security Ledger (`/app/audit`):** Immutable forensic chronological log of identity, security mutations, and administrative operations with raw JSON attribute inspection drawer, actor telemetry, and SOC2 Type II controls.

---

## Demo Accounts

The system automatically initializes and seeds a complete demonstration company (**Starlight Dynamics**) upon first run with rich data across every module:

| Role | Email | Password | Access / Permissions |
|---|---|---|---|
| **Company Owner** | `owner@starlight.com` | `OrbitPassword123!` | Complete administrative, financial, billing, and organizational authority |
| **Operations Manager** | `manager@starlight.com` | `OrbitPassword123!` | Departmental oversight, direct report task/leave approval, inventory transfers |
| **Lead Engineer (Employee)** | `employee@starlight.com` | `OrbitPassword123!` | Personal tasks, assigned work orders, personal time clock, support ticket replies |

---

## Project Structure

```
├── docs/                        # Complete architectural and operational documentation
│   ├── ARCHITECTURE.md          # Modular monolith & layer design
│   ├── REQUIREMENTS.md          # Confirmed scope & implementation verification
│   ├── DATA-MODEL.md            # Multi-tenant ERD and entity specifications
│   ├── SECURITY.md              # Tenant isolation controls & authorization policies
│   ├── API-CONVENTIONS.md       # REST contracts, endpoint catalog, error formats
│   ├── DECISIONS.md             # Architectural decision records (ADR-001 through ADR-013)
│   ├── IMPLEMENTATION-PLAN.md   # Phased implementation tracker (Phases 1-14 complete)
│   └── DEPLOYMENT.md            # Environment configuration & operations
├── backend/                     # ASP.NET Core Web API Solution
│   ├── Orbit.sln
│   ├── src/
│   │   ├── Orbit.Api            # API controllers, middleware, DI setup
│   │   ├── Orbit.Application    # Use cases, DTOs, interfaces, services
│   │   ├── Orbit.Domain         # Entities, enums, tenant contracts
│   │   └── Orbit.Infrastructure # EF Core, DbContext, Identity, persistence, seeder
│   └── tests/
│       └── Orbit.Tests          # 60 passing unit, integration, and security tests
└── frontend/                    # Angular 19 Standalone SPA (66 passing headless unit tests)
    ├── src/
    │   ├── app/
    │   │   ├── core/            # Tenant context, auth services, API services
    │   │   ├── shared/          # Reusable aurora/glassmorphism UI components
    │   │   ├── layouts/         # Marketing layout and authenticated workspace shell
    │   │   └── features/        # Auth, Org, Employees, Tasks, CRM, Support, Inventory, Finance, Manufacturing, HR, Reports, Audit
    │   └── styles/              # Design tokens, aurora palette, glassmorphism mixins
```

---

## Getting Started

### Option A: Running with Docker (Recommended)
Launch the entire suite with automated database seeding in one command:
```bash
docker compose up --build
```
- **Web Portal:** `http://localhost:4200`
- **Backend API:** `http://localhost:5115/swagger`

### Option B: Local Development
#### Prerequisites
- [.NET 10 SDK](https://dotnet.microsoft.com/)
- [Node.js (LTS/v24)](https://nodejs.org/) & npm
- SQL Server 2022+ (or SQLite for development)

#### Running the Backend
```bash
cd backend
dotnet restore
dotnet test
dotnet run --project src/Orbit.Api
```
The API Swagger documentation will be available at: `http://localhost:5000/swagger`

#### Running the Frontend
```bash
cd frontend
npm install
npm test -- --watch=false --browsers=ChromeHeadless
npm start
```
The frontend application will be available at: `http://localhost:4200`
