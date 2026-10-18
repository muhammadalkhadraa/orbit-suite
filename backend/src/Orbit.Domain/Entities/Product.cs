using System;
using System.Collections.Generic;
using Orbit.Domain.Common;
using Orbit.Domain.Enums;

namespace Orbit.Domain.Entities;

public class Product : BaseEntity, ITenantScopedEntity, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public string Sku { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public ProductCategory Category { get; set; } = ProductCategory.Hardware;
    public string UnitOfMeasure { get; set; } = "pcs";
    public decimal UnitPrice { get; set; }
    public decimal UnitCost { get; set; }
    public decimal ReorderLevel { get; set; } = 10;
    public bool IsActive { get; set; } = true;

    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }

    public ICollection<ProductInventory> Inventories { get; set; } = new List<ProductInventory>();
    public ICollection<StockMovement> StockMovements { get; set; } = new List<StockMovement>();
}
