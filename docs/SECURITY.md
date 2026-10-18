# Orbit Business Suite — Security & Tenant Isolation Controls

## 1. Multi-Tenant Isolation Controls

### 1.1 Tenant Context Resolution
1. **Authentication:** The client sends a JWT Bearer token in the `Authorization: Bearer <token>` HTTP header.
2. **Identity Verification:** ASP.NET Core Authentication validates the token signature, issuer, audience, and expiration.
3. **Tenant Membership Verification:**
   - The user selects or submits their desired tenant via the `X-Tenant-Id` header (or active claim).
   - `TenantResolutionMiddleware` intercepts the request:
     - Extracts the `UserId` from `ClaimsPrincipal`.
     - Validates that an active `TenantMembership` exists linking this `UserId` to the requested `TenantId`.
     - **Rejection:** If no membership exists, or the membership is suspended, the request immediately terminates with `403 Forbidden` (`ErrorCode: TENANT_ACCESS_DENIED`).
4. **Current Context Injection:** Upon validation, `ITenantContext` is populated with `TenantId`, `TenantRole`, and `UserId` for the lifetime of the scoped HTTP request.

### 1.2 Data Access Defense-in-Depth
- **EF Core Global Query Filters:**
  ```csharp
  modelBuilder.Entity<TEntity>()
      .HasQueryFilter(e => e.TenantId == _tenantContext.CurrentTenantId);
  ```
- **Creation Guard:** `OrbitDbContext.SaveChangesAsync` automatically stamps `ITenantScopedEntity.TenantId` from `_tenantContext.CurrentTenantId` if unset, and throws a `SecurityException` if an attempt is made to mutate across tenants.
- **Resource Route Verification:** Endpoints taking entity IDs verify that the returned entity exists within the tenant filter. If not found, a `404 Not Found` is returned rather than disclosing the existence of an entity in another tenant.

---

## 2. Authentication & Credential Management

- **Provider:** ASP.NET Core Identity.
- **Password Security:** PBKDF2 with HMAC-SHA256, 100,000+ iterations (ASP.NET Core Identity default v3 hasher).
- **Session Tokens:**
  - Standard JSON Web Tokens (JWT) signed using HMAC-SHA256 with strong symmetric keys or RSA.
  - Short-lived access tokens (15-60 minutes).
  - Refresh tokens persisted server-side with revocation support on logout or password change.
- **Client Storage Policy:**
  - Refresh tokens stored in `HttpOnly`, `Secure`, `SameSite=Strict` cookies or managed securely in memory during SPA sessions.
  - Never store raw passwords or long-lived authentication credentials in `localStorage` or `sessionStorage`.

---

## 3. Authorization & Role-Based Access Control (RBAC)

Orbit implements fine-grained, declarative policies:
- `RequireTenantMember`: Requires valid active membership in the resolved tenant.
- `RequireTenantAdmin`: Requires `Owner` or `Admin` role within the active tenant.
- `RequireTenantManager`: Requires `Owner`, `Admin`, or `Manager` role.
- `TaskAccessPolicy`: Custom resource-based authorization evaluating the relationship between the user's `EmployeeProfile` and the task (creator, assignee, direct reports, or company admin).

---

## 4. Cross-Tenant Attack Scenarios & Mitigations

| Attack Vector | Vulnerability | Mitigation in Orbit |
|---|---|---|
| **Tenant ID Spoofing** | Attacker sends `X-Tenant-Id: <Target>` in header | Server verifies `TenantMembership` in database; rejects immediately if unassociated. |
| **Insecure Direct Object Reference (IDOR)** | Attacker changes `/api/tasks/{id}` to target other tenant's task ID | EF Core query filter automatically scopes `WHERE TenantId = @CurrentTenantId`. Returns 404. |
| **Cross-Tenant Data Tampering** | Attacker submits payload with `tenantId: <Target>` | Server-side entity binder ignores payload tenant ID and enforces `_tenantContext.CurrentTenantId`. |
| **Privilege Escalation** | Employee sends `role: "Admin"` in membership update | Membership role modifications restricted to `Owner` or `Admin` via `[Authorize(Policy = "RequireTenantAdmin")]`. |
| **Data Leakage in Aggregations** | Reporting/Dashboard endpoints returning totals across all companies | All aggregation LINQ queries inherit EF Core Global Query Filters. |

---

## 5. Security Integration Testing

Automated test suites in `Orbit.Tests/Security/` verify:
1. `CrossTenantAccessTests`: User from Tenant A attempting to read/update/delete Tenant B's tasks or employees receives `403 Forbidden` or `404 Not Found`.
2. `ForgedTenantHeaderTests`: Sending an arbitrary GUID in `X-Tenant-Id` without membership is rejected with `403 Forbidden`.
3. `EmployeeTaskVisibilityTests`: Regular employee can only access tasks assigned to them; manager can only access tasks of direct reports or department.
4. `AuditTrailIsolationTests`: Verifies that audit query endpoints enforce strict tenant boundaries and that non-administrative roles cannot access forensic ledgers.
