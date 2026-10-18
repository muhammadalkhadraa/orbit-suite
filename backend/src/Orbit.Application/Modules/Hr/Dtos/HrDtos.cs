using System;
using Orbit.Domain.Enums;

namespace Orbit.Application.Modules.Hr.Dtos;

public class LeaveRequestDto
{
    public Guid Id { get; set; }
    public string RequestNumber { get; set; } = string.Empty;
    public Guid EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public string EmployeeNumber { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public LeaveType LeaveType { get; set; }
    public DateTime StartDateUtc { get; set; }
    public DateTime EndDateUtc { get; set; }
    public decimal DaysCount { get; set; }
    public string Reason { get; set; } = string.Empty;
    public LeaveStatus Status { get; set; }
    public Guid? ApproverEmployeeId { get; set; }
    public string? ApproverEmployeeName { get; set; }
    public DateTime? ActionedAtUtc { get; set; }
    public string? RejectionReason { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}

public class CreateLeaveRequestRequest
{
    public Guid? EmployeeId { get; set; } // If null, defaults to current employee profile
    public LeaveType LeaveType { get; set; } = LeaveType.Annual;
    public DateTime StartDateUtc { get; set; }
    public DateTime EndDateUtc { get; set; }
    public decimal? DaysCount { get; set; }
    public string Reason { get; set; } = string.Empty;
}

public class ActionLeaveRequestRequest
{
    public LeaveStatus Status { get; set; } // Approved or Rejected
    public string? RejectionReason { get; set; }
}

public class LeaveRequestFilterRequest
{
    public LeaveStatus? Status { get; set; }
    public LeaveType? LeaveType { get; set; }
    public Guid? EmployeeId { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class AttendanceLogDto
{
    public Guid Id { get; set; }
    public Guid EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public string EmployeeNumber { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public DateTime? CheckInTimeUtc { get; set; }
    public DateTime? CheckOutTimeUtc { get; set; }
    public decimal? TotalHours { get; set; }
    public AttendanceStatus Status { get; set; }
    public string WorkLocation { get; set; } = "Office";
    public string? Notes { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}

public class CheckInRequest
{
    public string WorkLocation { get; set; } = "Office";
    public string? Notes { get; set; }
}

public class CheckOutRequest
{
    public string? Notes { get; set; }
}

public class RecordAttendanceRequest
{
    public Guid EmployeeId { get; set; }
    public DateTime Date { get; set; }
    public DateTime? CheckInTimeUtc { get; set; }
    public DateTime? CheckOutTimeUtc { get; set; }
    public AttendanceStatus Status { get; set; } = AttendanceStatus.Present;
    public string WorkLocation { get; set; } = "Office";
    public string? Notes { get; set; }
}

public class AttendanceFilterRequest
{
    public Guid? EmployeeId { get; set; }
    public DateTime? DateFrom { get; set; }
    public DateTime? DateTo { get; set; }
    public AttendanceStatus? Status { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class ShiftScheduleDto
{
    public Guid Id { get; set; }
    public Guid EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public string EmployeeNumber { get; set; } = string.Empty;
    public string ShiftName { get; set; } = string.Empty;
    public ShiftType ShiftType { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
    public DateTime EffectiveFromUtc { get; set; }
    public DateTime? EffectiveToUtc { get; set; }
    public bool IsActive { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}

public class CreateShiftScheduleRequest
{
    public Guid EmployeeId { get; set; }
    public string ShiftName { get; set; } = string.Empty;
    public ShiftType ShiftType { get; set; } = ShiftType.StandardDay;
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
    public DateTime EffectiveFromUtc { get; set; }
    public DateTime? EffectiveToUtc { get; set; }
    public string? Notes { get; set; }
}

public class UpdateShiftScheduleRequest
{
    public string ShiftName { get; set; } = string.Empty;
    public ShiftType ShiftType { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
    public DateTime EffectiveFromUtc { get; set; }
    public DateTime? EffectiveToUtc { get; set; }
    public bool IsActive { get; set; }
    public string? Notes { get; set; }
}

public class HrMetricsDto
{
    public int TotalEmployees { get; set; }
    public int PresentToday { get; set; }
    public decimal AttendanceRatePercent { get; set; }
    public int OnLeaveToday { get; set; }
    public int LateToday { get; set; }
    public int PendingLeaveRequests { get; set; }
    public decimal ApprovedLeaveDaysThisMonth { get; set; }
}
