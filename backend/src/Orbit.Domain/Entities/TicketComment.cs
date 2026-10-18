using System;
using Orbit.Domain.Common;

namespace Orbit.Domain.Entities;

public class TicketComment : BaseEntity, ITenantScopedEntity, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public Guid TicketId { get; set; }
    public SupportTicket Ticket { get; set; } = null!;

    public Guid? AuthorEmployeeId { get; set; }
    public EmployeeProfile? AuthorEmployee { get; set; }

    public string AuthorName { get; set; } = string.Empty;
    public string CommentText { get; set; } = string.Empty;
    public bool IsInternal { get; set; } = false;

    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }
}
