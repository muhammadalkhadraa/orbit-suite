using System;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Orbit.Application.Common;
using Orbit.Application.Interfaces;
using Orbit.Domain.Enums;

namespace Orbit.Api.Middleware;

public class TenantResolutionMiddleware
{
    private readonly RequestDelegate _next;

    public TenantResolutionMiddleware(RequestDelegate _next)
    {
        this._next = _next;
    }

    public async Task InvokeAsync(HttpContext context, ITenantContext tenantContext, IIdentityService identityService)
    {
        // Only evaluate tenant if user is authenticated
        if (context.User.Identity?.IsAuthenticated == true)
        {
            var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier)
                         ?? context.User.FindFirstValue("sub");

            if (!string.IsNullOrEmpty(userId))
            {
                Guid? requestedTenantId = null;

                // Priority 1: X-Tenant-Id header
                if (context.Request.Headers.TryGetValue("X-Tenant-Id", out var tenantHeaderValues))
                {
                    var headerVal = tenantHeaderValues.ToString();
                    if (!string.IsNullOrWhiteSpace(headerVal))
                    {
                        if (Guid.TryParse(headerVal, out var parsedId))
                        {
                            requestedTenantId = parsedId;
                        }
                        else
                        {
                            context.Response.StatusCode = StatusCodes.Status403Forbidden;
                            context.Response.ContentType = "application/json";
                            await context.Response.WriteAsync(JsonSerializer.Serialize(
                                ApiResponse<object>.Fail("Invalid X-Tenant-Id header format.", "Invalid Tenant Header")));
                            return;
                        }
                    }
                }

                // Priority 2: Fallback to token claim if header is absent
                if (!requestedTenantId.HasValue)
                {
                    var claimTenant = context.User.FindFirstValue("tenant_id");
                    if (!string.IsNullOrEmpty(claimTenant) && Guid.TryParse(claimTenant, out var tokenTenantId))
                    {
                        requestedTenantId = tokenTenantId;
                    }
                }

                // If a tenant was requested, verify active membership in database
                if (requestedTenantId.HasValue)
                {
                    var role = await identityService.GetUserTenantRoleAsync(userId, requestedTenantId.Value);
                    if (role.HasValue)
                    {
                        tenantContext.SetContext(requestedTenantId.Value, userId, role.Value);
                    }
                    else
                    {
                        context.Response.StatusCode = StatusCodes.Status403Forbidden;
                        context.Response.ContentType = "application/json";
                        await context.Response.WriteAsync(JsonSerializer.Serialize(
                            ApiResponse<object>.Fail("Access to the requested tenant is denied or membership is invalid.", "Tenant Access Forbidden")));
                        return;
                    }
                }
            }
        }

        await _next(context);
    }
}
