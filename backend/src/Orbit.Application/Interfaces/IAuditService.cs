using System;
using System.Threading;
using System.Threading.Tasks;
using Orbit.Application.Common;
using Orbit.Application.Modules.Audit.Dtos;

namespace Orbit.Application.Interfaces;

public interface IAuditService
{
    Task LogAsync(string action, string entityName, string? entityId = null, object? details = null, CancellationToken cancellationToken = default);
    Task<PagedResponse<AuditLogDto>> GetLogsAsync(AuditLogFilterRequest filter, CancellationToken cancellationToken = default);
}
