using System;
using Orbit.Domain.Common;

namespace Orbit.Domain.Entities;

public class BomItem : BaseEntity, ITenantScopedEntity
{
    public Guid TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public Guid BillOfMaterialsId { get; set; }
    public BillOfMaterials BillOfMaterials { get; set; } = null!;

    public Guid ComponentProductId { get; set; }
    public Product ComponentProduct { get; set; } = null!;

    public decimal QuantityRequired { get; set; }
    public string UnitOfMeasure { get; set; } = "pcs";
    public string? Notes { get; set; }
}
