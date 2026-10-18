using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Orbit.Application.Common;
using Orbit.Application.Common.Exceptions;
using Orbit.Application.Interfaces;
using Orbit.Application.Modules.Finance;
using Orbit.Application.Modules.Finance.Dtos;
using Orbit.Domain.Entities;
using Orbit.Domain.Enums;

namespace Orbit.Infrastructure.Services;

public class InvoiceService : IInvoiceService
{
    private readonly IApplicationDbContext _context;
    private readonly ITenantContext _tenantContext;
    private readonly ICurrentUserService _currentUserService;
    private readonly IAuditService _auditService;

    public InvoiceService(
        IApplicationDbContext context,
        ITenantContext tenantContext,
        ICurrentUserService currentUserService,
        IAuditService auditService)
    {
        _context = context;
        _tenantContext = tenantContext;
        _currentUserService = currentUserService;
        _auditService = auditService;
    }

    public async Task<PagedResponse<InvoiceDto>> GetInvoicesAsync(InvoiceFilterRequest filter, CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var query = _context.Invoices
            .Include(i => i.Customer)
            .Include(i => i.Deal)
            .Include(i => i.Items)
                .ThenInclude(item => item.Product)
            .Include(i => i.Payments)
                .ThenInclude(p => p.RecordedByEmployee)
            .AsQueryable();

        if (filter.Status.HasValue)
        {
            query = query.Where(i => i.Status == filter.Status.Value);
        }

        if (filter.CustomerId.HasValue)
        {
            query = query.Where(i => i.CustomerId == filter.CustomerId.Value);
        }

        if (filter.IsOverdue.HasValue)
        {
            if (filter.IsOverdue.Value)
            {
                query = query.Where(i =>
                    (i.Status == InvoiceStatus.Issued || i.Status == InvoiceStatus.PartiallyPaid) &&
                    i.DueDateUtc < now);
            }
            else
            {
                query = query.Where(i =>
                    i.Status == InvoiceStatus.Paid ||
                    i.DueDateUtc >= now);
            }
        }

        if (filter.FromDateUtc.HasValue)
        {
            query = query.Where(i => i.IssueDateUtc >= filter.FromDateUtc.Value);
        }

        if (filter.ToDateUtc.HasValue)
        {
            query = query.Where(i => i.IssueDateUtc <= filter.ToDateUtc.Value);
        }

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var s = filter.Search.Trim().ToLower();
            query = query.Where(i =>
                i.InvoiceNumber.ToLower().Contains(s) ||
                i.Customer.CompanyName.ToLower().Contains(s) ||
                (i.Notes != null && i.Notes.ToLower().Contains(s)));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var skip = (filter.PageNumber - 1) * filter.PageSize;

        var items = await query
            .OrderByDescending(i => i.IssueDateUtc)
            .Skip(skip)
            .Take(filter.PageSize)
            .ToListAsync(cancellationToken);

        var dtos = items.Select(MapToDto).ToList();
        return new PagedResponse<InvoiceDto>(dtos, totalCount, filter.PageNumber, filter.PageSize);
    }

    public async Task<InvoiceDto> GetInvoiceByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var invoice = await _context.Invoices
            .Include(i => i.Customer)
            .Include(i => i.Deal)
            .Include(i => i.Items)
                .ThenInclude(item => item.Product)
            .Include(i => i.Payments)
                .ThenInclude(p => p.RecordedByEmployee)
            .FirstOrDefaultAsync(i => i.Id == id, cancellationToken);

        if (invoice == null)
        {
            throw new NotFoundException($"Invoice with ID '{id}' was not found.");
        }

