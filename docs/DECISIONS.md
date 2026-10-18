# Orbit Business Suite — Architectural Decision Records (ADRs)

## ADR-001: Tenancy Model — Shared Database with Discriminator (`TenantId`)
- **Status:** Approved
- **Context:** Orbit Business Suite is a multi-tenant business-management SaaS. A choice between shared database (discriminator), database-per-tenant, or schema-per-tenant was required.
- **Decision:** Implement a single shared SQL Server database utilizing a mandatory `TenantId` discriminator column on all tenant-owned entities (`ITenantScopedEntity`). Enforce boundaries automatically at query time using EF Core Global Query Filters and validate active membership via `TenantResolutionMiddleware`.
- **Consequences:**
  - *Positive:* Low hosting overhead, fast provisioning of new tenants, simple migrations.
  - *Mitigations:* Cross-tenant queries are blocked by default. Thorough integration tests guarantee isolation.

---

## ADR-002: Separation of ApplicationUser and EmployeeProfile
- **Status:** Approved
- **Context:** In enterprise organizations, not every employee needs system access or credentials (e.g. factory floor workers, field staff). Conversely, a user may be an external auditor or administrator with a login but not an employee record.
- **Decision:** Separate `ApplicationUser` (ASP.NET Core Identity credential) from `EmployeeProfile` (business/domain entity). Link them via an optional `UserId` foreign key.
- **Consequences:** Avoids cluttering the security store with domain employee metadata and supports employees without logins.

---

## ADR-003: UI Design System — Dark Aurora & Glassmorphism
- **Status:** Approved
- **Context:** Orbit Business Suite requires a modern, professional, high-end visual design that inspires trust without sacrificing operational ergonomics.
- **Decision:** Implement a Dark Aurora and Glassmorphism design system using CSS custom properties (variables), restrained backdrop filters (`backdrop-filter: blur(12px)`), dark slate/navy surfaces, and luminous indigo/violet/cyan accents.
- **Consequences:** Provides a unified look for marketing and dashboard pages while keeping data-heavy workspace screens clean and readable.

---

## ADR-004: Authentication Strategy — JWT Bearer with Membership Verification
- **Status:** Approved
- **Context:** The frontend (Angular SPA) and backend (ASP.NET Core API) communicate over REST.
- **Decision:** Issue signed JWT tokens upon login containing user identity claims (`sub`, `email`). Require the client to provide `X-Tenant-Id` header for tenant-scoped operations, which is verified server-side against the user's active `TenantMembership` records in the database.
- **Consequences:** Completely prevents tenant spoofing; tokens remain compact.

---

## ADR-005: Initial Business Workflow — Task & Project Management
- **Status:** Approved
- **Context:** Phase 6 requires implementing a primary business workflow with confirmed requirements.
- **Decision:** Implement Task Management with confirmed visibility rules:
  1. Employees see their own assigned tasks.
  2. Managers see their direct reports' tasks and department tasks.
  3. Admins/Owners see all tasks within the tenant.
- **Consequences:** Proves out the multi-tenant architecture, role hierarchy, and UI component workflows before expanding into remaining business modules.

---

## ADR-006: CRM Customer & Contact Governance with Role-Scoped Visibility
- **Status:** Approved
- **Context:** The CRM & Sales module requires foundational customer management while preserving sales rep ownership boundaries and data privacy.
- **Decision:** Implement Customer & Contact Directory first with role-scoped visibility:
  1. Sales Representatives (`Employee` role) view and edit only their assigned customer accounts.
  2. Sales Managers (`Manager` role) view accounts assigned to themselves and their direct reports (`ReportsToEmployeeId`).
  3. Administrators and Owners have company-wide account oversight.
  4. Cross-tenant isolation is strictly enforced via EF Core Global Query Filter on `ITenantScopedEntity`.
- **Consequences:** Provides a secure, customer foundation for future sales pipeline and deal tracking workflows without premature speculation on unconfirmed commission or complex approval rules.

---

