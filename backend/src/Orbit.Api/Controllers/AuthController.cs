using System;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Orbit.Application.Common;
using Orbit.Application.Interfaces;
using Orbit.Application.Modules.Auth.Dtos;

namespace Orbit.Api.Controllers;

[ApiController]
[Route("api/v1/auth")]
public class AuthController : ControllerBase
{
    private readonly IIdentityService _identityService;
    private readonly ITenantContext _tenantContext;

    public AuthController(IIdentityService identityService, ITenantContext tenantContext)
    {
        _identityService = identityService;
        _tenantContext = tenantContext;
    }

    [HttpPost("register")]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> Register([FromBody] RegisterRequest request, CancellationToken cancellationToken)
    {
        var result = await _identityService.RegisterAsync(request, cancellationToken);
        return Ok(ApiResponse<AuthResponse>.Ok(result, "Registration successful. Welcome to Orbit Business Suite."));
    }

    [HttpPost("login")]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> Login([FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        var result = await _identityService.LoginAsync(request, cancellationToken);
        return Ok(ApiResponse<AuthResponse>.Ok(result, "Login successful."));
    }

    [Authorize]
    [HttpPost("switch-tenant")]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> SwitchTenant([FromBody] SwitchTenantRequest request, CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var result = await _identityService.SwitchTenantAsync(userId, request.TenantId, cancellationToken);
        return Ok(ApiResponse<AuthResponse>.Ok(result, "Switched active tenant successfully."));
    }

    [Authorize]
    [HttpGet("context")]
    public ActionResult<ApiResponse<object>> GetContext()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        var email = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("email");
        var fullName = User.FindFirstValue("fullname");

        return Ok(ApiResponse<object>.Ok(new
        {
            UserId = userId,
            Email = email,
            FullName = fullName,
            TenantId = _tenantContext.CurrentTenantId,
            Role = _tenantContext.CurrentRole?.ToString(),
            IsResolved = _tenantContext.IsResolved
        }));
    }
}
