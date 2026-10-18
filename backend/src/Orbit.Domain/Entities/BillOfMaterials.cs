using System;
using System.Collections.Generic;
using Orbit.Domain.Common;

namespace Orbit.Domain.Entities;

public class BillOfMaterials : BaseEntity, ITenantScopedEntity, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public string BomNumber { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    public Guid ProductId { get; set; }
    public Product Product { get; set; } = null!;

    public string Version { get; set; } = "v1.0";
    public bool IsActive { get; set; } = true;

    public ICollection<BomItem> Items { get; set; } = new List<BomItem>();

    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }
}