## ADR-007: CRM Opportunity & Deal Pipeline Governance
- **Status:** Approved
- **Context:** Following customer account governance, revenue management requires tracking opportunities, deal sizes, closing timelines, and probability weighting.
- **Decision:** Implement a 6-stage opportunity pipeline (`Lead`, `Qualified`, `Proposal`, `Negotiation`, `ClosedWon`, `ClosedLost`):
  1. Default win probabilities are calibrated per stage (20%, 40%, 60%, 80%, 100%, 0%).
  2. Transitioning to `ClosedWon` automatically records `ClosedAtUtc` and locks probability to 100%.
  3. Transitioning to `ClosedLost` prompts for a mandatory or optional `LostReason` and sets probability to 0%.
  4. Real-time metrics compute Total Pipeline, Weighted Pipeline, Won Value, and Win Conversion Rate.
  5. Multi-tenant and role-scoped security mirrors Customer governance: Reps see their assigned deals, Managers supervise direct reports, and Admins/Owners oversee company-wide forecasts.
- **Consequences:** Establishes predictable revenue forecasting and interactive Kanban workflows while strictly maintaining data confidentiality and multi-tenant isolation.

---

## ADR-008: Customer Support & Helpdesk Case Governance
- **Status:** Approved
- **Context:** Delivering post-sales service, incident resolution, and maintaining customer trust requires a formal ticketing mechanism linked directly to customer accounts.
- **Decision:** Implement Customer Support & Helpdesk Case Management with role-scoped isolation and threaded discussions:
  1. `SupportTicket` links to `Customer`, `AssignedEmployee`, and `CreatedByEmployee` with sequential `TicketNumber` per tenant (`TCK-1001`).
  2. `TicketComment` provides case conversation history, featuring an `IsInternal` flag to prevent internal diagnostic notes from leaking to external parties.
  3. Status lifecycle (`Open`, `Pending`, `Resolved`, `Closed`) with automated resolution timestamping and root-cause summary capture.
  4. Role scoping ensures support reps view tickets assigned to/created by them, managers oversee team tickets, and administrators possess company-wide triage oversight.
- **Consequences:** Unifies customer communications, ensures SLA accountability, and maintains strict cross-tenant data isolation.

---

## ADR-009: Multi-Location Warehouse Inventory & Immutable Stock Ledger
- **Status:** Approved
- **Context:** Enterprise businesses maintain inventory distributed across multiple branches, warehouses, and fulfillment hubs. Raw on-hand counts must be auditable, resistant to untracked manual edits, and protected against negative inventory conditions.
- **Decision:** Implement a two-tiered architecture combining branch-level stock allocation with an immutable ledger:
  1. `Product` serves as the catalog master entity with tenant-unique `Sku`, pricing parameters (`UnitPrice`, `UnitCost`), and minimum `ReorderLevel`.
  2. `ProductInventory` captures localized warehouse allocation (`BranchId`, `QuantityOnHand`, `QuantityReserved`, `AisleBinLocation`).
  3. `StockMovement` records an append-only, immutable audit trail for every mutation (`Receipt`, `AdjustmentIn`, `AdjustmentOut`, `Transfer`, `SaleShipment`, `Scrap`).
  4. Inter-branch transfers are executed as atomic balance shifts between source and destination inventories while writing a linked transfer ledger record.
  5. Outbound adjustments and transfers guard against insufficient stock to protect ledger integrity.
  6. Catalog administration (`Create`, `Update`, `Deactivate`) is restricted to Owners, Admins, and Managers; Operators can execute verified stock adjustments and intake receipts.
- **Consequences:** Eliminates phantom inventory discrepancies, provides real-time multi-location valuation, and guarantees complete audit traceability for compliance and accounting.

---

## ADR-010: Accounts Receivable, Billing Lifecycle & Cash Receipts Ledger
- **Status:** Approved
- **Context:** Delivering end-to-end business operations requires billing customers for products and services, recording payment receipts, and tracking outstanding accounts receivable. Financial records demand immutable auditability, overpayment protection, sequential human-readable numbering, and strict authority controls.
- **Decision:** Implement Invoicing & Financial Accounting with sequential numbering, balance enforcement, and immutable payment records:
  1. `Invoice` represents the client billing statement with sequential tenant numbering (`INV-YYYY-XXXX`), currency, tax calculations, discounts, and payment balance tracking (`AmountPaid`, `BalanceDue`).
  2. `InvoiceItem` defines individual line items with quantity, unit price, tax amount, line total, and optional foreign key association to catalog `Product`.
  3. `PaymentRecord` forms an append-only cash receipts ledger with sequential tenant numbering (`PAY-YYYY-XXXX`), payment method (`BankTransfer`, `CreditCard`, `Check`, `Cash`, `Electronic`), reference number, and audit logging.
  4. Automated balance invariants: each payment automatically increments `AmountPaid` and decrements `BalanceDue`; when `BalanceDue == 0`, status transitions to `Paid`; when `AmountPaid > 0`, status becomes `PartiallyPaid`. Payments exceeding `BalanceDue` are rejected.
  5. Audit preservation: non-draft invoices cannot be deleted; they must be formally voided (`VoidInvoice`) with reversal rationale to maintain auditable general ledger integrity.
  6. Financial authority separation: Employees have read-only visibility into invoice status for accounts they manage; Managers, Admins, and Owners possess billing and payment recording authority.
