# Orbit Business Suite — Requirements and Specifications

## 1. Scope and Core Purpose

Orbit Business Suite is a multi-tenant business-management SaaS platform enabling diverse companies to manage their end-to-end operations through a single unified system.

---

## 2. Confirmed Requirements

### 2.1 Multi-Tenancy and Data Isolation
- **Logical Isolation:** Multiple independent companies (tenants) are served from a single application instance and database.
- **Zero Cross-Tenant Leakage:** A tenant must never view, query, update, delete, or aggregate another tenant's records.
- **Server-Derived Context:** Tenant context must be derived and verified on the server from the authenticated user's active membership. A client-provided tenant identifier must never be trusted without cryptographic or database membership verification.
- **Defense in Depth:** Enforce tenant isolation via EF Core Global Query Filters (`TenantId`), explicit repository/service guards, and integration test coverage.

### 2.2 Identity and Organization Model
- **Tenants (Companies):** Independent organizations with distinct configurations and datasets.
- **Branches:** Physical or logical operating locations belonging to a tenant.
- **Departments:** Functional divisions within a tenant.
- **Users:** Authentication identities (credentials, email, password hash) managed via ASP.NET Core Identity.
- **Tenant Memberships:** Link users to tenants with tenant-scoped roles (`Owner`, `Admin`, `Manager`, `Employee`) and status (`Active`, `Invited`, `Suspended`).
- **Employee Profiles:** Domain entity representing organizational/employment records (job title, employee code, branch, department, manager). **Crucial Rule:** Separation of `User` and `EmployeeProfile` — not all employees have login accounts, and user identity is decoupled from employment record.

### 2.3 Roles and Permission Model
- **Roles:**
  - `Owner`: Full administrative, billing, and organizational authority over the company.
  - `Admin`: Operational administration, user management, and module configuration.
  - `Manager`: Team-level oversight, task assignment, and department operations.
  - `Employee`: Standard business user executing assigned work.
- **Task Visibility (Confirmed Baseline):**
  - Employees can view their own tasks.
  - Managers can view their team's tasks.
  - Direct access to tasks outside of verified ownership/team scope is forbidden.

### 2.5 CRM Customer & Contact Governance (Confirmed & Implemented)
- **Scope:** Customer accounts, contacts, lifecycle statuses (`Lead`, `Prospect`, `ActiveCustomer`, `Inactive`), assigned sales representatives, and relationship notes.
- **Role-Scoped Visibility:**
  - Sales Representatives (Employees) strictly see only their assigned accounts.
  - Managers see accounts assigned to themselves and their direct reports.
  - Administrators & Owners possess tenant-wide account oversight.
  - Deletion is restricted to Managers, Admins, and Owners.
- **Tenant Isolation:** Enforced via EF Core Global Query Filter on `Customer` (`ITenantScopedEntity`) and `OrbitDbContext` change tracker tamper-prevention.

### 2.6 CRM Opportunity & Deal Pipeline Governance (Confirmed & Implemented)
- **Scope:** Sales opportunities (`Deal`), value tracking, stage progressions (`Lead`, `Qualified`, `Proposal`, `Negotiation`, `ClosedWon`, `ClosedLost`), stage confidence probabilities, expected close dates, lost reason records, and pipeline forecasting metrics.
- **Role-Scoped Visibility:**
  - Sales Representatives (`Employee` role) view and manage solely deals assigned to them.
  - Sales Managers (`Manager` role) view and manage deals assigned to themselves and their direct reports (`ReportsToEmployeeId`).
  - Company Owners and Administrators possess full tenant-wide deal visibility and forecasting oversight.
  - Deletion is restricted to Managers, Admins, and Owners.
- **Automated Lifecycle Transitions:**
  - `ClosedWon` transitions automatically lock probability to 100%, record timestamped `ClosedAtUtc`, and clear lost reason.
  - `ClosedLost` transitions automatically lock probability to 0%, record timestamped `ClosedAtUtc`, and record `LostReason`.
  - Reopening deals clears closed timestamp and lost reason.
- **Real-Time Forecasting Metrics:** Total Open Pipeline Value, Weighted Forecast Value (probability adjusted), Closed Won Revenue, Closed Lost Value, and Win Conversion Rate (%).

