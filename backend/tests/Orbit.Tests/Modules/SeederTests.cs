using System;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Identity;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Orbit.Application.Interfaces;
using Orbit.Domain.Enums;
using Orbit.Infrastructure.Identity;
using Orbit.Infrastructure.Persistence;
using Orbit.Infrastructure.Seed;
using Orbit.Infrastructure.Services;
using Xunit;

namespace Orbit.Tests.Modules;

public class SeederTests : IDisposable
{
    private readonly SqliteConnection _connection;

    public SeederTests()
    {
        _connection = new SqliteConnection("Data Source=:memory:");
        _connection.Open();
    }

    public void Dispose()
    {
        _connection.Dispose();
    }

    private (OrbitDbContext db, UserManager<ApplicationUser> userManager) CreateContextAndUserManager()
    {
        var services = new ServiceCollection();

        services.AddLogging(b => b.AddConsole());

        var tenantContext = new TenantContext();
        var userService = new FakeCurrentUserService();

        var options = new DbContextOptionsBuilder<OrbitDbContext>()
            .UseSqlite(_connection)
            .Options;

        var db = new OrbitDbContext(options, tenantContext, userService);

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

        return (db, userManager);
    }

    [Fact]
    public async Task InitializeAndSeedAsync_PopulatesCompleteDemoSuite_AndIsIdempotent()
    {
        var (db, userManager) = CreateContextAndUserManager();

        // Act 1: Initial seed
        await DatabaseSeeder.InitializeAndSeedAsync(db, userManager);

        // Assert 1: Demo tenant and core records exist
        var tenant = await db.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Slug == "starlight");
        tenant.Should().NotBeNull();
        tenant!.Name.Should().Be("Starlight Dynamics");

        var branches = await db.Branches.IgnoreQueryFilters().Where(b => b.TenantId == tenant.Id).ToListAsync();
        branches.Should().HaveCount(2);

        var departments = await db.Departments.IgnoreQueryFilters().Where(d => d.TenantId == tenant.Id).ToListAsync();
        departments.Should().HaveCount(5);

        var employees = await db.Employees.IgnoreQueryFilters().Where(e => e.TenantId == tenant.Id).ToListAsync();
        employees.Should().HaveCount(3);

        var tasks = await db.Tasks.IgnoreQueryFilters().Where(t => t.TenantId == tenant.Id).ToListAsync();
        tasks.Should().HaveCount(4);

        var customers = await db.Customers.IgnoreQueryFilters().Where(c => c.TenantId == tenant.Id).ToListAsync();
        customers.Should().HaveCount(3);

        var deals = await db.Deals.IgnoreQueryFilters().Where(d => d.TenantId == tenant.Id).ToListAsync();
        deals.Should().HaveCount(3);

        var tickets = await db.SupportTickets.IgnoreQueryFilters().Where(t => t.TenantId == tenant.Id).ToListAsync();
        tickets.Should().HaveCount(2);

        var products = await db.Products.IgnoreQueryFilters().Where(p => p.TenantId == tenant.Id).ToListAsync();
        products.Should().HaveCount(3);

        var inventories = await db.ProductInventories.IgnoreQueryFilters().Where(i => i.TenantId == tenant.Id).ToListAsync();
        inventories.Should().HaveCount(4);

        var invoices = await db.Invoices.IgnoreQueryFilters().Where(i => i.TenantId == tenant.Id).ToListAsync();
        invoices.Should().HaveCount(2);

        var payments = await db.PaymentRecords.IgnoreQueryFilters().Where(p => p.TenantId == tenant.Id).ToListAsync();
        payments.Should().HaveCount(2);

        var boms = await db.BillsOfMaterials.IgnoreQueryFilters().Where(b => b.TenantId == tenant.Id).ToListAsync();
        boms.Should().HaveCount(1);

        var workOrders = await db.WorkOrders.IgnoreQueryFilters().Where(w => w.TenantId == tenant.Id).ToListAsync();
        workOrders.Should().HaveCount(2);

        var leaveRequests = await db.LeaveRequests.IgnoreQueryFilters().Where(l => l.TenantId == tenant.Id).ToListAsync();
        leaveRequests.Should().HaveCount(1);

        var attendanceLogs = await db.AttendanceLogs.IgnoreQueryFilters().Where(a => a.TenantId == tenant.Id).ToListAsync();
        attendanceLogs.Should().HaveCount(3);

        var reportExports = await db.ReportExports.IgnoreQueryFilters().Where(r => r.TenantId == tenant.Id).ToListAsync();
        reportExports.Should().HaveCount(2);

        // Act 2: Idempotent re-run
        await DatabaseSeeder.InitializeAndSeedAsync(db, userManager);

        var tenantCount = await db.Tenants.IgnoreQueryFilters().CountAsync(t => t.Slug == "starlight");
        tenantCount.Should().Be(1);
    }
}
