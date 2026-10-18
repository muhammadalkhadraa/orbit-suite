using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Orbit.Application.Modules.Audit.Dtos;
using Orbit.Domain.Entities;
using Orbit.Domain.Enums;
using Orbit.Infrastructure.Persistence;
using Orbit.Infrastructure.Services;
using Xunit;

namespace Orbit.Tests.Modules;

public class AuditTests
{
    private (OrbitDbContext db, TenantContext tenantContext, FakeCurrentUserService userService, AuditService auditService)
        SetupTestEnvironment()
    {
        var tenantContext = new TenantContext();
        var userService = new FakeCurrentUserService();

        var options = new DbContextOptionsBuilder<OrbitDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var db = new OrbitDbContext(options, tenantContext, userService);
        var auditService = new AuditService(db, tenantContext, userService);

        return (db, tenantContext, userService, auditService);
    }

    [Fact]
    public async Task LogAsync_RecordsEvent_WithTenantAndUserDetails()
    {
        var (db, tenantContext, userService, auditService) = SetupTestEnvironment();
        var tenantId = Guid.NewGuid();

        tenantContext.SetContext(tenantId, "user-admin-1", TenantRole.Owner);
        userService.UserId = "user-admin-1";
        userService.Email = "admin@starlight.com";

        await auditService.LogAsync("CreateTask", "TaskItem", "task-99", new { Title = "Security Review" });

        var logs = await db.AuditLogs.IgnoreQueryFilters().ToListAsync();
        logs.Should().HaveCount(1);

        var log = logs[0];
        log.TenantId.Should().Be(tenantId);
        log.UserId.Should().Be("user-admin-1");
        log.UserEmail.Should().Be("admin@starlight.com");
        log.Action.Should().Be("CreateTask");
        log.EntityName.Should().Be("TaskItem");
        log.EntityId.Should().Be("task-99");
        log.DetailsJson.Should().Contain("Security Review");
        log.IpAddress.Should().Be("127.0.0.1");
    }

    [Fact]
    public async Task GetLogsAsync_EnforcesTenantBoundary_AndFiltersCorrectly()
    {
        var (db, tenantContext, userService, auditService) = SetupTestEnvironment();
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();

        // Seed Tenant A logs
        db.AuditLogs.AddRange(
            new AuditLog { Id = Guid.NewGuid(), TenantId = tenantA, Action = "Login", EntityName = "User", UserEmail = "a1@test.com", TimestampUtc = DateTime.UtcNow.AddMinutes(-10) },
            new AuditLog { Id = Guid.NewGuid(), TenantId = tenantA, Action = "CreateInvoice", EntityName = "Invoice", UserEmail = "a2@test.com", TimestampUtc = DateTime.UtcNow.AddMinutes(-5) }
        );

        // Seed Tenant B logs
        db.AuditLogs.Add(
            new AuditLog { Id = Guid.NewGuid(), TenantId = tenantB, Action = "Login", EntityName = "User", UserEmail = "b1@test.com", TimestampUtc = DateTime.UtcNow }
        );

        await db.SaveChangesAsync();

        // Set context to Tenant A
        tenantContext.SetContext(tenantA, "user-a", TenantRole.Owner);
        userService.UserId = "user-a";

        var filter = new AuditLogFilterRequest { PageNumber = 1, PageSize = 10 };
        var result = await auditService.GetLogsAsync(filter);

        result.Data.Should().HaveCount(2);
        result.Data.Should().OnlyContain(l => l.TenantId == tenantA);
        result.Data.Should().NotContain(l => l.TenantId == tenantB);

        // Filter by Action
        var filteredResult = await auditService.GetLogsAsync(new AuditLogFilterRequest { Action = "CreateInvoice" });
        filteredResult.Data.Should().HaveCount(1);
        filteredResult.Data[0].Action.Should().Be("CreateInvoice");
    }
}
