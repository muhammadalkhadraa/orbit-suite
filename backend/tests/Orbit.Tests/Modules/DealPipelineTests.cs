using System;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Orbit.Application.Common.Exceptions;
using Orbit.Application.Modules.Crm.Dtos;
using Orbit.Domain.Entities;
using Orbit.Domain.Enums;
using Orbit.Infrastructure.Persistence;
using Orbit.Infrastructure.Services;
using Xunit;

namespace Orbit.Tests.Modules;

public class DealPipelineTests
{
    private (OrbitDbContext db, TenantContext tenantContext, FakeCurrentUserService userService, DealService dealService)
        SetupTestEnvironment()
    {
        var tenantContext = new TenantContext();
        var userService = new FakeCurrentUserService();

        var options = new DbContextOptionsBuilder<OrbitDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var db = new OrbitDbContext(options, tenantContext, userService);
        var auditService = new AuditService(db, tenantContext, userService);
        var dealService = new DealService(db, tenantContext, userService, auditService);

        return (db, tenantContext, userService, dealService);
    }

    [Fact]
    public async Task Employee_CanOnlyViewTheirAssignedDeals()
    {
        var (db, tenantContext, userService, dealService) = SetupTestEnvironment();
        var tenantId = Guid.NewGuid();

        var emp1 = new EmployeeProfile { Id = Guid.NewGuid(), TenantId = tenantId, UserId = "user-alice", FirstName = "Alice", LastName = "Smith" };
        var emp2 = new EmployeeProfile { Id = Guid.NewGuid(), TenantId = tenantId, UserId = "user-bob", FirstName = "Bob", LastName = "Jones" };
        db.Employees.AddRange(emp1, emp2);

        var cust = new Customer { Id = Guid.NewGuid(), TenantId = tenantId, CompanyName = "Acme Corp" };
        db.Customers.Add(cust);

        var deal1 = new Deal { Id = Guid.NewGuid(), TenantId = tenantId, Title = "Alice Deal", CustomerId = cust.Id, AssignedEmployeeId = emp1.Id, Amount = 10000, Stage = DealStage.Qualified };
        var deal2 = new Deal { Id = Guid.NewGuid(), TenantId = tenantId, Title = "Bob Deal", CustomerId = cust.Id, AssignedEmployeeId = emp2.Id, Amount = 20000, Stage = DealStage.Proposal };
        db.Deals.AddRange(deal1, deal2);
        await db.SaveChangesAsync();

        // Act as Alice (Employee)
        tenantContext.SetContext(tenantId, "user-alice", TenantRole.Employee);
        userService.UserId = "user-alice";

        var result = await dealService.GetDealsAsync(new DealFilterRequest());

        // Assert: Alice should only see Alice Deal
        result.Data.Should().HaveCount(1);
        result.Data[0].Title.Should().Be("Alice Deal");
    }

    [Fact]
    public async Task Manager_CanViewDirectReportsDeals()
    {
        var (db, tenantContext, userService, dealService) = SetupTestEnvironment();
        var tenantId = Guid.NewGuid();

        var manager = new EmployeeProfile { Id = Guid.NewGuid(), TenantId = tenantId, UserId = "user-mgr", FirstName = "Sarah", LastName = "Manager" };
        var directReport = new EmployeeProfile { Id = Guid.NewGuid(), TenantId = tenantId, UserId = "user-rep", FirstName = "David", LastName = "Rep", ReportsToEmployeeId = manager.Id };
        var otherRep = new EmployeeProfile { Id = Guid.NewGuid(), TenantId = tenantId, UserId = "user-other", FirstName = "Other", LastName = "Person" };
        db.Employees.AddRange(manager, directReport, otherRep);

        var cust = new Customer { Id = Guid.NewGuid(), TenantId = tenantId, CompanyName = "Enterprise Global" };
        db.Customers.Add(cust);

        var repDeal = new Deal { Id = Guid.NewGuid(), TenantId = tenantId, Title = "Report's Big Deal", CustomerId = cust.Id, AssignedEmployeeId = directReport.Id, Amount = 50000, Stage = DealStage.Negotiation };
        var otherDeal = new Deal { Id = Guid.NewGuid(), TenantId = tenantId, Title = "Other Rep Deal", CustomerId = cust.Id, AssignedEmployeeId = otherRep.Id, Amount = 30000, Stage = DealStage.Lead };
        db.Deals.AddRange(repDeal, otherDeal);
        await db.SaveChangesAsync();

        // Act as Sarah (Manager)
        tenantContext.SetContext(tenantId, "user-mgr", TenantRole.Manager);
        userService.UserId = "user-mgr";

        var result = await dealService.GetDealsAsync(new DealFilterRequest());

        // Assert: Manager sees direct report's deal, but not other rep's deal
        result.Data.Should().HaveCount(1);
        result.Data[0].Title.Should().Be("Report's Big Deal");
    }

