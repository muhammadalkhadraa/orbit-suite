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

        if (existingTenant != null)
        {
            return; // Already seeded
        }

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

        var deptExec = new Department { Id = deptExecId, TenantId = tenantId, Name = "Executive Leadership", Code = "EXEC", IsActive = true, CreatedAtUtc = DateTime.UtcNow.AddMonths(-6) };
        var deptEng = new Department { Id = deptEngId, TenantId = tenantId, Name = "Engineering & Product", Code = "ENG", IsActive = true, CreatedAtUtc = DateTime.UtcNow.AddMonths(-6) };
        var deptSales = new Department { Id = deptSalesId, TenantId = tenantId, Name = "Revenue & Sales", Code = "SALES", IsActive = true, CreatedAtUtc = DateTime.UtcNow.AddMonths(-6) };
        var deptCs = new Department { Id = deptCsId, TenantId = tenantId, Name = "Customer Success", Code = "CS", IsActive = true, CreatedAtUtc = DateTime.UtcNow.AddMonths(-6) };
        var deptOps = new Department { Id = deptOpsId, TenantId = tenantId, Name = "Operations & Manufacturing", Code = "OPS", IsActive = true, CreatedAtUtc = DateTime.UtcNow.AddMonths(-6) };

        db.Departments.AddRange(deptExec, deptEng, deptSales, deptCs, deptOps);
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

    private static async Task EnsureSchemaCreatedAsync(OrbitDbContext db)
    {
        // Generates the DDL creation script for the entire EF Core model
        var script = db.Database.GenerateCreateScript();

        // Convert CREATE statements to IF NOT EXISTS to prevent conflicts if some tables already exist in SQLite
        var safeScript = script
            .Replace("CREATE TABLE ", "CREATE TABLE IF NOT EXISTS ")
            .Replace("CREATE UNIQUE INDEX ", "CREATE UNIQUE INDEX IF NOT EXISTS ")
            .Replace("CREATE INDEX ", "CREATE INDEX IF NOT EXISTS ");

        await db.Database.ExecuteSqlRawAsync(safeScript);
    }
}
