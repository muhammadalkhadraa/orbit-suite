using System;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Orbit.Application.Modules.Compliance.Dtos;
using Orbit.Domain.Entities;
using Orbit.Domain.Enums;
using Orbit.Infrastructure.Persistence;
using Orbit.Infrastructure.Services;
using Xunit;

namespace Orbit.Tests.Modules;

public class ComplianceTests
{
    private (OrbitDbContext db, TenantContext tenantContext, FakeCurrentUserService userService, ComplianceService complianceService)
        SetupTestEnvironment()
    {
        var tenantContext = new TenantContext();
        var userService = new FakeCurrentUserService();

        var options = new DbContextOptionsBuilder<OrbitDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var db = new OrbitDbContext(options, tenantContext, userService);
        var auditService = new AuditService(db, tenantContext, userService);
        var complianceService = new ComplianceService(db, tenantContext, auditService);

        return (db, tenantContext, userService, complianceService);
    }

    [Fact]
    public async Task ComplianceCertificate_ShouldCalculateExpiringSoon_AndExpiredAccurately()
    {
        var (db, tenantContext, userService, complianceService) = SetupTestEnvironment();
        var tenantId = Guid.NewGuid();

        tenantContext.SetContext(tenantId, "user-auditor", TenantRole.Admin);
        userService.UserId = "user-auditor";

        // 1. Create Active Certificate (expires in 120 days)
        var certActive = await complianceService.CreateCertificateAsync(new CreateCertificateRequest
        {
            Name = "ISO 9001 Quality Management",
            StandardCode = "ISO-9001",
            CertificateNumber = "CERT-9001",
            IssuingBody = "Bureau Veritas",
            IssueDateUtc = DateTime.UtcNow.AddMonths(-6),
            ExpiryDateUtc = DateTime.UtcNow.AddDays(120)
        });

        certActive.Status.Should().Be(CertificateStatus.Active);
        certActive.IsExpiringSoon.Should().BeFalse();
        certActive.IsExpired.Should().BeFalse();

        // 2. Create Expiring Soon Certificate (expires in 15 days)
        var certExpiring = await complianceService.CreateCertificateAsync(new CreateCertificateRequest
        {
            Name = "ISO 27001 ISMS",
            StandardCode = "ISO-27001",
            CertificateNumber = "CERT-27001",
            IssuingBody = "BSI",
            IssueDateUtc = DateTime.UtcNow.AddYears(-1),
            ExpiryDateUtc = DateTime.UtcNow.AddDays(15)
        });

        certExpiring.Status.Should().Be(CertificateStatus.ExpiringSoon);
        certExpiring.IsExpiringSoon.Should().BeTrue();
        certExpiring.IsExpired.Should().BeFalse();

        // 3. Create Expired Certificate (expired 5 days ago)
        var certExpired = await complianceService.CreateCertificateAsync(new CreateCertificateRequest
        {
            Name = "Facility Fire Safety License",
            StandardCode = "SAFETY",
            CertificateNumber = "FIRE-2023",
            IssuingBody = "Fire Dept",
            IssueDateUtc = DateTime.UtcNow.AddYears(-2),
            ExpiryDateUtc = DateTime.UtcNow.AddDays(-5)
        });

        certExpired.Status.Should().Be(CertificateStatus.Expired);
        certExpired.IsExpired.Should().BeTrue();

        // 4. Check Dashboard summary
        var dashboard = await complianceService.GetComplianceDashboardAsync();
        dashboard.TotalCertificates.Should().Be(3);
        dashboard.ActiveCertificates.Should().Be(1);
        dashboard.ExpiringSoonCertificates.Should().Be(1);
        dashboard.ExpiredCertificates.Should().Be(1);
    }

    [Fact]
    public async Task AuditMeeting_ShouldGenerateSequentialMeetingNumber_AndRecordFindings()
    {
        var (db, tenantContext, userService, complianceService) = SetupTestEnvironment();
        var tenantId = Guid.NewGuid();

        tenantContext.SetContext(tenantId, "user-auditor", TenantRole.Admin);
        userService.UserId = "user-auditor";

        var meeting = await complianceService.CreateAuditMeetingAsync(new CreateAuditMeetingRequest
        {
            Title = "Annual ISO 9001 Internal Review",
            AuditType = AuditMeetingType.Internal,
            ScheduledDateUtc = DateTime.UtcNow.AddDays(7),
            Location = "Meeting Room B",
            ChecklistSummary = "Review calibration records and supplier audit trails."
        });

        meeting.MeetingNumber.Should().StartWith($"AUD-{DateTime.UtcNow.Year}-");
        meeting.Status.Should().Be(AuditMeetingStatus.Scheduled);

        // Update with findings and complete
        var updated = await complianceService.UpdateAuditMeetingAsync(meeting.Id, new UpdateAuditMeetingRequest
        {
            Title = meeting.Title,
            AuditType = meeting.AuditType,
            Status = AuditMeetingStatus.Completed,
            ScheduledDateUtc = meeting.ScheduledDateUtc,
            Location = meeting.Location,
            ChecklistSummary = meeting.ChecklistSummary,
            Findings = "All records verified. 1 minor calibration lag observed.",
            NonConformancesCount = 1,
            CorrectiveActionPlan = "Recalibrate humidity sensor by end of month."
        });

        updated.Status.Should().Be(AuditMeetingStatus.Completed);
        updated.CompletedAtUtc.Should().NotBeNull();
        updated.NonConformancesCount.Should().Be(1);
    }
}
