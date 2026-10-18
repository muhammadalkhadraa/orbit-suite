using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Orbit.Application.Common;
using Orbit.Application.Common.Exceptions;
using Orbit.Application.Interfaces;
using Orbit.Application.Modules.Tasks;
using Orbit.Application.Modules.Tasks.Dtos;
using Orbit.Domain.Entities;
using Orbit.Domain.Enums;

namespace Orbit.Infrastructure.Services;

public class TaskService : ITaskService
{
    private readonly IApplicationDbContext _context;
    private readonly ITenantContext _tenantContext;
    private readonly ICurrentUserService _currentUserService;
    private readonly IAuditService _auditService;

    public TaskService(
        IApplicationDbContext context,
        ITenantContext tenantContext,
        ICurrentUserService currentUserService,
        IAuditService auditService)
    {
        _context = context;
        _tenantContext = tenantContext;
        _currentUserService = currentUserService;
        _auditService = auditService;
    }

    public async Task<PagedResponse<TaskItemDto>> GetTasksAsync(TaskFilterRequest filter, CancellationToken cancellationToken = default)
    {
        var currentEmployee = await GetCurrentEmployeeAsync(cancellationToken);
        var role = _tenantContext.CurrentRole ?? TenantRole.Employee;

        var query = _context.Tasks
            .Include(t => t.AssignedEmployee)
            .Include(t => t.CreatedByEmployee)
            .Include(t => t.Department)
            .AsQueryable();

        // Enforce Confirmed Role-Scoped Task Visibility
        if (role == TenantRole.Employee)
        {
            var empId = currentEmployee?.Id ?? Guid.Empty;
            query = query.Where(t => t.AssignedEmployeeId == empId || t.CreatedByEmployeeId == empId);
        }
        else if (role == TenantRole.Manager)
        {
            var managerId = currentEmployee?.Id ?? Guid.Empty;
            var deptId = currentEmployee?.DepartmentId;

            query = query.Where(t =>
                t.AssignedEmployeeId == managerId ||
                t.CreatedByEmployeeId == managerId ||
                (t.AssignedEmployee != null && t.AssignedEmployee.ReportsToEmployeeId == managerId) ||
                (deptId.HasValue && t.DepartmentId == deptId.Value));
        }
        // Owner and Admin can view all tenant tasks (scoping remains enforced via EF Core TenantId filter)

        // Apply filters
        if (filter.Status.HasValue)
        {
            query = query.Where(t => t.Status == filter.Status.Value);
        }

        if (filter.Priority.HasValue)
        {
            query = query.Where(t => t.Priority == filter.Priority.Value);
        }

        if (filter.AssignedEmployeeId.HasValue)
        {
            query = query.Where(t => t.AssignedEmployeeId == filter.AssignedEmployeeId.Value);
        }

        if (filter.DepartmentId.HasValue)
        {
            query = query.Where(t => t.DepartmentId == filter.DepartmentId.Value);
        }

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var s = filter.Search.Trim().ToLower();
            query = query.Where(t => t.Title.ToLower().Contains(s) || (t.Description != null && t.Description.ToLower().Contains(s)));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var skip = (filter.PageNumber - 1) * filter.PageSize;

        var items = await query
            .OrderByDescending(t => t.CreatedAtUtc)
            .Skip(skip)
            .Take(filter.PageSize)
            .Select(t => new TaskItemDto
            {
                Id = t.Id,
                TenantId = t.TenantId,
                Title = t.Title,
                Description = t.Description,
                Status = t.Status,
                Priority = t.Priority,
                AssignedEmployeeId = t.AssignedEmployeeId,
                AssignedEmployeeName = t.AssignedEmployee != null ? $"{t.AssignedEmployee.FirstName} {t.AssignedEmployee.LastName}".Trim() : null,
                CreatedByEmployeeId = t.CreatedByEmployeeId,
                CreatedByEmployeeName = t.CreatedByEmployee != null ? $"{t.CreatedByEmployee.FirstName} {t.CreatedByEmployee.LastName}".Trim() : null,
                DepartmentId = t.DepartmentId,
                DepartmentName = t.Department != null ? t.Department.Name : null,
                DueDateUtc = t.DueDateUtc,
                CompletedAtUtc = t.CompletedAtUtc,
                CreatedAtUtc = t.CreatedAtUtc,
                UpdatedAtUtc = t.UpdatedAtUtc
            })
            .ToListAsync(cancellationToken);

        return new PagedResponse<TaskItemDto>(items, totalCount, filter.PageNumber, filter.PageSize);
    }

    public async Task<TaskItemDto> GetTaskByIdAsync(Guid taskId, CancellationToken cancellationToken = default)
    {
        var task = await _context.Tasks
            .Include(t => t.AssignedEmployee)
            .Include(t => t.CreatedByEmployee)
            .Include(t => t.Department)
            .FirstOrDefaultAsync(t => t.Id == taskId, cancellationToken);

        if (task == null) throw new NotFoundException(nameof(TaskItem), taskId);

        await AssertTaskAccessAsync(task, cancellationToken);

        return MapToDto(task);
    }

    public async Task<TaskItemDto> CreateTaskAsync(CreateTaskRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireCurrentTenantId();
        var currentEmployee = await GetCurrentEmployeeAsync(cancellationToken);

        if (string.IsNullOrWhiteSpace(request.Title))
            throw new ValidationException(new Dictionary<string, string[]> { { "Title", new[] { "Task title is required." } } });

        var task = new TaskItem
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Title = request.Title,
            Description = request.Description,
            Priority = request.Priority,
            Status = TaskItemStatus.Todo,
            AssignedEmployeeId = request.AssignedEmployeeId,
            CreatedByEmployeeId = currentEmployee?.Id,
            DepartmentId = request.DepartmentId,
            DueDateUtc = request.DueDateUtc,
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.Tasks.Add(task);
        await _context.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync("Create", nameof(TaskItem), task.Id.ToString(), request, cancellationToken);

        return await GetTaskByIdAsync(task.Id, cancellationToken);
    }

