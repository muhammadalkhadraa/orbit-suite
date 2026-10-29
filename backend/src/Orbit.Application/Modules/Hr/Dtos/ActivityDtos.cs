using System;
using System.Collections.Generic;
using Orbit.Domain.Enums;

namespace Orbit.Application.Modules.Hr.Dtos;

public class ActivityActionRequest
{
    public string EmployeeCode { get; set; } = string.Empty;
    public string? Password { get; set; }
    /// <summary>
    /// Supported actions: "Start", "Break", "Resume", "End"
    /// </summary>
    public string Action { get; set; } = string.Empty;
    public int? ClientLocalHour { get; set; }
    public int? ClientLocalMinute { get; set; }
    public string? Notes { get; set; }
}

public class UserActivityStatusDto
{
    public Guid EmployeeId { get; set; }
    public string EmployeeNumber { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public string JobTitle { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public ActivityState State { get; set; } = ActivityState.NotStarted;

    public DateTime? WorkStartedAtUtc { get; set; }
    public DateTime? WorkEndedAtUtc { get; set; }
    public DateTime? CurrentBreakStartedAtUtc { get; set; }
    public DateTime? LastWorkResumedAtUtc { get; set; }

    public int TotalWorkSeconds { get; set; }
    public int TotalBreakSeconds { get; set; }
    public int CurrentWorkSeconds { get; set; }
    public int CurrentBreakSeconds { get; set; }

    public bool IsLate { get; set; }
    public int LateMinutes { get; set; }
    public int FaultsCount { get; set; }
    public string? FaultReason { get; set; }

    public int BreakSecondsRemaining { get; set; } = 3600; // 60 mins max
    public bool HasExceededBreak { get; set; }
    public DateTime ServerTimeUtc { get; set; } = DateTime.UtcNow;
}

public class LiveEmployeeActivityDto
{
    public Guid EmployeeId { get; set; }
    public string EmployeeNumber { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public string JobTitle { get; set; } = string.Empty;
    public string BranchName { get; set; } = string.Empty;
    public DateTime Date { get; set; }

    public ActivityState State { get; set; } = ActivityState.NotStarted;
    public DateTime? WorkStartedAtUtc { get; set; }
    public DateTime? WorkEndedAtUtc { get; set; }
    public DateTime? CurrentBreakStartedAtUtc { get; set; }

    public int TotalWorkSeconds { get; set; }
    public int TotalBreakSeconds { get; set; }
    public int CurrentWorkSeconds { get; set; }
    public int CurrentBreakSeconds { get; set; }

    public bool IsLate { get; set; }
    public int LateMinutes { get; set; }
    public int FaultsCount { get; set; }
    public string? FaultReason { get; set; }
    public bool BreakExceeded { get; set; }
    public int BreakRemainingSeconds { get; set; }
}

public class LiveMonitorResponse
{
    public int TotalEmployees { get; set; }
    public int WorkingCount { get; set; }
    public int IdleCount { get; set; }
    public int OnBreakCount { get; set; }
    public int ClosedCount { get; set; }
    public int NotStartedCount { get; set; }
    public int LateTodayCount { get; set; }
    public int FaultsTodayCount { get; set; }
    public List<LiveEmployeeActivityDto> Employees { get; set; } = new();
    public DateTime ServerTimeUtc { get; set; } = DateTime.UtcNow;
}

public class ActivityReportFilter
{
    public DateTime? DateFrom { get; set; }
    public DateTime? DateTo { get; set; }
    public Guid? DepartmentId { get; set; }
    public Guid? EmployeeId { get; set; }
    public ActivityState? State { get; set; }
    public bool? LateOnly { get; set; }
    public bool? FaultsOnly { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 25;
}

public class ActivityReportResponse
{
    public int TotalRecords { get; set; }
    public decimal TotalWorkHours { get; set; }
    public decimal TotalBreakHours { get; set; }
    public int TotalLateCount { get; set; }
    public int TotalFaultsCount { get; set; }
    public decimal AverageWorkHoursPerDay { get; set; }
    public List<LiveEmployeeActivityDto> Records { get; set; } = new();
    public int Page { get; set; }
    public int PageSize { get; set; }
}