### 2.7 Customer Support & Helpdesk Governance (Confirmed & Implemented)
- **Scope:** Support tickets (`SupportTicket`), sequential ticket numbering per tenant (`TCK-1001`), customer account links, priorities (`Low`, `Medium`, `High`, `Urgent`), categories (`Technical`, `Billing`, `Product`, `Account`, `General`), incident discussion timeline (`TicketComment`), and resolution summaries.
- **Role-Scoped Visibility:**
  - Support Representatives (`Employee` role) view tickets assigned to them or created by them.
  - Support Managers (`Manager` role) view tickets assigned to themselves, created by them, or assigned to their direct reports (`ReportsToEmployeeId`).
  - Company Owners and Administrators possess complete tenant-wide ticket and SLA queue oversight.
  - Deletion is restricted to Managers, Admins, and Owners.
- **Internal vs. Client Notes:**
  - Comments support an `IsInternal` boolean flag enabling internal engineering/support collaboration notes without exposing them to external client visibility.
- **Lifecycle & SLA Tracking:**
  - Marking `Resolved` records timestamped `ResolvedAtUtc` and resolution summary.
  - Closing records `ClosedAtUtc`.
  - Reopening resets resolution timestamps.
- **SLA Metrics:** Real-time counts of Open, Pending, Resolved, Closed, Urgent (SLA Critical) tickets, and Resolution Rate (%).

### 2.8 Inventory & Product Catalog Governance (Confirmed & Implemented)
- **Scope:** Product catalog items (`Product`), SKU identifiers unique per tenant, product categories (`Hardware`, `Software`, `Electronics`, `RawMaterials`, `Components`, `FinishedGoods`, `Services`), pricing book (selling price, unit cost, gross margin), and minimum reorder alert levels.
- **Multi-Location Inventory (`ProductInventory`):**
  - Tracks physical on-hand quantity (`QuantityOnHand`), reserved allocations (`QuantityReserved`), and available quantity per warehouse branch (`Branch`).
  - Storage coordinates support aisle, shelf, and bin tracking (`AisleBinLocation`).
- **Immutable Stock Movement Ledger (`StockMovement`):**
  - All stock adjustments, supplier intake receipts, inter-branch warehouse transfers, order fulfillment shipments, and scrap write-offs are recorded as append-only ledger entries.
  - Inter-branch transfers atomically deduct units from the source warehouse location and credit the destination warehouse location while writing a comprehensive movement audit trail.
  - Prevents negative stock on hand for outbound adjustments and shipments.
- **Role-Scoped Authority:**
  - Logistics Operators (`Employee` role) view catalog availability and record physical count receipts and adjustments.
  - Operations Managers (`Manager` role) oversee branch inventory, stock adjustments, and valuation reports.
  - Company Owners and Administrators possess full catalog authority (SKU creation, price book updates, cross-branch transfers, write-offs).
- **Inventory Valuation Metrics:** Real-time computation of Total Inventory Valuation (sum of `QuantityOnHand * UnitCost`), Active Catalog SKUs, Total Units on Hand, and Reorder Point Alerts (Low Stock / Out of Stock).

### 2.9 Invoicing & Financial Accounting Governance (Confirmed & Implemented)
- **Scope:** Customer invoices (`Invoice`), line items (`InvoiceItem`), immutable cash receipt payment records (`PaymentRecord`), automated sequential tenant numbering (`INV-YYYY-XXXX` and `PAY-YYYY-XXXX`), tax rates, discounts, due dates, balance calculations, and accounts receivable tracking.
- **Automated Lifecycle Transitions & Invariant Guardrails:**
  - Statuses: `Draft` -> `Issued` -> `PartiallyPaid` -> `Paid` / `Overdue` / `Void`.
  - Non-draft invoices cannot be deleted; they must be formally voided (`VoidInvoice`) with reversal reason to maintain auditable financial integrity.
  - Line items automatically compute `Quantity * UnitPrice` minus prorated discounts plus line tax amounts, feeding the invoice `SubTotal`, `TaxAmount`, and `TotalAmount`.
  - Overpayment prevention: recording a payment exceeding `BalanceDue` is strictly rejected by the domain service (`InvalidOperationException`).
  - Automated balance updates: each recorded payment decrements `BalanceDue` and increments `AmountPaid`; if `BalanceDue == 0`, status automatically transitions to `Paid`; otherwise if `AmountPaid > 0`, status becomes `PartiallyPaid`.
  - Overdue detection: unpaid or partially-paid invoices past `DueDateUtc` are dynamically flagged as overdue.
