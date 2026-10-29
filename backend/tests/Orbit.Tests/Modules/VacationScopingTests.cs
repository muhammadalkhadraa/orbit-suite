using System;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Orbit.Application.Common.Exceptions;
using Orbit.Application.Modules.Hr.Dtos;
using Orbit.Domain.Entities;
using Orbit.Domain.Enums;
using Orbit.Infrastructure.Persistence;
using Orbit.Infrastructure.Services;
using Xunit;

namespace Orbit.Tests.Modules;

public class VacationScopingTests
{
    private (OrbitDbContext db, TenantContext tenantContext, FakeCurrentUserService userService, HrService hrService)
        SetupTestEnvironment()
    {
        var tenantContext = new TenantContext();
        var userService = new FakeCurrentUserService();

        var options = new DbContextOptionsBuilder<OrbitDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var db = new OrbitDbContext(options, tenantContext, userService);
        var auditService = new AuditService(db, tenantContext, userService);
        var hrService = new HrService(db, tenantContext, userService, auditService);

        return (db, tenantContext, userService, hrService);
    }

    [Fact]
    public async Task VacationDays_ShouldDecrementOnApproval_AndCountNegativeWhenExhausted()
    {
        var (db, tenantContext, userService, hrService) = SetupTestEnvironment();
        var tenantId = Guid.NewGuid();

        var dept = new Department { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Operations", Code = "OPS" };
        db.Departments.Add(dept);

        var manager = new EmployeeProfile
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            UserId = "user-mgr",
            EmployeeNumber = "EMP-MGR",
            FirstName = "Marcus",
            LastName = "Vance",
            DepartmentId = dept.Id
        };

        dept.ManagerEmployeeId = manager.Id;

        var employee = new EmployeeProfile
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            UserId = "user-emp",
            EmployeeNumber = "EMP-010",
            FirstName = "Leo",
            LastName = "Fitz",
            DepartmentId = dept.Id,
            ReportsToEmployeeId = manager.Id,
            VacationDaysAllocated = 5,
            VacationDaysUsed = 0
        };

        db.Employees.AddRange(manager, employee);
        await db.SaveChangesAsync();

        // 1. Employee checks balance
        tenantContext.SetContext(tenantId, "user-emp", TenantRole.Employee);
        userService.UserId = "user-emp";

        var balanceBefore = await hrService.GetVacationBalanceAsync(employee.Id);
        balanceBefore.AllocatedDays.Should().Be(5);
        balanceBefore.UsedDays.Should().Be(0);
        balanceBefore.RemainingDays.Should().Be(5);
        balanceBefore.IsDeficit.Should().BeFalse();

        // 2. Employee requests 3 days vacation
        var leave1 = await hrService.SubmitLeaveRequestAsync(new CreateLeaveRequestRequest
        {
            StartDateUtc = DateTime.UtcNow.Date.AddDays(10),
            EndDateUtc = DateTime.UtcNow.Date.AddDays(12),
            DaysCount = 3,
            Reason = "Family trip"
        });

        leave1.RemainingBalanceAtRequest.Should().Be(5);

        // 3. Manager approves
        tenantContext.SetContext(tenantId, "user-mgr", TenantRole.Manager);
        userService.UserId = "user-mgr";

        var approved1 = await hrService.ActionLeaveRequestAsync(leave1.Id, new ActionLeaveRequestRequest
        {
            Status = LeaveStatus.Approved
        });

        approved1.ResultingBalanceAfterApproval.Should().Be(2); // 5 - 3 = 2
        approved1.IsForwardedToHr.Should().BeTrue();
        approved1.ForwardedToHrAtUtc.Should().NotBeNull();

        // 4. Employee requests 4 more days (Exceeding the 2 days left!)
        tenantContext.SetContext(tenantId, "user-emp", TenantRole.Employee);
        userService.UserId = "user-emp";

