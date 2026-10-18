using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Orbit.Application.Common.Exceptions;
using Orbit.Application.Modules.Finance.Dtos;
using Orbit.Domain.Entities;
using Orbit.Domain.Enums;
using Orbit.Infrastructure.Persistence;
using Orbit.Infrastructure.Services;
using Xunit;

namespace Orbit.Tests.Modules;

public class InvoiceTests
{
    private (OrbitDbContext db, TenantContext tenantContext, FakeCurrentUserService userService, InvoiceService invoiceService)
        SetupTestEnvironment()
    {
        var tenantContext = new TenantContext();
        var userService = new FakeCurrentUserService();

        var options = new DbContextOptionsBuilder<OrbitDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var db = new OrbitDbContext(options, tenantContext, userService);
        var auditService = new AuditService(db, tenantContext, userService);
        var invoiceService = new InvoiceService(db, tenantContext, userService, auditService);

        return (db, tenantContext, userService, invoiceService);
    }

    [Fact]
    public async Task Admin_CanCreateDraftInvoice_WithLineItemsAndMath()
    {
        var (db, tenantContext, userService, invoiceService) = SetupTestEnvironment();
        var tenantId = Guid.NewGuid();

        tenantContext.SetContext(tenantId, "admin-1", TenantRole.Admin);
        userService.UserId = "admin-1";

        var customer = new Customer { Id = Guid.NewGuid(), TenantId = tenantId, CompanyName = "Apex Technology Corp" };
        var product = new Product { Id = Guid.NewGuid(), TenantId = tenantId, Sku = "SRV-EDGE-1", Name = "Edge Server", UnitPrice = 1000m, UnitCost = 600m };
        db.Customers.Add(customer);
        db.Products.Add(product);
        await db.SaveChangesAsync();

        var request = new CreateInvoiceRequest
        {
            CustomerId = customer.Id,
            Currency = "USD",
            TaxRate = 10m, // 10%
            DiscountAmount = 200m,
            Items = new List<CreateInvoiceItemRequest>
            {
                new() { ProductId = product.Id, Description = "Edge Server Unit", Quantity = 2, UnitPrice = 1000m }, // 2000
                new() { Description = "Configuration Service", Quantity = 5, UnitPrice = 100m } // 500
            }
        };

        var invoice = await invoiceService.CreateInvoiceAsync(request);

        invoice.Should().NotBeNull();
        invoice.InvoiceNumber.Should().StartWith("INV-");
        invoice.Status.Should().Be(InvoiceStatus.Draft);
        invoice.CustomerName.Should().Be("Apex Technology Corp");
        invoice.Items.Should().HaveCount(2);

        // Subtotal = 2000 + 500 = 2500
        invoice.Subtotal.Should().Be(2500m);
        invoice.DiscountAmount.Should().Be(200m);
        // Taxable = 2500 - 200 = 2300. Tax = 2300 * 10% = 230
        invoice.TaxAmount.Should().Be(230m);
        // Total = 2300 + 230 = 2530
        invoice.TotalAmount.Should().Be(2530m);
        invoice.AmountPaid.Should().Be(0m);
        invoice.BalanceDue.Should().Be(2530m);
    }

    [Fact]
    public async Task Employee_CannotCreateInvoice_ThrowsForbiddenException()
    {
        var (db, tenantContext, userService, invoiceService) = SetupTestEnvironment();
        var tenantId = Guid.NewGuid();

        tenantContext.SetContext(tenantId, "emp-1", TenantRole.Employee);
        userService.UserId = "emp-1";

        var customer = new Customer { Id = Guid.NewGuid(), TenantId = tenantId, CompanyName = "Acme Global" };
        db.Customers.Add(customer);
        await db.SaveChangesAsync();

        var request = new CreateInvoiceRequest
        {
            CustomerId = customer.Id,
            Items = new List<CreateInvoiceItemRequest>
            {
                new() { Description = "Consulting Hour", Quantity = 1, UnitPrice = 150m }
            }
        };

        Func<Task> act = async () => await invoiceService.CreateInvoiceAsync(request);
        await act.Should().ThrowAsync<ForbiddenAccessException>()
            .WithMessage("*administrative permission*");
    }

