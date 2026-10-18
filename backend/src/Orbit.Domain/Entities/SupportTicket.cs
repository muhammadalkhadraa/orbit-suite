using System;
using System.Collections.Generic;
using Orbit.Domain.Common;
using Orbit.Domain.Enums;

namespace Orbit.Domain.Entities;

public class SupportTicket : BaseEntity, ITenantScopedEntity, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public string TicketNumber { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    public Guid CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;

    public Guid? AssignedEmployeeId { get; set; }
    public EmployeeProfile? AssignedEmployee { get; set; }

    public Guid? CreatedByEmployeeId { get; set; }
    public EmployeeProfile? CreatedByEmployee { get; set; }

    public TicketStatus Status { get; set; } = TicketStatus.Open;
    public TicketPriority Priority { get; set; } = TicketPriority.Medium;
    public TicketCategory Category { get; set; } = TicketCategory.Technical;

    public DateTime? ResolvedAtUtc { get; set; }
    public DateTime? ClosedAtUtc { get; set; }
    public string? ResolutionSummary { get; set; }

    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }

    public ICollection<TicketComment> Comments { get; set; } = new List<TicketComment>();
}
