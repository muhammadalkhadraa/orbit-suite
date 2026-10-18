using System;

namespace Orbit.Domain.Common;

/// <summary>
/// Enforces tenant data isolation at the compile-time and runtime levels.
/// All entities implementing this interface will automatically have EF Core Global Query Filters applied.
/// </summary>
public interface ITenantScopedEntity
{
    Guid TenantId { get; set; }
}