    [Fact]
    public async Task IssueInvoice_TransitionsDraftToIssued()
    {
        var (db, tenantContext, userService, invoiceService) = SetupTestEnvironment();
        var tenantId = Guid.NewGuid();

        tenantContext.SetContext(tenantId, "mgr-1", TenantRole.Manager);
        userService.UserId = "mgr-1";

        var customer = new Customer { Id = Guid.NewGuid(), TenantId = tenantId, CompanyName = "Vanguard Systems" };
        var invoice = new Invoice
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            CustomerId = customer.Id,
            InvoiceNumber = "INV-2026-0001",
            Status = InvoiceStatus.Draft,
            TotalAmount = 1500m
        };
        db.Customers.Add(customer);
        db.Invoices.Add(invoice);
        await db.SaveChangesAsync();

        var result = await invoiceService.IssueInvoiceAsync(invoice.Id);

        result.Status.Should().Be(InvoiceStatus.Issued);
        result.IssueDateUtc.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public async Task RecordPayment_PartialPayment_UpdatesStatusToPartiallyPaid()
    {
        var (db, tenantContext, userService, invoiceService) = SetupTestEnvironment();
        var tenantId = Guid.NewGuid();

        tenantContext.SetContext(tenantId, "mgr-1", TenantRole.Manager);
        userService.UserId = "mgr-1";

        var customer = new Customer { Id = Guid.NewGuid(), TenantId = tenantId, CompanyName = "Helios Dynamics" };
        var invoice = new Invoice
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            CustomerId = customer.Id,
            InvoiceNumber = "INV-2026-0002",
            Status = InvoiceStatus.Issued,
            TotalAmount = 5000m,
            AmountPaid = 0m
        };
        db.Customers.Add(customer);
        db.Invoices.Add(invoice);
        await db.SaveChangesAsync();

        var payment = await invoiceService.RecordPaymentAsync(invoice.Id, new RecordPaymentRequest
        {
            Amount = 2000m,
            Method = PaymentMethod.BankTransfer,
            ReferenceNumber = "WIRE-88910"
        });

        payment.Amount.Should().Be(2000m);
        payment.PaymentNumber.Should().StartWith("PAY-");

