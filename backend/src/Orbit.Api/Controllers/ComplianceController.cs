using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Orbit.Application.Common;
using Orbit.Application.Modules.Compliance;
using Orbit.Application.Modules.Compliance.Dtos;

namespace Orbit.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/compliance")]
public class ComplianceController : ControllerBase
{
    private readonly IComplianceService _complianceService;

    public ComplianceController(IComplianceService complianceService)
    {
        _complianceService = complianceService;
    }

    [HttpGet("dashboard")]
    public async Task<ActionResult<ApiResponse<ComplianceDashboardDto>>> GetDashboard(CancellationToken cancellationToken)
    {
        var result = await _complianceService.GetComplianceDashboardAsync(cancellationToken);
        return Ok(ApiResponse<ComplianceDashboardDto>.Ok(result));
    }

    #region Certificates

    [HttpGet("certificates")]
    public async Task<ActionResult<ApiResponse<List<ComplianceCertificateDto>>>> GetCertificates(CancellationToken cancellationToken)
    {
        var result = await _complianceService.GetCertificatesAsync(cancellationToken);
        return Ok(ApiResponse<List<ComplianceCertificateDto>>.Ok(result));
    }

    [HttpGet("certificates/{id}")]
    public async Task<ActionResult<ApiResponse<ComplianceCertificateDto>>> GetCertificateById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _complianceService.GetCertificateByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<ComplianceCertificateDto>.Ok(result));
    }

    [HttpPost("certificates")]
    public async Task<ActionResult<ApiResponse<ComplianceCertificateDto>>> CreateCertificate(
        [FromBody] CreateCertificateRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _complianceService.CreateCertificateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetCertificateById), new { id = result.Id },
            ApiResponse<ComplianceCertificateDto>.Ok(result, "Compliance certificate registered successfully."));
    }

    [HttpPut("certificates/{id}")]
    public async Task<ActionResult<ApiResponse<ComplianceCertificateDto>>> UpdateCertificate(
        Guid id,
        [FromBody] UpdateCertificateRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _complianceService.UpdateCertificateAsync(id, request, cancellationToken);
        return Ok(ApiResponse<ComplianceCertificateDto>.Ok(result, "Compliance certificate updated successfully."));
    }

    [HttpDelete("certificates/{id}")]
    public async Task<ActionResult<ApiResponse<string>>> DeleteCertificate(Guid id, CancellationToken cancellationToken)
    {
        await _complianceService.DeleteCertificateAsync(id, cancellationToken);
        return Ok(ApiResponse<string>.Ok(string.Empty, "Compliance certificate deleted successfully."));
    }

    #endregion

    #region Audit Meetings

    [HttpGet("meetings")]
    public async Task<ActionResult<ApiResponse<List<AuditMeetingDto>>>> GetMeetings(CancellationToken cancellationToken)
    {
        var result = await _complianceService.GetAuditMeetingsAsync(cancellationToken);
        return Ok(ApiResponse<List<AuditMeetingDto>>.Ok(result));
    }

    [HttpGet("meetings/{id}")]
    public async Task<ActionResult<ApiResponse<AuditMeetingDto>>> GetMeetingById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _complianceService.GetAuditMeetingByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<AuditMeetingDto>.Ok(result));
    }

    [HttpPost("meetings")]
    public async Task<ActionResult<ApiResponse<AuditMeetingDto>>> CreateMeeting(
        [FromBody] CreateAuditMeetingRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _complianceService.CreateAuditMeetingAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetMeetingById), new { id = result.Id },
            ApiResponse<AuditMeetingDto>.Ok(result, "Audit meeting scheduled successfully."));
    }

    [HttpPut("meetings/{id}")]
    public async Task<ActionResult<ApiResponse<AuditMeetingDto>>> UpdateMeeting(
        Guid id,
        [FromBody] UpdateAuditMeetingRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _complianceService.UpdateAuditMeetingAsync(id, request, cancellationToken);
        return Ok(ApiResponse<AuditMeetingDto>.Ok(result, "Audit meeting updated successfully."));
    }

    [HttpDelete("meetings/{id}")]
    public async Task<ActionResult<ApiResponse<string>>> DeleteMeeting(Guid id, CancellationToken cancellationToken)
    {
        await _complianceService.DeleteAuditMeetingAsync(id, cancellationToken);
        return Ok(ApiResponse<string>.Ok(string.Empty, "Audit meeting deleted successfully."));
    }

    #endregion
}
