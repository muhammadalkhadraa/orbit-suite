using System;
using Orbit.Domain.Enums;

namespace Orbit.Application.Interfaces;

public interface ITenantContext
{
    Guid? CurrentTenantId { get; }
    string? CurrentUserId { get; }
    TenantRole? CurrentRole { get; }
    bool IsResolved { get; }

    void SetContext(Guid tenantId, string userId, TenantRole role);
    void ClearContext();
}
