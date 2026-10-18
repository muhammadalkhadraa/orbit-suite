using System;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Orbit.Application.Common;
using Orbit.Application.Interfaces;
using Orbit.Application.Modules.Audit.Dtos;
using Orbit.Domain.Entities;

namespace Orbit.Infrastructure.Services;

public class AuditService : IAuditService
{
    private readonly IApplicationDbContext _context;
    private readonly ITenantContext _tenantContext;
    private readonly ICurrentUserService _currentUserService;

    public AuditService(
        IApplicationDbContext context,
        ITenantContext tenantContext,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _tenantContext = tenantContext;
        _currentUserService = currentUserService;
    }

    public async Task LogAsync(string action, string entityName, string? entityId = null, object? details = null, CancellationToken cancellationToken = default)
    {
        if (!_tenantContext.CurrentTenantId.HasValue) return;

        var auditLog = new AuditLog
        {
            TenantId = _tenantContext.CurrentTenantId.Value,
            UserId = _currentUserService.UserId,
            UserEmail = _currentUserService.Email,
            Action = action,
            EntityName = entityName,
            EntityId = entityId,
            DetailsJson = details != null ? JsonSerializer.Serialize(details) : null,
            IpAddress = _currentUserService.IpAddress,
            TimestampUtc = DateTime.UtcNow
        };

        _context.AuditLogs.Add(auditLog);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<PagedResponse<AuditLogDto>> GetLogsAsync(AuditLogFilterRequest filter, CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.CurrentTenantId 
            ?? throw new UnauthorizedAccessException("Tenant context required.");

        var query = _context.AuditLogs
            .AsNoTracking()
            .Where(a => a.TenantId == tenantId);

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var search = filter.Search.Trim().ToLower();
            query = query.Where(a =>
                a.Action.ToLower().Contains(search) ||
                a.EntityName.ToLower().Contains(search) ||
                (a.UserEmail != null && a.UserEmail.ToLower().Contains(search)) ||
                (a.EntityId != null && a.EntityId.ToLower().Contains(search)));
        }

        if (!string.IsNullOrWhiteSpace(filter.EntityName))
        {
            query = query.Where(a => a.EntityName == filter.EntityName);
        }

        if (!string.IsNullOrWhiteSpace(filter.Action))
        {
            query = query.Where(a => a.Action == filter.Action);
        }

        if (filter.FromDateUtc.HasValue)
        {
            query = query.Where(a => a.TimestampUtc >= filter.FromDateUtc.Value);
        }

        if (filter.ToDateUtc.HasValue)
        {
            query = query.Where(a => a.TimestampUtc <= filter.ToDateUtc.Value);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var pageNumber = Math.Max(1, filter.PageNumber);
        var pageSize = Math.Clamp(filter.PageSize, 1, 100);

        var items = await query
            .OrderByDescending(a => a.TimestampUtc)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new AuditLogDto
            {
                Id = a.Id,
                TenantId = a.TenantId,
                UserId = a.UserId,
                UserEmail = a.UserEmail,
                Action = a.Action,
                EntityName = a.EntityName,
                EntityId = a.EntityId,
                DetailsJson = a.DetailsJson,
                IpAddress = a.IpAddress,
                TimestampUtc = a.TimestampUtc
            })
            .ToListAsync(cancellationToken);

        return PagedResponse<AuditLogDto>.Create(items, totalCount, pageNumber, pageSize);
    }
}
