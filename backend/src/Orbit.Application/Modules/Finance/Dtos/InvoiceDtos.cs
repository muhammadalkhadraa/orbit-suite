using System;
using System.Collections.Generic;
using Orbit.Domain.Enums;

namespace Orbit.Application.Modules.Finance.Dtos;

public class InvoiceDto
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;

    public Guid CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string? CustomerEmail { get; set; }

    public Guid? DealId { get; set; }
    public string? DealTitle { get; set; }

    public DateTime IssueDateUtc { get; set; }
    public DateTime DueDateUtc { get; set; }
    public DateTime? PaidAtUtc { get; set; }

    public InvoiceStatus Status { get; set; }
    public string StatusName => Status.ToString();
    public string Currency { get; set; } = "USD";

    public decimal Subtotal { get; set; }
    public decimal TaxRate { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal AmountPaid { get; set; }
    public decimal BalanceDue => Math.Max(0, TotalAmount - AmountPaid);

    public bool IsOverdue => (Status == InvoiceStatus.Issued || Status == InvoiceStatus.PartiallyPaid) && DueDateUtc < DateTime.UtcNow;

    public string? Notes { get; set; }
    public string? TermsAndConditions { get; set; }

    public List<InvoiceItemDto> Items { get; set; } = new();
    public List<PaymentRecordDto> Payments { get; set; } = new();

    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
}

public class InvoiceItemDto
{
    public Guid Id { get; set; }
    public Guid InvoiceId { get; set; }
    public Guid? ProductId { get; set; }
    public string? ProductSku { get; set; }
    public string? ProductName { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
}

public class PaymentRecordDto
{
    public Guid Id { get; set; }
    public Guid InvoiceId { get; set; }
    public string PaymentNumber { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateTime PaymentDateUtc { get; set; }
    public PaymentMethod Method { get; set; }
    public string MethodName => Method.ToString();
    public string? ReferenceNumber { get; set; }
    public string? Notes { get; set; }
    public Guid? RecordedByEmployeeId { get; set; }
    public string? RecordedByEmployeeName { get; set; }
}

public class CreateInvoiceRequest
{
    public Guid CustomerId { get; set; }
    public Guid? DealId { get; set; }
    public DateTime? IssueDateUtc { get; set; }
    public DateTime? DueDateUtc { get; set; }
    public string Currency { get; set; } = "USD";
    public decimal TaxRate { get; set; }
    public decimal DiscountAmount { get; set; }
    public string? Notes { get; set; }
    public string? TermsAndConditions { get; set; }
    public List<CreateInvoiceItemRequest> Items { get; set; } = new();
}

public class CreateInvoiceItemRequest
{
    public Guid? ProductId { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal Quantity { get; set; } = 1;
    public decimal UnitPrice { get; set; }
}

public class UpdateInvoiceRequest
{
    public Guid CustomerId { get; set; }
    public Guid? DealId { get; set; }
    public DateTime DueDateUtc { get; set; }
    public decimal TaxRate { get; set; }
    public decimal DiscountAmount { get; set; }
    public string? Notes { get; set; }
    public string? TermsAndConditions { get; set; }
    public List<CreateInvoiceItemRequest> Items { get; set; } = new();
}

public class RecordPaymentRequest
{
    public decimal Amount { get; set; }
    public PaymentMethod Method { get; set; } = PaymentMethod.BankTransfer;
    public DateTime? PaymentDateUtc { get; set; }
    public string? ReferenceNumber { get; set; }
    public string? Notes { get; set; }
}

public class InvoiceFilterRequest
{
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 50;
    public InvoiceStatus? Status { get; set; }
    public Guid? CustomerId { get; set; }
    public bool? IsOverdue { get; set; }
    public DateTime? FromDateUtc { get; set; }
    public DateTime? ToDateUtc { get; set; }
    public string? Search { get; set; }
}

public class FinancialMetricsDto
{
    public decimal TotalInvoicedAmount { get; set; }
    public decimal TotalCollectedAmount { get; set; }
    public decimal TotalOutstandingAmount { get; set; }
    public decimal TotalOverdueAmount { get; set; }
    public int TotalInvoicesCount { get; set; }
    public int DraftInvoicesCount { get; set; }
    public int IssuedInvoicesCount { get; set; }
    public int PartiallyPaidInvoicesCount { get; set; }
    public int PaidInvoicesCount { get; set; }
    public double CollectionRatePercentage { get; set; }
}
