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
    public string WorkLocation { get; set; } = "Office";
    public string? Notes { get; set; }

    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }
}
