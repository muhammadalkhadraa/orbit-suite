# Orbit Business Suite — API Conventions & Error Standards

## 1. RESTful URL Conventions

All endpoints follow consistent RESTful conventions:
- Base path: `/api/v1`
- Plural nouns for resource collections: `/api/v1/tenants`, `/api/v1/employees`, `/api/v1/tasks`
- Sub-resources: `/api/v1/tenants/{tenantId}/memberships`
- Tenant-scoped resources: Derived from verified active tenant header `X-Tenant-Id: <Guid>`.

### Common HTTP Methods
- `GET`: Retrieve resource or collection. Safe and idempotent.
- `POST`: Create a new resource or execute an operational action (e.g. `/api/v1/tasks/{id}/assign`).
- `PUT`: Full update of an existing resource.
- `PATCH`: Partial update of specified fields.
- `DELETE`: Remove or soft-delete a resource.

---

## 2. Standard Request & Response Payloads

### 2.1 Unified Response Wrapper: `ApiResponse<T>`
```json
{
  "success": true,
  "data": { ... },
  "message": "Resource retrieved successfully",
  "errors": null
}
```

### 2.2 Paginated Collection Wrapper: `PagedResponse<T>`
```json
{
  "success": true,
  "data": [ ... ],
  "pageNumber": 1,
  "pageSize": 20,
  "totalCount": 142,
  "totalPages": 8,
  "hasPreviousPage": false,
  "hasNextPage": true
}
```

### 2.3 RFC 7807 Problem Details for Errors
Errors return HTTP 4xx or 5xx with standard problem details:
```json
{
  "type": "https://orbit.business/errors/validation-error",
  "title": "One or more validation errors occurred.",
  "status": 400,
  "detail": "Please refer to the errors property for details.",
  "instance": "/api/v1/tasks",
  "traceId": "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-00",
  "errors": {
    "Title": ["The Title field is required."],
    "Priority": ["Invalid task priority specified."]
  }
}
```

---

## 3. Standard HTTP Status Codes

- `200 OK`: Successful retrieval or synchronous update.
- `201 Created`: Resource successfully created (includes `Location` header).
- `204 No Content`: Successful action with no return payload.
- `400 Bad Request`: Client validation failure or malformed payload.
- `401 Unauthorized`: Missing or invalid authentication token.
- `403 Forbidden`: Authenticated user does not have permission or is not a member of the requested tenant.
- `404 Not Found`: Resource does not exist or belongs to another tenant.
- `409 Conflict`: Conflict state (e.g. duplicate email, unique constraint violation, concurrency conflict).
- `500 Internal Server Error`: Centralized unhandled exception with structured log correlation.

---

## 4. Operational Endpoint Catalogue

All endpoints require `Authorization: Bearer <JWT>` and `X-Tenant-Id: <Guid>` (except public auth endpoints).