    [Fact]
    public async Task DealStage_TransitionToClosedWon_SetsProbabilityAndClosedDate()
    {
        var (db, tenantContext, userService, dealService) = SetupTestEnvironment();
        var tenantId = Guid.NewGuid();

        var emp = new EmployeeProfile { Id = Guid.NewGuid(), TenantId = tenantId, UserId = "user-rep", FirstName = "David", LastName = "Rep" };
        db.Employees.Add(emp);

        var cust = new Customer { Id = Guid.NewGuid(), TenantId = tenantId, CompanyName = "Acme Corp" };
        db.Customers.Add(cust);

        var deal = new Deal { Id = Guid.NewGuid(), TenantId = tenantId, Title = "SaaS Migration", CustomerId = cust.Id, AssignedEmployeeId = emp.Id, Amount = 25000, Stage = DealStage.Proposal, Probability = 60 };
        db.Deals.Add(deal);
        await db.SaveChangesAsync();

        tenantContext.SetContext(tenantId, "user-rep", TenantRole.Employee);
        userService.UserId = "user-rep";

        var updated = await dealService.UpdateDealStageAsync(deal.Id, new UpdateDealStageRequest { Stage = DealStage.ClosedWon });

        updated.Stage.Should().Be(DealStage.ClosedWon);
        updated.Probability.Should().Be(100);
        updated.ClosedAtUtc.Should().NotBeNull();
    }

    [Fact]
    public async Task DealStage_TransitionToClosedLost_SetsZeroProbabilityAndReason()
    {
        var (db, tenantContext, userService, dealService) = SetupTestEnvironment();
        var tenantId = Guid.NewGuid();

        var emp = new EmployeeProfile { Id = Guid.NewGuid(), TenantId = tenantId, UserId = "user-rep", FirstName = "David", LastName = "Rep" };
        db.Employees.Add(emp);

        var cust = new Customer { Id = Guid.NewGuid(), TenantId = tenantId, CompanyName = "Beta Ltd" };
        db.Customers.Add(cust);

        var deal = new Deal { Id = Guid.NewGuid(), TenantId = tenantId, Title = "Security Suite", CustomerId = cust.Id, AssignedEmployeeId = emp.Id, Amount = 15000, Stage = DealStage.Negotiation, Probability = 80 };
        db.Deals.Add(deal);
        await db.SaveChangesAsync();

        tenantContext.SetContext(tenantId, "user-rep", TenantRole.Employee);
        userService.UserId = "user-rep";

        var updated = await dealService.UpdateDealStageAsync(deal.Id, new UpdateDealStageRequest { Stage = DealStage.ClosedLost, LostReason = "Budget frozen until next fiscal year" });

        updated.Stage.Should().Be(DealStage.ClosedLost);
        updated.Probability.Should().Be(0);
        updated.ClosedAtUtc.Should().NotBeNull();
        updated.LostReason.Should().Be("Budget frozen until next fiscal year");
    }

