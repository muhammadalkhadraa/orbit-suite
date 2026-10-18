using System;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Orbit.Application.Common.Exceptions;
using Orbit.Application.Modules.Support.Dtos;
using Orbit.Domain.Entities;
using Orbit.Domain.Enums;
using Orbit.Infrastructure.Persistence;
using Orbit.Infrastructure.Services;
using Xunit;

namespace Orbit.Tests.Modules;

public class SupportTicketTests
{
    private (OrbitDbContext db, TenantContext tenantContext, FakeCurrentUserService userService, TicketService ticketService)
        SetupTestEnvironment()
    {
        var tenantContext = new TenantContext();
        var userService = new FakeCurrentUserService();

        var options = new DbContextOptionsBuilder<OrbitDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var db = new OrbitDbContext(options, tenantContext, userService);
        var auditService = new AuditService(db, tenantContext, userService);
        var ticketService = new TicketService(db, tenantContext, userService, auditService);

        return (db, tenantContext, userService, ticketService);
    }

    [Fact]
    public async Task Employee_CanOnlyViewTheirAssignedOrCreatedTickets()
    {
        var (db, tenantContext, userService, ticketService) = SetupTestEnvironment();
        var tenantId = Guid.NewGuid();

        var emp1 = new EmployeeProfile { Id = Guid.NewGuid(), TenantId = tenantId, UserId = "user-alice", FirstName = "Alice", LastName = "Smith" };
        var emp2 = new EmployeeProfile { Id = Guid.NewGuid(), TenantId = tenantId, UserId = "user-bob", FirstName = "Bob", LastName = "Jones" };
        db.Employees.AddRange(emp1, emp2);

        var cust = new Customer { Id = Guid.NewGuid(), TenantId = tenantId, CompanyName = "Acme Corp" };
        db.Customers.Add(cust);

        var ticket1 = new SupportTicket { Id = Guid.NewGuid(), TenantId = tenantId, TicketNumber = "TCK-1001", Subject = "Alice Ticket", Description = "Desc", CustomerId = cust.Id, AssignedEmployeeId = emp1.Id };
        var ticket2 = new SupportTicket { Id = Guid.NewGuid(), TenantId = tenantId, TicketNumber = "TCK-1002", Subject = "Bob Ticket", Description = "Desc", CustomerId = cust.Id, AssignedEmployeeId = emp2.Id };
        db.SupportTickets.AddRange(ticket1, ticket2);
        await db.SaveChangesAsync();

        // Act as Alice (Employee)
        tenantContext.SetContext(tenantId, "user-alice", TenantRole.Employee);
        userService.UserId = "user-alice";

        var result = await ticketService.GetTicketsAsync(new TicketFilterRequest());

        // Assert: Alice should only see Alice Ticket
        result.Data.Should().HaveCount(1);
        result.Data[0].TicketNumber.Should().Be("TCK-1001");
        result.Data[0].Subject.Should().Be("Alice Ticket");
    }

    [Fact]
    public async Task Manager_CanViewDirectReportsTickets()
    {
        var (db, tenantContext, userService, ticketService) = SetupTestEnvironment();
        var tenantId = Guid.NewGuid();

        var manager = new EmployeeProfile { Id = Guid.NewGuid(), TenantId = tenantId, UserId = "user-mgr", FirstName = "Sarah", LastName = "Manager" };
        var directReport = new EmployeeProfile { Id = Guid.NewGuid(), TenantId = tenantId, UserId = "user-rep", FirstName = "David", LastName = "Rep", ReportsToEmployeeId = manager.Id };
        var otherRep = new EmployeeProfile { Id = Guid.NewGuid(), TenantId = tenantId, UserId = "user-other", FirstName = "Other", LastName = "Person" };
        db.Employees.AddRange(manager, directReport, otherRep);

        var cust = new Customer { Id = Guid.NewGuid(), TenantId = tenantId, CompanyName = "Enterprise Global" };
        db.Customers.Add(cust);

        var repTicket = new SupportTicket { Id = Guid.NewGuid(), TenantId = tenantId, TicketNumber = "TCK-2001", Subject = "Report's Ticket", Description = "Desc", CustomerId = cust.Id, AssignedEmployeeId = directReport.Id };
        var otherTicket = new SupportTicket { Id = Guid.NewGuid(), TenantId = tenantId, TicketNumber = "TCK-2002", Subject = "Other Ticket", Description = "Desc", CustomerId = cust.Id, AssignedEmployeeId = otherRep.Id };
        db.SupportTickets.AddRange(repTicket, otherTicket);
        await db.SaveChangesAsync();

        // Act as Sarah (Manager)
        tenantContext.SetContext(tenantId, "user-mgr", TenantRole.Manager);
        userService.UserId = "user-mgr";

        var result = await ticketService.GetTicketsAsync(new TicketFilterRequest());

        // Assert: Manager sees direct report's ticket, but not other rep's ticket
        result.Data.Should().HaveCount(1);
        result.Data[0].Subject.Should().Be("Report's Ticket");
    }

