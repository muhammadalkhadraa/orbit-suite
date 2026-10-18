using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Orbit.Application.Common;
using Orbit.Application.Common.Exceptions;
using Orbit.Application.Interfaces;
using Orbit.Application.Modules.Support;
using Orbit.Application.Modules.Support.Dtos;
using Orbit.Domain.Entities;
using Orbit.Domain.Enums;

namespace Orbit.Infrastructure.Services;

public class TicketService : ITicketService
{
    private readonly IApplicationDbContext _context;
    private readonly ITenantContext _tenantContext;
    private readonly ICurrentUserService _currentUserService;
    private readonly IAuditService _auditService;

    public TicketService(
        IApplicationDbContext context,
        ITenantContext tenantContext,
        ICurrentUserService currentUserService,
        IAuditService auditService)
    {
        _context = context;
        _tenantContext = tenantContext;
        _currentUserService = currentUserService;
        _auditService = auditService;
    }

    public async Task<PagedResponse<SupportTicketDto>> GetTicketsAsync(TicketFilterRequest filter, CancellationToken cancellationToken = default)
    {
        var currentEmployee = await GetCurrentEmployeeAsync(cancellationToken);
        var role = _tenantContext.CurrentRole ?? TenantRole.Employee;

        var query = _context.SupportTickets
            .Include(t => t.Customer)
            .Include(t => t.AssignedEmployee)
            .Include(t => t.CreatedByEmployee)
            .Include(t => t.Comments)
            .AsQueryable();

        // Enforce Confirmed Role-Scoped Support Visibility
        if (role == TenantRole.Employee)
        {
            var empId = currentEmployee?.Id ?? Guid.Empty;
            query = query.Where(t => t.AssignedEmployeeId == empId || t.CreatedByEmployeeId == empId);
        }
        else if (role == TenantRole.Manager)
        {
            var managerId = currentEmployee?.Id ?? Guid.Empty;
            query = query.Where(t =>
                t.AssignedEmployeeId == managerId ||
                t.CreatedByEmployeeId == managerId ||
                (t.AssignedEmployee != null && t.AssignedEmployee.ReportsToEmployeeId == managerId));
        }

        // Apply filters
        if (filter.Status.HasValue)
        {
            query = query.Where(t => t.Status == filter.Status.Value);
        }

        if (filter.Priority.HasValue)
        {
            query = query.Where(t => t.Priority == filter.Priority.Value);
        }

        if (filter.Category.HasValue)
        {
            query = query.Where(t => t.Category == filter.Category.Value);
        }

        if (filter.CustomerId.HasValue)
        {
            query = query.Where(t => t.CustomerId == filter.CustomerId.Value);
        }

        if (filter.AssignedEmployeeId.HasValue)
        {
            query = query.Where(t => t.AssignedEmployeeId == filter.AssignedEmployeeId.Value);
        }

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var s = filter.Search.Trim().ToLower();
            query = query.Where(t =>
                t.TicketNumber.ToLower().Contains(s) ||
                t.Subject.ToLower().Contains(s) ||
                t.Customer.CompanyName.ToLower().Contains(s));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var skip = (filter.PageNumber - 1) * filter.PageSize;

        var items = await query
            .OrderByDescending(t => t.CreatedAtUtc)
            .Skip(skip)
            .Take(filter.PageSize)
            .Select(t => new SupportTicketDto
            {
                Id = t.Id,
                TenantId = t.TenantId,
                TicketNumber = t.TicketNumber,
                Subject = t.Subject,
                Description = t.Description,
                CustomerId = t.CustomerId,
                CustomerName = t.Customer.CompanyName,
                AssignedEmployeeId = t.AssignedEmployeeId,
                AssignedEmployeeName = t.AssignedEmployee != null ? $"{t.AssignedEmployee.FirstName} {t.AssignedEmployee.LastName}".Trim() : null,
                CreatedByEmployeeId = t.CreatedByEmployeeId,
                CreatedByEmployeeName = t.CreatedByEmployee != null ? $"{t.CreatedByEmployee.FirstName} {t.CreatedByEmployee.LastName}".Trim() : null,
                Status = t.Status,
                Priority = t.Priority,
                Category = t.Category,
                ResolvedAtUtc = t.ResolvedAtUtc,
                ClosedAtUtc = t.ClosedAtUtc,
                ResolutionSummary = t.ResolutionSummary,
                CommentsCount = t.Comments.Count,
                CreatedAtUtc = t.CreatedAtUtc,
                UpdatedAtUtc = t.UpdatedAtUtc
            })
            .ToListAsync(cancellationToken);

        return PagedResponse<SupportTicketDto>.Create(items, totalCount, filter.PageNumber, filter.PageSize);
    }

