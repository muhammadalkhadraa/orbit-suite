# Orbit Business Suite — Architecture Documentation

## 1. Overview and Architectural Style

**Orbit Business Suite** is an enterprise-grade, multi-tenant Software-as-a-Service (SaaS) business management platform. It provides companies with unified management across organizational hierarchies, employees, tasks, customer relations, support, inventory, manufacturing, HR, and finance.

### Architectural Pattern: Modular Monolith
To maximize maintainability, development velocity, and data integrity while avoiding premature distributed systems complexity, Orbit Business Suite is architected as a **Modular Monolith**:
- **Single deployable unit** for the API and frontend respectively.
- **Strict logical module boundaries** separating domain logic, persistence, and presentation.
- **Shared infrastructure** for cross-cutting concerns: Multi-tenancy, Authentication & Authorization, Auditing, Logging, and Database Transactions.
- **Provider-neutral configuration** deployable on bare-metal VPS, Docker containers, or cloud environments (Azure, AWS, GCP).

---

## 2. High-Level System Architecture

```mermaid
graph TD
    subgraph Client["Frontend Client (Angular Standalone)"]
        UI["UI Layer (Aurora / Glassmorphism)"]
        AuthG["Auth & Tenant Guards"]
        HTTPInter["Tenant & Auth HTTP Interceptors"]
        FeatMod["Feature Components (Lazy Loaded)"]
        CoreSvc["Core Services (Tenant, Session, State)"]
    end

    subgraph Backend["Backend API (ASP.NET Core Web API)"]
        APIEndpoints["API Controllers & Endpoints"]
        Middleware["Tenant Resolution & Auth Middleware"]
        AppLayer["Application Services & Handlers"]
        DomainLayer["Domain Entities & Rules"]
        InfraLayer["EF Core DbContext & Repositories"]
    end

    subgraph Data["Persistence & Storage"]
        DB[(SQL Server / EF Core Migrations)]
        AuditStore[(Audit Log Entries)]
    end

    UI --> FeatMod
    FeatMod --> CoreSvc
    CoreSvc --> HTTPInter
    HTTPInter -->|REST API (JSON + JWT)| Middleware
    Middleware --> APIEndpoints
    APIEndpoints --> AppLayer
    AppLayer --> DomainLayer
    AppLayer --> InfraLayer
    InfraLayer -->|Global Query Filters (TenantId)| DB
    InfraLayer --> AuditStore
```

---

## 3. Frontend Architecture (Angular)

The frontend is built using **Angular** with standalone components, strict TypeScript, Reactive Forms, and SCSS styling implementing the **Dark Aurora & Glassmorphism** design system.

### Directory Structure
```
frontend/
├── src/
│   ├── app/
│   │   ├── core/                  # Singleton services, interceptors, guards, tenant context
│   │   │   ├── auth/              # AuthService, AuthGuard, TokenStorage
│   │   │   ├── tenant/            # TenantContextService, TenantInterceptor
│   │   │   ├── interceptors/      # ErrorInterceptor, JwtInterceptor
│   │   │   └── models/            # Core user, tenant, and API response models
│   │   ├── shared/                # Reusable UI components, directives, pipes
│   │   │   ├── components/        # Button, Card, Dialog, Table, Badge, Input, Loader
│   │   │   └── pipes/             # Date formatting, currency, safe HTML
│   │   ├── layouts/               # High-level layouts
│   │   │   ├── marketing-layout/  # Public aurora marketing shell
│   │   │   └── workspace-layout/  # Authenticated multi-tenant application shell
│   │   ├── features/              # Business domain feature modules (lazy-loaded)
│   │   │   ├── auth/              # Login, Register, Forgot Password
│   │   │   ├── organization/      # Companies, Branches, Departments, Memberships
│   │   │   ├── employees/         # Employee directory, profiles
│   │   │   ├── tasks/             # Task & project management (Phase 6)
│   │   │   ├── crm/               # CRM & sales (Feature boundary)
│   │   │   ├── support/           # Customer support (Feature boundary)
│   │   │   ├── inventory/         # Inventory & purchasing (Feature boundary)
│   │   │   ├── manufacturing/     # Manufacturing & production (Feature boundary)
│   │   │   ├── hr/                # HR & attendance (Feature boundary)
│   │   │   ├── finance/           # Invoicing & accounting (Feature boundary)
│   │   │   ├── reports/           # Business analytics & dashboards (Feature boundary)
│   │   │   └── audit/             # SOC2 Type II audit trail & forensic ledger (Feature boundary)
│   │   ├── styles/                # Global styling, tokens, aurora theme
│   │   │   ├── _variables.scss    # Palette tokens, aurora gradients, glass tokens
│   │   │   ├── _typography.scss   # Font hierarchy, scales
│   │   │   ├── _mixins.scss       # Glassmorphism, animations, responsive breakpoints
│   │   │   └── styles.scss        # Global reset & baseline styles
```