        var leave2 = await hrService.SubmitLeaveRequestAsync(new CreateLeaveRequestRequest
        {
            StartDateUtc = DateTime.UtcNow.Date.AddDays(20),
            EndDateUtc = DateTime.UtcNow.Date.AddDays(23),
            DaysCount = 4,
            Reason = "Medical recovery"
        });

        leave2.RemainingBalanceAtRequest.Should().Be(2);

        // 5. Manager approves -> Balance must become NEGATIVE (-2) to record deficit!
        tenantContext.SetContext(tenantId, "user-mgr", TenantRole.Manager);
        userService.UserId = "user-mgr";

        var approved2 = await hrService.ActionLeaveRequestAsync(leave2.Id, new ActionLeaveRequestRequest
        {
            Status = LeaveStatus.Approved
        });

        approved2.ResultingBalanceAfterApproval.Should().Be(-2); // 2 - 4 = -2
        approved2.IsForwardedToHr.Should().BeTrue();

        var balanceFinal = await hrService.GetVacationBalanceAsync(employee.Id);
        balanceFinal.AllocatedDays.Should().Be(5);
        balanceFinal.UsedDays.Should().Be(7);
        balanceFinal.RemainingDays.Should().Be(-2);
        balanceFinal.IsDeficit.Should().BeTrue(); // Flagged as unpaid/deficit vacation!
    }

    [Fact]
    public async Task ManagerFromOtherDepartment_CannotViewOrActionLeaveRequest()
    {
        var (db, tenantContext, userService, hrService) = SetupTestEnvironment();
        var tenantId = Guid.NewGuid();

        var deptA = new Department { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Stores", Code = "STORES" };
        var deptB = new Department { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Finance", Code = "FIN" };
        db.Departments.AddRange(deptA, deptB);

        var managerA = new EmployeeProfile { Id = Guid.NewGuid(), TenantId = tenantId, UserId = "user-mgr-a", FirstName = "Mgr", LastName = "A", DepartmentId = deptA.Id };
        var managerB = new EmployeeProfile { Id = Guid.NewGuid(), TenantId = tenantId, UserId = "user-mgr-b", FirstName = "Mgr", LastName = "B", DepartmentId = deptB.Id };
        deptA.ManagerEmployeeId = managerA.Id;
        deptB.ManagerEmployeeId = managerB.Id;

        var employeeA = new EmployeeProfile { Id = Guid.NewGuid(), TenantId = tenantId, UserId = "user-emp-a", FirstName = "Emp", LastName = "A", DepartmentId = deptA.Id, ReportsToEmployeeId = managerA.Id };

        db.Employees.AddRange(managerA, managerB, employeeA);
        await db.SaveChangesAsync();

        // Employee A submits
        tenantContext.SetContext(tenantId, "user-emp-a", TenantRole.Employee);
        userService.UserId = "user-emp-a";

        var leave = await hrService.SubmitLeaveRequestAsync(new CreateLeaveRequestRequest
        {
            StartDateUtc = DateTime.UtcNow.Date.AddDays(5),
            EndDateUtc = DateTime.UtcNow.Date.AddDays(6),
            DaysCount = 2,
            Reason = "Personal"
        });

        // Manager B (Finance) attempts to view or action Employee A's (Stores) leave request
        tenantContext.SetContext(tenantId, "user-mgr-b", TenantRole.Manager);
        userService.UserId = "user-mgr-b";

        var viewAct = async () => await hrService.GetLeaveRequestByIdAsync(leave.Id);
        await viewAct.Should().ThrowAsync<ForbiddenAccessException>()
            .WithMessage("*outside your supervisory scope*");

        var actionAct = async () => await hrService.ActionLeaveRequestAsync(leave.Id, new ActionLeaveRequestRequest { Status = LeaveStatus.Approved });
        await actionAct.Should().ThrowAsync<ForbiddenAccessException>()
            .WithMessage("*department members or direct reports*");
    }
}
