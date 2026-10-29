using System;
using Orbit.Domain.Common;
using Orbit.Domain.Enums;

namespace Orbit.Domain.Entities;

public class PayrollRecord : BaseEntity, ITenantScopedEntity, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public string PayrollNumber { get; set; } = string.Empty;
    public Guid EmployeeId { get; set; }
    public EmployeeProfile Employee { get; set; } = null!;

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
    public int DaysInMonth { get; set; } = 30;
    public int WorkingDaysExpected { get; set; } = 22;
    public int DaysPresent { get; set; }
    public int DaysAbsent { get; set; }
    public decimal AbsenceDeduction { get; set; }
    public int LateOccurrences { get; set; }
    public decimal LatePenaltyDeduction { get; set; }

    // Deficit Vacation (Negative Balance) Deduction
    public decimal NegativeVacationDays { get; set; }
    public decimal VacationDeficitDeduction { get; set; }

    // Statutory & Tax Deductions
    public decimal TaxRatePercentage { get; set; } = 15.0m;
    public decimal TaxDeduction { get; set; }
    public decimal SocialSecurityDeduction { get; set; }
    public decimal TotalDeductions { get; set; }

    // Final Net Pay
    public decimal NetPay { get; set; }

    // Governance & Email Distribution
    public PayrollStatus Status { get; set; } = PayrollStatus.Draft;
    public DateTime? ApprovedAtUtc { get; set; }
    public Guid? ApprovedByUserId { get; set; }
    public bool IsEmailedToEmployee { get; set; }
    public DateTime? EmailedAtUtc { get; set; }
    public string? Notes { get; set; }

    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }
}