    public async Task<TaskItemDto> UpdateTaskAsync(Guid taskId, UpdateTaskRequest request, CancellationToken cancellationToken = default)
    {
        var task = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == taskId, cancellationToken);
        if (task == null) throw new NotFoundException(nameof(TaskItem), taskId);

        await AssertTaskAccessAsync(task, cancellationToken);

        task.Title = request.Title;
        task.Description = request.Description;
        task.Priority = request.Priority;
        task.AssignedEmployeeId = request.AssignedEmployeeId;
        task.DepartmentId = request.DepartmentId;
        task.DueDateUtc = request.DueDateUtc;

        if (task.Status != request.Status)
        {
            task.Status = request.Status;
            task.CompletedAtUtc = request.Status == TaskItemStatus.Done ? DateTime.UtcNow : null;
        }

        await _context.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync("Update", nameof(TaskItem), task.Id.ToString(), request, cancellationToken);

        return await GetTaskByIdAsync(task.Id, cancellationToken);
    }

    public async Task<TaskItemDto> UpdateTaskStatusAsync(Guid taskId, UpdateTaskStatusRequest request, CancellationToken cancellationToken = default)
    {
        var task = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == taskId, cancellationToken);
        if (task == null) throw new NotFoundException(nameof(TaskItem), taskId);

        await AssertTaskAccessAsync(task, cancellationToken);

        task.Status = request.Status;
        task.CompletedAtUtc = request.Status == TaskItemStatus.Done ? DateTime.UtcNow : null;

        await _context.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync("UpdateStatus", nameof(TaskItem), task.Id.ToString(), new { request.Status }, cancellationToken);

        return await GetTaskByIdAsync(task.Id, cancellationToken);
    }

    public async Task DeleteTaskAsync(Guid taskId, CancellationToken cancellationToken = default)
    {
        var task = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == taskId, cancellationToken);
        if (task == null) throw new NotFoundException(nameof(TaskItem), taskId);

        var role = _tenantContext.CurrentRole ?? TenantRole.Employee;
        if (role == TenantRole.Employee)
            throw new ForbiddenAccessException("Employees cannot delete tasks.");

        await AssertTaskAccessAsync(task, cancellationToken);

        _context.Tasks.Remove(task);
        await _context.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync("Delete", nameof(TaskItem), taskId.ToString(), null, cancellationToken);
    }

    private async Task<EmployeeProfile?> GetCurrentEmployeeAsync(CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(_currentUserService.UserId)) return null;

        return await _context.Employees
            .FirstOrDefaultAsync(e => e.UserId == _currentUserService.UserId, cancellationToken);
    }

    private async Task AssertTaskAccessAsync(TaskItem task, CancellationToken cancellationToken)
    {
        var role = _tenantContext.CurrentRole ?? TenantRole.Employee;
        if (role == TenantRole.Owner || role == TenantRole.Admin) return;

        var currentEmployee = await GetCurrentEmployeeAsync(cancellationToken);
        var currentEmployeeId = currentEmployee?.Id ?? Guid.Empty;

        if (role == TenantRole.Employee)
        {
            if (task.AssignedEmployeeId != currentEmployeeId && task.CreatedByEmployeeId != currentEmployeeId)
            {
                throw new ForbiddenAccessException("You do not have access to this task.");
            }
            return;
        }

        if (role == TenantRole.Manager)
        {
            if (task.AssignedEmployeeId == currentEmployeeId || task.CreatedByEmployeeId == currentEmployeeId)
                return;

            if (currentEmployee?.DepartmentId != null && task.DepartmentId == currentEmployee.DepartmentId)
                return;

            if (task.AssignedEmployeeId.HasValue)
            {
                var isDirectReport = await _context.Employees
                    .AnyAsync(e => e.Id == task.AssignedEmployeeId.Value && e.ReportsToEmployeeId == currentEmployeeId, cancellationToken);

                if (isDirectReport) return;
            }

            throw new ForbiddenAccessException("You do not have permission to access tasks outside of your team scope.");
        }
    }

    private static TaskItemDto MapToDto(TaskItem t)
    {
        return new TaskItemDto
        {
            Id = t.Id,
            TenantId = t.TenantId,
            Title = t.Title,
            Description = t.Description,
            Status = t.Status,
            Priority = t.Priority,
            AssignedEmployeeId = t.AssignedEmployeeId,
            AssignedEmployeeName = t.AssignedEmployee != null ? $"{t.AssignedEmployee.FirstName} {t.AssignedEmployee.LastName}".Trim() : null,
            CreatedByEmployeeId = t.CreatedByEmployeeId,
            CreatedByEmployeeName = t.CreatedByEmployee != null ? $"{t.CreatedByEmployee.FirstName} {t.CreatedByEmployee.LastName}".Trim() : null,
            DepartmentId = t.DepartmentId,
            DepartmentName = t.Department != null ? t.Department.Name : null,
            DueDateUtc = t.DueDateUtc,
            CompletedAtUtc = t.CompletedAtUtc,
            CreatedAtUtc = t.CreatedAtUtc,
            UpdatedAtUtc = t.UpdatedAtUtc
        };
    }

    private Guid RequireCurrentTenantId()
    {
        if (!_tenantContext.CurrentTenantId.HasValue || _tenantContext.CurrentTenantId.Value == Guid.Empty)
            throw new TenantAccessDeniedException("Active tenant context is required.");

        return _tenantContext.CurrentTenantId.Value;
    }
}
