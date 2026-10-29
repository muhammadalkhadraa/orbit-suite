using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Orbit.Application.Common.Exceptions;
using Orbit.Application.Interfaces;
using Orbit.Application.Modules.Compliance;
using Orbit.Application.Modules.Compliance.Dtos;
using Orbit.Domain.Entities;
using Orbit.Domain.Enums;

namespace Orbit.Infrastructure.Services;

public class ComplianceService : IComplianceService
{
    private readonly IApplicationDbContext _context;
    private readonly ITenantContext _tenantContext;
    private readonly IAuditService _auditService;

    public ComplianceService(
        IApplicationDbContext context,
        ITenantContext tenantContext,
        IAuditService auditService)
    {
        _context = context;
        _tenantContext = tenantContext;
        _auditService = auditService;
    }

    #region Certificates

    public async Task<List<ComplianceCertificateDto>> GetCertificatesAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var certificates = await _context.ComplianceCertificates
            .Include(c => c.ResponsibleEmployee)
            .OrderBy(c => c.ExpiryDateUtc)
            .ToListAsync(cancellationToken);

        return certificates.Select(c => MapToCertificateDto(c, now)).ToList();
    }

    public async Task<ComplianceCertificateDto> GetCertificateByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var certificate = await _context.ComplianceCertificates
            .Include(c => c.ResponsibleEmployee)
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

        if (certificate == null)
            throw new NotFoundException(nameof(ComplianceCertificate), id);

        return MapToCertificateDto(certificate, DateTime.UtcNow);
    }

    public async Task<ComplianceCertificateDto> CreateCertificateAsync(CreateCertificateRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.CurrentTenantId ?? Guid.Empty;

        var cert = new ComplianceCertificate
        {
            TenantId = tenantId,
            Name = request.Name.Trim(),
            StandardCode = request.StandardCode.Trim().ToUpperInvariant(),
            CertificateNumber = request.CertificateNumber.Trim(),
            IssuingBody = request.IssuingBody.Trim(),
            IssueDateUtc = request.IssueDateUtc,
            ExpiryDateUtc = request.ExpiryDateUtc,
            Status = request.ExpiryDateUtc < DateTime.UtcNow ? CertificateStatus.Expired :
                     request.ExpiryDateUtc <= DateTime.UtcNow.AddDays(30) ? CertificateStatus.ExpiringSoon : CertificateStatus.Active,
            DocumentUrl = request.DocumentUrl,
            ScopeDescription = request.ScopeDescription,
            ResponsibleEmployeeId = request.ResponsibleEmployeeId
        };

        _context.ComplianceCertificates.Add(cert);
        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync("Create", "ComplianceCertificate", cert.Id.ToString(),
            $"Registered compliance certificate {cert.StandardCode} ({cert.Name}) expiring {cert.ExpiryDateUtc:yyyy-MM-dd}.", cancellationToken);

        return await GetCertificateByIdAsync(cert.Id, cancellationToken);
    }

    public async Task<ComplianceCertificateDto> UpdateCertificateAsync(Guid id, UpdateCertificateRequest request, CancellationToken cancellationToken = default)
    {
        var cert = await _context.ComplianceCertificates.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
        if (cert == null) throw new NotFoundException(nameof(ComplianceCertificate), id);

        cert.Name = request.Name.Trim();
        cert.StandardCode = request.StandardCode.Trim().ToUpperInvariant();
        cert.CertificateNumber = request.CertificateNumber.Trim();
        cert.IssuingBody = request.IssuingBody.Trim();
        cert.IssueDateUtc = request.IssueDateUtc;
        cert.ExpiryDateUtc = request.ExpiryDateUtc;
        cert.Status = request.Status;
        cert.DocumentUrl = request.DocumentUrl;
        cert.ScopeDescription = request.ScopeDescription;
        cert.ResponsibleEmployeeId = request.ResponsibleEmployeeId;

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync("Update", "ComplianceCertificate", cert.Id.ToString(),
            $"Updated compliance certificate {cert.StandardCode} ({cert.Name}). Status: {cert.Status}.", cancellationToken);

        return await GetCertificateByIdAsync(cert.Id, cancellationToken);
    }

    public async Task DeleteCertificateAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var cert = await _context.ComplianceCertificates.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
        if (cert == null) throw new NotFoundException(nameof(ComplianceCertificate), id);

        _context.ComplianceCertificates.Remove(cert);
        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync("Delete", "ComplianceCertificate", id.ToString(),
            $"Deleted compliance certificate {cert.StandardCode} ({cert.Name}).", cancellationToken);
    }

    #endregion

    #region Audit Meetings

    public async Task<List<AuditMeetingDto>> GetAuditMeetingsAsync(CancellationToken cancellationToken = default)
    {
        var meetings = await _context.AuditMeetings
            .Include(m => m.LeadAuditorEmployee)
            .Include(m => m.AuditedDepartment)
            .OrderByDescending(m => m.ScheduledDateUtc)
            .ToListAsync(cancellationToken);

        return meetings.Select(MapToMeetingDto).ToList();
    }

    public async Task<AuditMeetingDto> GetAuditMeetingByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var meeting = await _context.AuditMeetings
            .Include(m => m.LeadAuditorEmployee)
            .Include(m => m.AuditedDepartment)
            .FirstOrDefaultAsync(m => m.Id == id, cancellationToken);

        if (meeting == null)
            throw new NotFoundException(nameof(AuditMeeting), id);

        return MapToMeetingDto(meeting);
    }

    public async Task<AuditMeetingDto> CreateAuditMeetingAsync(CreateAuditMeetingRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.CurrentTenantId ?? Guid.Empty;
        var year = DateTime.UtcNow.Year;
        var prefix = $"AUD-{year}-";

        var lastMeeting = await _context.AuditMeetings
            .Where(m => m.MeetingNumber.StartsWith(prefix))
            .OrderByDescending(m => m.MeetingNumber)
            .FirstOrDefaultAsync(cancellationToken);

        int nextSeq = 1;
        if (lastMeeting != null && lastMeeting.MeetingNumber.Length > prefix.Length)
        {
            var seqStr = lastMeeting.MeetingNumber.Substring(prefix.Length);
            if (int.TryParse(seqStr, out var parsed)) nextSeq = parsed + 1;
        }

        var meetingNumber = $"{prefix}{nextSeq:D4}";

        var meeting = new AuditMeeting
        {
            TenantId = tenantId,
            MeetingNumber = meetingNumber,
            Title = request.Title.Trim(),
            AuditType = request.AuditType,
            Status = AuditMeetingStatus.Scheduled,
            ScheduledDateUtc = request.ScheduledDateUtc,
            Location = string.IsNullOrWhiteSpace(request.Location) ? "Headquarters" : request.Location.Trim(),
            LeadAuditorEmployeeId = request.LeadAuditorEmployeeId,
            AuditedDepartmentId = request.AuditedDepartmentId,
            ChecklistSummary = request.ChecklistSummary
        };

        _context.AuditMeetings.Add(meeting);
        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync("Create", "AuditMeeting", meeting.Id.ToString(),
            $"Scheduled {meeting.AuditType} audit meeting {meeting.MeetingNumber} ({meeting.Title}) on {meeting.ScheduledDateUtc:yyyy-MM-dd HH:mm}.", cancellationToken);

        return await GetAuditMeetingByIdAsync(meeting.Id, cancellationToken);
    }

    public async Task<AuditMeetingDto> UpdateAuditMeetingAsync(Guid id, UpdateAuditMeetingRequest request, CancellationToken cancellationToken = default)
    {
        var meeting = await _context.AuditMeetings.FirstOrDefaultAsync(m => m.Id == id, cancellationToken);
        if (meeting == null) throw new NotFoundException(nameof(AuditMeeting), id);

        var previousStatus = meeting.Status;
        meeting.Title = request.Title.Trim();
        meeting.AuditType = request.AuditType;
        meeting.Status = request.Status;
        meeting.ScheduledDateUtc = request.ScheduledDateUtc;
        meeting.Location = request.Location.Trim();
        meeting.LeadAuditorEmployeeId = request.LeadAuditorEmployeeId;
        meeting.AuditedDepartmentId = request.AuditedDepartmentId;
        meeting.ChecklistSummary = request.ChecklistSummary;
        meeting.Findings = request.Findings;
        meeting.NonConformancesCount = request.NonConformancesCount;
        meeting.CorrectiveActionPlan = request.CorrectiveActionPlan;

        if (request.Status == AuditMeetingStatus.Completed && previousStatus != AuditMeetingStatus.Completed)
        {
            meeting.CompletedAtUtc = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync("Update", "AuditMeeting", meeting.Id.ToString(),
            $"Updated audit meeting {meeting.MeetingNumber} ({meeting.Title}). Status: {meeting.Status}.", cancellationToken);

        return await GetAuditMeetingByIdAsync(meeting.Id, cancellationToken);
    }

    public async Task DeleteAuditMeetingAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var meeting = await _context.AuditMeetings.FirstOrDefaultAsync(m => m.Id == id, cancellationToken);
        if (meeting == null) throw new NotFoundException(nameof(AuditMeeting), id);

        _context.AuditMeetings.Remove(meeting);
        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync("Delete", "AuditMeeting", id.ToString(),
            $"Deleted audit meeting {meeting.MeetingNumber} ({meeting.Title}).", cancellationToken);
    }

    #endregion

    #region Dashboard

    public async Task<ComplianceDashboardDto> GetComplianceDashboardAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var certificates = await _context.ComplianceCertificates.ToListAsync(cancellationToken);
        var meetings = await _context.AuditMeetings.ToListAsync(cancellationToken);

        var activeCount = certificates.Count(c => c.ExpiryDateUtc > now.AddDays(30) && c.Status != CertificateStatus.Expired);
        var expiringSoonCount = certificates.Count(c => c.ExpiryDateUtc <= now.AddDays(30) && c.ExpiryDateUtc >= now);
        var expiredCount = certificates.Count(c => c.ExpiryDateUtc < now || c.Status == CertificateStatus.Expired);

        return new ComplianceDashboardDto
        {
            TotalCertificates = certificates.Count,
            ActiveCertificates = activeCount,
            ExpiringSoonCertificates = expiringSoonCount,
            ExpiredCertificates = expiredCount,
            TotalAuditMeetings = meetings.Count,
            ScheduledAuditsCount = meetings.Count(m => m.Status == AuditMeetingStatus.Scheduled || m.Status == AuditMeetingStatus.InProgress),
            ActionRequiredAuditsCount = meetings.Count(m => m.Status == AuditMeetingStatus.ActionRequired || m.NonConformancesCount > 0),
            CompletedAuditsCount = meetings.Count(m => m.Status == AuditMeetingStatus.Completed)
        };
    }

    #endregion

    #region Helpers

    private static ComplianceCertificateDto MapToCertificateDto(ComplianceCertificate c, DateTime now)
    {
        var daysRemaining = (int)Math.Ceiling((c.ExpiryDateUtc.Date - now.Date).TotalDays);
        var effectiveStatus = c.Status;
        if (daysRemaining < 0 && effectiveStatus != CertificateStatus.UnderRenewal)
            effectiveStatus = CertificateStatus.Expired;
        else if (daysRemaining <= 30 && daysRemaining >= 0 && effectiveStatus == CertificateStatus.Active)
            effectiveStatus = CertificateStatus.ExpiringSoon;

        return new ComplianceCertificateDto
        {
            Id = c.Id,
            Name = c.Name,
            StandardCode = c.StandardCode,
            CertificateNumber = c.CertificateNumber,
            IssuingBody = c.IssuingBody,
            IssueDateUtc = c.IssueDateUtc,
            ExpiryDateUtc = c.ExpiryDateUtc,
            Status = effectiveStatus,
            DocumentUrl = c.DocumentUrl,
            ScopeDescription = c.ScopeDescription,
            ResponsibleEmployeeId = c.ResponsibleEmployeeId,
            ResponsibleEmployeeName = c.ResponsibleEmployee != null ? $"{c.ResponsibleEmployee.FirstName} {c.ResponsibleEmployee.LastName}".Trim() : null,
            DaysUntilExpiry = daysRemaining,
            CreatedAtUtc = c.CreatedAtUtc
        };
    }

    private static AuditMeetingDto MapToMeetingDto(AuditMeeting m)
    {
        return new AuditMeetingDto
        {
            Id = m.Id,
            MeetingNumber = m.MeetingNumber,
            Title = m.Title,
            AuditType = m.AuditType,
            Status = m.Status,
            ScheduledDateUtc = m.ScheduledDateUtc,
            Location = m.Location,
            LeadAuditorEmployeeId = m.LeadAuditorEmployeeId,
            LeadAuditorName = m.LeadAuditorEmployee != null ? $"{m.LeadAuditorEmployee.FirstName} {m.LeadAuditorEmployee.LastName}".Trim() : null,
            AuditedDepartmentId = m.AuditedDepartmentId,
            AuditedDepartmentName = m.AuditedDepartment?.Name,
            ChecklistSummary = m.ChecklistSummary,
            Findings = m.Findings,
            NonConformancesCount = m.NonConformancesCount,
            CorrectiveActionPlan = m.CorrectiveActionPlan,
            CompletedAtUtc = m.CompletedAtUtc,
            CreatedAtUtc = m.CreatedAtUtc
        };
    }

    #endregion
}