- **Role-Scoped Authority:**
  - Employees have read-only visibility into client billing status for accounts they collaborate on.
  - Finance Managers (`Manager` role), Administrators (`Admin`), and Company Owners (`Owner`) possess billing creation, issuance, payment recording, and voiding authority.
- **Financial AR Metrics:** Real-time computation of Total Invoiced, Total Collected, Outstanding Accounts Receivable (AR), Overdue Receivables, Collection Rate (%), and Active Draft Count.

### 2.10 Manufacturing & Production Governance (Confirmed & Implemented)
- **Scope:** Bill of Materials (`BillOfMaterials`, `BomItem`), Work Orders (`WorkOrder`), sequential numbering (`WO-YYYY-XXXX` and `BOM-XXXX`), plant facility routing (`Branch`), finished good yield into inventory, and production metrics.
- **Automated Lifecycle Transitions & Invariant Guardrails:**
  - Statuses: `Draft` -> `Planned` -> `InProgress` -> `Completed` -> `Cancelled`.
  - Non-draft work orders cannot be hard-deleted (must be cancelled).
  - Completed work orders cannot be cancelled or transitioned back to earlier statuses.
  - Advancing to `InProgress` automatically records `StartDateUtc`.
  - Marking `Completed` records `CompletedDateUtc` and atomically credits the produced finished goods to the plant's `ProductInventory` while recording an immutable `StockMovement` (Type = `Receipt`) with order reference.
- **Role-Scoped Authority:**
  - Production Technicians (`Employee` role) view assigned work orders or facility work orders, update progress, and log produced units.
  - Plant Managers (`Manager` role), Administrators (`Admin`), and Company Owners (`Owner`) possess work order scheduling, planning, BOM formulation, and cancellation authority.
- **Manufacturing KPI Metrics:** Real-time computation of Total Work Orders, Draft, Planned, In-Progress, Completed, Cancelled counts, Total Target Units, Total Produced Units, and Run Completion Rate (%).

### 2.11 HR & Attendance Governance (Confirmed & Implemented)
- **Scope:** Leave requests (`LeaveRequest`), sequential tenant numbering (`LR-YYYY-XXXX`), leave types (`Annual`, `Sick`, `Unpaid`, `MaternityPaternity`, `Bereavement`, `Compensatory`), daily attendance logs (`AttendanceLog`), digital time clock check-in/out, work locations, shift schedules (`ShiftSchedule`), and managerial review hierarchies.
- **Role-Scoped Visibility & Approvals:**
  - Employees view and cancel only their own leave requests, view their personal attendance history, and clock in/out.
  - Managers view attendance and review/approve/reject leave requests for themselves and their direct reports (`ReportsToEmployeeId`). To preserve segregation of duties, self-approval is forbidden (`ForbiddenAccessException`).
  - Company Owners and Administrators possess full tenant-wide HR oversight, manual attendance adjustments, and shift rota assignment.
- **Digital Time Clock & Invariant Guardrails:**
  - Check-in records timestamped UTC time, status (`Present`), and selected work location.
  - Prevent duplicate check-in on the same day (`InvalidOperationException`).
  - Check-out records timestamped UTC time and automatically computes total hours worked rounded to two decimals.
  - Leave dates are validated: end date must not precede start date.
- **Real-Time HR Metrics:** Total Active Personnel, Present Today (count and attendance rate %), On Leave Today, Late / Irregularities, Pending Leave Requests, and Approved Leave Days Month-to-Date.

### 2.12 Reports & Executive Analytics Governance (Confirmed & Implemented)
- **Scope:** Cross-domain executive business intelligence, unified KPI summary matrix across all 6 business operational units (Financial AR, Sales Pipeline, Support SLA, Inventory Valuation, Manufacturing Yield, Workforce Attendance), historical 6-month financial trajectory charts, sales conversion velocity funnels, department headcount allocation, warehouse inventory distribution, dynamic CSV & JSON file export engine, and export history audit logging.
- **Cross-Domain Analytical Aggregation:**
  - Aggregations are projected directly across domain DB sets, completely inheriting EF Core Global Query Filters (`ITenantScopedEntity`) to ensure zero possibility of cross-tenant leakage.
  - Sliding 6-month window aggregates compute monthly billed invoices and cash payment collections.
  - Sales funnel conversion metrics calculate progression rates across all 6 opportunity lifecycle stages.
