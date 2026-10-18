using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Orbit.Application.Modules.Reports.Dtos;
using Orbit.Domain.Entities;
using Orbit.Domain.Enums;
using Orbit.Infrastructure.Persistence;
using Orbit.Infrastructure.Services;
using Xunit;

namespace Orbit.Tests.Modules;

public class ReportingTests
{
    private (OrbitDbContext db, TenantContext tenantContext, FakeCurrentUserService userService, ReportingService reportingService)
        SetupTestEnvironment()
    {
        var tenantContext = new TenantContext();
        var userService = new FakeCurrentUserService();

        var options = new DbContextOptionsBuilder<OrbitDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var db = new OrbitDbContext(options, tenantContext, userService);
        var auditService = new AuditService(db, tenantContext, userService);
        var reportingService = new ReportingService(db, tenantContext, userService, auditService);

        return (db, tenantContext, userService, reportingService);
    }

    [Fact]
    public async Task ExecutiveOverview_AggregatesMetricsAcrossAllModules()
    {
        var (db, tenantContext, userService, reportingService) = SetupTestEnvironment();
        var tenantId = Guid.NewGuid();

        tenantContext.SetContext(tenantId, "admin-1", TenantRole.Owner);
        userService.UserId = "admin-1";

        // Seed Customer
        var customer = new Customer { Id = Guid.NewGuid(), TenantId = tenantId, CompanyName = "Acme Corp" };
        db.Customers.Add(customer);

        // Seed Invoices
        var inv1 = new Invoice
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            InvoiceNumber = "INV-2026-0001",
            CustomerId = customer.Id,
            TotalAmount = 5000m,
            AmountPaid = 2000m,
            DueDateUtc = DateTime.UtcNow.AddDays(15),
            Status = InvoiceStatus.PartiallyPaid
        };
        var inv2 = new Invoice
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            InvoiceNumber = "INV-2026-0002",
            CustomerId = customer.Id,
            TotalAmount = 3000m,
            AmountPaid = 3000m,
            DueDateUtc = DateTime.UtcNow.AddDays(5),
            Status = InvoiceStatus.Paid
        };
        db.Invoices.AddRange(inv1, inv2);

        // Seed Deal
        var deal = new Deal
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            CustomerId = customer.Id,
            Title = "Enterprise Cloud Expansion",
            Amount = 15000m,
            Probability = 80,
            Stage = DealStage.Negotiation
        };
        db.Deals.Add(deal);

        // Seed Support Ticket
        var ticket = new SupportTicket
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            CustomerId = customer.Id,
            TicketNumber = "TCK-1001",
            Subject = "Network Gateway Timeout",
            Description = "Gateway times out intermittently",
            Priority = TicketPriority.Urgent,
            Status = TicketStatus.Open
        };
        db.SupportTickets.Add(ticket);

        // Seed Product & Inventory
        var branch = new Branch { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Austin HQ" };
        var product = new Product
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Sku = "TITAN-X1",
            Name = "Titan Industrial Gateway",
            Category = ProductCategory.Hardware,
            UnitCost = 400m,
            UnitPrice = 850m,
            ReorderLevel = 10
        };
        var inventory = new ProductInventory
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            BranchId = branch.Id,
            ProductId = product.Id,
            QuantityOnHand = 25m
        };
        db.Branches.Add(branch);
        db.Products.Add(product);
        db.ProductInventories.Add(inventory);

        // Seed Work Order
        var workOrder = new WorkOrder
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            OrderNumber = "WO-2026-0001",
            ProductId = product.Id,
            BranchId = branch.Id,
            QuantityTarget = 50m,
            QuantityProduced = 20m,
            Status = WorkOrderStatus.InProgress
        };
        db.WorkOrders.Add(workOrder);

        // Seed Employee & Attendance
        var emp = new EmployeeProfile
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            UserId = "emp-1",
            EmployeeNumber = "EMP-001",
            FirstName = "John",
            LastName = "Doe",
            IsActive = true
        };
        var att = new AttendanceLog
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            EmployeeId = emp.Id,
            Date = DateTime.UtcNow.Date,
            CheckInTimeUtc = DateTime.UtcNow.Date.AddHours(9),
            Status = AttendanceStatus.Present
        };
        db.Employees.Add(emp);
        db.AttendanceLogs.Add(att);

        await db.SaveChangesAsync();

        // Act
        var overview = await reportingService.GetExecutiveOverviewAsync(null, null);

        // Assert
        overview.Should().NotBeNull();

        // Financial
        overview.Financial.TotalInvoiced.Should().Be(8000m);
        overview.Financial.TotalCollected.Should().Be(5000m);
        overview.Financial.OutstandingAr.Should().Be(3000m);
        overview.Financial.CollectionRate.Should().Be(62.5m);

        // Sales
        overview.Sales.TotalPipelineValue.Should().Be(15000m);
        overview.Sales.WeightedPipelineValue.Should().Be(12000m); // 15000 * 80%

        // Support
        overview.Support.TotalTickets.Should().Be(1);
        overview.Support.OpenTickets.Should().Be(1);
        overview.Support.UrgentTickets.Should().Be(1);

        // Inventory
        overview.Inventory.TotalSkus.Should().Be(1);
        overview.Inventory.TotalValuation.Should().Be(10000m); // 25 * 400

        // Manufacturing
        overview.Manufacturing.TotalWorkOrders.Should().Be(1);
        overview.Manufacturing.ActiveWorkOrders.Should().Be(1);
        overview.Manufacturing.TotalUnitsProduced.Should().Be(20m);

        // Workforce
        overview.Workforce.TotalEmployees.Should().Be(1);
        overview.Workforce.PresentToday.Should().Be(1);
        overview.Workforce.AttendanceRatePercent.Should().Be(100m);
    }

    [Fact]
    public async Task ExecutiveOverview_EnforcesMultiTenantIsolation()
    {
        var (db, tenantContext, userService, reportingService) = SetupTestEnvironment();
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();

        // Tenant A Invoices
        var invA = new Invoice
        {
            Id = Guid.NewGuid(),
            TenantId = tenantA,
            InvoiceNumber = "INV-A-1",
            TotalAmount = 10000m,
            AmountPaid = 10000m,
            Status = InvoiceStatus.Paid
        };

        // Tenant B Invoices
        var invB = new Invoice
        {
            Id = Guid.NewGuid(),
            TenantId = tenantB,
            InvoiceNumber = "INV-B-1",
            TotalAmount = 50000m,
            AmountPaid = 50000m,
            Status = InvoiceStatus.Paid
        };

        db.Invoices.AddRange(invA, invB);
        await db.SaveChangesAsync();

        // Query in Tenant A context
        tenantContext.SetContext(tenantA, "admin-a", TenantRole.Owner);
        userService.UserId = "admin-a";

        var overviewA = await reportingService.GetExecutiveOverviewAsync(null, null);

        overviewA.Financial.TotalInvoiced.Should().Be(10000m);
        overviewA.Financial.InvoiceCount.Should().Be(1);
    }

    [Fact]
    public async Task ExportReport_GeneratesCsvContent_AndLogsHistory()
    {
        var (db, tenantContext, userService, reportingService) = SetupTestEnvironment();
        var tenantId = Guid.NewGuid();

        tenantContext.SetContext(tenantId, "admin-1", TenantRole.Owner);
        userService.UserId = "admin-1";

        var customer = new Customer { Id = Guid.NewGuid(), TenantId = tenantId, CompanyName = "Enterprise Global" };
        var inv = new Invoice
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            InvoiceNumber = "INV-2026-0099",
            CustomerId = customer.Id,
            TotalAmount = 4500m,
            AmountPaid = 4500m,
            Status = InvoiceStatus.Paid
        };
        db.Customers.Add(customer);
        db.Invoices.Add(inv);
        await db.SaveChangesAsync();

        var request = new ReportExportRequest
        {
            ReportType = ReportType.FinancialSummary,
            Format = ExportFormat.Csv
        };

        var export = await reportingService.ExportReportAsync(request);

        export.Should().NotBeNull();
        export.FileName.Should().EndWith(".csv");
        export.MimeType.Should().Be("text/csv");
        export.Content.Should().Contain("InvoiceNumber,CustomerName");
        export.Content.Should().Contain("INV-2026-0099");
        export.Content.Should().Contain("Enterprise Global");
        export.RecordCount.Should().Be(1);

        // Verify History
        var history = await reportingService.GetExportHistoryAsync();
        history.Should().ContainSingle(h => h.Title.Contains("Financial"));
    }

    [Fact]
    public async Task ExportReport_GeneratesJsonContent_ForSalesPipeline()
    {
        var (db, tenantContext, userService, reportingService) = SetupTestEnvironment();
        var tenantId = Guid.NewGuid();

        tenantContext.SetContext(tenantId, "admin-1", TenantRole.Owner);
        userService.UserId = "admin-1";

        var customer = new Customer { Id = Guid.NewGuid(), TenantId = tenantId, CompanyName = "Acme Global" };
        var deal = new Deal
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            CustomerId = customer.Id,
            Title = "Mega Deal",
            Amount = 100000m,
            Probability = 90,
            Stage = DealStage.Proposal
        };
        db.Customers.Add(customer);
        db.Deals.Add(deal);
        await db.SaveChangesAsync();

        var request = new ReportExportRequest
        {
            ReportType = ReportType.SalesPipeline,
            Format = ExportFormat.Json
        };

        var export = await reportingService.ExportReportAsync(request);

        export.Should().NotBeNull();
        export.FileName.Should().EndWith(".json");
        export.MimeType.Should().Be("application/json");
        export.Content.Should().Contain("Mega Deal");
        export.Content.Should().Contain("100000");
    }
}
