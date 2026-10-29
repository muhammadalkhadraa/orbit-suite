using System;
using Orbit.Domain.Common;
using Orbit.Domain.Enums;

namespace Orbit.Domain.Entities;

public class AuditMeeting : BaseEntity, ITenantScopedEntity, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public string MeetingNumber { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public AuditMeetingType AuditType { get; set; } = AuditMeetingType.Internal;
    public AuditMeetingStatus Status { get; set; } = AuditMeetingStatus.Scheduled;

    public DateTime ScheduledDateUtc { get; set; }
    public string Location { get; set; } = "Headquarters";

    public Guid? LeadAuditorEmployeeId { get; set; }
    public EmployeeProfile? LeadAuditorEmployee { get; set; }

    public Guid? AuditedDepartmentId { get; set; }
    public Department? AuditedDepartment { get; set; }

    public string? ChecklistSummary { get; set; }
    public string? Findings { get; set; }
    public int NonConformancesCount { get; set; } = 0;
    public string? CorrectiveActionPlan { get; set; }
    public DateTime? CompletedAtUtc { get; set; }

    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }
}
