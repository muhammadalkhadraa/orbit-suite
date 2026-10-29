using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Orbit.Application.Modules.Compliance.Dtos;

namespace Orbit.Application.Modules.Compliance;

public interface IComplianceService
{
    // Certificates
    Task<List<ComplianceCertificateDto>> GetCertificatesAsync(CancellationToken cancellationToken = default);
    Task<ComplianceCertificateDto> GetCertificateByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<ComplianceCertificateDto> CreateCertificateAsync(CreateCertificateRequest request, CancellationToken cancellationToken = default);
    Task<ComplianceCertificateDto> UpdateCertificateAsync(Guid id, UpdateCertificateRequest request, CancellationToken cancellationToken = default);
    Task DeleteCertificateAsync(Guid id, CancellationToken cancellationToken = default);

    // Audit Meetings
    Task<List<AuditMeetingDto>> GetAuditMeetingsAsync(CancellationToken cancellationToken = default);
    Task<AuditMeetingDto> GetAuditMeetingByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<AuditMeetingDto> CreateAuditMeetingAsync(CreateAuditMeetingRequest request, CancellationToken cancellationToken = default);
    Task<AuditMeetingDto> UpdateAuditMeetingAsync(Guid id, UpdateAuditMeetingRequest request, CancellationToken cancellationToken = default);
    Task DeleteAuditMeetingAsync(Guid id, CancellationToken cancellationToken = default);

    // Dashboard Overview
    Task<ComplianceDashboardDto> GetComplianceDashboardAsync(CancellationToken cancellationToken = default);
}
