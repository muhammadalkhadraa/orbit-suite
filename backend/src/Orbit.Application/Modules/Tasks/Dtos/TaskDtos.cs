using System;
using System.Collections.Generic;
using Orbit.Domain.Enums;

namespace Orbit.Application.Modules.Tasks.Dtos;

public class TaskItemDto
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public TaskItemStatus Status { get; set; }
    public TaskPriority Priority { get; set; }
    public Guid? AssignedEmployeeId { get; set; }
    public string? AssignedEmployeeName { get; set; }
    public Guid? CreatedByEmployeeId { get; set; }
    public string? CreatedByEmployeeName { get; set; }
    public Guid? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    public DateTime? DueDateUtc { get; set; }
    public DateTime? CompletedAtUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
}

public class CreateTaskRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public TaskPriority Priority { get; set; } = TaskPriority.Medium;
    public Guid? AssignedEmployeeId { get; set; }
    public Guid? DepartmentId { get; set; }
    public DateTime? DueDateUtc { get; set; }
}

public class UpdateTaskRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public TaskItemStatus Status { get; set; }
    public TaskPriority Priority { get; set; }
    public Guid? AssignedEmployeeId { get; set; }
    public Guid? DepartmentId { get; set; }
    public DateTime? DueDateUtc { get; set; }
}

public class UpdateTaskStatusRequest
{
    public TaskItemStatus Status { get; set; }
}

public class TaskFilterRequest
{
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public TaskItemStatus? Status { get; set; }
    public TaskPriority? Priority { get; set; }
    public Guid? AssignedEmployeeId { get; set; }
    public Guid? DepartmentId { get; set; }
    public string? Search { get; set; }
}
