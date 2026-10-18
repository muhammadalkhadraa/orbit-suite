using System;
using Orbit.Domain.Common;
using Orbit.Domain.Enums;

namespace Orbit.Domain.Entities;

public class ShiftSchedule : BaseEntity, ITenantScopedEntity, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public Guid EmployeeId { get; set; }
    public EmployeeProfile Employee { get; set; } = null!;

    public string ShiftName { get; set; } = string.Empty;
    public ShiftType ShiftType { get; set; } = ShiftType.StandardDay;

    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }

    public DateTime EffectiveFromUtc { get; set; }
    public DateTime? EffectiveToUtc { get; set; }
    public bool IsActive { get; set; } = true;

    public string? Notes { get; set; }

    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }
}
