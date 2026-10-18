using System;
using System.Collections.Generic;
using Orbit.Domain.Enums;

namespace Orbit.Application.Modules.Auth.Dtos;

public class RegisterRequest
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
}

public class LoginRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class SwitchTenantRequest
{
    public Guid TenantId { get; set; }
}

public class AuthResponse
{
    public string AccessToken { get; set; } = string.Empty;
    public string TokenType { get; set; } = "Bearer";
    public int ExpiresInMinutes { get; set; }
    public UserProfileDto User { get; set; } = new();
    public TenantSummaryDto? ActiveTenant { get; set; }
    public List<TenantMembershipSummaryDto> AvailableTenants { get; set; } = new();
}

public class UserProfileDto
{
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
}

public class TenantSummaryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public TenantRole Role { get; set; }
}

public class TenantMembershipSummaryDto
{
    public Guid TenantId { get; set; }
    public string TenantName { get; set; } = string.Empty;
    public string TenantSlug { get; set; } = string.Empty;
    public TenantRole Role { get; set; }
    public MembershipStatus Status { get; set; }
}
