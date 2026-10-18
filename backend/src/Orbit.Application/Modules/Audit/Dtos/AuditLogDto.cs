using System;

namespace Orbit.Application.Modules.Audit.Dtos;

public class AuditLogDto
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string? UserId { get; set; }
    public string? UserEmail { get; set; }
    public string Action { get; set; } = string.Empty;
    public string EntityName { get; set; } = string.Empty;
    public string? EntityId { get; set; }
    public string? DetailsJson { get; set; }
    public string? IpAddress { get; set; }
    public DateTime TimestampUtc { get; set; }
}
