using System;
using Orbit.Domain.Common;
using Orbit.Domain.Enums;

namespace Orbit.Domain.Entities;

public class ComplianceCertificate : BaseEntity, ITenantScopedEntity, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public string Name { get; set; } = string.Empty;
    public string StandardCode { get; set; } = string.Empty;
    public string CertificateNumber { get; set; } = string.Empty;
    public string IssuingBody { get; set; } = string.Empty;

    public DateTime IssueDateUtc { get; set; }
    public DateTime ExpiryDateUtc { get; set; }
    public CertificateStatus Status { get; set; } = CertificateStatus.Active;

    public string? DocumentUrl { get; set; }
    public string? ScopeDescription { get; set; }

    public Guid? ResponsibleEmployeeId { get; set; }
    public EmployeeProfile? ResponsibleEmployee { get; set; }

    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }
}