    [Fact]
    public async Task TicketStatus_TransitionToResolved_SetsResolvedDate()
    {
        var (db, tenantContext, userService, ticketService) = SetupTestEnvironment();
        var tenantId = Guid.NewGuid();

        var emp = new EmployeeProfile { Id = Guid.NewGuid(), TenantId = tenantId, UserId = "user-tech", FirstName = "Alex", LastName = "Tech" };
        db.Employees.Add(emp);

        var cust = new Customer { Id = Guid.NewGuid(), TenantId = tenantId, CompanyName = "Acme Corp" };
        db.Customers.Add(cust);

        var ticket = new SupportTicket { Id = Guid.NewGuid(), TenantId = tenantId, TicketNumber = "TCK-3001", Subject = "Server latency spike", Description = "High CPU load", CustomerId = cust.Id, AssignedEmployeeId = emp.Id, Status = TicketStatus.Open };
        db.SupportTickets.Add(ticket);
        await db.SaveChangesAsync();

        tenantContext.SetContext(tenantId, "user-tech", TenantRole.Employee);
        userService.UserId = "user-tech";

        var updated = await ticketService.UpdateTicketStatusAsync(ticket.Id, new UpdateTicketStatusRequest
        {
            Status = TicketStatus.Resolved,
            ResolutionSummary = "Restarted background queuing service and applied index patch"
        });

        updated.Status.Should().Be(TicketStatus.Resolved);
        updated.ResolvedAtUtc.Should().NotBeNull();
        updated.ResolutionSummary.Should().Contain("Restarted background queuing");
    }

    [Fact]
    public async Task TicketComment_AddsInternalAndPublicNotes()
    {
        var (db, tenantContext, userService, ticketService) = SetupTestEnvironment();
        var tenantId = Guid.NewGuid();

        var emp = new EmployeeProfile { Id = Guid.NewGuid(), TenantId = tenantId, UserId = "user-agent", FirstName = "Jane", LastName = "Agent" };
        db.Employees.Add(emp);

        var cust = new Customer { Id = Guid.NewGuid(), TenantId = tenantId, CompanyName = "Beta Ltd" };
        db.Customers.Add(cust);

        var ticket = new SupportTicket { Id = Guid.NewGuid(), TenantId = tenantId, TicketNumber = "TCK-4001", Subject = "API 500 error", Description = "Failing payload", CustomerId = cust.Id, AssignedEmployeeId = emp.Id };
        db.SupportTickets.Add(ticket);
        await db.SaveChangesAsync();

        tenantContext.SetContext(tenantId, "user-agent", TenantRole.Employee);
        userService.UserId = "user-agent";

        var comment = await ticketService.AddCommentAsync(ticket.Id, new AddTicketCommentRequest
        {
            CommentText = "Reproduced in staging environment with auth bearer token.",
            IsInternal = true
        });

        comment.IsInternal.Should().BeTrue();
        comment.AuthorName.Should().Be("Jane Agent");

        var ticketWithComments = await ticketService.GetTicketByIdAsync(ticket.Id);
        ticketWithComments.CommentsCount.Should().Be(1);
        ticketWithComments.Comments[0].CommentText.Should().Be("Reproduced in staging environment with auth bearer token.");
    }

