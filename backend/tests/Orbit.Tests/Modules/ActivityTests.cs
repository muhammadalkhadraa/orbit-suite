using System;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Identity;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Orbit.Application.Interfaces;
using Orbit.Application.Modules.Hr.Dtos;
using Orbit.Domain.Entities;
using Orbit.Domain.Enums;
using Orbit.Infrastructure.Identity;
using Orbit.Infrastructure.Persistence;
using Orbit.Infrastructure.Services;
using Xunit;

namespace Orbit.Tests.Modules;

public class ActivityTests : IDisposable
{
    private readonly SqliteConnection _connection;

    public ActivityTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
    }

    public void Dispose()
    {
        _connection.Dispose();
    }

    private (OrbitDbContext db, TenantContext tenantContext, FakeCurrentUserService userService, UserManager<ApplicationUser> userManager, ActivityService activityService)
        SetupTestEnvironment()
    {
        var services = new ServiceCollection();
        services.AddLogging(b => b.AddConsole());

        var tenantContext = new TenantContext();
        var userService = new FakeCurrentUserService();

        var options = new DbContextOptionsBuilder<OrbitDbContext>()
            .UseSqlite(_connection)
            .Options;

        var db = new OrbitDbContext(options, tenantContext, userService);
        db.Database.EnsureCreated();

        services.AddIdentityCore<ApplicationUser>(options =>
        {
            options.Password.RequireDigit = false;
            options.Password.RequireLowercase = false;
            options.Password.RequireUppercase = false;
            options.Password.RequireNonAlphanumeric = false;
            options.Password.RequiredLength = 6;
            options.User.RequireUniqueEmail = true;
        })
        .AddEntityFrameworkStores<OrbitDbContext>();

        services.AddSingleton(db);
        services.AddSingleton<ITenantContext>(tenantContext);
        services.AddSingleton<ICurrentUserService>(userService);

        var sp = services.BuildServiceProvider();
        var userManager = sp.GetRequiredService<UserManager<ApplicationUser>>();
        var auditService = new AuditService(db, tenantContext, userService);
        var activityService = new ActivityService(db, tenantContext, userService, userManager, auditService);

        return (db, tenantContext, userService, userManager, activityService);
    }

    private async Task<(Guid tenantId, EmployeeProfile employee, ApplicationUser user)> SeedEmployeeAsync(
        OrbitDbContext db,
        UserManager<ApplicationUser> userManager,
        string empNumber = "EMP-001",
        string email = "test.user@starlight.com",
        string password = "OrbitPassword123!")
    {
        var tenantId = Guid.NewGuid();
        var tenant = new Tenant
        {
            Id = tenantId,
            Name = "Test Space Org",
            Slug = "test-space",
            CurrencyCode = "USD"
        };
        db.Tenants.Add(tenant);

        var user = new ApplicationUser
        {
            Id = Guid.NewGuid().ToString(),
            UserName = email,
            Email = email,
            FullName = "Test Astronaut",
            IsActive = true
        };
        await userManager.CreateAsync(user, password);

        var emp = new EmployeeProfile
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            UserId = user.Id,
            EmployeeNumber = empNumber,
            FirstName = "Test",
            LastName = "Astronaut",
            Email = email,
            JobTitle = "Flight Specialist",
            IsActive = true
        };
        db.Employees.Add(emp);
        await db.SaveChangesAsync();

        return (tenantId, emp, user);
    }

    [Fact]
    public async Task Employee_CanStartWork_OnTime_WhenBetween8And810AM()
    {
        var (db, tenantContext, userService, userManager, activityService) = SetupTestEnvironment();
        var (tenantId, emp, user) = await SeedEmployeeAsync(db, userManager, "EMP-101", "on.time@orbit.io");

        tenantContext.SetContext(tenantId, user.Id, TenantRole.Employee);
        userService.UserId = user.Id;

        var request = new ActivityActionRequest
        {
            EmployeeCode = "EMP-101",
            Password = "OrbitPassword123!",
            Action = "Start",
            ClientLocalHour = 8,
            ClientLocalMinute = 5
        };

        var result = await activityService.ExecuteActionAsync(request);

        result.State.Should().Be(ActivityState.Working);
        result.IsLate.Should().BeFalse();
        result.LateMinutes.Should().Be(0);
        result.WorkStartedAtUtc.Should().NotBeNull();
    }

    [Fact]
    public async Task Employee_MarkedLate_WhenStartingAfter810AM()
    {
        var (db, tenantContext, userService, userManager, activityService) = SetupTestEnvironment();
        var (tenantId, emp, user) = await SeedEmployeeAsync(db, userManager, "EMP-102", "late.user@orbit.io");

        tenantContext.SetContext(tenantId, user.Id, TenantRole.Employee);
        userService.UserId = user.Id;

        // Starting at 8:35 AM (25 minutes after 8:10 cutoff)
        var request = new ActivityActionRequest
        {
            EmployeeCode = "EMP-102",
            Password = "OrbitPassword123!",
            Action = "Start",
            ClientLocalHour = 8,
            ClientLocalMinute = 35
        };

        var result = await activityService.ExecuteActionAsync(request);

        result.State.Should().Be(ActivityState.Working);
        result.IsLate.Should().BeTrue();
        result.LateMinutes.Should().Be(25);
    }

    [Fact]
    public async Task Employee_CanTakeBreak_AndResume_Accurately()
    {
        var (db, tenantContext, userService, userManager, activityService) = SetupTestEnvironment();
        var (tenantId, emp, user) = await SeedEmployeeAsync(db, userManager, "EMP-103", "break.user@orbit.io");

        tenantContext.SetContext(tenantId, user.Id, TenantRole.Employee);
        userService.UserId = user.Id;

        // 1. Start Work
        await activityService.ExecuteActionAsync(new ActivityActionRequest
        {
            EmployeeCode = "EMP-103",
            Password = "OrbitPassword123!",
            Action = "Start",
            ClientLocalHour = 8,
            ClientLocalMinute = 0
        });

        // 2. Press Break
        var breakResult = await activityService.ExecuteActionAsync(new ActivityActionRequest
        {
            EmployeeCode = "EMP-103",
            Password = "OrbitPassword123!",
            Action = "Break"
        });

        breakResult.State.Should().Be(ActivityState.OnBreak);
        breakResult.CurrentBreakStartedAtUtc.Should().NotBeNull();

        // 3. Press Resume
        var resumeResult = await activityService.ExecuteActionAsync(new ActivityActionRequest
        {
            EmployeeCode = "EMP-103",
            Password = "OrbitPassword123!",
            Action = "Resume"
        });

        resumeResult.State.Should().Be(ActivityState.Working);
        resumeResult.CurrentBreakStartedAtUtc.Should().BeNull();
        resumeResult.FaultsCount.Should().Be(0);
    }

    [Fact]
    public async Task Employee_BreakExceeding60Minutes_RegistersFault()
    {
        var (db, tenantContext, userService, userManager, activityService) = SetupTestEnvironment();
        var (tenantId, emp, user) = await SeedEmployeeAsync(db, userManager, "EMP-104", "overbreak@orbit.io");

        tenantContext.SetContext(tenantId, user.Id, TenantRole.Employee);
        userService.UserId = user.Id;

        // Start work
        await activityService.ExecuteActionAsync(new ActivityActionRequest
        {
            EmployeeCode = "EMP-104",
            Password = "OrbitPassword123!",
            Action = "Start",
            ClientLocalHour = 8,
            ClientLocalMinute = 8
        });

        // Set log break to 75 minutes (4500 seconds, exceeding 3600 seconds)
        var today = DateTime.UtcNow.Date;
        var log = await db.AttendanceLogs.FirstAsync(a => a.EmployeeId == emp.Id && a.Date == today);
        log.ActivityState = ActivityState.OnBreak;
        log.CurrentBreakStartedAtUtc = DateTime.UtcNow.AddMinutes(-75);
        await db.SaveChangesAsync();

        // Resume work
        var resumeResult = await activityService.ExecuteActionAsync(new ActivityActionRequest
        {
            EmployeeCode = "EMP-104",
            Password = "OrbitPassword123!",
            Action = "Resume"
        });

        resumeResult.State.Should().Be(ActivityState.Working);
        resumeResult.TotalBreakSeconds.Should().BeGreaterThanOrEqualTo(4500);
        resumeResult.FaultsCount.Should().BeGreaterThanOrEqualTo(1);
        resumeResult.FaultReason.Should().Contain("Exceeded 1-hour allowed daily break limit");
    }

    [Fact]
    public async Task Employee_CanEndWork_AndFinalizesSession()
    {
        var (db, tenantContext, userService, userManager, activityService) = SetupTestEnvironment();
        var (tenantId, emp, user) = await SeedEmployeeAsync(db, userManager, "EMP-105", "end.work@orbit.io");

        tenantContext.SetContext(tenantId, user.Id, TenantRole.Employee);
        userService.UserId = user.Id;

        // Start work
        await activityService.ExecuteActionAsync(new ActivityActionRequest
        {
            EmployeeCode = "EMP-105",
            Password = "OrbitPassword123!",
            Action = "Start",
            ClientLocalHour = 8,
            ClientLocalMinute = 10
        });

        // End work
        var endResult = await activityService.ExecuteActionAsync(new ActivityActionRequest
        {
            EmployeeCode = "EMP-105",
            Password = "OrbitPassword123!",
            Action = "End"
        });

        endResult.State.Should().Be(ActivityState.Closed);
        endResult.WorkEndedAtUtc.Should().NotBeNull();
    }

    [Fact]
    public async Task Owner_LiveMonitor_ReturnsAllEmployeesWithAccurateStatuses()
    {
        var (db, tenantContext, userService, userManager, activityService) = SetupTestEnvironment();
        var (tenantId, emp1, user1) = await SeedEmployeeAsync(db, userManager, "EMP-201", "emp1@orbit.io");

        // Seed 2nd employee in same tenant
        var user2 = new ApplicationUser { Id = Guid.NewGuid().ToString(), UserName = "emp2@orbit.io", Email = "emp2@orbit.io", FullName = "Bob" };
        await userManager.CreateAsync(user2, "OrbitPassword123!");
        var emp2 = new EmployeeProfile { Id = Guid.NewGuid(), TenantId = tenantId, UserId = user2.Id, EmployeeNumber = "EMP-202", FirstName = "Bob", LastName = "Builder", Email = "emp2@orbit.io" };
        db.Employees.Add(emp2);
        await db.SaveChangesAsync();

        tenantContext.SetContext(tenantId, user1.Id, TenantRole.Owner);
        userService.UserId = user1.Id;

        // Start work for emp1
        await activityService.ExecuteActionAsync(new ActivityActionRequest
        {
            EmployeeCode = "EMP-201",
            Password = "OrbitPassword123!",
            Action = "Start",
            ClientLocalHour = 8,
            ClientLocalMinute = 2
        });

        var monitor = await activityService.GetLiveMonitorAsync();

        monitor.TotalEmployees.Should().Be(2);
        monitor.WorkingCount.Should().Be(1);
        monitor.NotStartedCount.Should().Be(1);
        monitor.Employees.Should().Contain(e => e.EmployeeNumber == "EMP-201" && e.State == ActivityState.Working);
        monitor.Employees.Should().Contain(e => e.EmployeeNumber == "EMP-202" && e.State == ActivityState.NotStarted);
    }

    [Fact]
    public async Task InvalidPassword_ThrowsException()
    {
        var (db, tenantContext, userService, userManager, activityService) = SetupTestEnvironment();
        var (tenantId, emp, user) = await SeedEmployeeAsync(db, userManager, "EMP-301", "auth.fail@orbit.io");

        tenantContext.SetContext(tenantId, user.Id, TenantRole.Employee);
        userService.UserId = user.Id;

        var act = async () => await activityService.ExecuteActionAsync(new ActivityActionRequest
        {
            EmployeeCode = "EMP-301",
            Password = "WrongPassword999!",
            Action = "Start"
        });

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Invalid password*");
    }

    [Fact]
    public async Task PauseIdle_And_ResumeIdle_TransitionsCorrectlyAndPreservesHours()
    {
        var (db, tenantContext, userService, userManager, activityService) = SetupTestEnvironment();
        var (tenantId, emp, user) = await SeedEmployeeAsync(db, userManager, "EMP-401", "idle.test@orbit.io");

        tenantContext.SetContext(tenantId, user.Id, TenantRole.Employee);
        userService.UserId = user.Id;

        // 1. Start work
        var startResult = await activityService.ExecuteActionAsync(new ActivityActionRequest
        {
            EmployeeCode = "EMP-401",
            Password = "OrbitPassword123!",
            Action = "Start",
            ClientLocalHour = 8,
            ClientLocalMinute = 5
        });
        startResult.State.Should().Be(ActivityState.Working);

        // 2. Pause idle
        var pauseResult = await activityService.ExecuteActionAsync(new ActivityActionRequest
        {
            EmployeeCode = "EMP-401",
            Password = "OrbitPassword123!",
            Action = "pause-idle"
        });
        pauseResult.State.Should().Be(ActivityState.Idle);

        // Verify Live Monitor counts employee as Idle
        var monitor = await activityService.GetLiveMonitorAsync();
        monitor.IdleCount.Should().Be(1);
        monitor.WorkingCount.Should().Be(0);
        monitor.Employees.Should().Contain(e => e.EmployeeNumber == "EMP-401" && e.State == ActivityState.Idle);

        // 3. Resume idle
        var resumeResult = await activityService.ExecuteActionAsync(new ActivityActionRequest
        {
            EmployeeCode = "EMP-401",
            Password = "OrbitPassword123!",
            Action = "resume-idle"
        });
        resumeResult.State.Should().Be(ActivityState.Working);

        var monitorAfter = await activityService.GetLiveMonitorAsync();
        monitorAfter.IdleCount.Should().Be(0);
        monitorAfter.WorkingCount.Should().Be(1);
    }
}
