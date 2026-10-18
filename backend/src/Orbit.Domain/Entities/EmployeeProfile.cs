using System;
using System.Collections.Generic;
using Orbit.Domain.Common;

namespace Orbit.Domain.Entities;

/// <summary>
/// Domain representation of an employee.
/// Intentionally decoupled from ApplicationUser; an employee may or may not possess login credentials.
/// </summary>
public class EmployeeProfile : BaseEntity, ITenantScopedEntity, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Tenant? Tenant { get; set; }

    /// <summary>
    /// Optional foreign key to ApplicationUser if system access is granted.
    /// </summary>
    public string? UserId { get; set; }

    public string EmployeeNumber { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string JobTitle { get; set; } = string.Empty;

    public Guid? BranchId { get; set; }
    public Branch? Branch { get; set; }

    public Guid? DepartmentId { get; set; }
    public Department? Department { get; set; }

    /// <summary>
    /// Manager relationship for reporting structure and scoped task visibility.
    /// </summary>
    public Guid? ReportsToEmployeeId { get; set; }
    public EmployeeProfile? ReportsTo { get; set; }
    public ICollection<EmployeeProfile> DirectReports { get; set; } = new List<EmployeeProfile>();

    public bool IsActive { get; set; } = true;
    public DateTime? HireDateUtc { get; set; }

    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }

    public ICollection<TaskItem> AssignedTasks { get; set; } = new List<TaskItem>();
    public ICollection<TaskItem> CreatedTasks { get; set; } = new List<TaskItem>();
    public ICollection<Deal> AssignedDeals { get; set; } = new List<Deal>();
    public ICollection<LeaveRequest> LeaveRequests { get; set; } = new List<LeaveRequest>();
    public ICollection<AttendanceLog> AttendanceLogs { get; set; } = new List<AttendanceLog>();
    public ICollection<ShiftSchedule> ShiftSchedules { get; set; } = new List<ShiftSchedule>();
}
