using System;
using System.Collections.Generic;
using Orbit.Domain.Enums;

namespace Orbit.Application.Modules.Compliance.Dtos;

public class ComplianceCertificateDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string StandardCode { get; set; } = string.Empty;
    public string CertificateNumber { get; set; } = string.Empty;
    public string IssuingBody { get; set; } = string.Empty;
    public DateTime IssueDateUtc { get; set; }
    public DateTime ExpiryDateUtc { get; set; }
    public CertificateStatus Status { get; set; }
    public string StatusName => Status.ToString();
    public string? DocumentUrl { get; set; }
    public string? ScopeDescription { get; set; }
    public Guid? ResponsibleEmployeeId { get; set; }
    public string? ResponsibleEmployeeName { get; set; }
    public int DaysUntilExpiry { get; set; }
    public bool IsExpiringSoon => DaysUntilExpiry <= 30 && DaysUntilExpiry >= 0;
    public bool IsExpired => DaysUntilExpiry < 0;
    public DateTime CreatedAtUtc { get; set; }
}

public class CreateCertificateRequest
{
    public string Name { get; set; } = string.Empty;
    public string StandardCode { get; set; } = string.Empty;
    public string CertificateNumber { get; set; } = string.Empty;
    public string IssuingBody { get; set; } = string.Empty;
    public DateTime IssueDateUtc { get; set; }
    public DateTime ExpiryDateUtc { get; set; }
    public string? DocumentUrl { get; set; }
    public string? ScopeDescription { get; set; }
    public Guid? ResponsibleEmployeeId { get; set; }
}

public class UpdateCertificateRequest
{
    public string Name { get; set; } = string.Empty;
    public string StandardCode { get; set; } = string.Empty;
    public string CertificateNumber { get; set; } = string.Empty;
    public string IssuingBody { get; set; } = string.Empty;
    public DateTime IssueDateUtc { get; set; }
    public DateTime ExpiryDateUtc { get; set; }
    public CertificateStatus Status { get; set; }
    public string? DocumentUrl { get; set; }
    public string? ScopeDescription { get; set; }
    public Guid? ResponsibleEmployeeId { get; set; }
}

public class AuditMeetingDto
{
    public Guid Id { get; set; }
    public string MeetingNumber { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public AuditMeetingType AuditType { get; set; }
    public string AuditTypeName => AuditType.ToString();
    public AuditMeetingStatus Status { get; set; }
    public string StatusName => Status.ToString();
    public DateTime ScheduledDateUtc { get; set; }
    public string Location { get; set; } = string.Empty;
    public Guid? LeadAuditorEmployeeId { get; set; }
    public string? LeadAuditorName { get; set; }
    public Guid? AuditedDepartmentId { get; set; }
    public string? AuditedDepartmentName { get; set; }
    public string? ChecklistSummary { get; set; }
    public string? Findings { get; set; }
    public int NonConformancesCount { get; set; }
    public string? CorrectiveActionPlan { get; set; }
    public DateTime? CompletedAtUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}

public class CreateAuditMeetingRequest
{
    public string Title { get; set; } = string.Empty;
    public AuditMeetingType AuditType { get; set; } = AuditMeetingType.Internal;
    public DateTime ScheduledDateUtc { get; set; }
    public string Location { get; set; } = "Headquarters";
    public Guid? LeadAuditorEmployeeId { get; set; }
    public Guid? AuditedDepartmentId { get; set; }
    public string? ChecklistSummary { get; set; }
}

public class UpdateAuditMeetingRequest
{
    public string Title { get; set; } = string.Empty;
    public AuditMeetingType AuditType { get; set; }
    public AuditMeetingStatus Status { get; set; }
    public DateTime ScheduledDateUtc { get; set; }
    public string Location { get; set; } = string.Empty;
    public Guid? LeadAuditorEmployeeId { get; set; }
    public Guid? AuditedDepartmentId { get; set; }
    public string? ChecklistSummary { get; set; }
    public string? Findings { get; set; }
    public int NonConformancesCount { get; set; }
    public string? CorrectiveActionPlan { get; set; }
}

public class ComplianceDashboardDto
{
    public int TotalCertificates { get; set; }
    public int ActiveCertificates { get; set; }
    public int ExpiringSoonCertificates { get; set; }
    public int ExpiredCertificates { get; set; }
    public int TotalAuditMeetings { get; set; }
    public int ScheduledAuditsCount { get; set; }
    public int ActionRequiredAuditsCount { get; set; }
    public int CompletedAuditsCount { get; set; }
}
