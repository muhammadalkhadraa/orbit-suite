# Orbit Business Suite — Deployment & Operations Guide

## 1. Hosting Strategy & Environment Requirements

Orbit Business Suite is designed for provider-neutral deployment on standard Linux/Windows Virtual Private Servers (VPS), Docker containers, or managed cloud container platforms (AWS ECS/Fargate, Azure App Services, GCP Cloud Run).

### Minimum Server Requirements
- **CPU:** 2 vCPUs
- **Memory:** 4 GB RAM
- **Storage:** 20 GB SSD
- **Database:** Microsoft SQL Server 2022+ or Azure SQL Database (or SQLite for development/testing)
- **Runtime:** .NET 10.0 runtime / ASP.NET Core Hosting Bundle
- **Reverse Proxy:** Nginx, Caddy, or Traefik with TLS termination

---

## 2. Environment Configuration

### Backend Environment Variables (`appsettings.Production.json` or OS Environment Variables)
```bash
# Database Connection
ConnectionStrings__DefaultConnection="Server=tcp:sqlserver,1433;Database=OrbitSuiteDb;User Id=sa;Password=YourStrong(!)Password;TrustServerCertificate=True;MultipleActiveResultSets=True;"

# Authentication / JWT
Jwt__Issuer="https://orbit.business"
Jwt__Audience="https://orbit.business"
Jwt__SecretKey="<Generate-At-Least-256-Bit-Cryptographic-Key>"
Jwt__ExpiryMinutes=60

# CORS
Cors__AllowedOrigins="https://app.orbit.business,https://orbit.business"

# Logging
Logging__LogLevel__Default="Information"
Logging__LogLevel__Microsoft.AspNetCore="Warning"
```

---

## 3. Database Migration & Provisioning

Migrations are managed via EF Core Migrations and applied during CI/CD or via runtime migration bundle:
```bash
dotnet ef database update --project src/Orbit.Infrastructure --startup-project src/Orbit.Api
```

For production environments, generating idempotent SQL scripts is recommended:
```bash
dotnet ef migrations script --idempotent --output deploy/migrations.sql
```

---

## 4. Backup & Disaster Recovery Strategy

- **Recovery Point Objective (RPO):** < 15 minutes (using automated differential and log backups in SQL Server).
- **Recovery Time Objective (RTO):** < 2 hours for full disaster recovery restoration.
- **Tenant Isolation Note:** In a shared database model, individual tenant point-in-time recovery requires restoring a backup snapshot to an isolated scratch database and extracting the tenant's records by `TenantId`.

---

## 5. Docker & Containerized Deployment

Orbit Suite provides multi-stage `Dockerfile` definitions for both backend and frontend, and a unified `docker-compose.yml` for 1-click orchestration:

### Quickstart with Docker Compose

```bash
# Build and start both API and Frontend SPA
docker compose up -d --build

# View container logs
docker compose logs -f

# Verify running services
docker compose ps
```

- **Frontend Application:** `http://localhost:4200` (reverse proxies `/api/` to backend container).
- **Backend API & Swagger:** `http://localhost:5115` (`/swagger` and `/health`).
- **Data Persistence:** Stored in named Docker volume `orbit_data`.

### Continuous Integration (CI/CD)

GitHub Actions workflow is located at `.github/workflows/ci.yml`. It runs automatically on pull requests and pushes to `main`:
1. **Backend Job:** Installs .NET 10, restores solution, builds in Release mode, and runs all 60 automated unit/integration/security tests.
2. **Frontend Job:** Installs Node.js 22, restores `npm ci` dependencies with caching, executes all 66 headless Karma unit tests across all feature modules, and verifies `npm run build` in production mode.

