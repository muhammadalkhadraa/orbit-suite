using System;
using Orbit.Domain.Common;
using Orbit.Domain.Enums;

namespace Orbit.Domain.Entities;

public class WorkOrder : BaseEntity, ITenantScopedEntity, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public string OrderNumber { get; set; } = string.Empty;

    public Guid ProductId { get; set; }
    public Product Product { get; set; } = null!;

    public Guid? BillOfMaterialsId { get; set; }
    public BillOfMaterials? BillOfMaterials { get; set; }

    public Guid BranchId { get; set; }
    public Branch Branch { get; set; } = null!;

    public Guid? AssignedEmployeeId { get; set; }
    public EmployeeProfile? AssignedEmployee { get; set; }

    public decimal QuantityTarget { get; set; }
    public decimal QuantityProduced { get; set; }

    public WorkOrderStatus Status { get; set; } = WorkOrderStatus.Draft;
    public WorkOrderPriority Priority { get; set; } = WorkOrderPriority.Medium;

    public DateTime? StartDateUtc { get; set; }
    public DateTime? DueDateUtc { get; set; }
    public DateTime? CompletedDateUtc { get; set; }
    public string? Notes { get; set; }

    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }
}
