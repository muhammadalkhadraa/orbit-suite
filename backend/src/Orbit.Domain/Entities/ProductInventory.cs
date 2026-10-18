using System;
using Orbit.Domain.Common;

namespace Orbit.Domain.Entities;

public class ProductInventory : BaseEntity, ITenantScopedEntity, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public Guid ProductId { get; set; }
    public Product Product { get; set; } = null!;

    public Guid BranchId { get; set; }
    public Branch Branch { get; set; } = null!;

    public decimal QuantityOnHand { get; set; }
    public decimal QuantityReserved { get; set; }

    public decimal QuantityAvailable => QuantityOnHand - QuantityReserved;

    public string? AisleBinLocation { get; set; }

    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }
}
