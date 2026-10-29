using System;
using Orbit.Domain.Common;
using Orbit.Domain.Enums;

namespace Orbit.Domain.Entities;

public class AttendanceLog : BaseEntity, ITenantScopedEntity, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public Guid EmployeeId { get; set; }
    public EmployeeProfile Employee { get; set; } = null!;

    public DateTime Date { get; set; }
    public DateTime? CheckInTimeUtc { get; set; }
    public DateTime? CheckOutTimeUtc { get; set; }
    public decimal? TotalHours { get; set; }

    public AttendanceStatus Status { get; set; } = AttendanceStatus.Present;
    public ActivityState ActivityState { get; set; } = ActivityState.NotStarted;

    public DateTime? WorkStartedAtUtc { get; set; }
    public DateTime? WorkEndedAtUtc { get; set; }
    public DateTime? CurrentBreakStartedAtUtc { get; set; }
    public DateTime? LastWorkResumedAtUtc { get; set; }

    public int TotalWorkSeconds { get; set; } = 0;
    public int TotalBreakSeconds { get; set; } = 0;

    public bool IsLate { get; set; } = false;
    public int LateMinutes { get; set; } = 0;
    public int FaultsCount { get; set; } = 0;
    public string? FaultReason { get; set; }
    public DateTime? LastHeartbeatUtc { get; set; }

    public string WorkLocation { get; set; } = "Office";
    public string? Notes { get; set; }

    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }
}
