using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Orbit.Domain.Entities;
using Orbit.Domain.Enums;
using Orbit.Infrastructure.Identity;
using Orbit.Infrastructure.Persistence;

namespace Orbit.Infrastructure.Seed;

public static class DatabaseSeeder
{
    public static async Task InitializeAndSeedAsync(
        OrbitDbContext db,
        UserManager<ApplicationUser> userManager)
    {
        // 1. Ensure all tables exist in SQLite / SQL Server
        await EnsureSchemaCreatedAsync(db);

        // 2. Check if the demo company already exists
        var existingTenant = await db.Tenants
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.Slug == "starlight");

        if (existingTenant == null)
        {
            await SeedStarlightAsync(db, userManager);
        }

        var existingKazareen = await db.Tenants
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.Slug == "kazareen");

        if (existingKazareen == null)
        {
            await SeedKazareenAsync(db, userManager);
        }
        else
        {
            await EnsureKazareenMembershipsAndDataAsync(db, userManager, existingKazareen.Id);
        }
    }

    private static async Task SeedStarlightAsync(
        OrbitDbContext db,
        UserManager<ApplicationUser> userManager)
    {
        // 3. Seed Demo Tenant
        var tenantId = Guid.Parse("11111111-1111-1111-1111-111111111111");
        var tenant = new Tenant
        {
            Id = tenantId,
            Name = "Starlight Dynamics",
            Slug = "starlight",
            Status = TenantStatus.Active,
            Industry = "Advanced Aerospace & Electronics",
            CurrencyCode = "USD",
            CreatedAtUtc = DateTime.UtcNow.AddMonths(-6)
        };
        db.Tenants.Add(tenant);
        await db.SaveChangesAsync();

        // 4. Seed Branches
        var branchSfoId = Guid.Parse("22222222-2222-2222-2222-222222222221");
        var branchAtxId = Guid.Parse("22222222-2222-2222-2222-222222222222");

        var branchSfo = new Branch
        {
            Id = branchSfoId,
            TenantId = tenantId,
            Name = "San Francisco Headquarters",
            Code = "SFO-HQ",
            City = "San Francisco",
            Address = "500 Howard Street, Suite 1200",
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow.AddMonths(-6)
        };

        var branchAtx = new Branch
        {
            Id = branchAtxId,
            TenantId = tenantId,
            Name = "Austin Operations Hub",
            Code = "ATX-01",
            City = "Austin",
            Address = "1100 Congress Ave",
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow.AddMonths(-6)
        };

        db.Branches.AddRange(branchSfo, branchAtx);

        // 5. Seed Departments
        var deptExecId = Guid.NewGuid();
        var deptEngId = Guid.NewGuid();
        var deptSalesId = Guid.NewGuid();
        var deptCsId = Guid.NewGuid();
        var deptOpsId = Guid.NewGuid();
        var deptHrId = Guid.NewGuid();
        var deptFinId = Guid.NewGuid();
        var deptItId = Guid.NewGuid();
        var deptStoresId = Guid.NewGuid();
        var deptAuditId = Guid.NewGuid();

        var deptExec = new Department { Id = deptExecId, TenantId = tenantId, Name = "Executive Leadership", Code = "EXEC", IsActive = true, CreatedAtUtc = DateTime.UtcNow.AddMonths(-6) };
        var deptEng = new Department { Id = deptEngId, TenantId = tenantId, Name = "Engineering & Product", Code = "ENG", IsActive = true, CreatedAtUtc = DateTime.UtcNow.AddMonths(-6) };
        var deptSales = new Department { Id = deptSalesId, TenantId = tenantId, Name = "Sales & Commercial", Code = "SALES", IsActive = true, CreatedAtUtc = DateTime.UtcNow.AddMonths(-6) };
        var deptCs = new Department { Id = deptCsId, TenantId = tenantId, Name = "Customer Service", Code = "CS", IsActive = true, CreatedAtUtc = DateTime.UtcNow.AddMonths(-6) };
        var deptOps = new Department { Id = deptOpsId, TenantId = tenantId, Name = "Data Entry & Operations", Code = "OPS", IsActive = true, CreatedAtUtc = DateTime.UtcNow.AddMonths(-6) };
        var deptHr = new Department { Id = deptHrId, TenantId = tenantId, Name = "Human Resources", Code = "HR", IsActive = true, CreatedAtUtc = DateTime.UtcNow.AddMonths(-6) };
        var deptFin = new Department { Id = deptFinId, TenantId = tenantId, Name = "Finance & Accounting", Code = "FIN", IsActive = true, CreatedAtUtc = DateTime.UtcNow.AddMonths(-6) };
        var deptIt = new Department { Id = deptItId, TenantId = tenantId, Name = "Information Technology", Code = "IT", IsActive = true, CreatedAtUtc = DateTime.UtcNow.AddMonths(-6) };
        var deptStores = new Department { Id = deptStoresId, TenantId = tenantId, Name = "Stores & Warehouses", Code = "STORES", IsActive = true, CreatedAtUtc = DateTime.UtcNow.AddMonths(-6) };
        var deptAudit = new Department { Id = deptAuditId, TenantId = tenantId, Name = "Compliance & Audit", Code = "AUDIT", IsActive = true, CreatedAtUtc = DateTime.UtcNow.AddMonths(-6) };

        db.Departments.AddRange(deptExec, deptEng, deptSales, deptCs, deptOps, deptHr, deptFin, deptIt, deptStores, deptAudit);
        await db.SaveChangesAsync();

        // 6. Seed Application Users
        var ownerUser = await CreateUserIfNotExistsAsync(userManager, "owner@starlight.com", "Sarah Connor", "OrbitPassword123!");
        var managerUser = await CreateUserIfNotExistsAsync(userManager, "manager@starlight.com", "John Matrix", "OrbitPassword123!");
        var employeeUser = await CreateUserIfNotExistsAsync(userManager, "employee@starlight.com", "Ellen Ripley", "OrbitPassword123!");

        // 7. Seed Tenant Memberships
        db.TenantMemberships.AddRange(
            new TenantMembership { Id = Guid.NewGuid(), TenantId = tenantId, UserId = ownerUser.Id, Role = TenantRole.Owner, Status = MembershipStatus.Active, JoinedAtUtc = DateTime.UtcNow.AddMonths(-6) },
            new TenantMembership { Id = Guid.NewGuid(), TenantId = tenantId, UserId = managerUser.Id, Role = TenantRole.Manager, Status = MembershipStatus.Active, JoinedAtUtc = DateTime.UtcNow.AddMonths(-6) },
            new TenantMembership { Id = Guid.NewGuid(), TenantId = tenantId, UserId = employeeUser.Id, Role = TenantRole.Employee, Status = MembershipStatus.Active, JoinedAtUtc = DateTime.UtcNow.AddMonths(-6) }
        );

        // 8. Seed Employee Profiles
        var empSarahId = Guid.NewGuid();
        var empJohnId = Guid.NewGuid();
        var empEllenId = Guid.NewGuid();

        var empSarah = new EmployeeProfile
        {
            Id = empSarahId,
            TenantId = tenantId,
            UserId = ownerUser.Id,
            EmployeeNumber = "EMP-001",
            FirstName = "Sarah",
            LastName = "Connor",
            JobTitle = "Chief Executive Officer",
            Email = "owner@starlight.com",
            DepartmentId = deptExecId,
            BranchId = branchSfoId,
            BaseMonthlySalary = 16000m,
            HourlyRate = 100m,
            OvertimeRate = 150m,
            VacationDaysAllocated = 25,
            VacationDaysUsed = 5,
            IsActive = true,
            HireDateUtc = DateTime.UtcNow.AddMonths(-6),
            CreatedAtUtc = DateTime.UtcNow.AddMonths(-6)
        };

        var empJohn = new EmployeeProfile
        {
            Id = empJohnId,
            TenantId = tenantId,
            UserId = managerUser.Id,
            EmployeeNumber = "EMP-002",
            FirstName = "John",
            LastName = "Matrix",
            JobTitle = "VP of Engineering & Operations",
            Email = "manager@starlight.com",
            DepartmentId = deptEngId,
            BranchId = branchSfoId,
            ReportsToEmployeeId = empSarahId,
            BaseMonthlySalary = 11000m,
            HourlyRate = 68.75m,
            OvertimeRate = 103.12m,
            VacationDaysAllocated = 20,
            VacationDaysUsed = 12,
            IsActive = true,
            HireDateUtc = DateTime.UtcNow.AddMonths(-5),
            CreatedAtUtc = DateTime.UtcNow.AddMonths(-5)
        };

        var empEllen = new EmployeeProfile
        {
            Id = empEllenId,
            TenantId = tenantId,
            UserId = employeeUser.Id,
            EmployeeNumber = "EMP-003",
            FirstName = "Ellen",
            LastName = "Ripley",
            JobTitle = "Lead Hardware Architect",
            Email = "employee@starlight.com",
            DepartmentId = deptEngId,
            BranchId = branchAtxId,
            ReportsToEmployeeId = empJohnId,
            BaseMonthlySalary = 8500m,
            HourlyRate = 53.12m,
            OvertimeRate = 79.68m,
            VacationDaysAllocated = 18,
            VacationDaysUsed = 20, // Negative balance: 18 - 20 = -2 days deficit!
            IsActive = true,
            HireDateUtc = DateTime.UtcNow.AddMonths(-4),
            CreatedAtUtc = DateTime.UtcNow.AddMonths(-4)
        };

        db.Employees.AddRange(empSarah, empJohn, empEllen);
        await db.SaveChangesAsync();

        // 9. Seed Tasks
        db.Tasks.AddRange(
            new TaskItem
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                Title = "Upgrade Core Database Clusters to v10.0",
                Description = "Migrate primary telemetry databases to high-availability multi-region cluster.",
                Status = TaskItemStatus.InProgress,
                Priority = TaskPriority.High,
                AssignedEmployeeId = empEllenId,
                CreatedByEmployeeId = empJohnId,
                DepartmentId = deptEngId,
                DueDateUtc = DateTime.UtcNow.AddDays(14),
                CreatedAtUtc = DateTime.UtcNow.AddDays(-5)
            },
            new TaskItem
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                Title = "Conduct Annual SOC2 Type II Audit",
                Description = "Coordinate with external compliance auditors to verify tenant boundary isolation.",
                Status = TaskItemStatus.InReview,
                Priority = TaskPriority.Urgent,
                AssignedEmployeeId = empJohnId,
                CreatedByEmployeeId = empSarahId,
                DepartmentId = deptExecId,
                DueDateUtc = DateTime.UtcNow.AddDays(7),
                CreatedAtUtc = DateTime.UtcNow.AddDays(-12)
            },
            new TaskItem
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                Title = "Formulate Q4 Enterprise Pricing Strategy",
                Description = "Review tier margins and customer renewal incentives.",
                Status = TaskItemStatus.Done,
                Priority = TaskPriority.Medium,
                AssignedEmployeeId = empSarahId,
                CreatedByEmployeeId = empSarahId,
                DepartmentId = deptSalesId,
                DueDateUtc = DateTime.UtcNow.AddDays(-2),
                CreatedAtUtc = DateTime.UtcNow.AddDays(-20)
            },
            new TaskItem
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                Title = "Refactor Frontend UI to Dark Aurora Design Tokens",
                Description = "Implement responsive CSS custom properties with glassmorphism backdrop filters.",
                Status = TaskItemStatus.Done,
                Priority = TaskPriority.High,
                AssignedEmployeeId = empEllenId,
                CreatedByEmployeeId = empJohnId,
                DepartmentId = deptEngId,
                DueDateUtc = DateTime.UtcNow.AddDays(-1),
                CreatedAtUtc = DateTime.UtcNow.AddDays(-8)
            }
        );

        // 10. Seed Customers
        var custCyberdyneId = Guid.NewGuid();
        var custWeylandId = Guid.NewGuid();
        var custInitechId = Guid.NewGuid();

        var custCyberdyne = new Customer
        {
            Id = custCyberdyneId,
            TenantId = tenantId,
            CompanyName = "Cyberdyne Systems",
            ContactPerson = "Miles Dyson",
            Email = "mdyson@cyberdyne.corp",
            Phone = "+1 (415) 555-0199",
            Website = "https://cyberdyne.example.com",
            Industry = "Artificial Intelligence",
            Status = CustomerStatus.ActiveCustomer,
            AssignedEmployeeId = empJohnId,
            Notes = "Strategic hardware and cloud enterprise partner.",
            CreatedAtUtc = DateTime.UtcNow.AddMonths(-4)
        };

        var custWeyland = new Customer
        {
            Id = custWeylandId,
            TenantId = tenantId,
            CompanyName = "Weyland-Yutani Corp",
            ContactPerson = "Carter Burke",
            Email = "cburke@weyland-yutani.corp",
            Phone = "+1 (512) 555-0142",
            Website = "https://weyland-yutani.example.com",
            Industry = "Aerospace & Deep Tech",
            Status = CustomerStatus.Prospect,
            AssignedEmployeeId = empJohnId,
            Notes = "Exploring fleet sensor deployment.",
            CreatedAtUtc = DateTime.UtcNow.AddMonths(-3)
        };

        var custInitech = new Customer
        {
            Id = custInitechId,
            TenantId = tenantId,
            CompanyName = "Initech Software",
            ContactPerson = "Peter Gibbons",
            Email = "pgibbons@initech.example.com",
            Phone = "+1 (512) 555-0188",
            Website = "https://initech.example.com",
            Industry = "Enterprise Software",
            Status = CustomerStatus.Lead,
            AssignedEmployeeId = empEllenId,
            Notes = "Evaluating ERP migration pilot.",
            CreatedAtUtc = DateTime.UtcNow.AddMonths(-1)
        };

        db.Customers.AddRange(custCyberdyne, custWeyland, custInitech);
        await db.SaveChangesAsync();

        // 11. Seed Deals
        db.Deals.AddRange(
            new Deal
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                CustomerId = custCyberdyneId,
                AssignedEmployeeId = empJohnId,
                Title = "Cyberdyne - AI Hardware Renewal & Support",
                Amount = 280000m,
                Stage = DealStage.ClosedWon,
                Probability = 100,
                ExpectedCloseDateUtc = DateTime.UtcNow.AddDays(-15),
                ClosedAtUtc = DateTime.UtcNow.AddDays(-15),
                CreatedAtUtc = DateTime.UtcNow.AddDays(-60)
            },
            new Deal
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                CustomerId = custWeylandId,
                AssignedEmployeeId = empJohnId,
                Title = "Weyland-Yutani - Fleet Telemetry Rollout",
                Amount = 540000m,
                Stage = DealStage.Negotiation,
                Probability = 80,
                ExpectedCloseDateUtc = DateTime.UtcNow.AddDays(30),
                CreatedAtUtc = DateTime.UtcNow.AddDays(-35)
            },
            new Deal
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                CustomerId = custInitechId,
                AssignedEmployeeId = empEllenId,
                Title = "Initech - Manufacturing Cloud Migration",
                Amount = 75000m,
                Stage = DealStage.Proposal,
                Probability = 60,
                ExpectedCloseDateUtc = DateTime.UtcNow.AddDays(45),
                CreatedAtUtc = DateTime.UtcNow.AddDays(-14)
            }
        );

        // 12. Seed Support Tickets
        var ticket1Id = Guid.NewGuid();
        var ticket2Id = Guid.NewGuid();

        var ticket1 = new SupportTicket
        {
            Id = ticket1Id,
            TenantId = tenantId,
            TicketNumber = "TCK-1001",
            CustomerId = custCyberdyneId,
            AssignedEmployeeId = empEllenId,
            CreatedByEmployeeId = empJohnId,
            Subject = "High Ingestion Rate Telemetry Lag",
            Description = "Cyberdyne edge nodes experiencing 120ms latency spikes during peak shift.",
            Status = TicketStatus.Resolved,
            Priority = TicketPriority.High,
            Category = TicketCategory.Technical,
            ResolvedAtUtc = DateTime.UtcNow.AddDays(-2),
            ResolutionSummary = "Optimized SQLite index buffers and scaled memory allocation.",
            CreatedAtUtc = DateTime.UtcNow.AddDays(-7)
        };

        var ticket2 = new SupportTicket
        {
            Id = ticket2Id,
            TenantId = tenantId,
            TicketNumber = "TCK-1002",
            CustomerId = custWeylandId,
            AssignedEmployeeId = empJohnId,
            CreatedByEmployeeId = empJohnId,
            Subject = "SAML SSO Identity Provider Rotation",
            Description = "Requesting updated metadata XML for autumn certificate cycle.",
            Status = TicketStatus.Open,
            Priority = TicketPriority.Urgent,
            Category = TicketCategory.Account,
            CreatedAtUtc = DateTime.UtcNow.AddDays(-1)
        };

        db.SupportTickets.AddRange(ticket1, ticket2);

        db.TicketComments.AddRange(
            new TicketComment
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                TicketId = ticket1Id,
                AuthorEmployeeId = empEllenId,
                AuthorName = "Ellen Ripley",
                CommentText = "Diagnosed packet fragmentation on the tunnel interface. Applied patch.",
                IsInternal = true,
                CreatedAtUtc = DateTime.UtcNow.AddDays(-4)
            },
            new TicketComment
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                TicketId = ticket1Id,
                AuthorEmployeeId = empEllenId,
                AuthorName = "Ellen Ripley",
                CommentText = "The latency issue has been resolved. Please monitor telemetry over the next 24 hours.",
                IsInternal = false,
                CreatedAtUtc = DateTime.UtcNow.AddDays(-2)
            }
        );

        // 13. Seed Products & Inventory
        var prodAccelId = Guid.NewGuid();
        var prodGatewayId = Guid.NewGuid();
        var prodChipsetId = Guid.NewGuid();

        var prodAccel = new Product
        {
            Id = prodAccelId,
            TenantId = tenantId,
            Sku = "STR-ACC-X1",
            Name = "Starlight Neural Accelerator X1",
            Description = "High-throughput edge tensor accelerator for industrial robotics.",
            Category = ProductCategory.Electronics,
            UnitPrice = 1850m,
            UnitCost = 720m,
            ReorderLevel = 25,
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow.AddMonths(-4)
        };

        var prodGateway = new Product
        {
            Id = prodGatewayId,
            TenantId = tenantId,
            Sku = "STR-GW-V4",
            Name = "Industrial IoT Edge Gateway v4",
            Description = "Ruggedized environmental telemetry hub with dual failover WAN.",
            Category = ProductCategory.Hardware,
            UnitPrice = 540m,
            UnitCost = 210m,
            ReorderLevel = 40,
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow.AddMonths(-4)
        };

        var prodChipset = new Product
        {
            Id = prodChipsetId,
            TenantId = tenantId,
            Sku = "STR-CHIP-7NM",
            Name = "Tensor Processing Chipset 7nm",
            Description = "Raw silicon component used in X1 accelerator manufacturing.",
            Category = ProductCategory.Components,
            UnitPrice = 320m,
            UnitCost = 180m,
            ReorderLevel = 100,
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow.AddMonths(-4)
        };

        db.Products.AddRange(prodAccel, prodGateway, prodChipset);

        db.ProductInventories.AddRange(
            new ProductInventory { Id = Guid.NewGuid(), TenantId = tenantId, ProductId = prodAccelId, BranchId = branchSfoId, QuantityOnHand = 85, QuantityReserved = 15, AisleBinLocation = "A1-04-B" },
            new ProductInventory { Id = Guid.NewGuid(), TenantId = tenantId, ProductId = prodAccelId, BranchId = branchAtxId, QuantityOnHand = 40, QuantityReserved = 5, AisleBinLocation = "TX-RACK-2" },
            new ProductInventory { Id = Guid.NewGuid(), TenantId = tenantId, ProductId = prodGatewayId, BranchId = branchSfoId, QuantityOnHand = 120, QuantityReserved = 0, AisleBinLocation = "A2-12-C" },
            new ProductInventory { Id = Guid.NewGuid(), TenantId = tenantId, ProductId = prodChipsetId, BranchId = branchAtxId, QuantityOnHand = 250, QuantityReserved = 50, AisleBinLocation = "RAW-VAULT-1" }
        );

        db.StockMovements.Add(new StockMovement
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            ProductId = prodAccelId,
            BranchId = branchSfoId,
            Type = StockMovementType.Receipt,
            Quantity = 100,
            ReferenceNumber = "BATCH-2026-09",
            Reason = "Initial factory assembly intake.",
            PerformedByEmployeeId = empJohnId,
            TimestampUtc = DateTime.UtcNow.AddDays(-45),
            CreatedAtUtc = DateTime.UtcNow.AddDays(-45)
        });

        // 14. Seed Invoices & Payments
        var inv1Id = Guid.NewGuid();
        var inv2Id = Guid.NewGuid();

        var inv1 = new Invoice
        {
            Id = inv1Id,
            TenantId = tenantId,
            InvoiceNumber = "INV-2026-0001",
            CustomerId = custCyberdyneId,
            Status = InvoiceStatus.Paid,
            IssueDateUtc = DateTime.UtcNow.AddDays(-40),
            DueDateUtc = DateTime.UtcNow.AddDays(-10),
            Subtotal = 135000m,
            TaxAmount = 13500m,
            DiscountAmount = 0m,
            TotalAmount = 148500m,
            AmountPaid = 148500m,
            Currency = "USD",
            CreatedAtUtc = DateTime.UtcNow.AddDays(-40)
        };

        var inv2 = new Invoice
        {
            Id = inv2Id,
            TenantId = tenantId,
            InvoiceNumber = "INV-2026-0002",
            CustomerId = custWeylandId,
            Status = InvoiceStatus.PartiallyPaid,
            IssueDateUtc = DateTime.UtcNow.AddDays(-20),
            DueDateUtc = DateTime.UtcNow.AddDays(10),
            Subtotal = 85000m,
            TaxAmount = 8500m,
            DiscountAmount = 2500m,
            TotalAmount = 91000m,
            AmountPaid = 45000m,
            Currency = "USD",
            CreatedAtUtc = DateTime.UtcNow.AddDays(-20)
        };

        db.Invoices.AddRange(inv1, inv2);

        db.InvoiceItems.AddRange(
            new InvoiceItem { Id = Guid.NewGuid(), TenantId = tenantId, InvoiceId = inv1Id, ProductId = prodAccelId, Description = "Neural Accelerator X1 - Batch 1", Quantity = 75, UnitPrice = 1800m, TotalAmount = 135000m },
            new InvoiceItem { Id = Guid.NewGuid(), TenantId = tenantId, InvoiceId = inv2Id, ProductId = prodGatewayId, Description = "Industrial IoT Edge Gateway v4 - 150 units", Quantity = 150, UnitPrice = 540m, TotalAmount = 81000m }
        );

        db.PaymentRecords.AddRange(
            new PaymentRecord
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                InvoiceId = inv1Id,
                PaymentNumber = "PAY-2026-0001",
                Amount = 148500m,
                PaymentDateUtc = DateTime.UtcNow.AddDays(-12),
                Method = PaymentMethod.BankTransfer,
                ReferenceNumber = "WIRE-CYB-88319",
                RecordedByEmployeeId = empSarahId,
                Notes = "Full wire receipt.",
                CreatedAtUtc = DateTime.UtcNow.AddDays(-12)
            },
            new PaymentRecord
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                InvoiceId = inv2Id,
                PaymentNumber = "PAY-2026-0002",
                Amount = 45000m,
                PaymentDateUtc = DateTime.UtcNow.AddDays(-5),
                Method = PaymentMethod.BankTransfer,
                ReferenceNumber = "WIRE-WY-11029",
                RecordedByEmployeeId = empJohnId,
                Notes = "Initial installment.",
                CreatedAtUtc = DateTime.UtcNow.AddDays(-5)
            }
        );

        // 15. Seed Manufacturing BOM & Work Orders
        var bomId = Guid.NewGuid();
        var bom = new BillOfMaterials
        {
            Id = bomId,
            TenantId = tenantId,
            BomNumber = "BOM-0001",
            Name = "Neural Accelerator X1 Master Formulation",
            Description = "Assembly specification for X1 Tensor Accelerator Module.",
            ProductId = prodAccelId,
            Version = "v1.2",
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow.AddMonths(-3)
        };
        db.BillsOfMaterials.Add(bom);

        db.BomItems.Add(new BomItem
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            BillOfMaterialsId = bomId,
            ComponentProductId = prodChipsetId,
            QuantityRequired = 2,
            UnitOfMeasure = "pcs",
            Notes = "Dual 7nm processing dies."
        });

        db.WorkOrders.AddRange(
            new WorkOrder
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                OrderNumber = "WO-2026-0001",
                ProductId = prodAccelId,
                BranchId = branchAtxId,
                AssignedEmployeeId = empEllenId,
                QuantityTarget = 50,
                QuantityProduced = 50,
                Status = WorkOrderStatus.Completed,
                Priority = WorkOrderPriority.High,
                StartDateUtc = DateTime.UtcNow.AddDays(-20),
                DueDateUtc = DateTime.UtcNow.AddDays(-5),
                CompletedDateUtc = DateTime.UtcNow.AddDays(-6),
                Notes = "Batch completed ahead of schedule with 100% QA pass rate.",
                CreatedAtUtc = DateTime.UtcNow.AddDays(-25)
            },
            new WorkOrder
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                OrderNumber = "WO-2026-0002",
                ProductId = prodAccelId,
                BranchId = branchAtxId,
                AssignedEmployeeId = empEllenId,
                QuantityTarget = 100,
                QuantityProduced = 45,
                Status = WorkOrderStatus.InProgress,
                Priority = WorkOrderPriority.Urgent,
                StartDateUtc = DateTime.UtcNow.AddDays(-5),
                DueDateUtc = DateTime.UtcNow.AddDays(15),
                Notes = "Cyberdyne expansion production run.",
                CreatedAtUtc = DateTime.UtcNow.AddDays(-8)
            }
        );

        // 16. Seed HR Leave Requests & Attendance
        db.LeaveRequests.Add(new LeaveRequest
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            RequestNumber = "LR-2026-0001",
            EmployeeId = empEllenId,
            LeaveType = LeaveType.Annual,
            StartDateUtc = DateTime.UtcNow.Date.AddDays(10),
            EndDateUtc = DateTime.UtcNow.Date.AddDays(14),
            DaysCount = 5,
            Reason = "Annual family vacation.",
            Status = LeaveStatus.Approved,
            ApproverEmployeeId = empJohnId,
            ActionedAtUtc = DateTime.UtcNow.AddDays(-1),
            CreatedAtUtc = DateTime.UtcNow.AddDays(-3)
        });

        var today = DateTime.UtcNow.Date;
        db.AttendanceLogs.AddRange(
            new AttendanceLog
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                EmployeeId = empSarahId,
                Date = today,
                CheckInTimeUtc = today.AddHours(8).AddMinutes(30),
                WorkLocation = "HQ - San Francisco",
                Status = AttendanceStatus.Present,
                CreatedAtUtc = today
            },
            new AttendanceLog
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                EmployeeId = empJohnId,
                Date = today,
                CheckInTimeUtc = today.AddHours(8).AddMinutes(45),
                WorkLocation = "HQ - San Francisco",
                Status = AttendanceStatus.Present,
                CreatedAtUtc = today
            },
            new AttendanceLog
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                EmployeeId = empEllenId,
                Date = today,
                CheckInTimeUtc = today.AddHours(9).AddMinutes(0),
                WorkLocation = "Austin Operations Hub",
                Status = AttendanceStatus.Present,
                CreatedAtUtc = today
            }
        );

        // 17. Seed Report Export History
        db.ReportExports.AddRange(
            new ReportExportHistory
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                ReportType = ReportType.FinancialSummary,
                Title = $"FinancialSummary_{DateTime.UtcNow:yyyyMMdd}.csv",
                Format = ExportFormat.Csv,
                RecordCount = 142,
                FileSizeKb = 18.5m,
                GeneratedByEmployeeId = empSarahId,
                CreatedAtUtc = DateTime.UtcNow.AddDays(-3)
            },
            new ReportExportHistory
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                ReportType = ReportType.SalesPipeline,
                Title = $"SalesPipeline_{DateTime.UtcNow:yyyyMMdd}.json",
                Format = ExportFormat.Json,
                RecordCount = 28,
                FileSizeKb = 8.2m,
                GeneratedByEmployeeId = empJohnId,
                CreatedAtUtc = DateTime.UtcNow.AddDays(-1)
            }
        );

        // 18. Seed Compliance Certificates
        db.ComplianceCertificates.AddRange(
            new ComplianceCertificate
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                Name = "ISO 9001:2015 Quality Management System",
                StandardCode = "ISO-9001",
                CertificateNumber = "CERT-ISO-9001-2024",
                IssuingBody = "Bureau Veritas Certification",
                IssueDateUtc = DateTime.UtcNow.AddMonths(-18),
                ExpiryDateUtc = DateTime.UtcNow.AddMonths(18),
                Status = CertificateStatus.Active,
                ScopeDescription = "Enterprise multi-site quality assurance, operational workflows, and risk governance.",
                ResponsibleEmployeeId = empSarahId,
                CreatedAtUtc = DateTime.UtcNow.AddMonths(-6)
            },
            new ComplianceCertificate
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                Name = "ISO/IEC 27001:2022 Information Security Management",
                StandardCode = "ISO-27001",
                CertificateNumber = "BSI-ISMS-2023-882",
                IssuingBody = "BSI Assurance Group",
                IssueDateUtc = DateTime.UtcNow.AddYears(-1),
                ExpiryDateUtc = DateTime.UtcNow.AddDays(22), // Expiring soon (<30 days)
                Status = CertificateStatus.ExpiringSoon,
                ScopeDescription = "Cloud SaaS data protection, tenant logical isolation, cryptographic controls, and zero-trust policies.",
                ResponsibleEmployeeId = empSarahId,
                CreatedAtUtc = DateTime.UtcNow.AddMonths(-6)
            },
            new ComplianceCertificate
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                Name = "HACCP Food Safety & Facility Standards",
                StandardCode = "HACCP-HOTEL",
                CertificateNumber = "HACCP-REG-2025-09",
                IssuingBody = "Municipal Food & Health Authority",
                IssueDateUtc = DateTime.UtcNow.AddMonths(-8),
                ExpiryDateUtc = DateTime.UtcNow.AddMonths(16),
                Status = CertificateStatus.Active,
                ScopeDescription = "Commercial catering, perishable cold-chain logistics, and food prep hygiene compliance.",
                ResponsibleEmployeeId = empJohnId,
                CreatedAtUtc = DateTime.UtcNow.AddMonths(-6)
            },
            new ComplianceCertificate
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                Name = "Facility Fire Safety & Emergency Preparedness",
                StandardCode = "SAFETY-OSHA",
                CertificateNumber = "OSHA-FIRE-2023-41",
                IssuingBody = "National Fire & Life Safety Inspectorate",
                IssueDateUtc = DateTime.UtcNow.AddYears(-2),
                ExpiryDateUtc = DateTime.UtcNow.AddDays(-10), // Expired
                Status = CertificateStatus.Expired,
                ScopeDescription = "Sprinkler systems, emergency evacuation routes, and flammable chemical storage compliance.",
                ResponsibleEmployeeId = empJohnId,
                CreatedAtUtc = DateTime.UtcNow.AddMonths(-6)
            }
        );

        // 19. Seed Audit Meetings
        db.AuditMeetings.AddRange(
            new AuditMeeting
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                MeetingNumber = "AUD-2026-0001",
                Title = "Annual ISO 9001 Surveillance Review",
                AuditType = AuditMeetingType.External,
                Status = AuditMeetingStatus.Scheduled,
                ScheduledDateUtc = DateTime.UtcNow.AddDays(12),
                Location = "Global Headquarters - Boardroom A",
                LeadAuditorEmployeeId = empSarahId,
                AuditedDepartmentId = deptOpsId,
                ChecklistSummary = "Verify document version control, supplier qualification records, and scrap write-off authorization trails.",
                CreatedAtUtc = DateTime.UtcNow.AddDays(-14)
            },
            new AuditMeeting
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                MeetingNumber = "AUD-2026-0002",
                Title = "Q3 Internal IT Systems & Access Control Review",
                AuditType = AuditMeetingType.Internal,
                Status = AuditMeetingStatus.InProgress,
                ScheduledDateUtc = DateTime.UtcNow.AddDays(1),
                Location = "IT Operations Lab",
                LeadAuditorEmployeeId = empSarahId,
                AuditedDepartmentId = deptItId,
                ChecklistSummary = "Multi-factor authentication enforcement, service account rotation, and SOC2 audit trail tamper verification.",
                CreatedAtUtc = DateTime.UtcNow.AddDays(-5)
            },
            new AuditMeeting
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                MeetingNumber = "AUD-2026-0003",
                Title = "HACCP & Warehouse Cold-Storage Inspection",
                AuditType = AuditMeetingType.Internal,
                Status = AuditMeetingStatus.ActionRequired,
                ScheduledDateUtc = DateTime.UtcNow.AddDays(-4),
                CompletedAtUtc = DateTime.UtcNow.AddDays(-4),
                Location = "Austin Operations Plant - Bay 3",
                LeadAuditorEmployeeId = empJohnId,
                AuditedDepartmentId = deptStoresId,
                ChecklistSummary = "Freezer telemetry calibration, expiration label verification, and pest control logs.",
                Findings = "Sensor node 3 in raw battery bay required manual battery replacement. Pallet spacing in aisle 4 slightly obstructed.",
                NonConformancesCount = 2,
                CorrectiveActionPlan = "Replace sensor by Friday and re-mark yellow safety boundary lines.",
                CreatedAtUtc = DateTime.UtcNow.AddDays(-10)
            }
        );

        // 20. Seed Monthly Payroll Records (October 2026)
        db.PayrollRecords.AddRange(
            new PayrollRecord
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                PayrollNumber = "PAY-2026-10-001",
                EmployeeId = empSarahId,
                Year = 2026,
                Month = 10,
                PayPeriod = "October 2026",
                BaseSalary = 16000m,
                HourlyRate = 100m,
                OvertimeHours = 0m,
                OvertimeRate = 150m,
                OvertimePay = 0m,
                Bonuses = 2500m,
                GrossPay = 18500m,
                DaysInMonth = 31,
                WorkingDaysExpected = 22,
                DaysPresent = 22,
                DaysAbsent = 0,
                AbsenceDeduction = 0m,
                LateOccurrences = 0,
                LatePenaltyDeduction = 0m,
                NegativeVacationDays = 0m,
                VacationDeficitDeduction = 0m,
                TaxRatePercentage = 15.0m,
                TaxDeduction = 2775.00m,
                SocialSecurityDeduction = 925.00m,
                TotalDeductions = 3700.00m,
                NetPay = 14800.00m,
                Status = PayrollStatus.Approved,
                ApprovedAtUtc = DateTime.UtcNow.AddDays(-2),
                ApprovedByUserId = Guid.Parse(ownerUser.Id),
                IsEmailedToEmployee = true,
                EmailedAtUtc = DateTime.UtcNow.AddDays(-1),
                Notes = "Executive performance bonus included for Q3 ARR milestone.",
                CreatedAtUtc = DateTime.UtcNow.AddDays(-5)
            },
            new PayrollRecord
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                PayrollNumber = "PAY-2026-10-002",
                EmployeeId = empJohnId,
                Year = 2026,
                Month = 10,
                PayPeriod = "October 2026",
                BaseSalary = 11000m,
                HourlyRate = 68.75m,
                OvertimeHours = 12m,
                OvertimeRate = 103.12m,
                OvertimePay = 1237.44m,
                Bonuses = 1000m,
                GrossPay = 13237.44m,
                DaysInMonth = 31,
                WorkingDaysExpected = 22,
                DaysPresent = 22,
                DaysAbsent = 0,
                AbsenceDeduction = 0m,
                LateOccurrences = 1,
                LatePenaltyDeduction = 50.00m,
                NegativeVacationDays = 0m,
                VacationDeficitDeduction = 0m,
                TaxRatePercentage = 15.0m,
                TaxDeduction = 1985.62m,
                SocialSecurityDeduction = 661.87m,
                TotalDeductions = 2697.49m,
                NetPay = 10539.95m,
                Status = PayrollStatus.Approved,
                ApprovedAtUtc = DateTime.UtcNow.AddDays(-2),
                ApprovedByUserId = Guid.Parse(ownerUser.Id),
                IsEmailedToEmployee = true,
                EmailedAtUtc = DateTime.UtcNow.AddDays(-1),
                Notes = "Includes 12 hours server migration overtime.",
                CreatedAtUtc = DateTime.UtcNow.AddDays(-5)
            },
            new PayrollRecord
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                PayrollNumber = "PAY-2026-10-003",
                EmployeeId = empEllenId,
                Year = 2026,
                Month = 10,
                PayPeriod = "October 2026",
                BaseSalary = 8500m,
                HourlyRate = 53.12m,
                OvertimeHours = 8m,
                OvertimeRate = 79.68m,
                OvertimePay = 637.44m,
                Bonuses = 500m,
                GrossPay = 9637.44m,
                DaysInMonth = 31,
                WorkingDaysExpected = 22,
                DaysPresent = 20,
                DaysAbsent = 0,
                AbsenceDeduction = 0m,
                LateOccurrences = 0,
                LatePenaltyDeduction = 0m,
                NegativeVacationDays = 2.0m,
                VacationDeficitDeduction = 772.73m,
                TaxRatePercentage = 15.0m,
                TaxDeduction = 1445.62m,
                SocialSecurityDeduction = 481.87m,
                TotalDeductions = 2700.22m,
                NetPay = 6937.22m,
                Status = PayrollStatus.Approved,
                ApprovedAtUtc = DateTime.UtcNow.AddDays(-2),
                ApprovedByUserId = Guid.Parse(ownerUser.Id),
                IsEmailedToEmployee = true,
                EmailedAtUtc = DateTime.UtcNow.AddDays(-1),
                Notes = "Includes deduction of 2.0 deficit vacation days below 0-day baseline as per company leave policy.",
                CreatedAtUtc = DateTime.UtcNow.AddDays(-5)
            }
        );

        await db.SaveChangesAsync();
    }

    private static async Task SeedKazareenAsync(
        OrbitDbContext db,
        UserManager<ApplicationUser> userManager)
    {
        // 17. Seed "Kazareen" Company Tenant requested by user
        var kazareenTenantId = Guid.Parse("33333333-3333-3333-3333-333333333333");
        var kazareenTenant = new Tenant
        {
            Id = kazareenTenantId,
            Name = "Kazareen",
            Slug = "kazareen",
            Status = TenantStatus.Active,
            Industry = "Multi-Sector Industrial & Technology Enterprises",
            CurrencyCode = "USD",
            CreatedAtUtc = DateTime.UtcNow.AddMonths(-3)
        };
        db.Tenants.Add(kazareenTenant);

        var kazareenHq = new Branch
        {
            Id = Guid.NewGuid(),
            TenantId = kazareenTenantId,
            Name = "Cairo Headquarters",
            Code = "CAI-HQ",
            City = "Cairo",
            Address = "Industrial Zone 1, 10th of Ramadan",
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow.AddMonths(-3)
        };
        db.Branches.Add(kazareenHq);

        var kazDeptHr = new Department { Id = Guid.NewGuid(), TenantId = kazareenTenantId, Name = "Human Resources", Code = "HR", IsActive = true };
        var kazDeptFin = new Department { Id = Guid.NewGuid(), TenantId = kazareenTenantId, Name = "Finance & Accounting", Code = "FIN", IsActive = true };
        var kazDeptIt = new Department { Id = Guid.NewGuid(), TenantId = kazareenTenantId, Name = "Information Technology", Code = "IT", IsActive = true };
        var kazDeptCs = new Department { Id = Guid.NewGuid(), TenantId = kazareenTenantId, Name = "Customer Service", Code = "CS", IsActive = true };
        var kazDeptSales = new Department { Id = Guid.NewGuid(), TenantId = kazareenTenantId, Name = "Sales & Commercial", Code = "SALES", IsActive = true };
        var kazDeptStores = new Department { Id = Guid.NewGuid(), TenantId = kazareenTenantId, Name = "Stores & Warehouses", Code = "STORES", IsActive = true };
        var kazDeptOps = new Department { Id = Guid.NewGuid(), TenantId = kazareenTenantId, Name = "Data Entry & Operations", Code = "OPS", IsActive = true };
        var kazDeptAudit = new Department { Id = Guid.NewGuid(), TenantId = kazareenTenantId, Name = "Compliance & Audit", Code = "AUDIT", IsActive = true };
        db.Departments.AddRange(kazDeptHr, kazDeptFin, kazDeptIt, kazDeptCs, kazDeptSales, kazDeptStores, kazDeptOps, kazDeptAudit);

        // Seed Kazareen Users
        var kazAdminUser = await CreateUserIfNotExistsAsync(userManager, "admin@kazareen.com", "Kazareen Administrator", "OrbitMaster2026!");
        var kazMuhammadUser = await CreateUserIfNotExistsAsync(userManager, "alkhadraam@gmail.com", "Muhammad Alkhadraa", "OrbitMaster2026!");
        var kazAmrUser = await CreateUserIfNotExistsAsync(userManager, "amr@kazareen.com", "Amr El-Sayed", "OrbitMaster2026!");
        var kazAbdelrazikUser = await CreateUserIfNotExistsAsync(userManager, "abdelrazik@kazareen.com", "Abdelrazik Hassan", "OrbitMaster2026!");

        db.TenantMemberships.AddRange(
            new TenantMembership { Id = Guid.NewGuid(), TenantId = kazareenTenantId, UserId = kazAdminUser.Id, Role = TenantRole.Owner, Status = MembershipStatus.Active },
            new TenantMembership { Id = Guid.NewGuid(), TenantId = kazareenTenantId, UserId = kazMuhammadUser.Id, Role = TenantRole.Admin, Status = MembershipStatus.Active },
            new TenantMembership { Id = Guid.NewGuid(), TenantId = kazareenTenantId, UserId = kazAmrUser.Id, Role = TenantRole.Employee, Status = MembershipStatus.Active },
            new TenantMembership { Id = Guid.NewGuid(), TenantId = kazareenTenantId, UserId = kazAbdelrazikUser.Id, Role = TenantRole.Employee, Status = MembershipStatus.Active }
        );

        var empMuhammadId = Guid.NewGuid();
        var empMuhammad = new EmployeeProfile
        {
            Id = empMuhammadId,
            TenantId = kazareenTenantId,
            UserId = kazMuhammadUser.Id,
            EmployeeNumber = "EMP-004",
            FirstName = "Muhammad",
            LastName = "Alkhadraa",
            JobTitle = "Senior IT Systems Engineer",
            Email = "alkhadraam@gmail.com",
            DepartmentId = kazDeptIt.Id,
            BranchId = kazareenHq.Id,
            BaseMonthlySalary = 7500m,
            HourlyRate = 42.61m,
            OvertimeRate = 50.00m,
            VacationDaysAllocated = 21,
            VacationDaysUsed = 5,
            IsActive = true,
            HireDateUtc = DateTime.UtcNow.AddMonths(-3)
        };

        var empAmr = new EmployeeProfile
        {
            Id = Guid.NewGuid(),
            TenantId = kazareenTenantId,
            UserId = kazAmrUser.Id,
            EmployeeNumber = "EMP-005",
            FirstName = "Amr",
            LastName = "El-Sayed",
            JobTitle = "HR Operations Specialist",
            Email = "amr@kazareen.com",
            DepartmentId = kazDeptHr.Id,
            BranchId = kazareenHq.Id,
            BaseMonthlySalary = 6000m,
            HourlyRate = 34.09m,
            OvertimeRate = 45.00m,
            VacationDaysAllocated = 21,
            VacationDaysUsed = 3,
            IsActive = true,
            HireDateUtc = DateTime.UtcNow.AddMonths(-3)
        };

        var empAbdelrazik = new EmployeeProfile
        {
            Id = Guid.NewGuid(),
            TenantId = kazareenTenantId,
            UserId = kazAbdelrazikUser.Id,
            EmployeeNumber = "EMP-006",
            FirstName = "Abdelrazik",
            LastName = "Hassan",
            JobTitle = "Senior Payroll Accountant",
            Email = "abdelrazik@kazareen.com",
            DepartmentId = kazDeptFin.Id,
            BranchId = kazareenHq.Id,
            BaseMonthlySalary = 6500m,
            HourlyRate = 36.93m,
            OvertimeRate = 50.00m,
            VacationDaysAllocated = 21,
            VacationDaysUsed = 4,
            IsActive = true,
            HireDateUtc = DateTime.UtcNow.AddMonths(-3)
        };

        db.Employees.AddRange(empMuhammad, empAmr, empAbdelrazik);

        // Seed October 2026 Payroll Record for Muhammad Alkhadraa
        db.PayrollRecords.Add(
            new PayrollRecord
            {
                Id = Guid.NewGuid(),
                TenantId = kazareenTenantId,
                PayrollNumber = "PAY-2026-10-0004",
                EmployeeId = empMuhammadId,
                Year = 2026,
                Month = 10,
                PayPeriod = "October 2026",
                BaseSalary = 7500m,
                HourlyRate = 42.61m,
                OvertimeHours = 12m,
                OvertimeRate = 50.00m,
                OvertimePay = 600.00m,
                Bonuses = 250.00m,
                GrossPay = 8350.00m,
                DaysInMonth = 31,
                WorkingDaysExpected = 22,
                DaysPresent = 22,
                DaysAbsent = 0,
                AbsenceDeduction = 0,
                LateOccurrences = 0,
                LatePenaltyDeduction = 0,
                NegativeVacationDays = 0,
                VacationDeficitDeduction = 0,
                TaxRatePercentage = 12.0m,
                TaxDeduction = 1002.00m,
                SocialSecurityDeduction = 375.00m,
                TotalDeductions = 1377.00m,
                NetPay = 6973.00m,
                Status = PayrollStatus.Approved,
                ApprovedAtUtc = DateTime.UtcNow.AddDays(-1),
                ApprovedByUserId = Guid.Parse(kazAdminUser.Id),
                IsEmailedToEmployee = false,
                Notes = "October 2026 salary calculated by Abdelrazik (Accounting) and approved for HR delivery to Muhammad at alkhadraam@gmail.com.",
                CreatedAtUtc = DateTime.UtcNow.AddDays(-2)
            }
        );

        await db.SaveChangesAsync();
    }

    private static async Task<ApplicationUser> CreateUserIfNotExistsAsync(
        UserManager<ApplicationUser> userManager,
        string email,
        string fullName,
        string password)
    {
        var existing = await userManager.FindByEmailAsync(email);
        if (existing != null)
        {
            try
            {
                var resetToken = await userManager.GeneratePasswordResetTokenAsync(existing);
                await userManager.ResetPasswordAsync(existing, resetToken, password);
            }
            catch { }
            return existing;
        }

        var user = new ApplicationUser
        {
            Id = Guid.NewGuid().ToString(),
            UserName = email,
            Email = email,
            FullName = fullName,
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow.AddMonths(-6)
        };

        var result = await userManager.CreateAsync(user, password);
        if (!result.Succeeded)
        {
            throw new InvalidOperationException($"Failed to create seed user {email}: {string.Join(", ", result.Errors.Select(e => e.Description))}");
        }

        return user;
    }

    private static async Task EnsureKazareenMembershipsAndDataAsync(
        OrbitDbContext db,
        UserManager<ApplicationUser> userManager,
        Guid kazareenTenantId)
    {
        var kazAdminUser = await CreateUserIfNotExistsAsync(userManager, "admin@kazareen.com", "Kazareen Administrator", "OrbitMaster2026!");
        var kazMuhammadUser = await CreateUserIfNotExistsAsync(userManager, "alkhadraam@gmail.com", "Muhammad Alkhadraa", "OrbitMaster2026!");
        var kazAmrUser = await CreateUserIfNotExistsAsync(userManager, "amr@kazareen.com", "Amr El-Sayed", "OrbitMaster2026!");
        var kazAbdelrazikUser = await CreateUserIfNotExistsAsync(userManager, "abdelrazik@kazareen.com", "Abdelrazik Hassan", "OrbitMaster2026!");

        var users = new[]
        {
            (kazAdminUser.Id, TenantRole.Owner),
            (kazMuhammadUser.Id, TenantRole.Admin),
            (kazAmrUser.Id, TenantRole.Employee),
            (kazAbdelrazikUser.Id, TenantRole.Employee)
        };

        foreach (var (userId, role) in users)
        {
            var mem = await db.TenantMemberships
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(m => m.TenantId == kazareenTenantId && m.UserId == userId);
            if (mem == null)
            {
                db.TenantMemberships.Add(new TenantMembership
                {
                    Id = Guid.NewGuid(),
                    TenantId = kazareenTenantId,
                    UserId = userId,
                    Role = role,
                    Status = MembershipStatus.Active,
                    JoinedAtUtc = DateTime.UtcNow
                });
            }
            else
            {
                mem.Status = MembershipStatus.Active;
                mem.Role = role;
            }
        }
        await db.SaveChangesAsync();

        var hq = await db.Branches.IgnoreQueryFilters().FirstOrDefaultAsync(b => b.TenantId == kazareenTenantId);
        if (hq == null)
        {
            hq = new Branch
            {
                Id = Guid.NewGuid(),
                TenantId = kazareenTenantId,
                Name = "Cairo Headquarters",
                Code = "CAI-HQ",
                City = "Cairo",
                Address = "Industrial Zone 1, 10th of Ramadan",
                IsActive = true
            };
            db.Branches.Add(hq);
            await db.SaveChangesAsync();
        }

        var deptDefs = new[]
        {
            ("Human Resources", "HR"),
            ("Finance & Accounting", "FIN"),
            ("Information Technology", "IT"),
            ("Customer Service", "CS"),
            ("Sales & Commercial", "SALES"),
            ("Stores & Warehouses", "STORES"),
            ("Data Entry & Operations", "OPS"),
            ("Compliance & Audit", "AUDIT")
        };

        var depts = new Dictionary<string, Department>();
        foreach (var (name, code) in deptDefs)
        {
            var dept = await db.Departments.IgnoreQueryFilters().FirstOrDefaultAsync(d => d.TenantId == kazareenTenantId && d.Code == code);
            if (dept == null)
            {
                dept = new Department { Id = Guid.NewGuid(), TenantId = kazareenTenantId, Name = name, Code = code, IsActive = true };
                db.Departments.Add(dept);
            }
            depts[code] = dept;
        }
        await db.SaveChangesAsync();

        var empMuhammad = await db.Employees.IgnoreQueryFilters().FirstOrDefaultAsync(e => e.TenantId == kazareenTenantId && e.Email == "alkhadraam@gmail.com");
        if (empMuhammad == null)
        {
            empMuhammad = new EmployeeProfile
            {
                Id = Guid.NewGuid(),
                TenantId = kazareenTenantId,
                UserId = kazMuhammadUser.Id,
                EmployeeNumber = "EMP-004",
                FirstName = "Muhammad",
                LastName = "Alkhadraa",
                JobTitle = "Senior IT Systems Engineer",
                Email = "alkhadraam@gmail.com",
                DepartmentId = depts["IT"].Id,
                BranchId = hq.Id,
                BaseMonthlySalary = 7500m,
                HourlyRate = 42.61m,
                OvertimeRate = 50.00m,
                VacationDaysAllocated = 25,
                VacationDaysUsed = 2,
                IsActive = true,
                HireDateUtc = DateTime.UtcNow.AddMonths(-3)
            };
            db.Employees.Add(empMuhammad);
        }

        var empAmr = await db.Employees.IgnoreQueryFilters().FirstOrDefaultAsync(e => e.TenantId == kazareenTenantId && e.Email == "amr@kazareen.com");
        if (empAmr == null)
        {
            empAmr = new EmployeeProfile
            {
                Id = Guid.NewGuid(),
                TenantId = kazareenTenantId,
                UserId = kazAmrUser.Id,
                EmployeeNumber = "EMP-005",
                FirstName = "Amr",
                LastName = "El-Sayed",
                JobTitle = "HR Business Partner",
                Email = "amr@kazareen.com",
                DepartmentId = depts["HR"].Id,
                BranchId = hq.Id,
                BaseMonthlySalary = 5500m,
                HourlyRate = 31.25m,
                OvertimeRate = 45.00m,
                VacationDaysAllocated = 21,
                VacationDaysUsed = 3,
                IsActive = true,
                HireDateUtc = DateTime.UtcNow.AddMonths(-3)
            };
            db.Employees.Add(empAmr);
        }

        var empAbdelrazik = await db.Employees.IgnoreQueryFilters().FirstOrDefaultAsync(e => e.TenantId == kazareenTenantId && e.Email == "abdelrazik@kazareen.com");
        if (empAbdelrazik == null)
        {
            empAbdelrazik = new EmployeeProfile
            {
                Id = Guid.NewGuid(),
                TenantId = kazareenTenantId,
                UserId = kazAbdelrazikUser.Id,
                EmployeeNumber = "EMP-006",
                FirstName = "Abdelrazik",
                LastName = "Hassan",
                JobTitle = "Senior Payroll Accountant",
                Email = "abdelrazik@kazareen.com",
                DepartmentId = depts["FIN"].Id,
                BranchId = hq.Id,
                BaseMonthlySalary = 6500m,
                HourlyRate = 36.93m,
                OvertimeRate = 50.00m,
                VacationDaysAllocated = 21,
                VacationDaysUsed = 4,
                IsActive = true,
                HireDateUtc = DateTime.UtcNow.AddMonths(-3)
            };
            db.Employees.Add(empAbdelrazik);
        }
        await db.SaveChangesAsync();

        var existingPayroll = await db.PayrollRecords.IgnoreQueryFilters().FirstOrDefaultAsync(p => p.TenantId == kazareenTenantId && p.EmployeeId == empMuhammad.Id && p.Year == 2026 && p.Month == 10);
        if (existingPayroll == null)
        {
            db.PayrollRecords.Add(new PayrollRecord
            {
                Id = Guid.NewGuid(),
                TenantId = kazareenTenantId,
                PayrollNumber = "PAY-2026-10-0004",
                EmployeeId = empMuhammad.Id,
                Year = 2026,
                Month = 10,
                PayPeriod = "October 2026",
                BaseSalary = 7500m,
                HourlyRate = 42.61m,
                OvertimeHours = 12m,
                OvertimeRate = 50.00m,
                OvertimePay = 600.00m,
                Bonuses = 250.00m,
                GrossPay = 8350.00m,
                DaysInMonth = 31,
                WorkingDaysExpected = 22,
                DaysPresent = 22,
                DaysAbsent = 0,
                AbsenceDeduction = 0,
                LateOccurrences = 0,
                LatePenaltyDeduction = 0,
                NegativeVacationDays = 0,
                VacationDeficitDeduction = 0,
                TaxRatePercentage = 12.0m,
                TaxDeduction = 1002.00m,
                SocialSecurityDeduction = 375.00m,
                TotalDeductions = 1377.00m,
                NetPay = 6973.00m,
                Status = PayrollStatus.Approved,
                ApprovedAtUtc = DateTime.UtcNow.AddDays(-1),
                ApprovedByUserId = Guid.Parse(kazAdminUser.Id),
                IsEmailedToEmployee = false,
                Notes = "October 2026 salary calculated by Abdelrazik (Accounting) and approved for HR delivery to Muhammad at alkhadraam@gmail.com.",
                CreatedAtUtc = DateTime.UtcNow.AddDays(-2)
            });
            await db.SaveChangesAsync();
        }
    }

    private static async Task EnsureSchemaCreatedAsync(OrbitDbContext db)
    {
        if (db.Database.IsSqlServer())
        {
            await db.Database.EnsureCreatedAsync();
            return;
        }

        try
        {
            var createPayrollTableSql = @"
                CREATE TABLE IF NOT EXISTS ""PayrollRecords"" (
                    ""Id"" uuid NOT NULL PRIMARY KEY,
                    ""TenantId"" uuid NOT NULL,
                    ""PayrollNumber"" character varying(50) NOT NULL,
                    ""EmployeeId"" uuid NOT NULL,
                    ""Year"" integer NOT NULL,
                    ""Month"" integer NOT NULL,
                    ""PayPeriod"" character varying(50) NOT NULL,
                    ""BaseSalary"" numeric NOT NULL DEFAULT 0,
                    ""HourlyRate"" numeric NOT NULL DEFAULT 0,
                    ""OvertimeHours"" numeric NOT NULL DEFAULT 0,
                    ""OvertimeRate"" numeric NOT NULL DEFAULT 0,
                    ""OvertimePay"" numeric NOT NULL DEFAULT 0,
                    ""Bonuses"" numeric NOT NULL DEFAULT 0,
                    ""GrossPay"" numeric NOT NULL DEFAULT 0,
                    ""DaysInMonth"" integer NOT NULL DEFAULT 30,
                    ""WorkingDaysExpected"" integer NOT NULL DEFAULT 22,
                    ""DaysPresent"" integer NOT NULL DEFAULT 0,
                    ""DaysAbsent"" integer NOT NULL DEFAULT 0,
                    ""AbsenceDeduction"" numeric NOT NULL DEFAULT 0,
                    ""LateOccurrences"" integer NOT NULL DEFAULT 0,
                    ""LatePenaltyDeduction"" numeric NOT NULL DEFAULT 0,
                    ""NegativeVacationDays"" numeric NOT NULL DEFAULT 0,
                    ""VacationDeficitDeduction"" numeric NOT NULL DEFAULT 0,
                    ""TaxRatePercentage"" numeric NOT NULL DEFAULT 15,
                    ""TaxDeduction"" numeric NOT NULL DEFAULT 0,
                    ""SocialSecurityDeduction"" numeric NOT NULL DEFAULT 0,
                    ""TotalDeductions"" numeric NOT NULL DEFAULT 0,
                    ""NetPay"" numeric NOT NULL DEFAULT 0,
                    ""Status"" integer NOT NULL DEFAULT 0,
                    ""ApprovedAtUtc"" timestamp with time zone NULL,
                    ""ApprovedByUserId"" uuid NULL,
                    ""IsEmailedToEmployee"" boolean NOT NULL DEFAULT false,
                    ""EmailedAtUtc"" timestamp with time zone NULL,
                    ""Notes"" text NULL,
                    ""CreatedBy"" text NULL,
                    ""UpdatedBy"" text NULL,
                    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    ""UpdatedAtUtc"" timestamp with time zone NULL
                );
            ";
            await db.Database.ExecuteSqlRawAsync(createPayrollTableSql);
        }
        catch { }

        try
        {
            var preAlterSql = @"
                ALTER TABLE ""Departments"" ADD COLUMN IF NOT EXISTS ""ManagerEmployeeId"" uuid NULL;
                ALTER TABLE ""Employees"" ADD COLUMN IF NOT EXISTS ""VacationDaysAllocated"" integer NOT NULL DEFAULT 21;
                UPDATE ""Employees"" SET ""VacationDaysAllocated"" = 21 WHERE ""VacationDaysAllocated"" IS NULL;
                ALTER TABLE ""Employees"" ADD COLUMN IF NOT EXISTS ""VacationDaysUsed"" numeric NOT NULL DEFAULT 0;
                UPDATE ""Employees"" SET ""VacationDaysUsed"" = 0 WHERE ""VacationDaysUsed"" IS NULL;
                ALTER TABLE ""Employees"" ADD COLUMN IF NOT EXISTS ""BaseMonthlySalary"" numeric NOT NULL DEFAULT 3500;
                UPDATE ""Employees"" SET ""BaseMonthlySalary"" = 3500 WHERE ""BaseMonthlySalary"" IS NULL OR ""BaseMonthlySalary"" = 0;
                ALTER TABLE ""Employees"" ADD COLUMN IF NOT EXISTS ""BaseSalary"" numeric NOT NULL DEFAULT 0;
                ALTER TABLE ""Employees"" ADD COLUMN IF NOT EXISTS ""HourlyRate"" numeric NOT NULL DEFAULT 20;
                UPDATE ""Employees"" SET ""HourlyRate"" = 20 WHERE ""HourlyRate"" IS NULL OR ""HourlyRate"" = 0;
                ALTER TABLE ""Employees"" ADD COLUMN IF NOT EXISTS ""OvertimeHours"" numeric NOT NULL DEFAULT 0;
                ALTER TABLE ""Employees"" ADD COLUMN IF NOT EXISTS ""OvertimeRate"" numeric NOT NULL DEFAULT 30;
                UPDATE ""Employees"" SET ""OvertimeRate"" = 30 WHERE ""OvertimeRate"" IS NULL OR ""OvertimeRate"" = 0;
                ALTER TABLE ""Employees"" ADD COLUMN IF NOT EXISTS ""Allowances"" numeric NOT NULL DEFAULT 0;
                ALTER TABLE ""Employees"" ADD COLUMN IF NOT EXISTS ""Deductions"" numeric NOT NULL DEFAULT 0;
                ALTER TABLE ""Employees"" ADD COLUMN IF NOT EXISTS ""TaxRatePercent"" numeric NOT NULL DEFAULT 15;
                ALTER TABLE ""Employees"" ADD COLUMN IF NOT EXISTS ""SocialSecurityDeduction"" numeric NOT NULL DEFAULT 0;
                ALTER TABLE ""Employees"" ADD COLUMN IF NOT EXISTS ""BankIban"" text NULL;
                ALTER TABLE ""Employees"" ADD COLUMN IF NOT EXISTS ""BankName"" text NULL;
                ALTER TABLE ""Employees"" ADD COLUMN IF NOT EXISTS ""PayrollFrequency"" text NOT NULL DEFAULT 'Monthly';
                ALTER TABLE ""Employees"" ADD COLUMN IF NOT EXISTS ""ContractType"" text NOT NULL DEFAULT 'Permanent Full-Time';
                ALTER TABLE ""Employees"" ADD COLUMN IF NOT EXISTS ""ContractStartDateUtc"" timestamp with time zone NULL;
                ALTER TABLE ""Employees"" ADD COLUMN IF NOT EXISTS ""ContractEndDateUtc"" timestamp with time zone NULL;
                ALTER TABLE ""Employees"" ADD COLUMN IF NOT EXISTS ""ContractDocumentUrl"" text NULL;
                ALTER TABLE ""Employees"" ADD COLUMN IF NOT EXISTS ""ContractNotes"" text NULL;
            ";
            await db.Database.ExecuteSqlRawAsync(preAlterSql);
        }
        catch { }

        try
        {
            // Generates the DDL creation script for the entire EF Core model
            var script = db.Database.GenerateCreateScript();

            // Convert CREATE statements to IF NOT EXISTS to prevent conflicts if some tables already exist
            var safeScript = script
                .Replace("CREATE TABLE ", "CREATE TABLE IF NOT EXISTS ")
                .Replace("CREATE UNIQUE INDEX ", "CREATE UNIQUE INDEX IF NOT EXISTS ")
                .Replace("CREATE INDEX ", "CREATE INDEX IF NOT EXISTS ");

            await db.Database.ExecuteSqlRawAsync(safeScript);
        }
        catch { }

        try
        {
            var alterSql = @"
                ALTER TABLE ""AttendanceLogs"" ADD COLUMN IF NOT EXISTS ""ActivityState"" integer NOT NULL DEFAULT 0;
                ALTER TABLE ""AttendanceLogs"" ADD COLUMN IF NOT EXISTS ""WorkStartedAtUtc"" timestamp with time zone NULL;
                ALTER TABLE ""AttendanceLogs"" ADD COLUMN IF NOT EXISTS ""WorkEndedAtUtc"" timestamp with time zone NULL;
                ALTER TABLE ""AttendanceLogs"" ADD COLUMN IF NOT EXISTS ""CurrentBreakStartedAtUtc"" timestamp with time zone NULL;
                ALTER TABLE ""AttendanceLogs"" ADD COLUMN IF NOT EXISTS ""LastWorkResumedAtUtc"" timestamp with time zone NULL;
                ALTER TABLE ""AttendanceLogs"" ADD COLUMN IF NOT EXISTS ""TotalWorkSeconds"" integer NOT NULL DEFAULT 0;
                ALTER TABLE ""AttendanceLogs"" ADD COLUMN IF NOT EXISTS ""TotalBreakSeconds"" integer NOT NULL DEFAULT 0;
                ALTER TABLE ""AttendanceLogs"" ADD COLUMN IF NOT EXISTS ""IsLate"" boolean NOT NULL DEFAULT false;
                ALTER TABLE ""AttendanceLogs"" ADD COLUMN IF NOT EXISTS ""LateMinutes"" integer NOT NULL DEFAULT 0;
                ALTER TABLE ""AttendanceLogs"" ADD COLUMN IF NOT EXISTS ""FaultsCount"" integer NOT NULL DEFAULT 0;
                ALTER TABLE ""AttendanceLogs"" ADD COLUMN IF NOT EXISTS ""FaultReason"" text NULL;
                ALTER TABLE ""AttendanceLogs"" ADD COLUMN IF NOT EXISTS ""LastHeartbeatUtc"" timestamp with time zone NULL;
            ";
            await db.Database.ExecuteSqlRawAsync(alterSql);
        }
        catch
        {
            // Silently ignore if provider differences
        }
    }
}
