# Orbit Business Suite — Implementation Plan

## Overview
This document tracks the execution phases, current progress, dependencies, and verification steps for Orbit Business Suite.

---

## Phase Status Summary

| Phase | Description | Status | Blockers / Dependencies |
|---|---|---|---|
| **Phase 1** | Repository Assessment & Documentation | **Complete** | Verified |
| **Phase 2** | Technical Foundation (.NET & Angular) | **Complete** | Verified |
| **Phase 3** | Tenant & Identity Foundation | **Complete** | Verified |
| **Phase 4** | Authenticated Application Shell | **Complete** | Verified |
| **Phase 5** | Organization & Employee Management | **Complete** | Verified |
| **Phase 6** | Tasks & Projects Module | **Complete** | Verified |
| **Phase 7** | CRM & Customer Support Modules | **Complete** | Verified |
| **Phase 8** | Multi-Location Inventory & Catalog | **Complete** | Verified |
| **Phase 9** | Invoicing & Accounts Receivable | **Complete** | Verified |
| **Phase 10** | Specification Viewer Framework | **Complete** | Verified |
| **Phase 11** | Manufacturing & Production Control | **Complete** | Verified |
| **Phase 12** | HR & Workforce Attendance | **Complete** | Verified |
| **Phase 13** | Reports & Executive Analytics Dashboard | **Complete** | Verified |
| **Phase 14** | Integration & Release Readiness | **Complete** | 58/58 Tests Passed & 0-Error Build |
| **Phase 15** | Containerization, CI/CD & Audit Governance | **Complete** | 60/60 Tests Passed & Docker Orchestration |
| **Phase 16** | Multi-Industry Starter Pack & 8 Core Departments | **Planned** | Pending Execution |
| **Phase 17** | Compliance Audit & Regulatory Certificates | **Planned** | Pending Execution |
| **Phase 18** | Scoped Vacation Approvals & Negative Balance Engine | **Planned** | Pending Execution |
| **Phase 19** | Internal IT Support Helpdesk | **Planned** | Pending Execution |
| **Phase 20** | Finance Salary Calc, Excel Payroll & HR Email Dispatch | **Planned** | Pending Execution |

---

## Detailed Task Breakdown

### Phase 1: Repository Assessment & Documentation
- [x] Inspect existing repository (empty starting point).
- [x] Verify toolchain (`.NET 10.0.201`, `Node v24.14.0`, `npm 11.9.0`).
- [x] Author comprehensive project documentation:
  - `README.md`
  - `docs/ARCHITECTURE.md`
  - `docs/REQUIREMENTS.md`
  - `docs/DATA-MODEL.md`
  - `docs/SECURITY.md`
  - `docs/API-CONVENTIONS.md`
  - `docs/DECISIONS.md`
  - `docs/IMPLEMENTATION-PLAN.md`
  - `docs/DEPLOYMENT.md`

### Phase 2: Technical Foundation
- [x] Initialize ASP.NET Core Solution:
  - `Orbit.sln`
  - `src/Orbit.Api` (ASP.NET Core Web API, controllers, Swagger/OpenAPI)
  - `src/Orbit.Application` (Interfaces, DTOs, Base Services)
  - `src/Orbit.Domain` (BaseEntity, ITenantScopedEntity, Enums)
  - `src/Orbit.Infrastructure` (EF Core, DbContext, Identity)
  - `tests/Orbit.Tests` (xUnit test project with FluentAssertions / Moq)
- [x] Initialize Angular 19 Frontend:
  - Standalone components, strict TypeScript, SCSS.
  - Setup core SCSS tokens (`_variables.scss`, `_mixins.scss`, `_typography.scss`).
  - Dark aurora and glassmorphism styling foundation.
- [x] Verify local build and test execution for both backend and frontend.

### Phase 3: Tenant & Identity Foundation
- [x] Implement `ApplicationUser`, `Tenant`, `TenantMembership`, `Branch`, `Department`, `EmployeeProfile`.
- [x] Implement `OrbitDbContext` with EF Core Global Query Filter for `ITenantScopedEntity`.
- [x] Implement `TenantResolutionMiddleware` and `ITenantContext`.
- [x] Implement Auth endpoints (`/api/v1/auth/register`, `/api/v1/auth/login`, `/api/v1/auth/switch-tenant`, `/api/v1/auth/context`).
- [x] Implement `AuditLog` generation on critical events.
- [x] Write backend unit & security integration tests verifying cross-tenant isolation (6/6 passed).

