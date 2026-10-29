using System;
using System.Collections.Generic;
using Orbit.Domain.Enums;

namespace Orbit.Application.Modules.Support.Dtos;

public class SupportTicketDto
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string TicketNumber { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    public bool IsInternalItTicket { get; set; }
    public Guid? CustomerId { get; set; }
    public string? CustomerName { get; set; }

    public Guid? RequestingEmployeeId { get; set; }
    public string? RequestingEmployeeName { get; set; }

    public Guid? TargetDepartmentId { get; set; }
    public string? TargetDepartmentName { get; set; }

    public Guid? AssignedEmployeeId { get; set; }
    public string? AssignedEmployeeName { get; set; }

    public Guid? CreatedByEmployeeId { get; set; }
    public string? CreatedByEmployeeName { get; set; }

    public TicketStatus Status { get; set; }
    public string StatusName => Status.ToString();

    public TicketPriority Priority { get; set; }
    public string PriorityName => Priority.ToString();

    public TicketCategory Category { get; set; }
    public string CategoryName => Category.ToString();

    public DateTime? ResolvedAtUtc { get; set; }
    public DateTime? ClosedAtUtc { get; set; }
    public string? ResolutionSummary { get; set; }

    public int CommentsCount { get; set; }
    public List<TicketCommentDto> Comments { get; set; } = new();

    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
}

public class TicketCommentDto
{
    public Guid Id { get; set; }
    public Guid TicketId { get; set; }
    public Guid? AuthorEmployeeId { get; set; }
    public string AuthorName { get; set; } = string.Empty;
    public string CommentText { get; set; } = string.Empty;
    public bool IsInternal { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}

public class CreateTicketRequest
{
    public string Subject { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsInternalItTicket { get; set; } = false;
    public Guid? CustomerId { get; set; }
    public Guid? RequestingEmployeeId { get; set; }
    public Guid? TargetDepartmentId { get; set; }
    public Guid? AssignedEmployeeId { get; set; }
    public TicketPriority Priority { get; set; } = TicketPriority.Medium;
    public TicketCategory Category { get; set; } = TicketCategory.Technical;
}

public class UpdateTicketRequest
{
    public string Subject { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsInternalItTicket { get; set; } = false;
    public Guid? CustomerId { get; set; }
    public Guid? RequestingEmployeeId { get; set; }
    public Guid? TargetDepartmentId { get; set; }
    public Guid? AssignedEmployeeId { get; set; }
    public TicketPriority Priority { get; set; }
    public TicketCategory Category { get; set; }
    public TicketStatus Status { get; set; }
    public string? ResolutionSummary { get; set; }
}

public class UpdateTicketStatusRequest
{
    public TicketStatus Status { get; set; }
    public string? ResolutionSummary { get; set; }
}

public class AddTicketCommentRequest
{
    public string CommentText { get; set; } = string.Empty;
    public bool IsInternal { get; set; } = false;
}

public class TicketFilterRequest
{
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 50;
    public TicketStatus? Status { get; set; }
    public TicketPriority? Priority { get; set; }
    public TicketCategory? Category { get; set; }
    public bool? IsInternalItTicket { get; set; }
    public Guid? CustomerId { get; set; }
    public Guid? RequestingEmployeeId { get; set; }
    public Guid? TargetDepartmentId { get; set; }
    public Guid? AssignedEmployeeId { get; set; }
    public string? Search { get; set; }
}

public class TicketMetricsDto
{
    public int OpenTicketsCount { get; set; }
    public int PendingTicketsCount { get; set; }
    public int ResolvedTicketsCount { get; set; }
    public int ClosedTicketsCount { get; set; }
    public int UrgentTicketsCount { get; set; }
    public int TotalTicketsCount { get; set; }
    public double ResolutionRatePercentage { get; set; }
}
