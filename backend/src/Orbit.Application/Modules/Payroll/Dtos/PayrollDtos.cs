using System;
using System.Collections.Generic;
using Orbit.Domain.Enums;

namespace Orbit.Application.Modules.Payroll.Dtos;

public class PayrollRecordDto
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string PayrollNumber { get; set; } = string.Empty;

    public Guid EmployeeId { get; set; }
    public string EmployeeNumber { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public string JobTitle { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;

    public int Year { get; set; }
    public int Month { get; set; }
    public string PayPeriod { get; set; } = string.Empty;

    // Compensation & Earnings
    public decimal BaseSalary { get; set; }
    public decimal HourlyRate { get; set; }
    public decimal OvertimeHours { get; set; }
    public decimal OvertimeRate { get; set; }
    public decimal OvertimePay { get; set; }
    public decimal Bonuses { get; set; }
    public decimal GrossPay { get; set; }

    // Attendance & Absence Deductions
    public int DaysInMonth { get; set; }
    public int WorkingDaysExpected { get; set; }
    public int DaysPresent { get; set; }
    public int DaysAbsent { get; set; }
    public decimal AbsenceDeduction { get; set; }
    public int LateOccurrences { get; set; }
    public decimal LatePenaltyDeduction { get; set; }

    // Deficit Vacation (Negative Balance) Deduction
    public decimal NegativeVacationDays { get; set; }
    public decimal VacationDeficitDeduction { get; set; }

    // Statutory & Tax Deductions
    public decimal TaxRatePercentage { get; set; }
    public decimal TaxDeduction { get; set; }
    public decimal SocialSecurityDeduction { get; set; }
    public decimal TotalDeductions { get; set; }

    // Final Net Pay
    public decimal NetPay { get; set; }

    // Governance & Email Distribution
    public PayrollStatus Status { get; set; }
    public string StatusName => Status.ToString();
    public DateTime? ApprovedAtUtc { get; set; }
    public bool IsEmailedToEmployee { get; set; }
    public DateTime? EmailedAtUtc { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}

public class GeneratePayrollBatchRequest
{
    public int Year { get; set; }
    public int Month { get; set; }
    public decimal DefaultTaxRatePercentage { get; set; } = 15.0m;
}

public class ApprovePayrollBatchRequest
{
    public int Year { get; set; }
    public int Month { get; set; }
}

public class PayrollSummaryDto
{
    public int Year { get; set; }
    public int Month { get; set; }
    public string PayPeriod { get; set; } = string.Empty;
    public int TotalEmployees { get; set; }
    public int DraftCount { get; set; }
    public int ApprovedCount { get; set; }
    public int EmailedCount { get; set; }
    public decimal TotalGrossPay { get; set; }
    public decimal TotalDeductions { get; set; }
    public decimal TotalNetPay { get; set; }
    public decimal TotalOvertimePay { get; set; }
    public decimal TotalVacationDeficitDeductions { get; set; }
}

public class EmployeePayslipSpreadsheetDto
{
    public Guid PayrollRecordId { get; set; }
    public string PayrollNumber { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string EmployeeEmail { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = "text/csv";
    public string FileContent { get; set; } = string.Empty;
}

public class SendEmailResultDto
{
    public Guid PayrollRecordId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
}

public class InitiatePayrollRequest
{
    public Guid EmployeeId { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
}

public class SubmitHrSheetRequest
{
    public decimal HolidaysCount { get; set; }
    public int AbsencesCount { get; set; }
    public decimal OvertimeHours { get; set; }
    public decimal ConsumedDeductionAmount { get; set; }
    public string? Notes { get; set; }
}

