using System;
using System.Security.Claims;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Orbit.Application.Common.Exceptions;
using Orbit.Application.Modules.Tasks.Dtos;
using Orbit.Domain.Entities;
using Orbit.Domain.Enums;
using Orbit.Infrastructure.Persistence;
using Orbit.Infrastructure.Services;
using Xunit;

namespace Orbit.Tests.Modules;

public class TaskVisibilityTests
{
    private (OrbitDbContext db, TenantContext tenantContext, FakeCurrentUserService userService, TaskService taskService)
        SetupTestEnvironment()
    {
        var tenantContext = new TenantContext();
        var userService = new FakeCurrentUserService();

        var options = new DbContextOptionsBuilder<OrbitDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var db = new OrbitDbContext(options, tenantContext, userService);
        var auditService = new AuditService(db, tenantContext, userService);
        var taskService = new TaskService(db, tenantContext, userService, auditService);

        return (db, tenantContext, userService, taskService);
    }

    [Fact]
    public async Task Employee_CanOnlyViewTheirOwnTasks()
    {
        var (db, tenantContext, userService, taskService) = SetupTestEnvironment();
        var tenantId = Guid.NewGuid();

        // Seed tenant, employees, and tasks
        var emp1 = new EmployeeProfile { Id = Guid.NewGuid(), TenantId = tenantId, UserId = "user-1", FirstName = "Alice", LastName = "Smith" };
        var emp2 = new EmployeeProfile { Id = Guid.NewGuid(), TenantId = tenantId, UserId = "user-2", FirstName = "Bob", LastName = "Jones" };

        db.Employees.AddRange(emp1, emp2);

        var task1 = new TaskItem { Id = Guid.NewGuid(), TenantId = tenantId, Title = "Alice Task", AssignedEmployeeId = emp1.Id };
        var task2 = new TaskItem { Id = Guid.NewGuid(), TenantId = tenantId, Title = "Bob Task", AssignedEmployeeId = emp2.Id };

        db.Tasks.AddRange(task1, task2);
        await db.SaveChangesAsync();

        // Act as Alice (Employee role)
        tenantContext.SetContext(tenantId, "user-1", TenantRole.Employee);
        userService.UserId = "user-1";

        var filter = new TaskFilterRequest { PageNumber = 1, PageSize = 10 };
        var result = await taskService.GetTasksAsync(filter);

        // Assert: Alice should only see task 1
        result.Data.Should().ContainSingle(t => t.Id == task1.Id);
        result.Data.Should().NotContain(t => t.Id == task2.Id);

        // Alice trying to directly get Bob's task by ID should fail with ForbiddenAccessException
        var directGet = async () => await taskService.GetTaskByIdAsync(task2.Id);
        await directGet.Should().ThrowAsync<ForbiddenAccessException>();
    }

    [Fact]
    public async Task Manager_CanViewDirectReportsTasks()
    {
        var (db, tenantContext, userService, taskService) = SetupTestEnvironment();
        var tenantId = Guid.NewGuid();

        var manager = new EmployeeProfile { Id = Guid.NewGuid(), TenantId = tenantId, UserId = "manager-1", FirstName = "Charlie", LastName = "Boss" };
        var directReport = new EmployeeProfile { Id = Guid.NewGuid(), TenantId = tenantId, UserId = "user-3", FirstName = "David", LastName = "Subordinate", ReportsToEmployeeId = manager.Id };
        var unrelatedEmp = new EmployeeProfile { Id = Guid.NewGuid(), TenantId = tenantId, UserId = "user-4", FirstName = "Eve", LastName = "Unrelated" };

        db.Employees.AddRange(manager, directReport, unrelatedEmp);

        var reportTask = new TaskItem { Id = Guid.NewGuid(), TenantId = tenantId, Title = "Report Work", AssignedEmployeeId = directReport.Id };
        var otherTask = new TaskItem { Id = Guid.NewGuid(), TenantId = tenantId, Title = "Unrelated Work", AssignedEmployeeId = unrelatedEmp.Id };

        db.Tasks.AddRange(reportTask, otherTask);
        await db.SaveChangesAsync();

        // Act as Manager
        tenantContext.SetContext(tenantId, "manager-1", TenantRole.Manager);
        userService.UserId = "manager-1";

        var filter = new TaskFilterRequest { PageNumber = 1, PageSize = 10 };
        var result = await taskService.GetTasksAsync(filter);

        // Assert: Manager sees direct report's task but NOT unrelated employee's task
        result.Data.Should().Contain(t => t.Id == reportTask.Id);
        result.Data.Should().NotContain(t => t.Id == otherTask.Id);
    }

    [Fact]
    public async Task Employee_CannotDeleteTasks()
    {
        var (db, tenantContext, userService, taskService) = SetupTestEnvironment();
        var tenantId = Guid.NewGuid();

        var emp = new EmployeeProfile { Id = Guid.NewGuid(), TenantId = tenantId, UserId = "emp-1", FirstName = "Frank", LastName = "Worker" };
        var task = new TaskItem { Id = Guid.NewGuid(), TenantId = tenantId, Title = "Regular Task", AssignedEmployeeId = emp.Id };

        db.Employees.Add(emp);
        db.Tasks.Add(task);
        await db.SaveChangesAsync();

        tenantContext.SetContext(tenantId, "emp-1", TenantRole.Employee);
        userService.UserId = "emp-1";

        var deleteAct = async () => await taskService.DeleteTaskAsync(task.Id);
        await deleteAct.Should().ThrowAsync<ForbiddenAccessException>()
            .WithMessage("*Employees cannot delete tasks*");
    }
}

public class FakeCurrentUserService : Orbit.Application.Interfaces.ICurrentUserService
{
    public string? UserId { get; set; }
    public string? Email { get; set; } = "test@orbit.business";
    public bool IsAuthenticated => !string.IsNullOrEmpty(UserId);
    public string? IpAddress => "127.0.0.1";
}
