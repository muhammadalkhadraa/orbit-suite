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

public class CustomerVisibilityTests
{
    private (OrbitDbContext db, TenantContext tenantContext, FakeCurrentUserService userService, CustomerService customerService)
        SetupTestEnvironment()
    {
        var tenantContext = new TenantContext();
        var userService = new FakeCurrentUserService();

        var options = new DbContextOptionsBuilder<OrbitDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var db = new OrbitDbContext(options, tenantContext, userService);
        var auditService = new AuditService(db, tenantContext, userService);
        var customerService = new CustomerService(db, tenantContext, userService, auditService);

        return (db, tenantContext, userService, customerService);
    }

    [Fact]
    public async Task Employee_CanOnlyViewTheirAssignedCustomers()
    {
        var (db, tenantContext, userService, customerService) = SetupTestEnvironment();
        var tenantId = Guid.NewGuid();

        var emp1 = new EmployeeProfile { Id = Guid.NewGuid(), TenantId = tenantId, UserId = "user-alice", FirstName = "Alice", LastName = "Smith" };
        var emp2 = new EmployeeProfile { Id = Guid.NewGuid(), TenantId = tenantId, UserId = "user-bob", FirstName = "Bob", LastName = "Jones" };

        db.Employees.AddRange(emp1, emp2);

        var cust1 = new Customer { Id = Guid.NewGuid(), TenantId = tenantId, CompanyName = "Acme Corp", AssignedEmployeeId = emp1.Id };
        var cust2 = new Customer { Id = Guid.NewGuid(), TenantId = tenantId, CompanyName = "Globex Inc", AssignedEmployeeId = emp2.Id };

        db.Customers.AddRange(cust1, cust2);
        await db.SaveChangesAsync();

        // Act as Alice (Employee)
        tenantContext.SetContext(tenantId, "user-alice", TenantRole.Employee);
        userService.UserId = "user-alice";

        var result = await customerService.GetCustomersAsync(new CustomerFilterRequest());

        // Assert: Alice should only see Acme Corp
        result.Data.Should().HaveCount(1);
        result.Data[0].CompanyName.Should().Be("Acme Corp");
    }

    [Fact]
    public async Task Manager_CanViewDirectReportsCustomers()
    {
        var (db, tenantContext, userService, customerService) = SetupTestEnvironment();
        var tenantId = Guid.NewGuid();

        var manager = new EmployeeProfile { Id = Guid.NewGuid(), TenantId = tenantId, UserId = "user-mgr", FirstName = "Sarah", LastName = "Manager" };
        var directReport = new EmployeeProfile { Id = Guid.NewGuid(), TenantId = tenantId, UserId = "user-rep", FirstName = "David", LastName = "Rep", ReportsToEmployeeId = manager.Id };
        var otherRep = new EmployeeProfile { Id = Guid.NewGuid(), TenantId = tenantId, UserId = "user-other", FirstName = "Other", LastName = "Person" };

        db.Employees.AddRange(manager, directReport, otherRep);

        var cust1 = new Customer { Id = Guid.NewGuid(), TenantId = tenantId, CompanyName = "Direct Report Client", AssignedEmployeeId = directReport.Id };
        var cust2 = new Customer { Id = Guid.NewGuid(), TenantId = tenantId, CompanyName = "Other Department Client", AssignedEmployeeId = otherRep.Id };

        db.Customers.AddRange(cust1, cust2);
        await db.SaveChangesAsync();

        // Act as Sarah (Manager)
        tenantContext.SetContext(tenantId, "user-mgr", TenantRole.Manager);
        userService.UserId = "user-mgr";

        var result = await customerService.GetCustomersAsync(new CustomerFilterRequest());

        // Assert: Manager should see their direct report's client, but not the unrelated employee's client
        result.Data.Should().HaveCount(1);
        result.Data[0].CompanyName.Should().Be("Direct Report Client");
    }

    [Fact]
    public async Task Employee_CannotDeleteCustomer()
    {
        var (db, tenantContext, userService, customerService) = SetupTestEnvironment();
        var tenantId = Guid.NewGuid();

        var emp = new EmployeeProfile { Id = Guid.NewGuid(), TenantId = tenantId, UserId = "user-emp", FirstName = "Alice", LastName = "Smith" };
        db.Employees.Add(emp);

        var cust = new Customer { Id = Guid.NewGuid(), TenantId = tenantId, CompanyName = "Test Client", AssignedEmployeeId = emp.Id };
        db.Customers.Add(cust);
        await db.SaveChangesAsync();

        // Act as Employee
        tenantContext.SetContext(tenantId, "user-emp", TenantRole.Employee);
        userService.UserId = "user-emp";

        // Deleting should throw ForbiddenAccessException
        Func<Task> act = async () => await customerService.DeleteCustomerAsync(cust.Id);
        await act.Should().ThrowAsync<ForbiddenAccessException>();
    }

    [Fact]
    public async Task TenantIsolation_CustomersSeparatedBetweenTenants()
    {
        var (db, tenantContext, userService, customerService) = SetupTestEnvironment();
        var tenant1 = Guid.NewGuid();
        var tenant2 = Guid.NewGuid();

        var custTenant1 = new Customer { Id = Guid.NewGuid(), TenantId = tenant1, CompanyName = "Tenant 1 Enterprise" };
        var custTenant2 = new Customer { Id = Guid.NewGuid(), TenantId = tenant2, CompanyName = "Tenant 2 Enterprise" };

        db.Customers.AddRange(custTenant1, custTenant2);
        await db.SaveChangesAsync();

        // Act as Owner of Tenant 1
        tenantContext.SetContext(tenant1, "user-owner-1", TenantRole.Owner);
        userService.UserId = "user-owner-1";

        var result = await customerService.GetCustomersAsync(new CustomerFilterRequest());

        result.Data.Should().HaveCount(1);
        result.Data[0].CompanyName.Should().Be("Tenant 1 Enterprise");
    }
}