        return MapToDto(invoice);
    }

    public async Task<InvoiceDto> CreateInvoiceAsync(CreateInvoiceRequest request, CancellationToken cancellationToken = default)
    {
        EnforceFinanceWritePermission();

        var customer = await _context.Customers.FirstOrDefaultAsync(c => c.Id == request.CustomerId, cancellationToken);
        if (customer == null)
        {
            throw new NotFoundException($"Customer with ID '{request.CustomerId}' was not found.");
        }

        if (request.Items == null || request.Items.Count == 0)
        {
            throw new ValidationException("An invoice must contain at least one line item.");
        }

        // Generate sequential invoice number per tenant
        var count = await _context.Invoices.CountAsync(cancellationToken);
        var year = DateTime.UtcNow.Year;
        var invoiceNumber = $"INV-{year}-{(count + 1):D4}";
        while (await _context.Invoices.AnyAsync(i => i.InvoiceNumber == invoiceNumber, cancellationToken))
        {
            count++;
            invoiceNumber = $"INV-{year}-{(count + 1):D4}";
        }

        var invoice = new Invoice
        {
            InvoiceNumber = invoiceNumber,
            CustomerId = customer.Id,
            DealId = request.DealId,
            IssueDateUtc = request.IssueDateUtc ?? DateTime.UtcNow,
            DueDateUtc = request.DueDateUtc ?? DateTime.UtcNow.AddDays(30),
            Currency = string.IsNullOrWhiteSpace(request.Currency) ? "USD" : request.Currency.Trim(),
            Status = InvoiceStatus.Draft,
            TaxRate = request.TaxRate,
            DiscountAmount = request.DiscountAmount,
            Notes = request.Notes?.Trim(),
            TermsAndConditions = request.TermsAndConditions?.Trim()
        };

        decimal subtotal = 0;
        foreach (var reqItem in request.Items)
        {
            if (string.IsNullOrWhiteSpace(reqItem.Description))
            {
                throw new ValidationException("Each invoice item must have a description.");
            }

            if (reqItem.Quantity <= 0)
            {
                throw new ValidationException("Item quantity must be greater than zero.");
            }

            var itemTotal = Math.Round(reqItem.Quantity * reqItem.UnitPrice, 2);
            var itemTax = Math.Round(itemTotal * (request.TaxRate / 100m), 2);

            var item = new InvoiceItem
            {
                Invoice = invoice,
                ProductId = reqItem.ProductId,
                Description = reqItem.Description.Trim(),
                Quantity = reqItem.Quantity,
                UnitPrice = reqItem.UnitPrice,
                TaxAmount = itemTax,
                TotalAmount = itemTotal
            };

            invoice.Items.Add(item);
            subtotal += itemTotal;
        }

        invoice.Subtotal = subtotal;
        var taxableAmount = Math.Max(0, subtotal - request.DiscountAmount);
        invoice.TaxAmount = Math.Round(taxableAmount * (request.TaxRate / 100m), 2);
        invoice.TotalAmount = Math.Max(0, taxableAmount + invoice.TaxAmount);
        invoice.AmountPaid = 0;

        _context.Invoices.Add(invoice);
        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            action: "CreateInvoice",
            entityName: nameof(Invoice),
            entityId: invoice.Id.ToString(),
            details: $"Created draft invoice '{invoice.InvoiceNumber}' for '{customer.CompanyName}' ({invoice.TotalAmount:C})",
            cancellationToken: cancellationToken);

        return await GetInvoiceByIdAsync(invoice.Id, cancellationToken);
    }

    public async Task<InvoiceDto> UpdateInvoiceAsync(Guid id, UpdateInvoiceRequest request, CancellationToken cancellationToken = default)
    {
        EnforceFinanceWritePermission();

        var invoice = await _context.Invoices
            .Include(i => i.Items)
            .FirstOrDefaultAsync(i => i.Id == id, cancellationToken);

        if (invoice == null)
        {
            throw new NotFoundException($"Invoice with ID '{id}' was not found.");
        }

        if (invoice.Status == InvoiceStatus.Paid || invoice.Status == InvoiceStatus.Void)
        {
            throw new ValidationException($"Cannot modify an invoice with status '{invoice.Status}'.");
        }

        var customer = await _context.Customers.FirstOrDefaultAsync(c => c.Id == request.CustomerId, cancellationToken);
        if (customer == null)
        {
            throw new NotFoundException($"Customer with ID '{request.CustomerId}' was not found.");
        }

        if (request.Items == null || request.Items.Count == 0)
        {
            throw new ValidationException("An invoice must contain at least one line item.");
        }

        invoice.CustomerId = customer.Id;
        invoice.DealId = request.DealId;
        invoice.DueDateUtc = request.DueDateUtc;
        invoice.TaxRate = request.TaxRate;
        invoice.DiscountAmount = request.DiscountAmount;
        invoice.Notes = request.Notes?.Trim();
        invoice.TermsAndConditions = request.TermsAndConditions?.Trim();

        // Clear existing items and rebuild
        _context.InvoiceItems.RemoveRange(invoice.Items);
        invoice.Items.Clear();

        decimal subtotal = 0;
        foreach (var reqItem in request.Items)
        {
            var itemTotal = Math.Round(reqItem.Quantity * reqItem.UnitPrice, 2);
            var itemTax = Math.Round(itemTotal * (request.TaxRate / 100m), 2);

            var item = new InvoiceItem
            {
                Invoice = invoice,
                ProductId = reqItem.ProductId,
                Description = reqItem.Description.Trim(),
                Quantity = reqItem.Quantity,
                UnitPrice = reqItem.UnitPrice,
                TaxAmount = itemTax,
                TotalAmount = itemTotal
            };

            invoice.Items.Add(item);
            subtotal += itemTotal;
        }

        invoice.Subtotal = subtotal;
        var taxableAmount = Math.Max(0, subtotal - request.DiscountAmount);
        invoice.TaxAmount = Math.Round(taxableAmount * (request.TaxRate / 100m), 2);
        invoice.TotalAmount = Math.Max(0, taxableAmount + invoice.TaxAmount);

        // Recalculate status in case AmountPaid equals or exceeds updated TotalAmount
        if (invoice.AmountPaid >= invoice.TotalAmount && invoice.TotalAmount > 0)
        {
            invoice.Status = InvoiceStatus.Paid;
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            action: "UpdateInvoice",
            entityName: nameof(Invoice),
            entityId: invoice.Id.ToString(),
            details: $"Updated invoice '{invoice.InvoiceNumber}'",
            cancellationToken: cancellationToken);

        return await GetInvoiceByIdAsync(invoice.Id, cancellationToken);
    }

    public async Task<InvoiceDto> IssueInvoiceAsync(Guid id, CancellationToken cancellationToken = default)
    {
        EnforceFinanceWritePermission();

        var invoice = await _context.Invoices.FirstOrDefaultAsync(i => i.Id == id, cancellationToken);
        if (invoice == null)
        {
            throw new NotFoundException($"Invoice with ID '{id}' was not found.");
        }

        if (invoice.Status != InvoiceStatus.Draft)
        {
            throw new ValidationException($"Only draft invoices can be issued. Current status: '{invoice.Status}'.");
        }

        invoice.Status = InvoiceStatus.Issued;
        invoice.IssueDateUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            action: "IssueInvoice",
            entityName: nameof(Invoice),
            entityId: invoice.Id.ToString(),
            details: $"Issued invoice '{invoice.InvoiceNumber}' ({invoice.TotalAmount:C})",
            cancellationToken: cancellationToken);

        return await GetInvoiceByIdAsync(invoice.Id, cancellationToken);
    }

    public async Task<InvoiceDto> VoidInvoiceAsync(Guid id, CancellationToken cancellationToken = default)
    {
        EnforceFinanceWritePermission();

        var invoice = await _context.Invoices.FirstOrDefaultAsync(i => i.Id == id, cancellationToken);
        if (invoice == null)
        {
            throw new NotFoundException($"Invoice with ID '{id}' was not found.");
        }

        if (invoice.Status == InvoiceStatus.Void)
        {
            throw new ValidationException("Invoice is already voided.");
        }

        if (invoice.Status == InvoiceStatus.Paid)
        {
            throw new ValidationException("Cannot void a fully paid invoice. Issue a credit note or refund instead.");
        }

        invoice.Status = InvoiceStatus.Void;

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            action: "VoidInvoice",
            entityName: nameof(Invoice),
            entityId: invoice.Id.ToString(),
            details: $"Voided invoice '{invoice.InvoiceNumber}'",
            cancellationToken: cancellationToken);

        return await GetInvoiceByIdAsync(invoice.Id, cancellationToken);
    }

    public async Task<PaymentRecordDto> RecordPaymentAsync(Guid invoiceId, RecordPaymentRequest request, CancellationToken cancellationToken = default)
    {
        if (request.Amount <= 0)
        {
            throw new ValidationException("Payment amount must be greater than zero.");
        }

        var invoice = await _context.Invoices
            .Include(i => i.Payments)
            .FirstOrDefaultAsync(i => i.Id == invoiceId, cancellationToken);

        if (invoice == null)
        {
            throw new NotFoundException($"Invoice with ID '{invoiceId}' was not found.");
        }

        if (invoice.Status == InvoiceStatus.Draft || invoice.Status == InvoiceStatus.Void)
        {
            throw new ValidationException($"Cannot record payments against an invoice with status '{invoice.Status}'. The invoice must be issued first.");
        }

        var balanceRemaining = invoice.TotalAmount - invoice.AmountPaid;
        if (request.Amount > balanceRemaining)
        {
            throw new ValidationException($"Payment amount ({request.Amount:C}) exceeds the remaining balance due ({balanceRemaining:C}).");
        }

        var payCount = await _context.PaymentRecords.CountAsync(cancellationToken);
        var payYear = DateTime.UtcNow.Year;
        var payNumber = $"PAY-{payYear}-{(payCount + 1):D4}";
        while (await _context.PaymentRecords.AnyAsync(p => p.PaymentNumber == payNumber, cancellationToken))
        {
            payCount++;
            payNumber = $"PAY-{payYear}-{(payCount + 1):D4}";
        }

        var currentEmployee = await GetCurrentEmployeeAsync(cancellationToken);

        var payment = new PaymentRecord
        {
            InvoiceId = invoice.Id,
            PaymentNumber = payNumber,
            Amount = request.Amount,
            PaymentDateUtc = request.PaymentDateUtc ?? DateTime.UtcNow,
            Method = request.Method,
            ReferenceNumber = request.ReferenceNumber?.Trim(),
            Notes = request.Notes?.Trim(),
            RecordedByEmployeeId = currentEmployee?.Id
        };

        invoice.AmountPaid += request.Amount;

        if (invoice.AmountPaid >= invoice.TotalAmount)
        {
            invoice.Status = InvoiceStatus.Paid;
            invoice.PaidAtUtc = DateTime.UtcNow;
        }
        else
        {
            invoice.Status = InvoiceStatus.PartiallyPaid;
        }

        _context.PaymentRecords.Add(payment);
        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            action: "RecordPayment",
            entityName: nameof(PaymentRecord),
            entityId: payment.Id.ToString(),
            details: $"Recorded payment of {payment.Amount:C} ({payment.Method}) for invoice '{invoice.InvoiceNumber}'",
            cancellationToken: cancellationToken);

        return new PaymentRecordDto
        {
            Id = payment.Id,
            InvoiceId = invoice.Id,
            PaymentNumber = payment.PaymentNumber,
            Amount = payment.Amount,
            PaymentDateUtc = payment.PaymentDateUtc,
            Method = payment.Method,
            ReferenceNumber = payment.ReferenceNumber,
            Notes = payment.Notes,
            RecordedByEmployeeId = currentEmployee?.Id,
            RecordedByEmployeeName = currentEmployee != null ? $"{currentEmployee.FirstName} {currentEmployee.LastName}".Trim() : null
        };
    }

    public async Task DeleteInvoiceAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var role = _tenantContext.CurrentRole ?? TenantRole.Employee;
        if (role != TenantRole.Owner && role != TenantRole.Admin)
        {
            throw new ForbiddenAccessException("Only company Administrators and Owners can delete invoices.");
        }

        var invoice = await _context.Invoices.FirstOrDefaultAsync(i => i.Id == id, cancellationToken);
        if (invoice == null)
        {
            throw new NotFoundException($"Invoice with ID '{id}' was not found.");
        }

        if (invoice.Status != InvoiceStatus.Draft)
        {
            throw new ValidationException($"Only draft invoices can be permanently deleted. Issued invoices must be voided to preserve audit history.");
        }

        _context.Invoices.Remove(invoice);
        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            action: "DeleteInvoice",
            entityName: nameof(Invoice),
            entityId: id.ToString(),
            details: $"Deleted draft invoice '{invoice.InvoiceNumber}'",
            cancellationToken: cancellationToken);
    }

    public async Task<FinancialMetricsDto> GetFinancialMetricsAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var invoices = await _context.Invoices.ToListAsync(cancellationToken);

        var billable = invoices.Where(i => i.Status != InvoiceStatus.Draft && i.Status != InvoiceStatus.Void).ToList();

        var totalInvoiced = billable.Sum(i => i.TotalAmount);
        var totalCollected = invoices.Where(i => i.Status != InvoiceStatus.Void).Sum(i => i.AmountPaid);
        var totalOutstanding = billable.Sum(i => Math.Max(0, i.TotalAmount - i.AmountPaid));
        var totalOverdue = billable.Where(i => i.DueDateUtc < now && (i.Status == InvoiceStatus.Issued || i.Status == InvoiceStatus.PartiallyPaid))
            .Sum(i => Math.Max(0, i.TotalAmount - i.AmountPaid));

        var collectionRate = totalInvoiced > 0
            ? Math.Round((double)(totalCollected / totalInvoiced) * 100, 1)
            : 0;

        return new FinancialMetricsDto
        {
            TotalInvoicedAmount = totalInvoiced,
            TotalCollectedAmount = totalCollected,
            TotalOutstandingAmount = totalOutstanding,
            TotalOverdueAmount = totalOverdue,
            TotalInvoicesCount = invoices.Count,
            DraftInvoicesCount = invoices.Count(i => i.Status == InvoiceStatus.Draft),
            IssuedInvoicesCount = invoices.Count(i => i.Status == InvoiceStatus.Issued),
            PartiallyPaidInvoicesCount = invoices.Count(i => i.Status == InvoiceStatus.PartiallyPaid),
            PaidInvoicesCount = invoices.Count(i => i.Status == InvoiceStatus.Paid),
            CollectionRatePercentage = collectionRate
        };
    }

    private void EnforceFinanceWritePermission()
    {
        var role = _tenantContext.CurrentRole ?? TenantRole.Employee;
        if (role == TenantRole.Employee)
        {
            throw new ForbiddenAccessException("Employees do not have administrative permission to create or modify financial invoices.");
        }
    }

    private static InvoiceDto MapToDto(Invoice inv)
    {
        return new InvoiceDto
        {
            Id = inv.Id,
            TenantId = inv.TenantId,
            InvoiceNumber = inv.InvoiceNumber,
            CustomerId = inv.CustomerId,
            CustomerName = inv.Customer?.CompanyName ?? string.Empty,
            CustomerEmail = inv.Customer?.Email,
            DealId = inv.DealId,
            DealTitle = inv.Deal?.Title,
            IssueDateUtc = inv.IssueDateUtc,
            DueDateUtc = inv.DueDateUtc,
            PaidAtUtc = inv.PaidAtUtc,
            Status = inv.Status,
            Currency = inv.Currency,
            Subtotal = inv.Subtotal,
            TaxRate = inv.TaxRate,
            TaxAmount = inv.TaxAmount,
            DiscountAmount = inv.DiscountAmount,
            TotalAmount = inv.TotalAmount,
            AmountPaid = inv.AmountPaid,
            Notes = inv.Notes,
            TermsAndConditions = inv.TermsAndConditions,
            Items = inv.Items.Select(i => new InvoiceItemDto
            {
                Id = i.Id,
                InvoiceId = i.InvoiceId,
                ProductId = i.ProductId,
                ProductSku = i.Product?.Sku,
                ProductName = i.Product?.Name,
                Description = i.Description,
                Quantity = i.Quantity,
                UnitPrice = i.UnitPrice,
                TaxAmount = i.TaxAmount,
                TotalAmount = i.TotalAmount
            }).ToList(),
            Payments = inv.Payments.Select(p => new PaymentRecordDto
            {
                Id = p.Id,
                InvoiceId = p.InvoiceId,
                PaymentNumber = p.PaymentNumber,
                Amount = p.Amount,
                PaymentDateUtc = p.PaymentDateUtc,
                Method = p.Method,
                ReferenceNumber = p.ReferenceNumber,
                Notes = p.Notes,
                RecordedByEmployeeId = p.RecordedByEmployeeId,
                RecordedByEmployeeName = p.RecordedByEmployee != null
                    ? $"{p.RecordedByEmployee.FirstName} {p.RecordedByEmployee.LastName}".Trim()
                    : null
            }).OrderByDescending(p => p.PaymentDateUtc).ToList(),
            CreatedAtUtc = inv.CreatedAtUtc,
            UpdatedAtUtc = inv.UpdatedAtUtc
        };
    }

    private async Task<EmployeeProfile?> GetCurrentEmployeeAsync(CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (string.IsNullOrEmpty(userId)) return null;

        return await _context.Employees
            .FirstOrDefaultAsync(e => e.UserId == userId, cancellationToken);
    }
}
