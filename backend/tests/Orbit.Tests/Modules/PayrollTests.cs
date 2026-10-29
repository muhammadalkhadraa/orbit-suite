using System;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Orbit.Application.Modules.Payroll.Dtos;
using Orbit.Domain.Entities;
using Orbit.Domain.Enums;
using Orbit.Infrastructure.Persistence;
using Orbit.Infrastructure.Services;
using Xunit;

namespace Orbit.Tests.Modules;

public class PayrollTests
{
    private (OrbitDbContext db, TenantContext tenantContext, FakeCurrentUserService userService, PayrollService payrollService)
        SetupTestEnvironment()
    {
        var tenantContext = new TenantContext();
        var userService = new FakeCurrentUserService();

        var options = new DbContextOptionsBuilder<OrbitDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var db = new OrbitDbContext(options, tenantContext, userService);
        var auditService = new AuditService(db, tenantContext, userService);
        var logger = NullLogger<PayrollService>.Instance;
        var payrollService = new PayrollService(db, tenantContext, userService, auditService, logger);

        return (db, tenantContext, userService, payrollService);
    }

    [Fact]
    public async Task GenerateMonthlyPayroll_CalculatesCompensation_AndDeficitVacationDeduction()
    {
        var (db, tenantContext, userService, payrollService) = SetupTestEnvironment();
        var tenantId = Guid.NewGuid();
        tenantContext.SetContext(tenantId, "admin-user", TenantRole.Owner);
        userService.UserId = "admin-user";

        var dept = new Department { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Hardware Engineering", Code = "ENG" };
        db.Departments.Add(dept);

        // Employee with base salary 8,800, hourly 50, overtime rate 75
        // Vacation days: 10 allocated, 13 used => 3 negative deficit days!
        var emp = new EmployeeProfile
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            UserId = "user-eng-1",
            EmployeeNumber = "EMP-777",
            FirstName = "Marcus",
            LastName = "Wright",
            Email = "m.wright@cyberdyne.org",
            DepartmentId = dept.Id,
            BaseMonthlySalary = 8800m,
            HourlyRate = 50m,
            OvertimeRate = 75m,
            VacationDaysAllocated = 10,
            VacationDaysUsed = 13, // 10 - 13 = -3 deficit days!
            IsActive = true
        };
        db.Employees.Add(emp);

        // Add 1 attendance record with 12 total hours (4 overtime hours)
        var attendanceDate = new DateTime(2026, 10, 5, 0, 0, 0, DateTimeKind.Utc);
        db.AttendanceLogs.Add(new AttendanceLog
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            EmployeeId = emp.Id,
            Date = attendanceDate,
            TotalHours = 12.0m,
            Status = AttendanceStatus.Present,
            ActivityState = ActivityState.Closed,
            TotalWorkSeconds = 12 * 3600
        });

        await db.SaveChangesAsync();

        // Act: Generate payroll batch for 2026-10
        var request = new GeneratePayrollBatchRequest
        {
            Year = 2026,
            Month = 10,
            DefaultTaxRatePercentage = 15.0m
        };

        var records = await payrollService.GeneratePayrollBatchAsync(request);

        // Assert
        records.Should().HaveCount(1);
        var rec = records.First();
        rec.EmployeeId.Should().Be(emp.Id);
        rec.BaseSalary.Should().Be(8800m);
        rec.OvertimeHours.Should().Be(4.0m);
        rec.OvertimePay.Should().Be(300m); // 4 * 75 = 300
        rec.GrossPay.Should().Be(9100m); // 8800 + 300

        // Daily rate: 8800 / 22 = 400. 3 deficit vacation days = 3 * 400 = 1200 deduction!
        rec.NegativeVacationDays.Should().Be(3.0m);
        rec.VacationDeficitDeduction.Should().Be(1200m);