- **Dynamic File Export Engine & Audit Accountability:**
  - Generates RFC 4180-compliant CSV and structured JSON files on-demand for financial summaries, sales deals, inventory valuation, support SLA, and workforce attendance.
  - Streams byte payloads directly over HTTP responses (`text/csv`, `application/json`), avoiding temporary disk file storage.
  - Every export operation is permanently recorded in `ReportExportHistory` (`ReportType`, `Format`, `RecordCount`, `FileSizeKb`, `ParametersJson`, `GeneratedByUserId`, `CreatedAtUtc`).
- **Role-Scoped Authority:**
  - Executive intelligence queries and raw file export operations are restricted to `Owner`, `Admin`, and `Manager` tenant roles.

---

## 3. Decisions Requiring Confirmation Before Detailed Domain Work

To avoid fabricating business logic, the following decisions are documented as requiring confirmation before locking down their respective modules:

| Decision | Why It Matters | Current Baseline / Proposal | Status |
|---|---|---|---|
| **Branch & Department Hierarchy** | Determines whether departments belong to branches or are company-wide | Departments belong directly to Company, optionally assigned to Branches | Pending Confirmation |
| **Manager Team Reporting Model** | Governs which tasks a manager can see | An employee has a `ReportsToEmployeeId` or is in the manager's department | Confirmed & Implemented |
| **CRM Customer Scoping Model** | Governs visibility of CRM accounts | Role-scoped (Rep sees assigned, Manager sees direct reports, Owner sees all) | Confirmed & Implemented |
| **CRM Deal Pipeline Stages** | Governs stage progression and win probability | Lead (20%) -> Qualified (40%) -> Proposal (60%) -> Negotiation (80%) -> Closed Won (100%) / Closed Lost (0%) | Confirmed & Implemented |
| **Multi-Location Inventory & Stock Ledger** | Governs warehouse branch allocation and movement audit trail | Branch-scoped inventory with immutable movement ledger | Confirmed & Implemented |
| **Invoicing Lifecycle & Payment Ledger** | Governs sequential numbering, overpayment prevention, and balance tracking | Strict double-precision accounting, immutable payment ledger, voiding instead of hard deletion | Confirmed & Implemented |
| **Manufacturing Work Orders & BOM** | Governs recipe formulations, plant routing, and inventory completion yield | Multi-branch routing with atomic stock yield and immutable movement ledger | Confirmed & Implemented |
| **HR Shift & Attendance Rules** | Time tracking, leave approval, and shift rotas | Multi-tier reporting hierarchy with digital clock and sequential numbering | Confirmed & Implemented |
| **Reports Cross-Domain Aggregation** | Executive insights across modules | Query-level aggregation inheriting EF global query filters | Confirmed & Implemented |

---

## 4. Phase-by-Phase Acceptance Criteria

### Phase 1: Repository Assessment & Planning
- [x] Full inspection of repository structure and tooling versions.
- [x] Core documentation suite created (`README.md`, `ARCHITECTURE.md`, `REQUIREMENTS.md`, `DATA-MODEL.md`, `SECURITY.md`, `API-CONVENTIONS.md`, `DECISIONS.md`, `IMPLEMENTATION-PLAN.md`, `DEPLOYMENT.md`).

### Phase 2: Technical Foundation
- [x] Backend .NET solution and projects configured with clean architecture.
- [x] Frontend Angular application configured with standalone components and SCSS design tokens.
- [x] Automated tests runnable via CLI.

### Phase 3: Tenant & Identity Foundation
- [x] ASP.NET Core Identity authentication with secure password hashing.
- [x] Multi-tenant data model with EF Core migrations.
- [x] `TenantResolutionMiddleware` and `ITenantContext`.
- [x] Global query filters enforcing tenant scoping.
- [x] Automated security integration tests verifying cross-tenant isolation.

### Phase 4: Authenticated Application Shell
- [x] Responsive aurora/glassmorphism application shell.
- [x] Active company switcher & user profile menu.
- [x] Role-aware sidebar navigation.
- [x] Loading, empty, and permission-denied states.

### Phase 5: Organization & Employee Management
- [x] Company, Branch, Department CRUD.
- [x] Employee Profile directory with department and manager associations.
- [x] User invitation & TenantMembership role assignment.

### Phase 6: Tasks & Projects Module
- [x] Task creation, editing, status transitions (`Todo`, `InProgress`, `InReview`, `Done`).
- [x] Priority levels (`Low`, `Medium`, `High`, `Urgent`).
- [x] Scoped task visibility: Employees see own tasks; Managers see team tasks; Admins/Owners see tenant tasks.
- [x] Security tests validating task isolation.

