using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Orbit.Application.Interfaces;
using Orbit.Application.Modules.Employees;
using Orbit.Application.Modules.Organization;
using Orbit.Application.Modules.Tasks;
using Orbit.Application.Modules.Crm;
using Orbit.Application.Modules.Support;
using Orbit.Application.Modules.Inventory;
using Orbit.Application.Modules.Finance;
using Orbit.Application.Modules.Manufacturing;
using Orbit.Application.Modules.Hr;
using Orbit.Application.Modules.Reports;
using Orbit.Infrastructure.Identity;
using Orbit.Infrastructure.Persistence;
using Orbit.Infrastructure.Services;

namespace Orbit.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection") 
            ?? "Data Source=orbit.db";
        var useSqlServer = configuration.GetValue<bool>("UseSqlServer");

        services.AddDbContext<OrbitDbContext>((sp, options) =>
        {
            if (useSqlServer)
            {
                options.UseSqlServer(connectionString);
            }
            else
            {
                options.UseSqlite(connectionString);
            }
        });

        services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<OrbitDbContext>());

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

        services.AddHttpContextAccessor();

        services.AddScoped<ITenantContext, TenantContext>();
        services.AddScoped<ICurrentUserService, CurrentUserService>();
        services.AddScoped<IIdentityService, IdentityService>();
        services.AddScoped<IAuditService, AuditService>();
        services.AddScoped<IOrganizationService, OrganizationService>();
        services.AddScoped<IEmployeeService, EmployeeService>();
        services.AddScoped<ITaskService, TaskService>();
        services.AddScoped<ICustomerService, CustomerService>();
        services.AddScoped<IDealService, DealService>();
        services.AddScoped<ITicketService, TicketService>();
        services.AddScoped<IInventoryService, InventoryService>();
        services.AddScoped<IInvoiceService, InvoiceService>();
        services.AddScoped<IManufacturingService, ManufacturingService>();
        services.AddScoped<IHrService, HrService>();
        services.AddScoped<IReportingService, ReportingService>();

        return services;
    }
}
