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
        var dbProvider = configuration.GetValue<string>("DatabaseProvider")
            ?? (configuration.GetValue<bool>("UseSqlServer") ? "SqlServer" : "Sqlite");

        AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

        services.AddDbContext<OrbitDbContext>((sp, options) =>
        {
            if (dbProvider.Equals("PostgreSql", StringComparison.OrdinalIgnoreCase) ||
                dbProvider.Equals("Supabase", StringComparison.OrdinalIgnoreCase) ||
                connectionString.StartsWith("Host=", StringComparison.OrdinalIgnoreCase) ||
                connectionString.StartsWith("postgresql:", StringComparison.OrdinalIgnoreCase) ||
                connectionString.StartsWith("postgres:", StringComparison.OrdinalIgnoreCase))
            {
                var npgsqlConnectionString = NormalizeNpgsqlConnectionString(connectionString);
                options.UseNpgsql(npgsqlConnectionString);
            }
            else if (dbProvider.Equals("SqlServer", StringComparison.OrdinalIgnoreCase))
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

    private static string NormalizeNpgsqlConnectionString(string connectionString)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
            return connectionString;

        if (connectionString.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase) ||
            connectionString.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase))
        {
            try
            {
                var uri = new Uri(connectionString);
                var userInfo = uri.UserInfo.Split(':');
                var username = Uri.UnescapeDataString(userInfo[0]);
                var password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : "";
                var host = uri.Host;
                var port = uri.Port > 0 ? uri.Port : 5432;
                var database = uri.AbsolutePath.TrimStart('/');
                if (string.IsNullOrEmpty(database)) database = "postgres";

                // If host is a Supabase direct host (db.<project-ref>.supabase.co), route through its IPv4 pooler
                if (host.StartsWith("db.") && host.EndsWith(".supabase.co"))
                {
                    var projectRef = host.Substring(3, host.Length - 3 - ".supabase.co".Length);
                    host = "aws-0-eu-west-1.pooler.supabase.com";
                    username = $"postgres.{projectRef}";
                }

                return $"Host={host};Port={port};Database={database};Username={username};Password={password};SSL Mode=Require;Trust Server Certificate=true;Include Error Detail=true;";
            }
            catch
            {
                return connectionString;
            }
        }

        return connectionString;
    }
}
