using System;
using System.Threading;
using System.Threading.Tasks;
using Orbit.Application.Modules.Auth.Dtos;
using Orbit.Domain.Enums;

namespace Orbit.Application.Interfaces;

public interface IIdentityService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default);
    Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default);
    Task<AuthResponse> SwitchTenantAsync(string userId, Guid targetTenantId, CancellationToken cancellationToken = default);
    Task<bool> ValidateTenantMembershipAsync(string userId, Guid tenantId, CancellationToken cancellationToken = default);
    Task<TenantRole?> GetUserTenantRoleAsync(string userId, Guid tenantId, CancellationToken cancellationToken = default);
    Task LogoutAsync(string userId, Guid? tenantId, string? userEmail, string? ipAddress, string? reason, CancellationToken cancellationToken = default);
}