### Phase 7: CRM & Sales Pipeline Module
- [x] Customer accounts directory with industry, phone, email, website, and annual revenue.
- [x] Visual Kanban Deal pipeline with 5 stages (Lead, Qualified, Proposal, Negotiation, ClosedWon, ClosedLost).
- [x] Win/loss conversion calculations, weighted forecast value, and role-scoped permissions.
- [x] Automated tests verifying CRM isolation and deal transitions.

### Phase 8: Customer Support & Helpdesk Module
- [x] Support tickets with sequential numbering (`TCK-1001`), priorities, categories, and SLA metrics.
- [x] Ticket discussion thread supporting internal staff notes (`IsInternal`).
- [x] Resolution summaries, automated timestamps, and role-scoped ticket assignment queues.
- [x] Automated tests verifying support isolation and SLA transitions.

### Phase 9: Multi-Location Inventory & Stock Ledger Module
- [x] Product catalog with unique tenant SKUs, cost/selling price margin tracking, and reorder points.
- [x] Multi-branch warehouse physical inventory tracking (`ProductInventory`).
- [x] Immutable stock movement ledger (`StockMovement`) recording intake, adjustments, transfers, and fulfillments.
- [x] Atomic inter-branch transfers and inventory valuation metrics.
- [x] Automated tests verifying stock movements and warehouse isolation.

### Phase 10: Invoicing & Financial Accounting Module
- [x] Customer billing invoices with sequential numbering (`INV-YYYY-XXXX`) and line item catalog links.
- [x] Immutable payment receipts ledger (`PAY-YYYY-XXXX`) with overpayment rejection guardrails.
- [x] Automated balance computation, overdue tracking, and formal audit voiding.
- [x] Real-time Accounts Receivable (AR) metrics and Dark Aurora glassmorphism UI.
- [x] 38 passing backend tests and 0 compilation errors on frontend.

### Phase 11: Manufacturing & Production Module
- [x] Bill of Materials (BOM) with sequential numbering (`BOM-XXXX`) and multi-component line item formulation.
- [x] Work Orders with sequential numbering (`WO-YYYY-XXXX`), plant branch routing, lead engineer assignment, and target unit quotas.
- [x] Status state machine (`Draft` -> `Planned` -> `InProgress` -> `Completed` / `Cancelled`) with automated timestamps.
- [x] Atomic inventory integration: completing an order atomically credits branch inventory on-hand units and creates an immutable `StockMovement` receipt.
- [x] Full Dark Aurora UI with tabbed queue, BOM catalog, facility stats, modals, and route `/app/manufacturing`.
- [x] 45 passing backend tests and 0 compilation errors on frontend.

### Phase 12: HR & Attendance Module
- [x] Leave Requests with sequential tenant numbering (`LR-YYYY-XXXX`), leave types, duration calculations, and reason notes.
- [x] Multi-tier managerial approval workflow based on `ReportsToEmployeeId` reporting tree with self-approval guardrails.
- [x] Digital time clock for employee self-service check-in/out with location selection and total hours worked calculation.
- [x] Shift schedule planning and daily attendance roster tracking.
- [x] Real-time HR KPI metrics (Workforce, Present Today %, On Leave Today, Late Today, Pending Approvals, MTD Approved Days).
- [x] Full Dark Aurora UI with digital clock card, 3-tab operational workspace, interactive action modals, and route `/app/hr`.
- [x] 53 passing backend tests and 0 compilation errors on frontend.

### Phase 13: Reports & Executive Analytics Dashboard
- [x] Executive Dashboard cross-domain metrics (`Financial`, `Sales`, `Support`, `Inventory`, `Manufacturing`, `Workforce`).
- [x] 6-month historical billing & collection trajectory trends with cash collection conversion metrics.
- [x] Sales pipeline stage-by-stage velocity funnel with win rate and conversion percentages.
- [x] Department workforce distribution and inventory valuation breakdown tracks.
- [x] Dynamic on-demand CSV & JSON file export streaming engine with RFC 4180 compliance.
- [x] Append-only `ReportExportHistory` audit ledger tracking file names, record counts, file sizes, and user audit trails.
- [x] Full Dark Aurora UI with 6-domain KPI matrix, 7-tab operational workspace, interactive SVG charts, direct browser file download, and export history ledger.
- [x] 57 passing backend tests (100% pass rate) and 0 compilation errors or warnings on frontend production build.