- **Consequences:** Provides enterprise-grade Accounts Receivable control, prevents financial data tampering or leakage across tenants, and seamlessly integrates CRM deals and inventory catalog products into cash realization.

---

## ADR-011: Manufacturing Work Orders, BOM Recipes & Production Yield Governance
- **Status:** Approved
- **Context:** Industrial and product enterprises manufacture physical goods from raw materials and sub-components. Production runs demand recipe formulation (BOM), plant branch scheduling, lead operator assignment, progress monitoring, and seamless inventory crediting upon assembly completion.
- **Decision:** Implement Manufacturing & Work Orders with BOM recipes, lifecycle status transitions, and automatic stock yields:
  1. `BillOfMaterials` defines recipe formulations (`BOM-XXXX`) for finished goods with versioning and active status flags.
  2. `BomItem` specifies required sub-components, raw materials, quantities, and units of measure.
  3. `WorkOrder` represents production runs (`WO-YYYY-XXXX`) tied to target products, plant branches, and assigned lead engineers.
  4. Status transitions enforce invariants: `Draft` -> `Planned` -> `InProgress` (sets start timestamp) -> `Completed` (sets completion timestamp, yields finished products into branch inventory via `StockMovement`, and prevents cancellation).
  5. Non-draft work orders cannot be hard-deleted; draft deletion is permitted.
  6. Role authority enables operators to view assigned/plant orders and report produced quantities; administrators and managers plan, schedule, and manage BOM recipes.
- **Consequences:** Closes the operational loop between procurement, inventory, and sales, ensuring real-time finished goods availability and physical trace auditability.

---

## ADR-012: HR & Attendance Management, Digital Time Clock & Multi-Tier Leave Approval
- **Status:** Approved
- **Context:** Managing enterprise human capital requires tracking employee attendance, supporting digital check-in/out, managing shift rotas, and handling leave requests. Time and leave operations demand privacy preservation, hierarchical supervisory approval, sequential human-readable numbering, and segregation of duties.
- **Decision:** Implement HR & Attendance with digital time tracking, multi-tier approvals, and role-scoped confidentiality:
  1. `LeaveRequest` represents time-off requests with sequential tenant numbering (`LR-YYYY-XXXX`), leave classification (`Annual`, `Sick`, `Unpaid`, `MaternityPaternity`, `Bereavement`, `Compensatory`), duration calculations, and reason notes.
  2. `AttendanceLog` records daily work time (`Date`, `CheckInTimeUtc`, `CheckOutTimeUtc`, `TotalHours`, `WorkLocation`, `Status`) preventing duplicate check-in on the same day.
  3. `ShiftSchedule` defines recurring employee work rotas with active validity windows.
  4. Multi-tier approval governance: Employees submit and view their own requests; Managers approve or reject requests for their direct reports (`ReportsToEmployeeId`), with self-approval explicitly forbidden; Admins and Owners possess tenant-wide approval and manual attendance adjustment authority.
  5. Privacy safeguards: Non-managerial peers cannot view other employees' leave reasons or attendance histories.
- **Consequences:** Provides comprehensive workforce governance, honors jurisdictional neutrality by separating abstract leave classification from hard-coded statutory tax calculations, and enforces bulletproof tenant data isolation.

---