### Phase 4: Authenticated Application Shell
- [x] Angular Layouts: Public Marketing Layout & Authenticated Workspace Layout.
- [x] Aurora navigation sidebar with active tenant indicator and role badge.
- [x] Header with tenant switcher dropdown and user profile controls.
- [x] Shared UI components: Button, Card, Badge, Data Table, Modal Dialog, Spinner.
- [x] Route guards: `AuthGuard`.
- [x] Live role switcher pill bar (`Owner`, `Manager`, `Employee`) for interactive permission inspection.

### Phase 5: Organization & Employee Management
- [x] Backend API: Organization (branches, departments) & Employee management endpoints.
- [x] Frontend Features: Company profile, Branch management, Department management, Employee directory.
- [x] Verification of authorization policies (Admin/Owner access only).
- [x] Decoupled employee profile from login identity with hierarchical manager reporting relationships.

### Phase 6: Tasks & Projects Module
- [x] Backend API: TaskItem endpoints with role-based scoping (Employee own tasks, Manager team tasks, Admin company tasks).
- [x] Frontend Feature: 4-lane Kanban board (`Todo`, `InProgress`, `InReview`, `Done`), task creation modal, status updates.
- [x] Automated security tests for task visibility rules (6/6 passed).

### Phase 7: Business Modules Implementation
- [x] **CRM & Sales — Customer & Contact Governance:**
  - Implemented `Customer` entity (`ITenantScopedEntity`, `IAuditableEntity`) and `CustomerStatus` enum.
  - Implemented `CustomerService` enforcing confirmed role-scoped visibility (Rep sees assigned, Manager sees direct reports, Owner/Admin see all).
  - Created `CustomersController` REST API (`GET`, `POST`, `PUT`, `DELETE`).
  - Implemented Angular `CrmComponent` with Dark Aurora design, metrics cards, status tabs, directory table, and creation modal.
  - Added 4 automated unit and security tests in `Orbit.Tests` (all passing).
- [x] **CRM & Sales — Deal & Opportunity Pipeline:**
  - Implemented `Deal` entity (`ITenantScopedEntity`, `IAuditableEntity`) and `DealStage` enum.
  - Implemented `DealService` with role-scoped pipeline governance.
  - Implemented `DealsController` REST API (`GET`, `POST`, `PUT`, `PATCH /stage`, `DELETE`, `GET /metrics`).
  - Enhanced Angular `CrmComponent` with 6-stage Aurora Kanban Board, win/loss modals, and pipeline analytics.
  - Added 7 automated unit and security tests in `Orbit.Tests` (all passing).
- [x] **Customer Support & Helpdesk Ticketing:**
  - Implemented `SupportTicket` and `TicketComment` entities with `TicketStatus`, `TicketPriority`, and `TicketCategory` enums.
  - Implemented `TicketService` with sequential tenant numbering (`TCK-1001`), internal/public notes, and SLA metrics.
  - Implemented `TicketsController` REST API.
  - Implemented Angular `SupportComponent` with SLA cards, filtering, and modal discussion thread.
  - Added 7 automated unit and security tests in `Orbit.Tests` (all passing).

### Phase 8: Multi-Location Inventory & Product Catalog
- [x] Implemented `Product`, `ProductInventory`, and `StockMovement` domain entities with `ProductCategory` and `StockMovementType` enums.
- [x] Configured EF Core models in `OrbitDbContext` with tenant global query filters and decimal precision (`18, 2`).
- [x] Created `InventoryService` supporting catalog management, atomic stock adjustments, inter-branch transfers, and valuation metrics.
- [x] Implemented `ProductsController` REST API endpoints under `/api/v1/inventory`.
- [x] Implemented Dark Aurora Angular `InventoryComponent` with tabbed views, adjust modals, and route `/app/inventory`.
- [x] Added 7 automated unit and integration tests in `InventoryTests.cs` (all passing).

