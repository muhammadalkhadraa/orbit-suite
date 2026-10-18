using System;
using Orbit.Domain.Common;
using Orbit.Domain.Enums;

namespace Orbit.Domain.Entities;

public class StockMovement : BaseEntity, ITenantScopedEntity, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public Guid ProductId { get; set; }
    public Product Product { get; set; } = null!;

    public Guid BranchId { get; set; }
    public Branch Branch { get; set; } = null!;

    public Guid? DestinationBranchId { get; set; }
    public Branch? DestinationBranch { get; set; }

    public StockMovementType Type { get; set; }
    public decimal Quantity { get; set; }
    public decimal? UnitCost { get; set; }

    public string? ReferenceNumber { get; set; }
    public string? Reason { get; set; }

    public Guid? PerformedByEmployeeId { get; set; }
    public EmployeeProfile? PerformedByEmployee { get; set; }

    public DateTime TimestampUtc { get; set; } = DateTime.UtcNow;

    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }
}
