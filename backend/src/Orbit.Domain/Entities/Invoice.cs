using System;
using System.Collections.Generic;
using Orbit.Domain.Common;
using Orbit.Domain.Enums;

namespace Orbit.Domain.Entities;

public class Invoice : BaseEntity, ITenantScopedEntity, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public string InvoiceNumber { get; set; } = string.Empty;

    public Guid CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;

    public Guid? DealId { get; set; }
    public Deal? Deal { get; set; }

    public DateTime IssueDateUtc { get; set; } = DateTime.UtcNow;
    public DateTime DueDateUtc { get; set; } = DateTime.UtcNow.AddDays(30);
    public DateTime? PaidAtUtc { get; set; }

    public InvoiceStatus Status { get; set; } = InvoiceStatus.Draft;
    public string Currency { get; set; } = "USD";

    public decimal Subtotal { get; set; }
    public decimal TaxRate { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal AmountPaid { get; set; }

    public decimal BalanceDue => Math.Max(0, TotalAmount - AmountPaid);

    public string? Notes { get; set; }
    public string? TermsAndConditions { get; set; }

    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }

    public ICollection<InvoiceItem> Items { get; set; } = new List<InvoiceItem>();
    public ICollection<PaymentRecord> Payments { get; set; } = new List<PaymentRecord>();
}
