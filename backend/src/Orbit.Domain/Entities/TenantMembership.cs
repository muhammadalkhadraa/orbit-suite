using System;
using Orbit.Domain.Common;
using Orbit.Domain.Enums;

namespace Orbit.Domain.Entities;

public class TenantMembership : BaseEntity, ITenantScopedEntity
{
    public Guid TenantId { get; set; }
    public Tenant? Tenant { get; set; }

    public string UserId { get; set; } = string.Empty;
    public TenantRole Role { get; set; } = TenantRole.Employee;
    public MembershipStatus Status { get; set; } = MembershipStatus.Active;

    public DateTime JoinedAtUtc { get; set; } = DateTime.UtcNow;
}