### Phase 9: Invoicing & Financial Accounting
- [x] Implemented `Invoice`, `InvoiceItem`, and `PaymentRecord` domain entities with `InvoiceStatus` and `PaymentMethod` enums.
- [x] Created `InvoiceService` with sequential numbering (`INV-YYYY-XXXX` and `PAY-YYYY-XXXX`), line item pricing calculations, tax/discount logic, and audit logging.
- [x] Implemented `InvoicesController` REST API endpoints under `/api/v1/finance/invoices`.
- [x] Implemented Dark Aurora Angular `FinanceComponent` with KPI metrics, invoices table, payments ledger, line item builder, and route `/app/finance`.
- [x] Added 7 automated unit and integration tests in `InvoiceTests.cs` (all passing).

### Phase 11: Manufacturing & Production Control
- [x] Implemented `BillOfMaterials`, `BomItem`, and `WorkOrder` domain entities with `WorkOrderStatus` and `WorkOrderPriority` enums.
- [x] Implemented `ManufacturingService` with automated sequential numbering (`WO-YYYY-XXXX` and `BOM-XXXX`), shop-floor status machine, atomic stock yield, and immutable `StockMovement` audit logs.
- [x] Implemented `ManufacturingController` REST API endpoints under `/api/v1/manufacturing`.
- [x] Implemented full Dark Aurora Angular `ManufacturingComponent` with Work Orders queue, BOM catalog, facility yield stats, and route `/app/manufacturing`.
- [x] Added 7 automated unit and integration tests in `ManufacturingTests.cs` (all passing).

### Phase 12: HR & Attendance Management
- [x] Implemented `LeaveRequest`, `AttendanceLog`, and `ShiftSchedule` domain entities with `LeaveType`, `LeaveStatus`, `AttendanceStatus`, and `ShiftType` enums.
- [x] Implemented `HrService` enforcing confirmed role-scoped visibility (self-service time clock, manager approvals for direct reports, owner/admin tenant-wide authority).
- [x] Implemented `HrController` REST API endpoints under `/api/v1/hr` (`leaves`, `attendance`, `shifts`, `metrics`).
- [x] Implemented full Dark Aurora Angular `HrComponent` with time clock card, roster tabs, shift rota cards, and route `/app/hr`.
- [x] Added 8 automated unit, security, and multi-tenant isolation tests in `HrTests.cs` (all passing).

### Phase 13: Reports & Executive Analytics Dashboard
- [x] Implemented cross-domain `ReportExportHistory` entity and `ReportType` / `ExportFormat` enums.
- [x] Created `ReportingService` computing consolidated telemetry across Financial, Sales, Support, Inventory, Manufacturing, and Workforce domains, plus CSV and JSON formatted file generators.
- [x] Implemented `ReportsController` REST API endpoints under `/api/v1/reports` (`executive`, `export`, `history`).
- [x] Implemented full Dark Aurora Angular `ReportsComponent` with 6-domain KPI matrix, 6-month revenue & cash collection bar chart, sales pipeline funnel, department/inventory distribution tracks, 1-click native browser Blob file exporter, and export history audit log.
- [x] Connected route `/app/reports` directly to `ReportsComponent` (retiring all placeholders across the suite).
- [x] Added 4 automated unit, security, and format export tests in `ReportingTests.cs` (suite expanded to 57/57 passing tests).

### Phase 14: Integration & Release Readiness
- [x] Implemented `DatabaseSeeder` (`Orbit.Infrastructure.Seed`) with automated SQLite/SQL Server schema initialization and comprehensive demo dataset seeding ("Starlight Dynamics" tenant with branches, departments, users, tasks, deals, tickets, inventory, invoices, work orders, attendance, and exports).
- [x] Added `SeederTests.cs` verifying schema creation, full entity tree seeding, and idempotency (suite expanded to **58/58 tests passing** with 0 failures).
- [x] Frontend Angular production bundle build (`npm run build`) passing with **0 errors and 0 warnings** (generated in ~9s).
- [x] All 7 core business suite modules verified live with multi-tenant data isolation and role-scoped permissions.

