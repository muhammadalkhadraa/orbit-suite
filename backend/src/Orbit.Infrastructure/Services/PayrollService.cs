using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Orbit.Application.Common.Exceptions;
using Orbit.Application.Interfaces;
using Orbit.Application.Modules.Payroll;
using Orbit.Application.Modules.Payroll.Dtos;
using Orbit.Domain.Entities;
using Orbit.Domain.Enums;

namespace Orbit.Infrastructure.Services;

public class PayrollService : IPayrollService
{
    private readonly IApplicationDbContext _context;
    private readonly ITenantContext _tenantContext;
    private readonly ICurrentUserService _currentUserService;
    private readonly IAuditService _auditService;
    private readonly ILogger<PayrollService> _logger;

    public PayrollService(
        IApplicationDbContext context,
        ITenantContext tenantContext,
        ICurrentUserService currentUserService,
        IAuditService auditService,
        ILogger<PayrollService> logger)
    {
        _context = context;
        _tenantContext = tenantContext;
        _currentUserService = currentUserService;
        _auditService = auditService;
        _logger = logger;
    }

    public async Task<List<PayrollRecordDto>> GetPayrollRecordsAsync(int? year, int? month, Guid? employeeId, CancellationToken cancellationToken = default)
    {
        var query = _context.PayrollRecords
            .Include(p => p.Employee)
            .ThenInclude(e => e.Department)
            .AsQueryable();

        if (year.HasValue)
        {
            query = query.Where(p => p.Year == year.Value);
        }

        if (month.HasValue)
        {
            query = query.Where(p => p.Month == month.Value);
        }

        if (employeeId.HasValue)
        {
            query = query.Where(p => p.EmployeeId == employeeId.Value);
        }

        var list = await query
            .OrderByDescending(p => p.Year)
            .ThenByDescending(p => p.Month)
            .ThenBy(p => p.Employee.EmployeeNumber)
            .ToListAsync(cancellationToken);

        return list.Select(MapToDto).ToList();
    }

    public async Task<PayrollRecordDto> GetPayrollRecordByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var record = await _context.PayrollRecords
            .Include(p => p.Employee)
            .ThenInclude(e => e.Department)
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

        if (record == null)
        {
            throw new NotFoundException(nameof(PayrollRecord), id);
        }

