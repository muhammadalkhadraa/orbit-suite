using System;
using Orbit.Domain.Common;
using Orbit.Domain.Enums;

namespace Orbit.Domain.Entities;

public class LeaveRequest : BaseEntity, ITenantScopedEntity, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public string RequestNumber { get; set; } = string.Empty;

    public Guid EmployeeId { get; set; }
    public EmployeeProfile Employee { get; set; } = null!;

    public LeaveType LeaveType { get; set; } = LeaveType.Annual;
    public DateTime StartDateUtc { get; set; }
    public DateTime EndDateUtc { get; set; }
    public decimal DaysCount { get; set; }

    public string Reason { get; set; } = string.Empty;
    public LeaveStatus Status { get; set; } = LeaveStatus.Pending;

    public Guid? ApproverEmployeeId { get; set; }
    public EmployeeProfile? ApproverEmployee { get; set; }
    public DateTime? ActionedAtUtc { get; set; }
    public string? RejectionReason { get; set; }

    /// <summary>
    /// Employee's remaining vacation balance at the moment of request submission.
    /// </summary>
    public decimal RemainingBalanceAtRequest { get; set; } = 0;

    /// <summary>
    /// Resulting balance after manager approval (can become negative).
    /// </summary>
    public decimal? ResultingBalanceAfterApproval { get; set; }

    /// <summary>
    /// Indicates whether this approved vacation has been synchronized and forwarded to the HR department.
    /// </summary>
    public bool IsForwardedToHr { get; set; } = false;
    public DateTime? ForwardedToHrAtUtc { get; set; }

    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }
}
