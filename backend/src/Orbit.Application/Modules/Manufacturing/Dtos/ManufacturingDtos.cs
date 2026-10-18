using System;
using System.Collections.Generic;
using Orbit.Domain.Enums;

namespace Orbit.Application.Modules.Manufacturing.Dtos;

public class WorkOrderDto
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;

    public Guid ProductId { get; set; }
    public string ProductSku { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;

    public Guid? BillOfMaterialsId { get; set; }
    public string? BomNumber { get; set; }
    public string? BomName { get; set; }

    public Guid BranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;

    public Guid? AssignedEmployeeId { get; set; }
    public string? AssignedEmployeeName { get; set; }

    public decimal QuantityTarget { get; set; }
    public decimal QuantityProduced { get; set; }
    public decimal ProgressPercentage => QuantityTarget > 0 ? Math.Min(100, Math.Round((QuantityProduced / QuantityTarget) * 100, 1)) : 0;

    public WorkOrderStatus Status { get; set; }
    public string StatusName => Status.ToString();

    public WorkOrderPriority Priority { get; set; }
    public string PriorityName => Priority.ToString();

    public DateTime? StartDateUtc { get; set; }
    public DateTime? DueDateUtc { get; set; }
    public DateTime? CompletedDateUtc { get; set; }

    public bool IsOverdue => (Status == WorkOrderStatus.Planned || Status == WorkOrderStatus.InProgress) && DueDateUtc.HasValue && DueDateUtc.Value < DateTime.UtcNow;

    public string? Notes { get; set; }

    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
}

public class BillOfMaterialsDto
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string BomNumber { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    public Guid ProductId { get; set; }
    public string ProductSku { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;

    public string Version { get; set; } = "v1.0";
    public bool IsActive { get; set; }

    public List<BomItemDto> Items { get; set; } = new();

    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
}

public class BomItemDto
{
    public Guid Id { get; set; }
    public Guid BillOfMaterialsId { get; set; }

    public Guid ComponentProductId { get; set; }
    public string ComponentProductSku { get; set; } = string.Empty;
    public string ComponentProductName { get; set; } = string.Empty;

    public decimal QuantityRequired { get; set; }
    public string UnitOfMeasure { get; set; } = "pcs";
    public string? Notes { get; set; }
}

public class CreateWorkOrderRequest
{
    public Guid ProductId { get; set; }
    public Guid? BillOfMaterialsId { get; set; }
    public Guid BranchId { get; set; }
    public Guid? AssignedEmployeeId { get; set; }
    public decimal QuantityTarget { get; set; }
    public WorkOrderPriority Priority { get; set; } = WorkOrderPriority.Medium;
    public DateTime? StartDateUtc { get; set; }
    public DateTime? DueDateUtc { get; set; }
    public string? Notes { get; set; }
}

public class UpdateWorkOrderRequest
{
    public Guid BranchId { get; set; }
    public Guid? AssignedEmployeeId { get; set; }
    public decimal QuantityTarget { get; set; }
    public WorkOrderPriority Priority { get; set; }
    public DateTime? StartDateUtc { get; set; }
    public DateTime? DueDateUtc { get; set; }
    public string? Notes { get; set; }
}

public class UpdateWorkOrderStatusRequest
{
    public WorkOrderStatus Status { get; set; }
    public decimal? QuantityProduced { get; set; }
    public string? Notes { get; set; }
}

public class CreateBomRequest
{
    public Guid ProductId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Version { get; set; } = "v1.0";
    public List<CreateBomItemRequest> Items { get; set; } = new();
}

public class CreateBomItemRequest
{
    public Guid ComponentProductId { get; set; }
    public decimal QuantityRequired { get; set; }
    public string UnitOfMeasure { get; set; } = "pcs";
    public string? Notes { get; set; }
}

public class WorkOrderFilterRequest
{
    public WorkOrderStatus? Status { get; set; }
    public WorkOrderPriority? Priority { get; set; }
    public Guid? BranchId { get; set; }
    public Guid? ProductId { get; set; }
    public Guid? AssignedEmployeeId { get; set; }
    public string? Search { get; set; }
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class ManufacturingMetricsDto
{
    public int TotalWorkOrders { get; set; }
    public int DraftCount { get; set; }
    public int PlannedCount { get; set; }
    public int InProgressCount { get; set; }
    public int CompletedCount { get; set; }
    public int CancelledCount { get; set; }
    public decimal TotalUnitsTarget { get; set; }
    public decimal TotalUnitsProduced { get; set; }
    public decimal CompletionRate => TotalWorkOrders > 0 ? Math.Round(((decimal)CompletedCount / TotalWorkOrders) * 100, 1) : 0;
}