    public async Task<SupportTicketDto> GetTicketByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var currentEmployee = await GetCurrentEmployeeAsync(cancellationToken);
        var role = _tenantContext.CurrentRole ?? TenantRole.Employee;

        var ticket = await _context.SupportTickets
            .Include(t => t.Customer)
            .Include(t => t.AssignedEmployee)
            .Include(t => t.CreatedByEmployee)
            .Include(t => t.Comments)
            .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);

        if (ticket == null)
        {
            throw new NotFoundException(nameof(SupportTicket), id);
        }

        // Validate Role-Scoped Access
        if (role == TenantRole.Employee)
        {
            var empId = currentEmployee?.Id ?? Guid.Empty;
            if (ticket.AssignedEmployeeId != empId && ticket.CreatedByEmployeeId != empId)
            {
                throw new ForbiddenAccessException("You do not have permission to view this support ticket.");
            }
        }
        else if (role == TenantRole.Manager)
        {
            var managerId = currentEmployee?.Id ?? Guid.Empty;
            var isDirectReport = ticket.AssignedEmployee != null && ticket.AssignedEmployee.ReportsToEmployeeId == managerId;
            if (ticket.AssignedEmployeeId != managerId && ticket.CreatedByEmployeeId != managerId && !isDirectReport)
            {
                throw new ForbiddenAccessException("You do not have permission to access support tickets outside your team scope.");
            }
        }

        return MapToDto(ticket);
    }

    public async Task<SupportTicketDto> CreateTicketAsync(CreateTicketRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Subject))
        {
            throw new ValidationException("Subject", "Ticket subject is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Description))
        {
            throw new ValidationException("Description", "Ticket description is required.");
        }

        if (request.CustomerId == Guid.Empty)
        {
            throw new ValidationException("CustomerId", "Associated customer account is required.");
        }

        var customer = await _context.Customers.FirstOrDefaultAsync(c => c.Id == request.CustomerId, cancellationToken);
        if (customer == null)
        {
            throw new NotFoundException(nameof(Customer), request.CustomerId);
        }

        var currentEmployee = await GetCurrentEmployeeAsync(cancellationToken);
        var role = _tenantContext.CurrentRole ?? TenantRole.Employee;

        var assignedId = request.AssignedEmployeeId;
        if (!assignedId.HasValue && role == TenantRole.Employee && currentEmployee != null)
        {
            assignedId = currentEmployee.Id;
        }

        // Generate sequential ticket number per tenant
        var count = await _context.SupportTickets.CountAsync(cancellationToken);
        var ticketNumber = $"TCK-{(count + 1001)}";

        var ticket = new SupportTicket
        {
            Id = Guid.NewGuid(),
            TicketNumber = ticketNumber,
            Subject = request.Subject.Trim(),
            Description = request.Description.Trim(),
            CustomerId = request.CustomerId,
            AssignedEmployeeId = assignedId,
            CreatedByEmployeeId = currentEmployee?.Id,
            Status = TicketStatus.Open,
            Priority = request.Priority,
            Category = request.Category,
            CreatedBy = _currentUserService.Email ?? _currentUserService.UserId ?? "System"
        };

        _context.SupportTickets.Add(ticket);
        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "Created Support Ticket",
            nameof(SupportTicket),
            ticket.Id.ToString(),
            $"Created ticket {ticket.TicketNumber}: '{ticket.Subject}' for customer '{customer.CompanyName}' (Priority: {ticket.Priority})",
            cancellationToken);

        return await GetTicketByIdAsync(ticket.Id, cancellationToken);
    }

    public async Task<SupportTicketDto> UpdateTicketAsync(Guid id, UpdateTicketRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Subject))
        {
            throw new ValidationException("Subject", "Ticket subject is required.");
        }

        var ticket = await _context.SupportTickets
            .Include(t => t.Customer)
            .Include(t => t.AssignedEmployee)
            .Include(t => t.Comments)
            .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);

        if (ticket == null)
        {
            throw new NotFoundException(nameof(SupportTicket), id);
        }

        await ValidateModifyPermissionAsync(ticket, cancellationToken);

        ticket.Subject = request.Subject.Trim();
        ticket.Description = request.Description.Trim();
        ticket.CustomerId = request.CustomerId;
        ticket.AssignedEmployeeId = request.AssignedEmployeeId;
        ticket.Priority = request.Priority;
        ticket.Category = request.Category;
        ticket.Status = request.Status;
        ticket.ResolutionSummary = request.ResolutionSummary?.Trim();
        ticket.UpdatedBy = _currentUserService.Email ?? _currentUserService.UserId;
        ticket.UpdatedAtUtc = DateTime.UtcNow;

        if (request.Status == TicketStatus.Resolved)
        {
            ticket.ResolvedAtUtc ??= DateTime.UtcNow;
        }
        else if (request.Status == TicketStatus.Closed)
        {
            ticket.ClosedAtUtc ??= DateTime.UtcNow;
            ticket.ResolvedAtUtc ??= DateTime.UtcNow;
        }
        else
        {
            ticket.ResolvedAtUtc = null;
            ticket.ClosedAtUtc = null;
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "Updated Support Ticket",
            nameof(SupportTicket),
            ticket.Id.ToString(),
            $"Updated ticket {ticket.TicketNumber}: '{ticket.Subject}' (Status: {ticket.Status})",
            cancellationToken);

        return await GetTicketByIdAsync(ticket.Id, cancellationToken);
    }

    public async Task<SupportTicketDto> UpdateTicketStatusAsync(Guid id, UpdateTicketStatusRequest request, CancellationToken cancellationToken = default)
    {
        var ticket = await _context.SupportTickets
            .Include(t => t.Customer)
            .Include(t => t.AssignedEmployee)
            .Include(t => t.Comments)
            .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);

        if (ticket == null)
        {
            throw new NotFoundException(nameof(SupportTicket), id);
        }

        await ValidateModifyPermissionAsync(ticket, cancellationToken);

        var oldStatus = ticket.Status;
        ticket.Status = request.Status;
        ticket.ResolutionSummary = request.ResolutionSummary?.Trim() ?? ticket.ResolutionSummary;
        ticket.UpdatedBy = _currentUserService.Email ?? _currentUserService.UserId;
        ticket.UpdatedAtUtc = DateTime.UtcNow;

        if (request.Status == TicketStatus.Resolved)
        {
            ticket.ResolvedAtUtc = DateTime.UtcNow;
        }
        else if (request.Status == TicketStatus.Closed)
        {
            ticket.ClosedAtUtc = DateTime.UtcNow;
            ticket.ResolvedAtUtc ??= DateTime.UtcNow;
        }
        else
        {
            ticket.ResolvedAtUtc = null;
            ticket.ClosedAtUtc = null;
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "Transitioned Support Ticket Status",
            nameof(SupportTicket),
            ticket.Id.ToString(),
            $"Transitioned ticket {ticket.TicketNumber} from {oldStatus} to {ticket.Status}",
            cancellationToken);

        return await GetTicketByIdAsync(ticket.Id, cancellationToken);
    }

    public async Task<TicketCommentDto> AddCommentAsync(Guid ticketId, AddTicketCommentRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.CommentText))
        {
            throw new ValidationException("CommentText", "Comment text cannot be empty.");
        }

        var ticket = await _context.SupportTickets
            .Include(t => t.AssignedEmployee)
            .FirstOrDefaultAsync(t => t.Id == ticketId, cancellationToken);

        if (ticket == null)
        {
            throw new NotFoundException(nameof(SupportTicket), ticketId);
        }

        var currentEmployee = await GetCurrentEmployeeAsync(cancellationToken);
        var authorName = currentEmployee != null ? $"{currentEmployee.FirstName} {currentEmployee.LastName}".Trim() : (_currentUserService.Email ?? "Support Agent");

        var comment = new TicketComment
        {
            Id = Guid.NewGuid(),
            TicketId = ticketId,
            AuthorEmployeeId = currentEmployee?.Id,
            AuthorName = authorName,
            CommentText = request.CommentText.Trim(),
            IsInternal = request.IsInternal,
            CreatedBy = _currentUserService.Email ?? _currentUserService.UserId ?? "System"
        };

        _context.TicketComments.Add(comment);

        ticket.UpdatedAtUtc = DateTime.UtcNow;
        ticket.UpdatedBy = _currentUserService.Email ?? _currentUserService.UserId;

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "Added Support Ticket Comment",
            nameof(TicketComment),
            comment.Id.ToString(),
            $"Added {(comment.IsInternal ? "internal note" : "public reply")} to ticket {ticket.TicketNumber}",
            cancellationToken);

        return new TicketCommentDto
        {
            Id = comment.Id,
            TicketId = comment.TicketId,
            AuthorEmployeeId = comment.AuthorEmployeeId,
            AuthorName = comment.AuthorName,
            CommentText = comment.CommentText,
            IsInternal = comment.IsInternal,
            CreatedAtUtc = comment.CreatedAtUtc
        };
    }

    public async Task DeleteTicketAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var role = _tenantContext.CurrentRole ?? TenantRole.Employee;
        if (role == TenantRole.Employee)
        {
            throw new ForbiddenAccessException("Employees are not authorized to delete support tickets.");
        }

        var ticket = await _context.SupportTickets
            .Include(t => t.AssignedEmployee)
            .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);

        if (ticket == null)
        {
            throw new NotFoundException(nameof(SupportTicket), id);
        }

        if (role == TenantRole.Manager)
        {
            var currentEmployee = await GetCurrentEmployeeAsync(cancellationToken);
            var managerId = currentEmployee?.Id ?? Guid.Empty;
            var isDirectReport = ticket.AssignedEmployee != null && ticket.AssignedEmployee.ReportsToEmployeeId == managerId;
            if (ticket.AssignedEmployeeId != managerId && !isDirectReport)
            {
                throw new ForbiddenAccessException("Managers can only delete tickets within their team scope.");
            }
        }

        _context.SupportTickets.Remove(ticket);
        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "Deleted Support Ticket",
            nameof(SupportTicket),
            ticket.Id.ToString(),
            $"Deleted ticket {ticket.TicketNumber}: '{ticket.Subject}'",
            cancellationToken);
    }

    public async Task<TicketMetricsDto> GetTicketMetricsAsync(CancellationToken cancellationToken = default)
    {
        var currentEmployee = await GetCurrentEmployeeAsync(cancellationToken);
        var role = _tenantContext.CurrentRole ?? TenantRole.Employee;

        var query = _context.SupportTickets.AsQueryable();

        if (role == TenantRole.Employee)
        {
            var empId = currentEmployee?.Id ?? Guid.Empty;
            query = query.Where(t => t.AssignedEmployeeId == empId || t.CreatedByEmployeeId == empId);
        }
        else if (role == TenantRole.Manager)
        {
            var managerId = currentEmployee?.Id ?? Guid.Empty;
            query = query.Where(t =>
                t.AssignedEmployeeId == managerId ||
                t.CreatedByEmployeeId == managerId ||
                (t.AssignedEmployee != null && t.AssignedEmployee.ReportsToEmployeeId == managerId));
        }

        var tickets = await query.ToListAsync(cancellationToken);

        var open = tickets.Count(t => t.Status == TicketStatus.Open);
        var pending = tickets.Count(t => t.Status == TicketStatus.Pending);
        var resolved = tickets.Count(t => t.Status == TicketStatus.Resolved);
        var closed = tickets.Count(t => t.Status == TicketStatus.Closed);
        var urgent = tickets.Count(t => t.Priority == TicketPriority.Urgent && t.Status != TicketStatus.Closed);

        var resolvedTotal = resolved + closed;
        var rate = tickets.Count > 0 ? (double)resolvedTotal / tickets.Count * 100.0 : 0.0;

        return new TicketMetricsDto
        {
            OpenTicketsCount = open,
            PendingTicketsCount = pending,
            ResolvedTicketsCount = resolved,
            ClosedTicketsCount = closed,
            UrgentTicketsCount = urgent,
            TotalTicketsCount = tickets.Count,
            ResolutionRatePercentage = Math.Round(rate, 1)
        };
    }

    private async Task ValidateModifyPermissionAsync(SupportTicket ticket, CancellationToken cancellationToken)
    {
        var role = _tenantContext.CurrentRole ?? TenantRole.Employee;
        if (role == TenantRole.Employee)
        {
            var currentEmployee = await GetCurrentEmployeeAsync(cancellationToken);
            var empId = currentEmployee?.Id ?? Guid.Empty;
            if (ticket.AssignedEmployeeId != empId && ticket.CreatedByEmployeeId != empId)
            {
                throw new ForbiddenAccessException("Employees can only modify support tickets assigned to or created by them.");
            }
        }
        else if (role == TenantRole.Manager)
        {
            var currentEmployee = await GetCurrentEmployeeAsync(cancellationToken);
            var managerId = currentEmployee?.Id ?? Guid.Empty;
            var isDirectReport = ticket.AssignedEmployee != null && ticket.AssignedEmployee.ReportsToEmployeeId == managerId;
            if (ticket.AssignedEmployeeId != managerId && ticket.CreatedByEmployeeId != managerId && !isDirectReport)
            {
                throw new ForbiddenAccessException("Managers can only modify support tickets within their team scope.");
            }
        }
    }

    private static SupportTicketDto MapToDto(SupportTicket ticket)
    {
        return new SupportTicketDto
        {
            Id = ticket.Id,
            TenantId = ticket.TenantId,
            TicketNumber = ticket.TicketNumber,
            Subject = ticket.Subject,
            Description = ticket.Description,
            CustomerId = ticket.CustomerId,
            CustomerName = ticket.Customer?.CompanyName ?? string.Empty,
            AssignedEmployeeId = ticket.AssignedEmployeeId,
            AssignedEmployeeName = ticket.AssignedEmployee != null ? $"{ticket.AssignedEmployee.FirstName} {ticket.AssignedEmployee.LastName}".Trim() : null,
            CreatedByEmployeeId = ticket.CreatedByEmployeeId,
            CreatedByEmployeeName = ticket.CreatedByEmployee != null ? $"{ticket.CreatedByEmployee.FirstName} {ticket.CreatedByEmployee.LastName}".Trim() : null,
            Status = ticket.Status,
            Priority = ticket.Priority,
            Category = ticket.Category,
            ResolvedAtUtc = ticket.ResolvedAtUtc,
            ClosedAtUtc = ticket.ClosedAtUtc,
            ResolutionSummary = ticket.ResolutionSummary,
            CommentsCount = ticket.Comments.Count,
            Comments = ticket.Comments
                .OrderBy(c => c.CreatedAtUtc)
                .Select(c => new TicketCommentDto
                {
                    Id = c.Id,
                    TicketId = c.TicketId,
                    AuthorEmployeeId = c.AuthorEmployeeId,
                    AuthorName = c.AuthorName,
                    CommentText = c.CommentText,
                    IsInternal = c.IsInternal,
                    CreatedAtUtc = c.CreatedAtUtc
                }).ToList(),
            CreatedAtUtc = ticket.CreatedAtUtc,
            UpdatedAtUtc = ticket.UpdatedAtUtc
        };
    }

    private async Task<EmployeeProfile?> GetCurrentEmployeeAsync(CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (string.IsNullOrEmpty(userId)) return null;

        return await _context.Employees
            .FirstOrDefaultAsync(e => e.UserId == userId, cancellationToken);
    }
}