## ADR-013: Executive Analytics Aggregation Architecture and Cross-Domain File Export Engine
- **Status:** Approved
- **Context:** Enterprise decision-makers and C-suite executives require a unified, cross-domain operational intelligence dashboard consolidating Financial AR, Sales Pipeline, Support SLA, Inventory Valuation, Manufacturing Yield, and Workforce Attendance without opening separate operational silos. Additionally, compliance auditors and analysts demand portable data exports in standard CSV and JSON formats with full tenant audit traceability.
- **Decision:** Implement cross-domain analytical querying via `IReportingService` paired with an auditable export engine:
  1. **Executive Dashboard Aggregation:** Query-level projection directly across `Invoices`, `Payments`, `Deals`, `SupportTickets`, `Products`, `ProductInventories`, `WorkOrders`, `Employees`, `AttendanceLogs`, and `LeaveRequests`. By leveraging EF Core Global Query Filters (`ITenantScopedEntity`), tenant boundary isolation is automatically enforced without risk of cross-tenant data leakage.
  2. **Trend & Velocity Computations:** Dynamically aggregate historical monthly billing & collection totals over a 6-month sliding window, stage-by-stage sales funnel conversion rates, department resource allocations, and inventory asset distributions.
  3. **Streaming Dynamic Export Engine:** Generate on-demand CSV (RFC 4180 compliant with header sanitization) and JSON datasets streamed directly into byte payloads (`text/csv`, `application/json`), avoiding server-side scratch file creation and disk leaks.
  4. **Immutable Export Audit Ledger:** Record every export invocation in `ReportExportHistory` (`ReportType`, `Format`, `RecordCount`, `FileSizeKb`, `ParametersJson`, `GeneratedByUserId`, `CreatedAtUtc`) to preserve data governance and forensic accountability.
  5. **Security & Access Control:** Limit executive intelligence and raw export generation to `Owner`, `Admin`, and `Manager` tenant roles.
- **Consequences:** Delivers instant, high-performance operational intelligence across all business functions with zero data leakage risk, eliminates the need for expensive third-party BI licensing, and maintains strict SOC2/ISO audit compliance for data extractions.

---

## ADR-014: SOC2 Type II Audit Trail & Forensic Security Ledger
- **Status:** Approved
- **Context:** Enterprise security standards and SOC2 Type II compliance mandate that all modifications to identity, sensitive records, and administrative authorizations be captured in a tamper-resistant, queryable chronological audit trail.
- **Decision:** Implement dedicated tenant-scoped forensic logging:
  1. `AuditLog` records actor identification (`UserId`, `UserEmail`), network origin (`IpAddress`), chronological timestamp (`TimestampUtc`), operation (`Action`), target (`EntityName`, `EntityId`), and structured data (`DetailsJson`).
  2. Implement `IAuditService.GetLogsAsync` supporting multi-dimensional filtering by search term, target entity type, action classification, and date range with efficient pagination.
  3. Expose `AuditController` (`GET /api/v1/audit`) strictly gated behind `Owner`, `Admin`, and `Manager` tenant authorizations.
  4. Build a dedicated Dark Aurora `AuditComponent` with real-time KPI metrics, search/filter controls, and a formatted raw JSON payload inspection drawer.
- **Consequences:** Provides immutable forensic accountability, enables swift investigation of operational anomalies, and satisfies regulatory compliance standards without performance degradation.

---

## ADR-015: Containerization, Zero-Config Local Orchestration & CI/CD Gateways
- **Status:** Approved
- **Context:** Delivering a cloud-native SaaS requires reproducible builds, rapid onboarding, zero-configuration local development, and continuous verification in automated delivery pipelines.
- **Decision:** Containerize both tiers with Docker and automate CI gates:
  1. **Backend:** Multi-stage `Dockerfile` with .NET 10 SDK build stage that executes tests as a compilation gate, followed by ASP.NET Core runtime image.
  2. **Frontend:** Multi-stage `Dockerfile` with Node 22 build environment producing optimized static Angular 19 bundles served via Nginx Alpine with custom reverse-proxy routing and security headers.
  3. **Docker Compose:** Root `docker-compose.yml` orchestrating API (`5115:8080`) and Web Portal (`4200:80`) with persistent volume mappings.
  4. **Continuous Integration:** GitHub Actions workflow (`.github/workflows/ci.yml`) executing all unit tests and Angular production bundle verification on every push and pull request.
- **Consequences:** Eliminates environment discrepancies between development and production, enables one-command stack launches (`docker compose up --build`), and prevents broken code from merging.





