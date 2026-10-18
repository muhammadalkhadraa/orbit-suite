using System;
using Orbit.Application.Interfaces;
using Orbit.Domain.Enums;

namespace Orbit.Infrastructure.Services;

public class TenantContext : ITenantContext
{
    public Guid? CurrentTenantId { get; private set; }
    public string? CurrentUserId { get; private set; }
    public TenantRole? CurrentRole { get; private set; }
    public bool IsResolved => CurrentTenantId.HasValue && CurrentTenantId.Value != Guid.Empty;

    public void SetContext(Guid tenantId, string userId, TenantRole role)
    {
        CurrentTenantId = tenantId;
        CurrentUserId = userId;
        CurrentRole = role;
    }

    public void ClearContext()
    {
        CurrentTenantId = null;
        CurrentUserId = null;
        CurrentRole = null;
    }
}