        // Taxable income: 9100 - 1200 = 7900. Tax (15%): 1185.00
        rec.TaxDeduction.Should().Be(1185m);
        // Social security: 8800 * 0.05 = 440.00
        rec.SocialSecurityDeduction.Should().Be(440m);
        // Total deductions = 1200 + 1185 + 440 = 2825
        rec.TotalDeductions.Should().Be(2825m);
        rec.NetPay.Should().Be(9100m - 2825m); // 6275
        rec.Status.Should().Be(PayrollStatus.Draft);
    }

    [Fact]
    public async Task ApprovePayrollBatch_TransitionsStatusToApproved()
    {
        var (db, tenantContext, userService, payrollService) = SetupTestEnvironment();
        var tenantId = Guid.NewGuid();
        tenantContext.SetContext(tenantId, "admin-user", TenantRole.Owner);
        userService.UserId = "admin-user";

        var dept = new Department { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Finance", Code = "FIN" };
        db.Departments.Add(dept);

        var emp = new EmployeeProfile
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            UserId = "user-fin-1",
            EmployeeNumber = "EMP-888",
            FirstName = "Rachel",
            LastName = "Tyrell",
            Email = "rachel@tyrell.corp",
            DepartmentId = dept.Id,
            BaseMonthlySalary = 6600m,
            VacationDaysAllocated = 15,
            VacationDaysUsed = 5,
            IsActive = true
        };
        db.Employees.Add(emp);
        await db.SaveChangesAsync();

        await payrollService.GeneratePayrollBatchAsync(new GeneratePayrollBatchRequest { Year = 2026, Month = 10 });

        // Act: Approve batch
        var approvedRecords = await payrollService.ApprovePayrollBatchAsync(new ApprovePayrollBatchRequest { Year = 2026, Month = 10 });

        approvedRecords.Should().HaveCount(1);
        approvedRecords.First().Status.Should().Be(PayrollStatus.Approved);
        approvedRecords.First().ApprovedAtUtc.Should().NotBeNull();

        var summary = await payrollService.GetPayrollSummaryAsync(2026, 10);
        summary.TotalEmployees.Should().Be(1);
        summary.ApprovedCount.Should().Be(1);
        summary.DraftCount.Should().Be(0);
    }

    [Fact]
    public async Task ExportEmployeePayslipSpreadsheet_ReturnsValidSpreadsheetData()
    {
        var (db, tenantContext, userService, payrollService) = SetupTestEnvironment();
        var tenantId = Guid.NewGuid();
        tenantContext.SetContext(tenantId, "admin-user", TenantRole.Owner);
        userService.UserId = "admin-user";

        var dept = new Department { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Sales", Code = "SALES" };
        db.Departments.Add(dept);

        var emp = new EmployeeProfile
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            UserId = "user-sales-1",
            EmployeeNumber = "EMP-999",
            FirstName = "Dave",
            LastName = "Bowman",
            Email = "dbowman@discovery.space",
            DepartmentId = dept.Id,
            BaseMonthlySalary = 5000m,
            VacationDaysAllocated = 10,
            VacationDaysUsed = 12, // -2 negative days
            IsActive = true
        };
        db.Employees.Add(emp);
        await db.SaveChangesAsync();

        var batch = await payrollService.GeneratePayrollBatchAsync(new GeneratePayrollBatchRequest { Year = 2026, Month = 10 });
        var recordId = batch.First().Id;

        // Act: Generate individual spreadsheet
        var sheet = await payrollService.GetEmployeePayslipSpreadsheetAsync(recordId);

        sheet.FileName.Should().Contain("EMP-999");
        sheet.FileContent.Should().NotBeNullOrEmpty();
        sheet.FileContent.Should().Contain("Dave Bowman");
        sheet.FileContent.Should().Contain("EMP-999");
        sheet.FileContent.Should().Contain("Vacation Deficit Deduction (Unpaid Leave)");
        sheet.FileContent.Should().Contain("Negative Vacation Days (Deficit)");
    }

    [Fact]
    public async Task SendEmployeePayslipEmail_MarksRecordAsEmailed()
    {
        var (db, tenantContext, userService, payrollService) = SetupTestEnvironment();
        var tenantId = Guid.NewGuid();
        tenantContext.SetContext(tenantId, "admin-user", TenantRole.Owner);
        userService.UserId = "admin-user";

        var dept = new Department { Id = Guid.NewGuid(), TenantId = tenantId, Name = "IT", Code = "IT" };
        db.Departments.Add(dept);

        var emp = new EmployeeProfile
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            UserId = "user-it-1",
            EmployeeNumber = "EMP-321",
            FirstName = "Roy",
            LastName = "Batty",
            Email = "rbatty@nexus.ai",
            DepartmentId = dept.Id,
            BaseMonthlySalary = 9000m,
            VacationDaysAllocated = 14,
            VacationDaysUsed = 4,
            IsActive = true
        };
        db.Employees.Add(emp);
        await db.SaveChangesAsync();

        var batch = await payrollService.GeneratePayrollBatchAsync(new GeneratePayrollBatchRequest { Year = 2026, Month = 10 });
        var recordId = batch.First().Id;

        // Act: Send payslip email
        var result = await payrollService.SendEmployeePayslipEmailAsync(recordId);

        result.Success.Should().BeTrue();
        result.Email.Should().Be("rbatty@nexus.ai");

        var rec = await payrollService.GetPayrollRecordByIdAsync(recordId);
        rec.IsEmailedToEmployee.Should().BeTrue();
        rec.EmailedAtUtc.Should().NotBeNull();
    }
}
