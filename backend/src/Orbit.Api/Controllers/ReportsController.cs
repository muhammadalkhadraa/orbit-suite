using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Orbit.Application.Common;
using Orbit.Application.Modules.Reports;
using Orbit.Application.Modules.Reports.Dtos;

namespace Orbit.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/reports")]
public class ReportsController : ControllerBase
{
    private readonly IReportingService _reportingService;

    public ReportsController(IReportingService reportingService)
    {
        _reportingService = reportingService;
    }

    [HttpGet("executive")]
    public async Task<ActionResult<ApiResponse<ExecutiveDashboardDto>>> GetExecutiveOverview(
        [FromQuery] DateTime? fromDateUtc,
        [FromQuery] DateTime? toDateUtc,
        CancellationToken cancellationToken)
    {
        var result = await _reportingService.GetExecutiveOverviewAsync(fromDateUtc, toDateUtc, cancellationToken);
        return Ok(ApiResponse<ExecutiveDashboardDto>.Ok(result));
    }

    [HttpPost("export")]
    public async Task<ActionResult<ApiResponse<ReportExportDto>>> ExportReport(
        [FromBody] ReportExportRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _reportingService.ExportReportAsync(request, cancellationToken);
        return Ok(ApiResponse<ReportExportDto>.Ok(result, "Report generated and export logged successfully."));
    }

    [HttpGet("history")]
    public async Task<ActionResult<ApiResponse<List<ReportExportHistoryDto>>>> GetExportHistory(CancellationToken cancellationToken)
    {
        var result = await _reportingService.GetExportHistoryAsync(cancellationToken);
        return Ok(ApiResponse<List<ReportExportHistoryDto>>.Ok(result));
    }
}