        var updatedInvoice = await db.Invoices.FirstAsync(i => i.Id == invoice.Id);
        updatedInvoice.Status.Should().Be(InvoiceStatus.PartiallyPaid);
        updatedInvoice.AmountPaid.Should().Be(2000m);
        updatedInvoice.BalanceDue.Should().Be(3000m);
    }

    [Fact]
    public async Task RecordPayment_FullPayment_TransitionsToPaid()
    {
        var (db, tenantContext, userService, invoiceService) = SetupTestEnvironment();
        var tenantId = Guid.NewGuid();

        tenantContext.SetContext(tenantId, "admin-1", TenantRole.Admin);
        userService.UserId = "admin-1";

        var customer = new Customer { Id = Guid.NewGuid(), TenantId = tenantId, CompanyName = "Quantum Logistics" };
        var invoice = new Invoice
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            CustomerId = customer.Id,
            InvoiceNumber = "INV-2026-0003",
            Status = InvoiceStatus.PartiallyPaid,
            TotalAmount = 3000m,
            AmountPaid = 1000m
        };
        db.Customers.Add(customer);
        db.Invoices.Add(invoice);
        await db.SaveChangesAsync();

        await invoiceService.RecordPaymentAsync(invoice.Id, new RecordPaymentRequest
        {
            Amount = 2000m,
            Method = PaymentMethod.CreditCard,
            ReferenceNumber = "AUTH-44129"
        });

        var updated = await db.Invoices.FirstAsync(i => i.Id == invoice.Id);
        updated.Status.Should().Be(InvoiceStatus.Paid);
        updated.AmountPaid.Should().Be(3000m);
        updated.BalanceDue.Should().Be(0m);
        updated.PaidAtUtc.Should().NotBeNull();
    }

    [Fact]
    public async Task RecordPayment_ExceedingBalance_ThrowsValidationException()
    {
        var (db, tenantContext, userService, invoiceService) = SetupTestEnvironment();
        var tenantId = Guid.NewGuid();

        tenantContext.SetContext(tenantId, "mgr-1", TenantRole.Manager);
        userService.UserId = "mgr-1";

        var customer = new Customer { Id = Guid.NewGuid(), TenantId = tenantId, CompanyName = "Orion Aero" };
        var invoice = new Invoice
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            CustomerId = customer.Id,
            InvoiceNumber = "INV-2026-0004",
            Status = InvoiceStatus.Issued,
            TotalAmount = 1000m,
            AmountPaid = 0m
        };
        db.Customers.Add(customer);
        db.Invoices.Add(invoice);
        await db.SaveChangesAsync();

        Func<Task> act = async () => await invoiceService.RecordPaymentAsync(invoice.Id, new RecordPaymentRequest
        {
            Amount = 1500m, // Exceeds 1000
            Method = PaymentMethod.BankTransfer
        });

        await act.Should().ThrowAsync<ValidationException>()
            .WithMessage("*exceeds the remaining balance*");
    }

    [Fact]
    public async Task FinancialMetrics_CalculatesTotalsAndOutstandingCorrectly()
    {
        var (db, tenantContext, userService, invoiceService) = SetupTestEnvironment();
        var tenantId = Guid.NewGuid();

        tenantContext.SetContext(tenantId, "admin-1", TenantRole.Admin);
        userService.UserId = "admin-1";

        var customer = new Customer { Id = Guid.NewGuid(), TenantId = tenantId, CompanyName = "Solaris Inc" };
        db.Customers.Add(customer);

        // Invoice 1: Paid ($2000 total, $2000 paid)
        var inv1 = new Invoice { Id = Guid.NewGuid(), TenantId = tenantId, CustomerId = customer.Id, InvoiceNumber = "INV-1", Status = InvoiceStatus.Paid, TotalAmount = 2000m, AmountPaid = 2000m, IssueDateUtc = DateTime.UtcNow, DueDateUtc = DateTime.UtcNow.AddDays(10) };

        // Invoice 2: PartiallyPaid ($5000 total, $2000 paid, $3000 outstanding)
        var inv2 = new Invoice { Id = Guid.NewGuid(), TenantId = tenantId, CustomerId = customer.Id, InvoiceNumber = "INV-2", Status = InvoiceStatus.PartiallyPaid, TotalAmount = 5000m, AmountPaid = 2000m, IssueDateUtc = DateTime.UtcNow, DueDateUtc = DateTime.UtcNow.AddDays(15) };

        // Invoice 3: Overdue ($1000 total, $0 paid, DueDate 5 days ago)
        var inv3 = new Invoice { Id = Guid.NewGuid(), TenantId = tenantId, CustomerId = customer.Id, InvoiceNumber = "INV-3", Status = InvoiceStatus.Issued, TotalAmount = 1000m, AmountPaid = 0m, IssueDateUtc = DateTime.UtcNow.AddDays(-35), DueDateUtc = DateTime.UtcNow.AddDays(-5) };

        // Invoice 4: Draft ($800 total - excluded from invoiced receivables)
        var inv4 = new Invoice { Id = Guid.NewGuid(), TenantId = tenantId, CustomerId = customer.Id, InvoiceNumber = "INV-4", Status = InvoiceStatus.Draft, TotalAmount = 800m, AmountPaid = 0m, IssueDateUtc = DateTime.UtcNow, DueDateUtc = DateTime.UtcNow.AddDays(30) };

        db.Invoices.AddRange(inv1, inv2, inv3, inv4);
        await db.SaveChangesAsync();

        var metrics = await invoiceService.GetFinancialMetricsAsync();

        // Invoiced: inv1 (2000) + inv2 (5000) + inv3 (1000) = 8000
        metrics.TotalInvoicedAmount.Should().Be(8000m);
        // Collected: inv1 (2000) + inv2 (2000) = 4000
        metrics.TotalCollectedAmount.Should().Be(4000m);
        // Outstanding: inv2 (3000) + inv3 (1000) = 4000
        metrics.TotalOutstandingAmount.Should().Be(4000m);
        // Overdue: inv3 (1000)
        metrics.TotalOverdueAmount.Should().Be(1000m);
        // Collection rate: 4000 / 8000 = 50%
        metrics.CollectionRatePercentage.Should().Be(50.0);
        metrics.DraftInvoicesCount.Should().Be(1);
        metrics.IssuedInvoicesCount.Should().Be(1);
        metrics.PartiallyPaidInvoicesCount.Should().Be(1);
        metrics.PaidInvoicesCount.Should().Be(1);
    }
}
