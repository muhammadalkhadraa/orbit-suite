using System;

namespace Orbit.Application.Modules.Audit.Dtos;

public class AuditLogFilterRequest
{
    public string? Search { get; set; }
    public string? EntityName { get; set; }
    public string? Action { get; set; }
    public string? UserId { get; set; }
    public string? UserEmail { get; set; }
    public DateTime? FromDateUtc { get; set; }
    public DateTime? ToDateUtc { get; set; }
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 25;
}