| Module | Route Pattern | Methods | Description |
|---|---|---|---|
| **Auth** | `/api/v1/auth/register` | `POST` | User registration & initial tenant setup |
| | `/api/v1/auth/login` | `POST` | User authentication & JWT issuance |
| | `/api/v1/auth/switch-tenant` | `POST` | Switch active tenant context |
| | `/api/v1/auth/context` | `GET` | Retrieve authenticated profile & memberships |
| **Organization** | `/api/v1/organization/company` | `GET`, `PUT` | Company profile management |
| | `/api/v1/organization/branches` | `GET`, `POST`, `PUT`, `DELETE` | Branch facility management |
| | `/api/v1/organization/departments` | `GET`, `POST`, `PUT`, `DELETE` | Department hierarchy management |
| **Employees** | `/api/v1/employees` | `GET`, `POST`, `PUT`, `DELETE` | Employee directory & supervisor linking |
| **Tasks** | `/api/v1/tasks` | `GET`, `POST`, `PUT`, `DELETE` | Task CRUD & role-scoped Kanban |
| | `/api/v1/tasks/{id}/status` | `PATCH` | Kanban lane transition |
| **CRM & Sales** | `/api/v1/crm/customers` | `GET`, `POST`, `PUT`, `DELETE` | Customer account directory |
| | `/api/v1/crm/deals` | `GET`, `POST`, `PUT`, `DELETE` | Opportunity pipeline CRUD |
| | `/api/v1/crm/deals/{id}/stage` | `PATCH` | Stage transition & win/loss recording |
| | `/api/v1/crm/deals/metrics` | `GET` | Pipeline value & conversion telemetry |
| **Support** | `/api/v1/support/tickets` | `GET`, `POST`, `PUT`, `DELETE` | Ticket management (`TCK-1001`) |
| | `/api/v1/support/tickets/{id}/status` | `PATCH` | Lifecycle transition (Resolve, Close) |
| | `/api/v1/support/tickets/{id}/comments` | `POST` | Discussion timeline (Internal & Public) |
| | `/api/v1/support/tickets/metrics` | `GET` | SLA compliance & triage metrics |
| **Inventory** | `/api/v1/inventory/products` | `GET`, `POST`, `PUT`, `DELETE` | Product catalog with tenant SKU |
| | `/api/v1/inventory/products/{id}/adjust` | `POST` | On-hand count adjustments & receipts |
| | `/api/v1/inventory/products/{id}/transfer` | `POST` | Atomic inter-branch warehouse transfers |
| | `/api/v1/inventory/products/movements` | `GET` | Immutable stock movement audit ledger |
| | `/api/v1/inventory/products/metrics` | `GET` | Asset valuation & reorder point alerts |
| **Finance** | `/api/v1/finance/invoices` | `GET`, `POST`, `PUT` | Customer billing (`INV-YYYY-XXXX`) |
| | `/api/v1/finance/invoices/{id}/issue` | `POST` | Issue invoice to customer |
| | `/api/v1/finance/invoices/{id}/void` | `POST` | Formal audit voiding |
| | `/api/v1/finance/invoices/{id}/payments` | `GET`, `POST` | Record payment (`PAY-YYYY-XXXX`) |
| | `/api/v1/finance/invoices/metrics` | `GET` | Accounts Receivable (AR) & cash flow |
| **Manufacturing** | `/api/v1/manufacturing/boms` | `GET`, `POST`, `PUT` | BOM recipes (`BOM-XXXX`) |
| | `/api/v1/manufacturing/work-orders` | `GET`, `POST`, `PUT`, `DELETE` | Work orders (`WO-YYYY-XXXX`) |
| | `/api/v1/manufacturing/work-orders/{id}/status` | `PATCH` | Lifecycle & atomic inventory yield |
| | `/api/v1/manufacturing/metrics` | `GET` | Production throughput telemetry |
| **HR & Attendance** | `/api/v1/hr/leaves` | `GET`, `POST` | Leave request submission (`LR-YYYY-XXXX`) |
| | `/api/v1/hr/leaves/{id}/approve` | `POST` | Direct report leave approval |
| | `/api/v1/hr/leaves/{id}/reject` | `POST` | Leave rejection with rationale |
| | `/api/v1/hr/attendance/clock-in` | `POST` | Digital time clock punch-in |
| | `/api/v1/hr/attendance/clock-out` | `POST` | Digital time clock punch-out |
| | `/api/v1/hr/attendance` | `GET` | Daily attendance roster |
| | `/api/v1/hr/shifts` | `GET`, `POST`, `PUT` | Shift schedule rota planning |
| | `/api/v1/hr/metrics` | `GET` | Daily workforce attendance KPIs |
| **Reports** | `/api/v1/reports/executive` | `GET` | 6-domain consolidated intelligence |
| | `/api/v1/reports/export` | `POST` | RFC 4180 CSV / JSON file streaming |
| | `/api/v1/reports/history` | `GET` | Data export forensic audit trail |
| **Audit** | `/api/v1/audit` | `GET` | SOC2 Type II chronological forensic audit log & payload query |