    [Fact]
    public async Task DealMetrics_CalculatesPipelineAndWinRateAccurately()
    {
        var (db, tenantContext, userService, dealService) = SetupTestEnvironment();
        var tenantId = Guid.NewGuid();

        var cust = new Customer { Id = Guid.NewGuid(), TenantId = tenantId, CompanyName = "Enterprise Global" };
        db.Customers.Add(cust);

        // Open deals:
        // Deal 1: $10,000, prob 50% => weighted: $5,000
        // Deal 2: $20,000, prob 25% => weighted: $5,000
        // Total open pipeline: $30,000, Weighted: $10,000
        var deal1 = new Deal { Id = Guid.NewGuid(), TenantId = tenantId, Title = "Open 1", CustomerId = cust.Id, Amount = 10000, Stage = DealStage.Lead, Probability = 50 };
        var deal2 = new Deal { Id = Guid.NewGuid(), TenantId = tenantId, Title = "Open 2", CustomerId = cust.Id, Amount = 20000, Stage = DealStage.Qualified, Probability = 25 };
        // Won deal: $40,000
        var wonDeal = new Deal { Id = Guid.NewGuid(), TenantId = tenantId, Title = "Won 1", CustomerId = cust.Id, Amount = 40000, Stage = DealStage.ClosedWon, Probability = 100 };
        // Lost deal: $10,000
        var lostDeal = new Deal { Id = Guid.NewGuid(), TenantId = tenantId, Title = "Lost 1", CustomerId = cust.Id, Amount = 10000, Stage = DealStage.ClosedLost, Probability = 0 };

        db.Deals.AddRange(deal1, deal2, wonDeal, lostDeal);
        await db.SaveChangesAsync();

        // Act as Owner
        tenantContext.SetContext(tenantId, "user-owner", TenantRole.Owner);
        userService.UserId = "user-owner";

        var metrics = await dealService.GetDealMetricsAsync();

        metrics.TotalPipelineValue.Should().Be(30000m);
        metrics.WeightedPipelineValue.Should().Be(10000m);
        metrics.WonValue.Should().Be(40000m);
        metrics.LostValue.Should().Be(10000m);
        metrics.OpenDealsCount.Should().Be(2);
        metrics.WonDealsCount.Should().Be(1);
        metrics.LostDealsCount.Should().Be(1);
        metrics.TotalDealsCount.Should().Be(4);
        metrics.WinRatePercentage.Should().Be(50.0); // 1 won out of 2 closed = 50%
    }

    [Fact]
    public async Task TenantIsolation_DealsSeparatedBetweenTenants()
    {
        var (db, tenantContext, userService, dealService) = SetupTestEnvironment();
        var tenant1 = Guid.NewGuid();
        var tenant2 = Guid.NewGuid();

        var cust1 = new Customer { Id = Guid.NewGuid(), TenantId = tenant1, CompanyName = "Tenant 1 Client" };
        var cust2 = new Customer { Id = Guid.NewGuid(), TenantId = tenant2, CompanyName = "Tenant 2 Client" };
        db.Customers.AddRange(cust1, cust2);

        var deal1 = new Deal { Id = Guid.NewGuid(), TenantId = tenant1, Title = "Tenant 1 Deal", CustomerId = cust1.Id, Amount = 10000, Stage = DealStage.Qualified };
        var deal2 = new Deal { Id = Guid.NewGuid(), TenantId = tenant2, Title = "Tenant 2 Deal", CustomerId = cust2.Id, Amount = 20000, Stage = DealStage.Qualified };
        db.Deals.AddRange(deal1, deal2);
        await db.SaveChangesAsync();

        // Act as Owner of Tenant 1
        tenantContext.SetContext(tenant1, "user-owner-1", TenantRole.Owner);
        userService.UserId = "user-owner-1";

        var result = await dealService.GetDealsAsync(new DealFilterRequest());

        result.Data.Should().HaveCount(1);
        result.Data[0].Title.Should().Be("Tenant 1 Deal");
    }

    [Fact]
    public async Task Employee_CannotDeleteDeal()
    {
        var (db, tenantContext, userService, dealService) = SetupTestEnvironment();
        var tenantId = Guid.NewGuid();

        var emp = new EmployeeProfile { Id = Guid.NewGuid(), TenantId = tenantId, UserId = "user-emp", FirstName = "Alice", LastName = "Smith" };
        db.Employees.Add(emp);

        var cust = new Customer { Id = Guid.NewGuid(), TenantId = tenantId, CompanyName = "Acme Corp" };
        db.Customers.Add(cust);

        var deal = new Deal { Id = Guid.NewGuid(), TenantId = tenantId, Title = "Test Deal", CustomerId = cust.Id, AssignedEmployeeId = emp.Id, Amount = 10000 };
        db.Deals.Add(deal);
        await db.SaveChangesAsync();

        // Act as Employee
        tenantContext.SetContext(tenantId, "user-emp", TenantRole.Employee);
        userService.UserId = "user-emp";

        Func<Task> act = async () => await dealService.DeleteDealAsync(deal.Id);
        await act.Should().ThrowAsync<ForbiddenAccessException>();
    }
}