---

## 4. Backend Architecture (ASP.NET Core Web API)

The backend is organized into clean architectural layers adhering to separation of concerns:

```
backend/
├── Orbit.Api/                     # Entry point, Controllers, Middlewares, DI configuration
│   ├── Controllers/               # RESTful endpoints grouped by domain
│   ├── Middleware/                # TenantResolutionMiddleware, GlobalExceptionMiddleware
│   └── Extensions/                # ServiceCollection extensions for DI setup
├── Orbit.Application/             # Use cases, DTOs, Validators, Interfaces
│   ├── Common/                    # Result wrappers, PagedResult, Exceptions
│   ├── Interfaces/                # IApplicationDbContext, ITenantContext, IReportingService, etc.
│   └── Modules/                   # Feature DTOs, Service Contracts & Implementations
│       ├── Auth/                  # Login, Register, Token DTOs & Services
│       ├── Organization/          # Tenant, Branch, Department DTOs & Services
│       ├── Employees/             # Employee profile DTOs & Services
│       ├── Tasks/                 # Task DTOs & Services
│       ├── Crm/                   # Customer & Deal Pipeline Services & DTOs
│       ├── Support/               # Support Ticket & SLA Services & DTOs
│       ├── Inventory/             # Product Catalog & Stock Movement Services & DTOs
│       ├── Invoicing/             # Invoicing & Payment Ledger Services & DTOs
│       ├── Manufacturing/         # Work Order & BOM Services & DTOs
│       ├── Hr/                    # Attendance Clock & Leave Approval Services & DTOs
│       ├── Reporting/             # Executive Intelligence & File Exporter Services & DTOs
│       └── Audit/                 # Audit Trail Log Query Services & DTOs
├── Orbit.Domain/                  # Core domain models, Enums, Entity bases
│   ├── Common/                    # BaseEntity, ITenantScopedEntity, AuditableEntity
│   ├── Entities/                  # Tenant, Branch, Department, TenantMembership, EmployeeProfile,
│   │                              # TaskItem, Customer, Deal, SupportTicket, TicketComment,
│   │                              # Product, ProductInventory, StockMovement, Invoice, InvoiceItem,
│   │                              # PaymentRecord, WorkOrder, BillOfMaterials, BomItem,
│   │                              # LeaveRequest, AttendanceLog, ShiftSchedule, ReportExportHistory, AuditLog
│   ├── Enums/                     # TenantRole, TaskStatus, CustomerStatus, DealStage, TicketStatus,
│   │                              # ProductCategory, StockMovementType, InvoiceStatus, PaymentMethod,
│   │                              # WorkOrderStatus, LeaveType, AttendanceStatus, ReportType, ExportFormat
│   └── Events/                    # Domain events for auditing
├── Orbit.Infrastructure/          # Persistence, EF Core, Identity, External services
│   ├── Persistence/               # OrbitDbContext, EntityConfigurations, Migrations
│   ├── Identity/                  # ApplicationUser, IdentityService
│   ├── Services/                  # TenantContext, CurrentUserService, AuditService
│   └── Seed/                      # Development-only database seeders
└── Orbit.Tests/                   # Automated tests (60/60 passing)
    ├── Security/                  # Cross-tenant isolation & unauthorized access tests
    └── Modules/                   # Unit & integration tests for all 10 domain services
```

---

## 5. Multi-Tenancy Strategy

- **Logical Data Isolation:** A single shared database with a mandatory `TenantId` foreign key column on every tenant-scoped entity (`ITenantScopedEntity`).
- **Server-Side Tenant Resolution:**
  1. The authenticated user submits requests with a bearer token.
  2. The server decodes the identity and verifies active `TenantMembership` records for the user.
  3. The active tenant is derived from the verified user session or requested via an authorized header (`X-Tenant-Id`) that must strictly match one of the user's valid memberships.
  4. If an invalid or unassociated tenant ID is requested, the request is rejected with `403 Forbidden`.
- **Query Filter Defense-in-Depth:**
  - EF Core Global Query Filters (`e => e.TenantId == _tenantContext.CurrentTenantId`) are automatically applied to all entities implementing `ITenantScopedEntity`.
  - Application services explicitly assert `TenantId` on creation and mutation operations.
- **Audit Logging:**
  - Sensitive operations (login, tenant switch, role updates, record modifications) generate immutable `AuditLog` records recording `TenantId`, `UserId`, `Action`, `EntityName`, `EntityId`, and `TimestampUtc`.
