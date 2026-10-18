using System;
using Orbit.Domain.Common;
using Orbit.Domain.Enums;

namespace Orbit.Domain.Entities;

public class ReportExportHistory : BaseEntity, ITenantScopedEntity, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public ReportType ReportType { get; set; }
    public string Title { get; set; } = string.Empty;
    public ExportFormat Format { get; set; } = ExportFormat.Csv;

    public Guid? GeneratedByEmployeeId { get; set; }
    public EmployeeProfile? GeneratedByEmployee { get; set; }

    public string? ParametersJson { get; set; }
    public int RecordCount { get; set; }
    public decimal FileSizeKb { get; set; }

    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }
}