### Phase 15: Containerization, CI/CD & Audit Governance
- [x] Implemented multi-stage `backend/Dockerfile` targeting .NET 10 with build-time test gates and ASP.NET Core runtime minimization.
- [x] Implemented `frontend/Dockerfile` leveraging Node 22 build environment and lightweight Nginx Alpine runtime with custom reverse proxy (`nginx.conf`) and SPA routing fallbacks.
- [x] Configured root `docker-compose.yml` orchestrating API (`5115:8080`) and Angular Web Portal (`4200:80`) with persistent SQLite volume.
- [x] Created `.github/workflows/ci.yml` defining automated CI pipelines for backend unit test suites and Angular production builds on all pushes and PRs.
- [x] Implemented SOC2 Type II Audit & Security Ledger:
  - Backend `AuditService.GetLogsAsync` with chronological ordering and tenant isolation filters.
  - `AuditController.cs` restricted to Owner, Admin, and Manager roles.
  - Two security tests in `AuditTests.cs` (expanding suite to **60/60 tests passing**).
  - Angular `AuditComponent` with Dark Aurora glassmorphism, KPI metrics, live filtering, and interactive raw JSON payload drawer.
  - Registered route `/app/audit` and added navigation entry under *Security & Governance* in workspace shell.
- [x] Updated `README.md` and `docs/DEPLOYMENT.md` with containerized execution commands and operational playbooks.

### Phase 16: Multi-Industry Starter Pack & 8 Core Departments
- [ ] Pre-configure auto-provisioning for the 8 core operational departments across all industries (Hotels, Manufacturing, Retail, Corporate):
  1. HR (Human Resources)
  2. Finance & Accounting
  3. Customer Service
  4. IT (Information Technology)
  5. Sales & Commercial
  6. Stores & Warehouses
  7. Data Entry & Operations
  8. Compliance & Audit
- [ ] Seed standard industry role mappings and reporting lines.

### Phase 17: Compliance & Audit Governance Engine
- [ ] Implement `ComplianceCertificate` entity:
  - Certificate Name, Standard (ISO 9001, ISO 27001, HACCP, OSHA, Fire Safety, Health/Food License).
  - Issuing authority, Certificate Number, Issue Date, Expiration Date.
  - Status state machine (`Active`, `ExpiringSoon`, `Expired`, `UnderRenewal`).
  - Document attachment/link and renewal alerting.
- [ ] Implement `AuditMeeting` entity:
  - Title, Audit Type (`Internal`, `External`), Scheduled Date & Time, Location/Branch.
  - Lead Auditor (from Compliance Department), Target Department, Checklist, Non-Conformance findings, Corrective Action plans.
- [ ] REST API endpoints under `/api/v1/compliance` and frontend UI view `/app/compliance`.

### Phase 18: Scoped Vacation Approval & Negative Balance Engine
- [ ] Add `VacationDaysAllocated` (default 21) and `VacationDaysUsed` to `EmployeeProfile`.
- [ ] Implement live Vacation Days Balance Counter calculation (`Allocated - Approved Days`).
- [ ] Implement negative number counter behavior:
  - When approved days exceed available balance, count down below 0 into negative numbers (e.g. `-1`, `-2`, `-3`), representing deficit / unpaid vacation balance.
- [ ] Enforce strict managerial scoping:
  - Vacation requests visible strictly to the employee's direct supervisor (`ReportsToEmployeeId` or Department Manager) and executive admins.
  - Only the designated Department Manager has approval/rejection authority for that department.
- [ ] Automated HR Forwarding & Ledger Sync:
  - Every approved vacation request automatically synchronizes with the HR Department roster and flags deficit days for payroll deduction.

### Phase 19: Internal IT Support Helpdesk
- [ ] Extend ticketing to support Internal IT requests:
  - Ticket categories: Hardware/Workstation, Software/Bug, Network/Wi-Fi, Email/Account Access, ERP System.
  - Direct employee submission with automatic IT Department queue routing.
  - Internal resolution comments and SLA tracking.

### Phase 20: Finance Salary Calculation, Excel Payroll Engine & HR Email Dispatch
- [ ] Add compensation contract attributes to `EmployeeProfile` (Base salary, hourly rate, overtime rate, tax/insurance parameters).
- [ ] Implement `PayrollService`:
  - Calculate gross pay, absence deductions, late penalties, and unpaid negative vacation days.
  - Calculate overtime additions and net salary payable.
- [ ] Implement Excel (`.xlsx` / CSV) spreadsheet export engine:
  - Individual itemized employee payslip spreadsheets.
  - Consolidated company payroll master ledger.
- [ ] Implement HR Review Dashboard and `IEmailService`:
  - HR review and approval queue.
  - One-click "Send Payslips via Email" dispatching individual Excel sheets to employees' email addresses.
  - Full audit logging in `AuditLog` table.
