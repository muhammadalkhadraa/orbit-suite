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
    public decimal RemainingBalanceAtRequest { get; set; }
    public decimal? ResultingBalanceAfterApproval { get; set; }
    public bool IsForwardedToHr { get; set; }
    public DateTime? ForwardedToHrAtUtc { get; set; }
    public decimal CurrentEmployeeBalance { get; set; }
    public int EmployeeAllocatedDays { get; set; }
    public decimal EmployeeUsedDays { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}

public class EmployeeVacationBalanceDto
{
    public Guid EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public string EmployeeNumber { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public int AllocatedDays { get; set; }
    public decimal UsedDays { get; set; }
    public decimal RemainingDays { get; set; }
    public bool IsDeficit => RemainingDays < 0;
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
    public ActivityState ActivityState { get; set; } = ActivityState.NotStarted;

    public DateTime? WorkStartedAtUtc { get; set; }
    public DateTime? WorkEndedAtUtc { get; set; }
    public DateTime? CurrentBreakStartedAtUtc { get; set; }
    public int TotalWorkSeconds { get; set; } = 0;
    public int TotalBreakSeconds { get; set; } = 0;
    public bool IsLate { get; set; } = false;
    public int LateMinutes { get; set; } = 0;
    public int FaultsCount { get; set; } = 0;
    public string? FaultReason { get; set; }

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

public class EmployeeSalaryProfileDto
{
    public Guid EmployeeId { get; set; }
    public string EmployeeNumber { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string FullName => $"{FirstName} {LastName}".Trim();
    public string Email { get; set; } = string.Empty;
    public string JobTitle { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public string BranchName { get; set; } = string.Empty;
    public DateTime? HireDateUtc { get; set; }
    public bool IsActive { get; set; }

    // Contract Stored in Database
    public string ContractType { get; set; } = "Permanent Full-Time";
    public DateTime? ContractStartDateUtc { get; set; }
    public DateTime? ContractEndDateUtc { get; set; }
    public string? ContractNotes { get; set; }

    // Stored Contract Monthly Salary & Rate Formulas
    // Formula 1: Day price = Salary / 30
    // Formula 2: Hour price = Day price / 9 = Salary / 270
    public decimal BaseMonthlySalary { get; set; }
    public decimal DailyRate => BaseMonthlySalary > 0 ? Math.Round(BaseMonthlySalary / 30.0m, 2) : 0m;
    public decimal HourlyRate => DailyRate > 0 ? Math.Round(DailyRate / 9.0m, 2) : 0m;
    public decimal OvertimeRate => HourlyRate > 0 ? Math.Round(HourlyRate * 1.5m, 2) : 0m;

    // Attendance & Absence Ledger
    public int WorkingDaysExpected { get; set; } = 22;
    public int DaysPresent { get; set; } = 22;
    public int DaysAbsent { get; set; } = 0;
    public decimal AbsenceDeduction => Math.Round(DaysAbsent * DailyRate, 2);

    // Vacation Quota & Deficits
    public int VacationDaysAllocated { get; set; } = 21;
    public decimal VacationDaysUsed { get; set; } = 0;
    public decimal VacationDaysRemaining => (decimal)VacationDaysAllocated - VacationDaysUsed;
    public decimal NegativeVacationDays => VacationDaysRemaining < 0 ? Math.Abs(VacationDaysRemaining) : 0m;
    public decimal VacationDeficitDeduction => Math.Round(NegativeVacationDays * DailyRate, 2);

    // Late Occurrences & Penalties
    public int LateOccurrences { get; set; } = 0;
    public decimal LateHours { get; set; } = 0;
    public decimal LatePenaltyDeduction => Math.Round(LateHours * HourlyRate, 2);

    // Overtime Hours
    public decimal OvertimeHours { get; set; } = 0;
    public decimal OvertimePay => Math.Round(OvertimeHours * OvertimeRate, 2);

    // Consumed Money
    public decimal ConsumedSalaryDeductions { get; set; } = 0;

    // Total Net Salary Calculation
    public decimal GrossPay => BaseMonthlySalary + OvertimePay;
    public decimal TotalDeductions => AbsenceDeduction + VacationDeficitDeduction + LatePenaltyDeduction + ConsumedSalaryDeductions;
    public decimal NetPay => Math.Max(0, GrossPay - TotalDeductions);
}
