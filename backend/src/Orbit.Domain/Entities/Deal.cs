using System;
using Orbit.Domain.Common;
using Orbit.Domain.Enums;

namespace Orbit.Domain.Entities;

public class Deal : BaseEntity, ITenantScopedEntity, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public string Title { get; set; } = string.Empty;

    public Guid CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;

    public Guid? AssignedEmployeeId { get; set; }
    public EmployeeProfile? AssignedEmployee { get; set; }

    public decimal Amount { get; set; }
    public string Currency { get; set; } = "USD";

    public DealStage Stage { get; set; } = DealStage.Lead;
    public int Probability { get; set; } = 20;

    public DateTime? ExpectedCloseDateUtc { get; set; }
    public DateTime? ClosedAtUtc { get; set; }

    public string? LostReason { get; set; }
    public string? Notes { get; set; }

    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }
}