    [Fact]
    public async Task TicketMetrics_CalculatesResolutionRateAccurately()
    {
        var (db, tenantContext, userService, ticketService) = SetupTestEnvironment();
        var tenantId = Guid.NewGuid();

        var cust = new Customer { Id = Guid.NewGuid(), TenantId = tenantId, CompanyName = "Enterprise Global" };
        db.Customers.Add(cust);

        // 1 Open, 1 Pending, 1 Resolved, 1 Closed => 2/4 resolved = 50.0%
        var t1 = new SupportTicket { Id = Guid.NewGuid(), TenantId = tenantId, TicketNumber = "TCK-5001", Subject = "T1", Description = "D", CustomerId = cust.Id, Status = TicketStatus.Open, Priority = TicketPriority.Urgent };
        var t2 = new SupportTicket { Id = Guid.NewGuid(), TenantId = tenantId, TicketNumber = "TCK-5002", Subject = "T2", Description = "D", CustomerId = cust.Id, Status = TicketStatus.Pending, Priority = TicketPriority.High };
        var t3 = new SupportTicket { Id = Guid.NewGuid(), TenantId = tenantId, TicketNumber = "TCK-5003", Subject = "T3", Description = "D", CustomerId = cust.Id, Status = TicketStatus.Resolved, Priority = TicketPriority.Medium };
        var t4 = new SupportTicket { Id = Guid.NewGuid(), TenantId = tenantId, TicketNumber = "TCK-5004", Subject = "T4", Description = "D", CustomerId = cust.Id, Status = TicketStatus.Closed, Priority = TicketPriority.Low };

        db.SupportTickets.AddRange(t1, t2, t3, t4);
        await db.SaveChangesAsync();

        tenantContext.SetContext(tenantId, "user-owner", TenantRole.Owner);
        userService.UserId = "user-owner";

        var metrics = await ticketService.GetTicketMetricsAsync();

        metrics.OpenTicketsCount.Should().Be(1);
        metrics.PendingTicketsCount.Should().Be(1);
        metrics.ResolvedTicketsCount.Should().Be(1);
        metrics.ClosedTicketsCount.Should().Be(1);
        metrics.UrgentTicketsCount.Should().Be(1);
        metrics.TotalTicketsCount.Should().Be(4);
        metrics.ResolutionRatePercentage.Should().Be(50.0);
    }

    [Fact]
    public async Task TenantIsolation_TicketsSeparatedBetweenTenants()
    {
        var (db, tenantContext, userService, ticketService) = SetupTestEnvironment();
        var tenant1 = Guid.NewGuid();
        var tenant2 = Guid.NewGuid();

        var cust1 = new Customer { Id = Guid.NewGuid(), TenantId = tenant1, CompanyName = "Tenant 1 Client" };
        var cust2 = new Customer { Id = Guid.NewGuid(), TenantId = tenant2, CompanyName = "Tenant 2 Client" };
        db.Customers.AddRange(cust1, cust2);

        var ticket1 = new SupportTicket { Id = Guid.NewGuid(), TenantId = tenant1, TicketNumber = "TCK-6001", Subject = "Tenant 1 Ticket", Description = "D", CustomerId = cust1.Id };
        var ticket2 = new SupportTicket { Id = Guid.NewGuid(), TenantId = tenant2, TicketNumber = "TCK-6002", Subject = "Tenant 2 Ticket", Description = "D", CustomerId = cust2.Id };
        db.SupportTickets.AddRange(ticket1, ticket2);
        await db.SaveChangesAsync();

        // Act as Owner of Tenant 1
        tenantContext.SetContext(tenant1, "user-owner-1", TenantRole.Owner);
        userService.UserId = "user-owner-1";

        var result = await ticketService.GetTicketsAsync(new TicketFilterRequest());

        result.Data.Should().HaveCount(1);
        result.Data[0].Subject.Should().Be("Tenant 1 Ticket");
    }

    [Fact]
    public async Task Employee_CannotDeleteTicket()
    {
        var (db, tenantContext, userService, ticketService) = SetupTestEnvironment();
        var tenantId = Guid.NewGuid();

        var emp = new EmployeeProfile { Id = Guid.NewGuid(), TenantId = tenantId, UserId = "user-emp", FirstName = "Alice", LastName = "Smith" };
        db.Employees.Add(emp);

        var cust = new Customer { Id = Guid.NewGuid(), TenantId = tenantId, CompanyName = "Acme Corp" };
        db.Customers.Add(cust);

        var ticket = new SupportTicket { Id = Guid.NewGuid(), TenantId = tenantId, TicketNumber = "TCK-7001", Subject = "Test Ticket", Description = "D", CustomerId = cust.Id, AssignedEmployeeId = emp.Id };
        db.SupportTickets.Add(ticket);
        await db.SaveChangesAsync();

        // Act as Employee
        tenantContext.SetContext(tenantId, "user-emp", TenantRole.Employee);
        userService.UserId = "user-emp";

        Func<Task> act = async () => await ticketService.DeleteTicketAsync(ticket.Id);
        await act.Should().ThrowAsync<ForbiddenAccessException>();
    }
}
