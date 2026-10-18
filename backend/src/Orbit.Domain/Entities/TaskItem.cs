using System;
using Orbit.Domain.Common;
using Orbit.Domain.Enums;

namespace Orbit.Domain.Entities;

public class TaskItem : BaseEntity, ITenantScopedEntity, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Tenant? Tenant { get; set; }

    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }

    public TaskItemStatus Status { get; set; } = TaskItemStatus.Todo;
    public TaskPriority Priority { get; set; } = TaskPriority.Medium;

    public Guid? AssignedEmployeeId { get; set; }
    public EmployeeProfile? AssignedEmployee { get; set; }

    public Guid? CreatedByEmployeeId { get; set; }
    public EmployeeProfile? CreatedByEmployee { get; set; }

    public Guid? DepartmentId { get; set; }
    public Department? Department { get; set; }

    public DateTime? DueDateUtc { get; set; }
    public DateTime? CompletedAtUtc { get; set; }

    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }
}
