using System;
using System.Security;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Orbit.Domain.Entities;
using Orbit.Domain.Enums;
using Orbit.Infrastructure.Identity;
using Orbit.Infrastructure.Persistence;
using Orbit.Infrastructure.Services;
using Xunit;

namespace Orbit.Tests.Security;

public class TenantIsolationTests
{
    private OrbitDbContext CreateDbContext(TenantContext tenantContext)
    {
        var options = new DbContextOptionsBuilder<OrbitDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var currentUserService = new CurrentUserService(new Microsoft.AspNetCore.Http.HttpContextAccessor());
        return new OrbitDbContext(options, tenantContext, currentUserService);
    }

    [Fact]
    public async Task QueryFilter_ShouldIsolateRecordsBetweenTenants()
    {
        // Arrange: Seed two distinct tenants with tasks
        var tenantContext = new TenantContext();
        using var db = CreateDbContext(tenantContext);

        var tenantA = new Tenant { Id = Guid.NewGuid(), Name = "Company Alpha", Slug = "alpha" };
        var tenantB = new Tenant { Id = Guid.NewGuid(), Name = "Company Beta", Slug = "beta" };
        db.Tenants.AddRange(tenantA, tenantB);

        var taskA = new TaskItem { Id = Guid.NewGuid(), TenantId = tenantA.Id, Title = "Alpha Confidential Task" };
        var taskB = new TaskItem { Id = Guid.NewGuid(), TenantId = tenantB.Id, Title = "Beta Secret Task" };

        db.Tasks.AddRange(taskA, taskB);
        await db.SaveChangesAsync();

        // Act & Assert 1: Query as Tenant A
        tenantContext.SetContext(tenantA.Id, "user-a", TenantRole.Owner);
        var tasksForA = await db.Tasks.ToListAsync();
        tasksForA.Should().ContainSingle(t => t.Id == taskA.Id);
        tasksForA.Should().NotContain(t => t.Id == taskB.Id);

        // Act & Assert 2: Query as Tenant B
        tenantContext.SetContext(tenantB.Id, "user-b", TenantRole.Owner);
        var tasksForB = await db.Tasks.ToListAsync();
        tasksForB.Should().ContainSingle(t => t.Id == taskB.Id);
        tasksForB.Should().NotContain(t => t.Id == taskA.Id);
    }

    [Fact]
    public async Task SaveChangesAsync_ShouldPreventCrossTenantEntityCreation()
    {
        var tenantContext = new TenantContext();
        using var db = CreateDbContext(tenantContext);

        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();

        tenantContext.SetContext(tenantA, "user-a", TenantRole.Owner);

        // Attempting to persist an entity with Tenant B's ID while in Tenant A's context
        var forbiddenTask = new TaskItem
        {
            Id = Guid.NewGuid(),
            TenantId = tenantB, // Spoofed TenantId
            Title = "Spoofed Cross-Tenant Task"
        };

        db.Tasks.Add(forbiddenTask);

        // Act & Assert
        var act = async () => await db.SaveChangesAsync();
        await act.Should().ThrowAsync<SecurityException>()
            .WithMessage("*Cross-tenant entity creation is strictly prohibited*");
    }

    [Fact]
    public async Task SaveChangesAsync_ShouldPreventModifyingTenantIdOfExistingEntity()
    {
        var tenantContext = new TenantContext();
        using var db = CreateDbContext(tenantContext);

        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();

        tenantContext.SetContext(tenantA, "user-a", TenantRole.Owner);

        var task = new TaskItem
        {
            Id = Guid.NewGuid(),
            TenantId = tenantA,
            Title = "Legitimate Task"
        };
        db.Tasks.Add(task);
        await db.SaveChangesAsync();

        // Attempt to tamper with TenantId
        task.TenantId = tenantB;

        var act = async () => await db.SaveChangesAsync();
        await act.Should().ThrowAsync<SecurityException>()
            .WithMessage("*Modifying the TenantId of an existing entity is strictly prohibited*");
    }
}
