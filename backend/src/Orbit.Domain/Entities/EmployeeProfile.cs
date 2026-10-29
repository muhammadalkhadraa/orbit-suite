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

    /// <summary>
    /// Annual vacation days allocated (default: 21 days).
    /// </summary>
    public int VacationDaysAllocated { get; set; } = 21;

    /// <summary>
    /// Total approved vacation days used. When this exceeds VacationDaysAllocated, balance becomes negative.
    /// </summary>
    public decimal VacationDaysUsed { get; set; } = 0;

    /// <summary>
    /// Remaining balance. If negative, represents deficit / unpaid vacation days.
    /// </summary>
    public decimal VacationDaysRemaining => (decimal)VacationDaysAllocated - VacationDaysUsed;

    /// <summary>
    /// Compensation contract fields for salary and payroll calculation.
    /// </summary>
    public decimal BaseMonthlySalary { get; set; } = 3500.00m;
    public decimal HourlyRate { get; set; } = 20.00m;
    public decimal OvertimeRate { get; set; } = 30.00m;

    /// <summary>
    /// Employment contract specifications stored in the database.
    /// </summary>
    public string ContractType { get; set; } = "Permanent Full-Time";
    public DateTime? ContractStartDateUtc { get; set; }
    public DateTime? ContractEndDateUtc { get; set; }
    public string? ContractDocumentUrl { get; set; }
    public string? ContractNotes { get; set; }

    /// <summary>
    /// Day price: Monthly Salary divided by 30.
    /// </summary>
    public decimal DailyRate => BaseMonthlySalary > 0 ? Math.Round(BaseMonthlySalary / 30.0m, 2) : 0m;

    /// <summary>
    /// Hour price: Day price divided by 9 (i.e. Monthly Salary / 270).
    /// </summary>
    public decimal CalculatedHourlyRate => DailyRate > 0 ? Math.Round(DailyRate / 9.0m, 2) : 0m;

    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }

    public ICollection<TaskItem> AssignedTasks { get; set; } = new List<TaskItem>();
    public ICollection<TaskItem> CreatedTasks { get; set; } = new List<TaskItem>();
    public ICollection<Deal> AssignedDeals { get; set; } = new List<Deal>();
    public ICollection<LeaveRequest> LeaveRequests { get; set; } = new List<LeaveRequest>();
    public ICollection<AttendanceLog> AttendanceLogs { get; set; } = new List<AttendanceLog>();
    public ICollection<ShiftSchedule> ShiftSchedules { get; set; } = new List<ShiftSchedule>();
}
