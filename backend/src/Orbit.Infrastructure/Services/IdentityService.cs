using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Orbit.Application.Common.Exceptions;
using Orbit.Application.Interfaces;
using Orbit.Application.Modules.Auth.Dtos;
using Orbit.Domain.Entities;
using Orbit.Domain.Enums;
using Orbit.Infrastructure.Identity;

namespace Orbit.Infrastructure.Services;

public class IdentityService : IIdentityService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IApplicationDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ICurrentUserService? _currentUserService;

    public IdentityService(
        UserManager<ApplicationUser> userManager,
        IApplicationDbContext context,
        IConfiguration configuration,
        ICurrentUserService? currentUserService = null)
    {
        _userManager = userManager;
        _context = context;
        _configuration = configuration;
        _currentUserService = currentUserService;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
            throw new ValidationException(new Dictionary<string, string[]> { { "Email", new[] { "Email is required." } } });

        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 6)
            throw new ValidationException(new Dictionary<string, string[]> { { "Password", new[] { "Password must be at least 6 characters." } } });

        if (string.IsNullOrWhiteSpace(request.CompanyName))
            throw new ValidationException(new Dictionary<string, string[]> { { "CompanyName", new[] { "Company name is required." } } });

        var existingUser = await _userManager.FindByEmailAsync(request.Email);
        if (existingUser != null)
            throw new ValidationException(new Dictionary<string, string[]> { { "Email", new[] { "A user with this email already exists." } } });

        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            FullName = request.FullName,
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow
        };

        var createResult = await _userManager.CreateAsync(user, request.Password);
        if (!createResult.Succeeded)
        {
            var errors = createResult.Errors.ToDictionary(e => e.Code, e => new[] { e.Description });
            throw new ValidationException(errors);
        }

        // Generate tenant slug
        var baseSlug = Regex.Replace(request.CompanyName.ToLowerInvariant(), @"[^a-z0-9]", "-").Trim('-');
        if (string.IsNullOrEmpty(baseSlug)) baseSlug = "company";
        var uniqueSlug = $"{baseSlug}-{Guid.NewGuid().ToString("N")[..6]}";

        var tenant = new Tenant
        {
            Id = Guid.NewGuid(),
            Name = request.CompanyName,
            Slug = uniqueSlug,
            Status = TenantStatus.Active,
            CreatedAtUtc = DateTime.UtcNow
        };
        _context.Tenants.Add(tenant);

        var membership = new TenantMembership
        {
            Id = Guid.NewGuid(),
            TenantId = tenant.Id,
            UserId = user.Id,
            Role = TenantRole.Owner,
            Status = MembershipStatus.Active,
            JoinedAtUtc = DateTime.UtcNow
        };
        _context.TenantMemberships.Add(membership);

        // Create default Branch and Department
        var hqBranch = new Branch
        {
            Id = Guid.NewGuid(),
            TenantId = tenant.Id,
            Name = "Headquarters",
            Code = "HQ",
            IsActive = true
        };
        _context.Branches.Add(hqBranch);

        // Provision the 8 Essential Standard Departments across all company types
        var deptHr = new Department { Id = Guid.NewGuid(), TenantId = tenant.Id, Name = "Human Resources", Code = "HR", Description = "Workforce, people operations, recruitment & payroll governance", IsActive = true };
        var deptFin = new Department { Id = Guid.NewGuid(), TenantId = tenant.Id, Name = "Finance & Accounting", Code = "FIN", Description = "General ledger, invoicing, accounts receivable & salary disbursement", IsActive = true };
        var deptCs = new Department { Id = Guid.NewGuid(), TenantId = tenant.Id, Name = "Customer Service", Code = "CS", Description = "Guest inquiries, client support & helpdesk ticket management", IsActive = true };
        var deptIt = new Department { Id = Guid.NewGuid(), TenantId = tenant.Id, Name = "Information Technology", Code = "IT", Description = "Internal IT infrastructure, hardware, systems & network troubleshooting", IsActive = true };
        var deptSales = new Department { Id = Guid.NewGuid(), TenantId = tenant.Id, Name = "Sales & Commercial", Code = "SALES", Description = "Revenue generation, client accounts & deal pipeline execution", IsActive = true };
        var deptStores = new Department { Id = Guid.NewGuid(), TenantId = tenant.Id, Name = "Stores & Warehouses", Code = "STORES", Description = "Physical inventory allocations, SKU tracking & inter-branch transfers", IsActive = true };
        var deptData = new Department { Id = Guid.NewGuid(), TenantId = tenant.Id, Name = "Data Entry & Operations", Code = "OPS", Description = "Operational logs, routine workflows, task execution & shift rosters", IsActive = true };
        var deptAudit = new Department { Id = Guid.NewGuid(), TenantId = tenant.Id, Name = "Compliance & Audit", Code = "AUDIT", Description = "Regulatory certificates, ISO standards, safety audits & compliance reviews", IsActive = true };

        _context.Departments.AddRange(deptHr, deptFin, deptCs, deptIt, deptSales, deptStores, deptData, deptAudit);

        var generalDept = deptData;

        // Create initial employee profile for owner
        var nameParts = request.FullName.Split(' ', 2);
        var firstName = nameParts[0];
        var lastName = nameParts.Length > 1 ? nameParts[1] : string.Empty;

        var ownerEmployee = new EmployeeProfile
        {
            Id = Guid.NewGuid(),
            TenantId = tenant.Id,
            UserId = user.Id,
            EmployeeNumber = "EMP-001",
            FirstName = firstName,
            LastName = lastName,
            Email = user.Email,
            JobTitle = "Founder & Chief Executive",
            BranchId = hqBranch.Id,
            DepartmentId = generalDept.Id,
            IsActive = true,
            HireDateUtc = DateTime.UtcNow
        };
        _context.Employees.Add(ownerEmployee);

        await _context.SaveChangesAsync(cancellationToken);

        var availableTenants = new List<TenantMembershipSummaryDto>
        {
            new()
            {
                TenantId = tenant.Id,
                TenantName = tenant.Name,
                TenantSlug = tenant.Slug,
                Role = TenantRole.Owner,
                Status = MembershipStatus.Active
            }
        };

        var token = GenerateJwtToken(user, tenant.Id, TenantRole.Owner);

        var regAudit = new AuditLog
        {
            Id = Guid.NewGuid(),
            TenantId = tenant.Id,
            UserId = user.Id,
            UserEmail = user.Email,
            Action = "Register",
            EntityName = "UserSession",
            EntityId = user.Id,
            DetailsJson = JsonSerializer.Serialize(new
            {
                user.Email,
                Tenant = tenant.Name,
                Role = TenantRole.Owner.ToString(),
                Client = "Orbit Web App",
                Method = "OrganizationRegistration"
            }),
            IpAddress = _currentUserService?.IpAddress ?? "127.0.0.1",
            TimestampUtc = DateTime.UtcNow
        };
        _context.AuditLogs.Add(regAudit);
        await _context.SaveChangesAsync(cancellationToken);

        return new AuthResponse
        {
            AccessToken = token,
            ExpiresInMinutes = GetExpiryMinutes(),
            User = new UserProfileDto
            {
                Id = user.Id,
                Email = user.Email ?? string.Empty,
                FullName = user.FullName,
                Role = TenantRole.Owner.ToString(),
                DepartmentCode = "OPS",
                DepartmentName = "Data Entry & Operations"
            },
            ActiveTenant = new TenantSummaryDto
            {
                Id = tenant.Id,
                Name = tenant.Name,
                Slug = tenant.Slug,
                Role = TenantRole.Owner
            },
            AvailableTenants = availableTenants
        };
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null || !user.IsActive)
            throw new UnauthorizedAccessException("Invalid email or password.");

        var validPassword = await _userManager.CheckPasswordAsync(user, request.Password);
        if (!validPassword)
            throw new UnauthorizedAccessException("Invalid email or password.");

        // Query active memberships without tenant filter
        var memberships = await _context.TenantMemberships
            .Include(m => m.Tenant)
            .Where(m => m.UserId == user.Id && m.Status == MembershipStatus.Active)
            .ToListAsync(cancellationToken);

        if (!memberships.Any())
            throw new TenantAccessDeniedException("No active company memberships found for this user.");

        var activeMembership = memberships.First();
        var activeTenant = activeMembership.Tenant!;

        var availableTenants = memberships.Select(m => new TenantMembershipSummaryDto
        {
            TenantId = m.TenantId,
            TenantName = m.Tenant?.Name ?? "Unnamed",
            TenantSlug = m.Tenant?.Slug ?? string.Empty,
            Role = m.Role,
            Status = m.Status
        }).ToList();

        string? deptCode = null;
        string? deptName = null;
        try
        {
            var empProfile = await _context.Employees
                .IgnoreQueryFilters()
                .Include(e => e.Department)
                .FirstOrDefaultAsync(e => e.TenantId == activeTenant.Id && (e.UserId == user.Id || e.Email == user.Email), cancellationToken);

            deptCode = empProfile?.Department?.Code;
            deptName = empProfile?.Department?.Name;
        }
        catch { }

        var token = GenerateJwtToken(user, activeTenant.Id, activeMembership.Role, deptCode);

        var loginAudit = new AuditLog
        {
            Id = Guid.NewGuid(),
            TenantId = activeTenant.Id,
            UserId = user.Id,
            UserEmail = user.Email,
            Action = "Login",
            EntityName = "UserSession",
            EntityId = user.Id,
            DetailsJson = JsonSerializer.Serialize(new
            {
                user.Email,
                Tenant = activeTenant.Name,
                Role = activeMembership.Role.ToString(),
                Department = deptCode,
                Client = "Orbit Web App",
                Method = "PasswordAuth"
            }),
            IpAddress = _currentUserService?.IpAddress ?? "127.0.0.1",
            TimestampUtc = DateTime.UtcNow
        };
        _context.AuditLogs.Add(loginAudit);
        await _context.SaveChangesAsync(cancellationToken);

        return new AuthResponse
        {
            AccessToken = token,
            ExpiresInMinutes = GetExpiryMinutes(),
            User = new UserProfileDto
            {
                Id = user.Id,
                Email = user.Email ?? string.Empty,
                FullName = user.FullName,
                Role = activeMembership.Role.ToString(),
                DepartmentCode = deptCode,
                DepartmentName = deptName
            },
            ActiveTenant = new TenantSummaryDto
            {
                Id = activeTenant.Id,
                Name = activeTenant.Name,
                Slug = activeTenant.Slug,
                Role = activeMembership.Role
            },
            AvailableTenants = availableTenants
        };
    }

    public async Task<AuthResponse> SwitchTenantAsync(string userId, Guid targetTenantId, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null || !user.IsActive)
            throw new UnauthorizedAccessException("User not found or inactive.");

        var memberships = await _context.TenantMemberships
            .Include(m => m.Tenant)
            .Where(m => m.UserId == user.Id && m.Status == MembershipStatus.Active)
            .ToListAsync(cancellationToken);

        var targetMembership = memberships.FirstOrDefault(m => m.TenantId == targetTenantId);
        if (targetMembership == null || targetMembership.Tenant == null)
            throw new TenantAccessDeniedException("User is not an active member of the requested company.");

        var targetTenant = targetMembership.Tenant;

        string? deptCode = null;
        string? deptName = null;
        try
        {
            var empProfile = await _context.Employees
                .IgnoreQueryFilters()
                .Include(e => e.Department)
                .FirstOrDefaultAsync(e => e.TenantId == targetTenant.Id && (e.UserId == user.Id || e.Email == user.Email), cancellationToken);

            deptCode = empProfile?.Department?.Code;
            deptName = empProfile?.Department?.Name;
        }
        catch { }

        var token = GenerateJwtToken(user, targetTenant.Id, targetMembership.Role, deptCode);

        var availableTenants = memberships.Select(m => new TenantMembershipSummaryDto
        {
            TenantId = m.TenantId,
            TenantName = m.Tenant?.Name ?? "Unnamed",
            TenantSlug = m.Tenant?.Slug ?? string.Empty,
            Role = m.Role,
            Status = m.Status
        }).ToList();

        var switchAudit = new AuditLog
        {
            Id = Guid.NewGuid(),
            TenantId = targetTenant.Id,
            UserId = user.Id,
            UserEmail = user.Email,
            Action = "SwitchTenant",
            EntityName = "TenantMembership",
            EntityId = targetTenant.Id.ToString(),
            DetailsJson = JsonSerializer.Serialize(new
            {
                TargetTenant = targetTenant.Name,
                Role = targetMembership.Role.ToString(),
                Department = deptCode
            }),
            IpAddress = _currentUserService?.IpAddress ?? "127.0.0.1",
            TimestampUtc = DateTime.UtcNow
        };
        _context.AuditLogs.Add(switchAudit);
        await _context.SaveChangesAsync(cancellationToken);

        return new AuthResponse
        {
            AccessToken = token,
            ExpiresInMinutes = GetExpiryMinutes(),
            User = new UserProfileDto
            {
                Id = user.Id,
                Email = user.Email ?? string.Empty,
                FullName = user.FullName,
                Role = targetMembership.Role.ToString(),
                DepartmentCode = deptCode,
                DepartmentName = deptName
            },
            ActiveTenant = new TenantSummaryDto
            {
                Id = targetTenant.Id,
                Name = targetTenant.Name,
                Slug = targetTenant.Slug,
                Role = targetMembership.Role
            },
            AvailableTenants = availableTenants
        };
    }

    public async Task LogoutAsync(string userId, Guid? tenantId, string? userEmail, string? ipAddress, string? reason, CancellationToken cancellationToken = default)
    {
        if (!tenantId.HasValue) return;

        var logoutAudit = new AuditLog
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId.Value,
            UserId = userId,
            UserEmail = userEmail,
            Action = "Logout",
            EntityName = "UserSession",
            EntityId = userId,
            DetailsJson = JsonSerializer.Serialize(new
            {
                Reason = reason ?? "UserInitiated",
                Client = "Orbit Web App"
            }),
            IpAddress = ipAddress ?? _currentUserService?.IpAddress ?? "127.0.0.1",
            TimestampUtc = DateTime.UtcNow
        };
        _context.AuditLogs.Add(logoutAudit);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<bool> ValidateTenantMembershipAsync(string userId, Guid tenantId, CancellationToken cancellationToken = default)
    {
        return await _context.TenantMemberships
            .AnyAsync(m => m.UserId == userId && m.TenantId == tenantId && m.Status == MembershipStatus.Active, cancellationToken);
    }

    public async Task<TenantRole?> GetUserTenantRoleAsync(string userId, Guid tenantId, CancellationToken cancellationToken = default)
    {
        var membership = await _context.TenantMemberships
            .FirstOrDefaultAsync(m => m.UserId == userId && m.TenantId == tenantId && m.Status == MembershipStatus.Active, cancellationToken);

        return membership?.Role;
    }

    private string GenerateJwtToken(ApplicationUser user, Guid tenantId, TenantRole role, string? departmentCode = null)
    {
        var secretKey = _configuration["Jwt:SecretKey"] ?? "OrbitBusinessSuiteSuperSecretKeyForDevelopmentAndTestingPurposesOnly2026!";
        var issuer = _configuration["Jwt:Issuer"] ?? "https://orbit.business";
        var audience = _configuration["Jwt:Audience"] ?? "https://orbit.business";
        var expiryMinutes = GetExpiryMinutes();

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id),
            new(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
            new("fullname", user.FullName),
            new("tenant_id", tenantId.ToString()),
            new(ClaimTypes.Role, role.ToString()),
            new("role", role.ToString()),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        if (!string.IsNullOrEmpty(departmentCode))
        {
            claims.Add(new Claim("dept", departmentCode));
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private int GetExpiryMinutes()
    {
        return int.TryParse(_configuration["Jwt:ExpiryMinutes"], out var minutes) ? minutes : 60;
    }
}
