using System;
using Orbit.Domain.Common;
using Orbit.Domain.Enums;

namespace Orbit.Domain.Entities;

public class PaymentRecord : BaseEntity, ITenantScopedEntity, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public Guid InvoiceId { get; set; }
    public Invoice Invoice { get; set; } = null!;

    public string PaymentNumber { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateTime PaymentDateUtc { get; set; } = DateTime.UtcNow;
    public PaymentMethod Method { get; set; } = PaymentMethod.BankTransfer;

    public string? ReferenceNumber { get; set; }
    public string? Notes { get; set; }

    public Guid? RecordedByEmployeeId { get; set; }
    public EmployeeProfile? RecordedByEmployee { get; set; }

    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }
}