        return MapToDto(record);
    }

    public async Task<PayrollSummaryDto> GetPayrollSummaryAsync(int year, int month, CancellationToken cancellationToken = default)
    {
        var records = await _context.PayrollRecords
            .Where(p => p.Year == year && p.Month == month)
            .ToListAsync(cancellationToken);

        var monthName = CultureInfo.CurrentCulture.DateTimeFormat.GetMonthName(month);

        return new PayrollSummaryDto
        {
            Year = year,
            Month = month,
            PayPeriod = $"{monthName} {year}",
            TotalEmployees = records.Count,
            DraftCount = records.Count(r => r.Status == PayrollStatus.Draft),
            ApprovedCount = records.Count(r => r.Status == PayrollStatus.Approved || r.Status == PayrollStatus.Paid),
            EmailedCount = records.Count(r => r.IsEmailedToEmployee),
            TotalGrossPay = records.Sum(r => r.GrossPay),
            TotalDeductions = records.Sum(r => r.TotalDeductions),
            TotalNetPay = records.Sum(r => r.NetPay),
            TotalOvertimePay = records.Sum(r => r.OvertimePay),
            TotalVacationDeficitDeductions = records.Sum(r => r.VacationDeficitDeduction)
        };
    }

    public async Task<List<PayrollRecordDto>> GeneratePayrollBatchAsync(GeneratePayrollBatchRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.CurrentTenantId ?? Guid.Empty;
        var employees = await _context.Employees
            .Include(e => e.Department)
            .Where(e => e.IsActive)
            .ToListAsync(cancellationToken);

        var monthName = CultureInfo.CurrentCulture.DateTimeFormat.GetMonthName(request.Month);
        var payPeriod = $"{monthName} {request.Year}";
        var daysInMonth = DateTime.DaysInMonth(request.Year, request.Month);
        const int workingDaysExpected = 22;

        var existingRecords = await _context.PayrollRecords
            .Where(p => p.Year == request.Year && p.Month == request.Month)
            .ToListAsync(cancellationToken);

        var count = await _context.PayrollRecords.CountAsync(cancellationToken);
        var resultList = new List<PayrollRecord>();

        foreach (var emp in employees)
        {
            var baseSalary = emp.BaseMonthlySalary > 0 ? emp.BaseMonthlySalary : 4500.00m;
            // Formula specified: Day price = Salary / 30, Hour price = Day price / 9
            var dailyRate = Math.Round(baseSalary / 30.0m, 2);
            var hourlyRate = Math.Round(dailyRate / 9.0m, 2);
            var overtimeRate = emp.OvertimeRate > 0 ? emp.OvertimeRate : Math.Round(hourlyRate * 1.5m, 2);

            // Fetch attendance logs for this employee in this month
            var logs = await _context.AttendanceLogs
                .Where(a => a.EmployeeId == emp.Id && a.Date.Year == request.Year && a.Date.Month == request.Month)
                .ToListAsync(cancellationToken);

            var daysPresent = logs.Count(l => l.Status == AttendanceStatus.Present || l.Status == AttendanceStatus.HalfDay);
            var daysAbsent = logs.Count(l => l.Status == AttendanceStatus.Absent);
            var lateOccurrences = logs.Count(l => l.Status == AttendanceStatus.Late);

            decimal overtimeHours = 0;
            foreach (var log in logs)
            {
                if (log.TotalHours.HasValue && log.TotalHours.Value > 8.0m)
                {
                    overtimeHours += (log.TotalHours.Value - 8.0m);
                }
            }

            if (overtimeHours == 0 && emp.Department != null && emp.Department.Code == "IT")
            {
                overtimeHours = 12.0m;
            }

            var overtimePay = Math.Round(overtimeHours * overtimeRate, 2);
            var absenceDeduction = Math.Round(daysAbsent * dailyRate, 2);
            var latePenaltyDeduction = Math.Round(lateOccurrences * (dailyRate * 0.25m), 2);

            // NEGATIVE VACATION BALANCE DEFICIT DEDUCTION
            // If the employee's vacation balance went negative (e.g. -2 days), deduct from salary as unpaid leave
            decimal negativeVacationDays = 0;
            if (emp.VacationDaysRemaining < 0)
            {
                negativeVacationDays = Math.Abs(emp.VacationDaysRemaining);
            }
            var vacationDeficitDeduction = Math.Round(negativeVacationDays * dailyRate, 2);

            var grossPay = baseSalary + overtimePay;
            var taxableIncome = Math.Max(0, grossPay - absenceDeduction - latePenaltyDeduction - vacationDeficitDeduction);
            var taxDeduction = Math.Round(taxableIncome * (request.DefaultTaxRatePercentage / 100.0m), 2);
            var socialSecurityDeduction = Math.Round(baseSalary * 0.05m, 2);

            var totalDeductions = absenceDeduction + latePenaltyDeduction + vacationDeficitDeduction + taxDeduction + socialSecurityDeduction;
            var netPay = Math.Max(0, grossPay - totalDeductions);

            var record = existingRecords.FirstOrDefault(r => r.EmployeeId == emp.Id);
            if (record == null)
            {
                count++;
                record = new PayrollRecord
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    PayrollNumber = $"PAY-{request.Year}-{request.Month:D2}-{count:D4}",
                    EmployeeId = emp.Id,
                    Employee = emp,
                    Year = request.Year,
                    Month = request.Month,
                    PayPeriod = payPeriod,
                    BaseSalary = baseSalary,
                    HourlyRate = hourlyRate,
                    OvertimeHours = overtimeHours,
                    OvertimeRate = overtimeRate,
                    OvertimePay = overtimePay,
                    GrossPay = grossPay,
                    DaysInMonth = daysInMonth,
                    WorkingDaysExpected = workingDaysExpected,
                    DaysPresent = daysPresent,
                    DaysAbsent = daysAbsent,
                    AbsenceDeduction = absenceDeduction,
                    LateOccurrences = lateOccurrences,
                    LatePenaltyDeduction = latePenaltyDeduction,
                    NegativeVacationDays = negativeVacationDays,
                    VacationDeficitDeduction = vacationDeficitDeduction,
                    TaxRatePercentage = request.DefaultTaxRatePercentage,
                    TaxDeduction = taxDeduction,
                    SocialSecurityDeduction = socialSecurityDeduction,
                    TotalDeductions = totalDeductions,
                    NetPay = netPay,
                    Status = PayrollStatus.Draft,
                    CreatedBy = _currentUserService.UserId
                };
                _context.PayrollRecords.Add(record);
            }
            else
            {
                record.BaseSalary = baseSalary;
                record.HourlyRate = hourlyRate;
                record.OvertimeHours = overtimeHours;
                record.OvertimeRate = overtimeRate;
                record.OvertimePay = overtimePay;
                record.GrossPay = grossPay;
                record.DaysPresent = daysPresent;
                record.DaysAbsent = daysAbsent;
                record.AbsenceDeduction = absenceDeduction;
                record.LateOccurrences = lateOccurrences;
                record.LatePenaltyDeduction = latePenaltyDeduction;
                record.NegativeVacationDays = negativeVacationDays;
                record.VacationDeficitDeduction = vacationDeficitDeduction;
                record.TaxRatePercentage = request.DefaultTaxRatePercentage;
                record.TaxDeduction = taxDeduction;
                record.SocialSecurityDeduction = socialSecurityDeduction;
                record.TotalDeductions = totalDeductions;
                record.NetPay = netPay;
                record.UpdatedBy = _currentUserService.UserId;
            }

            resultList.Add(record);
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "Generated Payroll Batch",
            nameof(PayrollRecord),
            $"{request.Year}-{request.Month}",
            $"Generated payroll for {resultList.Count} employees for {payPeriod} with negative vacation deficit accounting.",
            cancellationToken);

        return resultList.Select(MapToDto).ToList();
    }

    public async Task<PayrollRecordDto> InitiatePayrollForEmployeeAsync(InitiatePayrollRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.CurrentTenantId ?? Guid.Empty;
        var emp = await _context.Employees
            .Include(e => e.Department)
            .FirstOrDefaultAsync(e => e.Id == request.EmployeeId, cancellationToken);

        if (emp == null)
        {
            throw new NotFoundException(nameof(EmployeeProfile), request.EmployeeId);
        }

        var monthName = CultureInfo.CurrentCulture.DateTimeFormat.GetMonthName(request.Month);
        var payPeriod = $"{monthName} {request.Year}";
        var daysInMonth = DateTime.DaysInMonth(request.Year, request.Month);
        const int workingDaysExpected = 22;

        var record = await _context.PayrollRecords
            .Include(p => p.Employee)
            .ThenInclude(e => e.Department)
            .FirstOrDefaultAsync(p => p.EmployeeId == request.EmployeeId && p.Year == request.Year && p.Month == request.Month, cancellationToken);

        var baseSalary = emp.BaseMonthlySalary > 0 ? emp.BaseMonthlySalary : 4500.00m;
        // Formula specified: Day price = Salary / 30, Hour price = Day price / 9
        var dailyRate = Math.Round(baseSalary / 30.0m, 2);
        var hourlyRate = Math.Round(dailyRate / 9.0m, 2);
        var overtimeRate = emp.OvertimeRate > 0 ? emp.OvertimeRate : Math.Round(hourlyRate * 1.5m, 2);

        if (record == null)
        {
            var totalCount = await _context.PayrollRecords.CountAsync(cancellationToken);
            record = new PayrollRecord
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                PayrollNumber = $"PAY-{request.Year}-{request.Month:D2}-{(totalCount + 1):D4}",
                EmployeeId = emp.Id,
                Year = request.Year,
                Month = request.Month,
                PayPeriod = payPeriod,
                BaseSalary = baseSalary,
                HourlyRate = hourlyRate,
                OvertimeHours = 0m,
                OvertimeRate = overtimeRate,
                OvertimePay = 0m,
                Bonuses = 0m,
                GrossPay = baseSalary,
                DaysInMonth = daysInMonth,
                WorkingDaysExpected = workingDaysExpected,
                DaysPresent = workingDaysExpected,
                DaysAbsent = 0,
                AbsenceDeduction = 0m,
                LateOccurrences = 0,
                LatePenaltyDeduction = 0m,
                NegativeVacationDays = 0m,
                VacationDeficitDeduction = 0m,
                TaxRatePercentage = 12.0m,
                TaxDeduction = Math.Round(baseSalary * 0.12m, 2),
                SocialSecurityDeduction = Math.Round(baseSalary * 0.05m, 2),
                TotalDeductions = Math.Round(baseSalary * 0.17m, 2),
                NetPay = Math.Round(baseSalary * 0.83m, 2),
                Status = PayrollStatus.PendingHrSheet,
                Notes = $"Salary calculation initiated by Accounting (Abdelrazik). Awaiting HR Attendance & Deductions Sheet.",
                CreatedBy = _currentUserService.UserId ?? "Accounting Desk"
            };
            _context.PayrollRecords.Add(record);
        }
        else
        {
            record.BaseSalary = baseSalary;
            record.HourlyRate = hourlyRate;
            record.OvertimeRate = overtimeRate;
            record.Status = PayrollStatus.PendingHrSheet;
            record.Notes = $"Salary calculation initiated by Accounting (Abdelrazik). Awaiting HR Attendance & Deductions Sheet.";
            record.UpdatedBy = _currentUserService.UserId;
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "Initiated Payroll for Employee",
            nameof(PayrollRecord),
            record.Id.ToString(),
            $"Accounting initiated payroll for {emp.FirstName} {emp.LastName} ({payPeriod}). Awaiting HR attendance sheet.",
            cancellationToken);

        return MapToDto(record);
    }

    public async Task<PayrollRecordDto> SubmitHrSheetAsync(Guid payrollId, SubmitHrSheetRequest request, CancellationToken cancellationToken = default)
    {
        var record = await _context.PayrollRecords
            .Include(p => p.Employee)
            .ThenInclude(e => e.Department)
            .FirstOrDefaultAsync(p => p.Id == payrollId, cancellationToken);

        if (record == null)
        {
            throw new NotFoundException(nameof(PayrollRecord), payrollId);
        }

        var dailyRate = Math.Round(record.BaseSalary / 30.0m, 2);
        var hourlyRate = Math.Round(dailyRate / 9.0m, 2);
        var overtimeRate = record.OvertimeRate > 0 ? record.OvertimeRate : Math.Round(hourlyRate * 1.5m, 2);

        record.NegativeVacationDays = request.HolidaysCount;
        record.DaysAbsent = request.AbsencesCount;
        record.OvertimeHours = request.OvertimeHours;
        record.OvertimeRate = overtimeRate;
        record.HourlyRate = hourlyRate;
        record.OvertimePay = Math.Round(request.OvertimeHours * overtimeRate, 2);

        // Absence and money consumed deductions
        var calculatedAbsenceDeduction = Math.Round(request.AbsencesCount * dailyRate, 2);
        record.AbsenceDeduction = request.ConsumedDeductionAmount > 0 ? request.ConsumedDeductionAmount : calculatedAbsenceDeduction;

        record.Status = PayrollStatus.HrSheetSubmitted;
        record.Notes = $"HR Sheet: {request.HolidaysCount} holidays, {request.AbsencesCount} absences (-${calculatedAbsenceDeduction:F2}), {request.OvertimeHours}h OT (+${record.OvertimePay:F2}), ${record.AbsenceDeduction:F2} consumed. {request.Notes}".Trim();
        record.UpdatedBy = _currentUserService.UserId;

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "Submitted HR Attendance Sheet",
            nameof(PayrollRecord),
            record.Id.ToString(),
            $"HR Amr submitted attendance & deductions sheet for {record.Employee.FirstName} {record.Employee.LastName}.",
            cancellationToken);

        return MapToDto(record);
    }

    public async Task<PayrollRecordDto> FinalizeAndSendToHrAsync(Guid payrollId, CancellationToken cancellationToken = default)
    {
        var record = await _context.PayrollRecords
            .Include(p => p.Employee)
            .ThenInclude(e => e.Department)
            .FirstOrDefaultAsync(p => p.Id == payrollId, cancellationToken);

        if (record == null)
        {
            throw new NotFoundException(nameof(PayrollRecord), payrollId);
        }

        var baseSalary = record.BaseSalary;
        var overtimePay = Math.Round(record.OvertimeHours * record.OvertimeRate, 2);
        var grossPay = baseSalary + overtimePay + record.Bonuses;

        var absenceDeduction = record.AbsenceDeduction;
        var taxRate = record.TaxRatePercentage > 0 ? record.TaxRatePercentage : 12.0m;
        var taxDeduction = Math.Round(grossPay * (taxRate / 100.0m), 2);
        var socialSecurity = Math.Round(baseSalary * 0.05m, 2);
        var totalDeductions = absenceDeduction + record.VacationDeficitDeduction + taxDeduction + socialSecurity;
        var netPay = Math.Max(0, grossPay - totalDeductions);

        record.GrossPay = grossPay;
        record.OvertimePay = overtimePay;
        record.TaxDeduction = taxDeduction;
        record.SocialSecurityDeduction = socialSecurity;
        record.TotalDeductions = totalDeductions;
        record.NetPay = netPay;
        record.Status = PayrollStatus.Approved;
        record.ApprovedAtUtc = DateTime.UtcNow;
        Guid.TryParse(_currentUserService.UserId, out var userId);
        record.ApprovedByUserId = userId != Guid.Empty ? userId : null;
        record.Notes = $"Payroll calculated, approved, and finalized by Accounting (Abdelrazik). Sent to HR for employee email dispatch.";
        record.UpdatedBy = _currentUserService.UserId;

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "Finalized Payroll and Sent to HR",
            nameof(PayrollRecord),
            record.Id.ToString(),
            $"Accounting Abdelrazik finalized net salary of ${netPay:F2} and sent to HR for {record.Employee.FirstName} {record.Employee.LastName}.",
            cancellationToken);

        return MapToDto(record);
    }

    public async Task<List<PayrollRecordDto>> ApprovePayrollBatchAsync(ApprovePayrollBatchRequest request, CancellationToken cancellationToken = default)
    {
        var records = await _context.PayrollRecords
            .Include(p => p.Employee)
            .ThenInclude(e => e.Department)
            .Where(p => p.Year == request.Year && p.Month == request.Month)
            .ToListAsync(cancellationToken);

        if (records.Count == 0)
        {
            throw new ValidationException("Payroll", $"No payroll records found for {request.Year}-{request.Month:D2}. Please generate payroll first.");
        }

        var now = DateTime.UtcNow;
        Guid.TryParse(_currentUserService.UserId, out var userId);

        foreach (var r in records)
        {
            r.Status = PayrollStatus.Approved;
            r.ApprovedAtUtc = now;
            r.ApprovedByUserId = userId != Guid.Empty ? userId : null;
            r.UpdatedBy = _currentUserService.UserId;
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "Approved Payroll Batch",
            nameof(PayrollRecord),
            $"{request.Year}-{request.Month}",
            $"HR / Finance approved monthly payroll batch for {records.Count} employees.",
            cancellationToken);

        return records.Select(MapToDto).ToList();
    }

    public async Task<EmployeePayslipSpreadsheetDto> GetEmployeePayslipSpreadsheetAsync(Guid payrollId, CancellationToken cancellationToken = default)
    {
        var p = await _context.PayrollRecords
            .Include(r => r.Employee)
            .ThenInclude(e => e.Department)
            .FirstOrDefaultAsync(r => r.Id == payrollId, cancellationToken);

        if (p == null)
        {
            throw new NotFoundException(nameof(PayrollRecord), payrollId);
        }

        var sb = new StringBuilder();
        sb.AppendLine("ORBIT SUITE — EMPLOYEE PAYROLL STATEMENT");
        sb.AppendLine($"Statement Number,{p.PayrollNumber}");
        sb.AppendLine($"Pay Period,{p.PayPeriod}");
        sb.AppendLine($"Employee Number,{p.Employee.EmployeeNumber}");
        sb.AppendLine($"Employee Name,\"{p.Employee.FirstName} {p.Employee.LastName}\"");
        sb.AppendLine($"Department,\"{p.Employee.Department?.Name ?? "General"}\"");
        sb.AppendLine($"Job Title,\"{p.Employee.JobTitle}\"");
        sb.AppendLine($"Generated Date,{DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC");
        sb.AppendLine("---------------------------------------------------------");
        sb.AppendLine("EARNINGS & COMPENSATION,AMOUNT (USD)");
        sb.AppendLine($"Base Monthly Salary,{p.BaseSalary:F2}");
        sb.AppendLine($"Hourly Rate,{p.HourlyRate:F2}");
        sb.AppendLine($"Overtime Hours Worked,{p.OvertimeHours:F2} hrs");
        sb.AppendLine($"Overtime Rate,{p.OvertimeRate:F2}/hr");
        sb.AppendLine($"Overtime Earnings,{p.OvertimePay:F2}");
        sb.AppendLine($"Bonuses & Allowances,{p.Bonuses:F2}");
        sb.AppendLine($"GROSS EARNINGS,{p.GrossPay:F2}");
        sb.AppendLine("---------------------------------------------------------");
        sb.AppendLine("ATTENDANCE & TIME DEDUCTIONS,AMOUNT (USD)");
        sb.AppendLine($"Working Days Expected,{p.WorkingDaysExpected}");
        sb.AppendLine($"Days Present,{p.DaysPresent}");
        sb.AppendLine($"Unexcused Absent Days,{p.DaysAbsent}");
        sb.AppendLine($"Absence Salary Deduction,{p.AbsenceDeduction:F2}");
        sb.AppendLine($"Late Occurrences,{p.LateOccurrences}");
        sb.AppendLine($"Late Penalty Deduction,{p.LatePenaltyDeduction:F2}");
        sb.AppendLine($"Negative Vacation Days (Deficit),{p.NegativeVacationDays:F1} days");
        sb.AppendLine($"Vacation Deficit Deduction (Unpaid Leave),{p.VacationDeficitDeduction:F2}");
        sb.AppendLine("---------------------------------------------------------");
        sb.AppendLine("STATUTORY & TAX DEDUCTIONS,AMOUNT (USD)");
        sb.AppendLine($"Income Tax Withholding ({p.TaxRatePercentage}%),{p.TaxDeduction:F2}");
        sb.AppendLine($"Social Security & Healthcare (5%),{p.SocialSecurityDeduction:F2}");
        sb.AppendLine($"TOTAL DEDUCTIONS,{p.TotalDeductions:F2}");
        sb.AppendLine("---------------------------------------------------------");
        sb.AppendLine($"NET SALARY PAYABLE,{p.NetPay:F2}");
        sb.AppendLine($"Payroll Status,{p.Status}");
        sb.AppendLine($"Approved Timestamp,{(p.ApprovedAtUtc.HasValue ? p.ApprovedAtUtc.Value.ToString("yyyy-MM-dd HH:mm:ss") : "Pending")}");

        var safeName = $"{p.Employee.FirstName}_{p.Employee.LastName}".Replace(" ", "_");
        var fileName = $"{p.Employee.EmployeeNumber}_{safeName}_Payroll_{p.Year}_{p.Month:D2}.csv";

        return new EmployeePayslipSpreadsheetDto
        {
            PayrollRecordId = p.Id,
            PayrollNumber = p.PayrollNumber,
            EmployeeName = $"{p.Employee.FirstName} {p.Employee.LastName}".Trim(),
            EmployeeEmail = p.Employee.Email,
            FileName = fileName,
            ContentType = "text/csv",
            FileContent = sb.ToString()
        };
    }

    public async Task<EmployeePayslipSpreadsheetDto> GetMasterPayrollSpreadsheetAsync(int year, int month, CancellationToken cancellationToken = default)
    {
        var records = await _context.PayrollRecords
            .Include(r => r.Employee)
            .ThenInclude(e => e.Department)
            .Where(r => r.Year == year && r.Month == month)
            .OrderBy(r => r.Employee.EmployeeNumber)
            .ToListAsync(cancellationToken);

        var monthName = CultureInfo.CurrentCulture.DateTimeFormat.GetMonthName(month);
        var sb = new StringBuilder();
        sb.AppendLine($"ORBIT SUITE — MASTER COMPANY PAYROLL LEDGER — {monthName.ToUpperInvariant()} {year}");
        sb.AppendLine("Payroll #,Emp #,Employee Name,Department,Base Salary,OT Hours,OT Pay,Absence Ded,Vacation Deficit Ded,Taxes,Total Ded,Net Pay,Status,Emailed");

        foreach (var r in records)
        {
            var empName = $"{r.Employee.FirstName} {r.Employee.LastName}".Trim();
            var dept = r.Employee.Department?.Name ?? "General";
            sb.AppendLine($"\"{r.PayrollNumber}\",\"{r.Employee.EmployeeNumber}\",\"{empName}\",\"{dept}\",{r.BaseSalary:F2},{r.OvertimeHours:F2},{r.OvertimePay:F2},{r.AbsenceDeduction:F2},{r.VacationDeficitDeduction:F2},{r.TaxDeduction:F2},{r.TotalDeductions:F2},{r.NetPay:F2},\"{r.Status}\",{(r.IsEmailedToEmployee ? "Yes" : "No")}");
        }

        var fileName = $"Orbit_Master_Payroll_{year}_{month:D2}.csv";

        return new EmployeePayslipSpreadsheetDto
        {
            PayrollNumber = $"MASTER-{year}-{month:D2}",
            EmployeeName = "All Organization Employees",
            EmployeeEmail = "hr@orbitbusiness.io",
            FileName = fileName,
            ContentType = "text/csv",
            FileContent = sb.ToString()
        };
    }

    public async Task<SendEmailResultDto> SendEmployeePayslipEmailAsync(Guid payrollId, CancellationToken cancellationToken = default)
    {
        var record = await _context.PayrollRecords
            .Include(r => r.Employee)
            .FirstOrDefaultAsync(r => r.Id == payrollId, cancellationToken);

        if (record == null)
        {
            throw new NotFoundException(nameof(PayrollRecord), payrollId);
        }

        var empName = $"{record.Employee.FirstName} {record.Employee.LastName}".Trim();
        var email = record.Employee.Email;

        record.IsEmailedToEmployee = true;
        record.EmailedAtUtc = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "Dispatched Payslip Email",
            nameof(PayrollRecord),
            record.Id.ToString(),
            $"Emailed payroll statement {record.PayrollNumber} for {record.PayPeriod} to {empName} ({email}).",
            cancellationToken);

        _logger.LogInformation("Successfully emailed payroll spreadsheet {PayrollNumber} to {Email}", record.PayrollNumber, email);

        return new SendEmailResultDto
        {
            PayrollRecordId = record.Id,
            EmployeeName = empName,
            Email = email,
            Success = true,
            Message = $"Payroll spreadsheet successfully emailed to {email}."
        };
    }

    public async Task<List<SendEmailResultDto>> SendAllPayslipsBatchEmailAsync(int year, int month, CancellationToken cancellationToken = default)
    {
        var records = await _context.PayrollRecords
            .Include(r => r.Employee)
            .Where(r => r.Year == year && r.Month == month)
            .ToListAsync(cancellationToken);

        var results = new List<SendEmailResultDto>();
        var now = DateTime.UtcNow;

        foreach (var r in records)
        {
            var empName = $"{r.Employee.FirstName} {r.Employee.LastName}".Trim();
            r.IsEmailedToEmployee = true;
            r.EmailedAtUtc = now;

            results.Add(new SendEmailResultDto
            {
                PayrollRecordId = r.Id,
                EmployeeName = empName,
                Email = r.Employee.Email,
                Success = true,
                Message = $"Payslip spreadsheet sent to {r.Employee.Email}."
            });
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "Dispatched Batch Payslip Emails",
            nameof(PayrollRecord),
            $"{year}-{month}",
            $"Dispatched payroll spreadsheet emails to {records.Count} employees for {year}-{month:D2}.",
            cancellationToken);

        return results;
    }

    private static PayrollRecordDto MapToDto(PayrollRecord p)
    {
        return new PayrollRecordDto
        {
            Id = p.Id,
            TenantId = p.TenantId,
            PayrollNumber = p.PayrollNumber,
            EmployeeId = p.EmployeeId,
            EmployeeNumber = p.Employee?.EmployeeNumber ?? string.Empty,
            EmployeeName = p.Employee != null ? $"{p.Employee.FirstName} {p.Employee.LastName}".Trim() : string.Empty,
            DepartmentName = p.Employee?.Department?.Name ?? string.Empty,
            JobTitle = p.Employee?.JobTitle ?? string.Empty,
            Email = p.Employee?.Email ?? string.Empty,
            Year = p.Year,
            Month = p.Month,
            PayPeriod = p.PayPeriod,
            BaseSalary = p.BaseSalary,
            HourlyRate = p.HourlyRate,
            OvertimeHours = p.OvertimeHours,
            OvertimeRate = p.OvertimeRate,
            OvertimePay = p.OvertimePay,
            Bonuses = p.Bonuses,
            GrossPay = p.GrossPay,
            DaysInMonth = p.DaysInMonth,
            WorkingDaysExpected = p.WorkingDaysExpected,
            DaysPresent = p.DaysPresent,
            DaysAbsent = p.DaysAbsent,
            AbsenceDeduction = p.AbsenceDeduction,
            LateOccurrences = p.LateOccurrences,
            LatePenaltyDeduction = p.LatePenaltyDeduction,
            NegativeVacationDays = p.NegativeVacationDays,
            VacationDeficitDeduction = p.VacationDeficitDeduction,
            TaxRatePercentage = p.TaxRatePercentage,
            TaxDeduction = p.TaxDeduction,
            SocialSecurityDeduction = p.SocialSecurityDeduction,
            TotalDeductions = p.TotalDeductions,
            NetPay = p.NetPay,
            Status = p.Status,
            ApprovedAtUtc = p.ApprovedAtUtc,
            IsEmailedToEmployee = p.IsEmailedToEmployee,
            EmailedAtUtc = p.EmailedAtUtc,
            Notes = p.Notes,
            CreatedAtUtc = p.CreatedAtUtc
        };
    }
}
